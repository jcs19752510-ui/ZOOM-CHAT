import { z } from 'zod';

const csv = z
  .string()
  .transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean));

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(0).max(65535).default(3001),
    ALLOWED_ORIGINS: csv.pipe(
      z
        .array(
          z.string().refine((o) => {
            try {
              const u = new URL(o);
              return (u.protocol === 'http:' || u.protocol === 'https:') && u.origin === o;
            } catch {
              return false;
            }
          }, 'origin 형식이 아닙니다 (예: https://meet.example.com)'),
        )
        .min(1),
    ),
    SESSION_SECRET: z.string().min(32, '32자 이상이어야 합니다'),
    STUN_URLS: csv.default(['stun:stun.l.google.com:19302']),
    TURN_URLS: csv.optional(),
    TURN_SECRET: z.string().min(16).optional(),
    TURN_TTL_SEC: z.coerce.number().int().min(60).max(86_400).default(3600),
    MAX_PARTICIPANTS: z.coerce.number().int().min(2).max(12).default(6),
    MAX_ROOMS: z.coerce.number().int().min(1).max(10_000).default(100),
    ROOM_EMPTY_TTL_MIN: z.coerce.number().min(0.01).max(1440).default(10),
    RECONNECT_GRACE_SEC: z.coerce.number().min(1).max(300).default(20),
    IP_MAX_CONNECTIONS: z.coerce.number().int().min(1).max(1000).default(20),
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
    /** IP 단위 속도 제한(방 생성·조회·입장) 배율. 운영에서는 1, 테스트·부하 시험에서만 키운다. */
    RATE_LIMIT_SCALE: z.coerce.number().min(1).max(1000).default(1),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'silent']).default('info'),
    WEB_DIST: z.string().optional(),
  })
  .refine((e) => !(e.TURN_URLS?.length && !e.TURN_SECRET), { message: 'TURN_URLS를 쓰려면 TURN_SECRET이 필요합니다', path: ['TURN_SECRET'] })
  // .env.example의 예시 값을 그대로 운영에 쓰는 실수를 막는다(SEC-10)
  .refine((e) => !(e.NODE_ENV === 'production' && (e.SESSION_SECRET.startsWith('change-me') || e.TURN_SECRET?.startsWith('change-me'))), {
    message: '운영에서는 예시 비밀값(change-me...)을 쓸 수 없습니다. 새 난수로 바꾸세요',
    path: ['SESSION_SECRET'],
  });

export type Config = z.infer<typeof EnvSchema>;

export class ConfigError extends Error {}

/** 환경변수를 검증한다. 누락·오류가 있으면 읽기 쉬운 메시지와 함께 예외를 던진다(서버 시작 실패, NFR-08). */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => ` - ${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new ConfigError(`환경변수 오류:\n${lines.join('\n')}\n.env.example을 참고해 .env를 설정하세요.`);
  }
  return parsed.data;
}
