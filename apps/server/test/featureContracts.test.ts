import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { ERROR_CODES } from '@meetlite/shared';
import type { Socket } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';
import { createLogger } from '../src/logger';
import { startServer, type RunningServer } from '../src/server';
import { baseEnv, connect, createRoom, emit, join, makeConfig, once, sleep } from './helpers';

// 7단계 통합: 작업 단위 사이의 계약을 "목록 대 목록"으로 대조한다. 한쪽만 고치고 다른 쪽을 놓치면(이벤트 이름, 오류 코드,
// 환경변수, 포트) 단위 시험은 각자 통과하고 조립 시점에야 깨진다. 여기서는 소스·문서를 읽어 집합을 만들고 같은지 본다.

const ROOT = path.resolve(__dirname, '../../..');
const read = (rel: string): string => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const names = (text: string, re: RegExp): string[] => [...new Set([...text.matchAll(re)].map((m) => m[1] as string))].sort();
const section = (text: string, start: string, end: string): string => {
  const i = text.indexOf(start);
  const j = text.indexOf(end, i + start.length);
  if (i < 0 || j < 0) throw new Error(`section not found: ${start}`);
  return text.slice(i, j);
};

/** 웹 소스(시험·시험 도구 제외)를 모은다. */
function webSources(dir = path.join(ROOT, 'apps/web/src'), out: { rel: string; text: string }[] = []): { rel: string; text: string }[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['integration', 'testing'].includes(e.name)) continue;
      webSources(full, out);
    } else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\.|testUtil/.test(e.name)) out.push({ rel: path.relative(ROOT, full), text: fs.readFileSync(full, 'utf8') });
  }
  return out;
}

const protocol = read('packages/shared/src/protocol.ts');
const c2s = names(section(protocol, 'interface ClientToServerEvents', '}'), /^\s+'([a-z]+:[A-Za-z]+)':/gm);
const s2c = names(section(protocol, 'interface ServerToClientEvents', '\n}'), /^\s+'([a-z]+:[A-Za-z]+)':/gm);
const serverSrc = read('apps/server/src/socket/server.ts');
const web = webSources();
const webText = web.map((w) => w.text).join('\n');

describe('F1 이벤트 이름 목록: shared ↔ 서버 ↔ 웹', () => {
  it('IT-80 [NFR-12,SEC-06] 클라이언트→서버 이벤트 12종: shared 타입 = 서버 핸들러 = 서버 속도 제한 표 = 웹이 실제로 보내는 이벤트', () => {
    expect(c2s).toHaveLength(12);
    expect(names(serverSrc, /\bon\('([a-z]+:[A-Za-z]+)'/g)).toEqual(c2s);
    expect(names(section(serverSrc, 'const RATE_SPECS', '};'), /'([a-z]+:[A-Za-z]+)':/g)).toEqual(c2s);
    expect(names(webText, /\.request\(\s*'([a-z]+:[A-Za-z]+)'/g)).toEqual(c2s);
    // 이벤트마다 zod 스키마가 있고(on(...) 두 번째 인자) 입장 필요 여부가 명시된다
    expect([...serverSrc.matchAll(/\bon\('[a-z]+:[A-Za-z]+', (\w+Schema), (true|false)/g)]).toHaveLength(c2s.length);
    // 음성 대조군: 핸들러 하나를 지운 사본, 웹 요청 하나를 바꾼 사본은 이 비교가 실제로 잡아낸다
    expect(names(serverSrc.replace("on('metrics:path'", "on('metrics:pathX'"), /\bon\('([a-z]+:[A-Za-z]+)'/g)).not.toEqual(c2s);
    expect(names(webText.replace(".request('chat:send'", ".request('chat:sendX'"), /\.request\(\s*'([a-z]+:[A-Za-z]+)'/g)).not.toEqual(c2s);
  });

  it('IT-81 [NFR-12,SEC-04] 서버→클라이언트 이벤트 10종: shared 타입 = 서버가 내보내는 이벤트 = 웹이 듣는 이벤트', () => {
    expect(s2c).toHaveLength(10);
    expect(names(serverSrc, /\.emit\('([a-z]+:[A-Za-z]+)'/g)).toEqual(s2c);
    expect(names(webText, /\bsock\.on\('([a-z]+:[A-Za-z]+)'/g)).toEqual(s2c);
    // 서버가 보내는 모든 이벤트 호출에 v: 1이 들어 있다
    const emits = [...serverSrc.matchAll(/\.emit\('[a-z]+:[A-Za-z]+', \{([^}]*)/g)];
    expect(emits.length).toBeGreaterThanOrEqual(s2c.length);
    for (const m of emits) expect(m[1], m[0]).toMatch(/\bv: 1\b/);
  });
});

describe('F1 오류 코드 목록: shared ↔ 서버 ↔ 웹', () => {
  it('IT-82 [NFR-12,SEC-08] 서버·웹 소스가 쓰는 오류 코드 문자열은 모두 shared ERROR_CODES(또는 HTTP 전용 코드·NETWORK)에 있고 서버 message 표와 코드 목록이 일치한다', () => {
    const msgs = read('apps/server/src/socket/messages.ts');
    expect(names(section(msgs, 'const MESSAGES', '};'), /^\s+([A-Z_]+):/gm)).toEqual([...ERROR_CODES].sort());
    // 사용자에게 보이지 않는 개발용 영문 설명이며 내부 정보(경로·스택·ID)를 담지 않는다
    for (const m of section(msgs, 'const MESSAGES', '};').matchAll(/^\s+[A-Z_]+: '([^']*)'/gm)) expect(m[1], m[0]).toMatch(/^[a-z ]{5,40}$/);

    const allowed = new Set<string>([...ERROR_CODES, 'NETWORK', 'NOT_FOUND', 'METHOD_NOT_ALLOWED', 'PAYLOAD_TOO_LARGE']);
    const files = ['apps/server/src/rooms/RoomManager.ts', 'apps/server/src/socket/server.ts', 'apps/server/src/http/app.ts', 'apps/server/src/http/admin.ts'];
    const used = [...files.map((f) => ({ f, t: read(f) })), ...web.map((w) => ({ f: w.rel, t: w.text }))];
    const stray: string[] = [];
    for (const { f, t } of used) for (const m of t.matchAll(/'([A-Z]{3,}(?:_[A-Z]+)+|NETWORK|INTERNAL|FORBIDDEN|KICKED)'/g)) if (!allowed.has(m[1] as string)) stray.push(`${f}: ${m[1]}`);
    expect(stray).toEqual([]);
  });

  it('IT-83 [NFR-12,SEC-08] DOC-I-01: api-spec.md(단일 기준)에 오류 코드 19종·metrics:path·room:closed·/api/meta·admin 이벤트가 모두 적혀 있다 (11단계에서 정정, DEC-020)', () => {
    const api = read('docs/03-engineering/api-spec.md');
    const missing = [...ERROR_CODES, ...c2s, ...s2c, '/api/meta', '/admin/rooms'].filter((n) => !api.includes(n));
    expect(missing).toEqual([]);
  });
});

describe('F6 환경변수·포트·인프라 산출물 정합', () => {
  const configText = read('apps/server/src/config.ts');
  const keys = names(section(configText, 'const EnvSchema', '\n  })\n  .refine('), /^\s{4}([A-Z_]+):/gm);
  const envExample = read('.env.example');

  it('IT-84 [NFR-08,SEC-10,POL-19,POL-20] config 스키마의 환경변수는 .env.example에 모두(주석 포함) 있고 .env.example에 스키마에 없는 죽은 키가 없으며, 사본을 그대로 쓰면 개발 모드로 기동 설정이 통과한다', () => {
    expect(keys.length).toBeGreaterThanOrEqual(21);
    const exampleKeys = names(envExample, /^#?\s*([A-Z][A-Z_]+)=/gm);
    // RATE_LIMIT_SCALE은 부하·시험 전용이라 예시에 두지 않는다(config.ts 주석)
    expect(keys.filter((k) => !exampleKeys.includes(k))).toEqual(['RATE_LIMIT_SCALE']);
    expect(exampleKeys.filter((k) => !keys.includes(k))).toEqual([]);
    const env: NodeJS.ProcessEnv = {};
    for (const line of envExample.split('\n')) {
      const m = /^([A-Z][A-Z_]+)=(.*)$/.exec(line);
      if (m) env[m[1] as string] = m[2] as string;
    }
    expect(() => loadConfig(env)).not.toThrow();
    // 주석을 풀어 쓰는 선택 항목도 값 형식이 스키마를 통과한다(운영자가 그대로 복사해 채우는 값)
    const optional: NodeJS.ProcessEnv = { ...env, ADMIN_PORT: '3002', ADMIN_TOKEN: 'change-me-admin-token-change-me-admin', TURN_URLS: 'turn:localhost:3478,turn:localhost:3478?transport=tcp', TURN_SECRET: 'change-me-turn-secret-change-me', WEB_DIST: 'apps/web/dist' };
    expect(() => loadConfig(optional)).not.toThrow();
    expect(() => loadConfig({ ...optional, NODE_ENV: 'production' })).toThrow(/change-me/);
  });

  it('IT-85 [NFR-07,NFR-08,SEC-09] 기본 포트(3001)가 config 기본값·.env.example·Dockerfile(EXPOSE·HEALTHCHECK)·dev 프록시·runbook에서 같고, TURN 포트·릴레이 대역이 .env.example·compose 안내·coturn 설정에서 같다', () => {
    const def = loadConfig({ ...baseEnv, PORT: undefined }).PORT;
    expect(def).toBe(3001);
    expect(envExample).toMatch(/^PORT=3001$/m);
    const docker = read('Dockerfile');
    expect(docker).toMatch(/^EXPOSE 3001$/m);
    expect(docker).toMatch(/process\.env\.PORT\|\|3001/);
    expect(names(read('apps/web/vite.config.ts'), /localhost:(\d+)/g)).toEqual(['3001']);
    expect(read('docs/06-ops/runbook.md')).toContain('-p 3001:3001');
    // .env.example의 허용 Origin에는 서버가 직접 정적 파일을 줄 때의 주소(3001)와 vite(5173)가 모두 있다
    expect(makeConfigFromExample().ALLOWED_ORIGINS).toEqual(['http://localhost:5173', `http://localhost:${def}`]);

    const conf = read('infra/coturn/turnserver.conf');
    expect(envExample).toMatch(/turn:localhost:3478/);
    expect(conf).toMatch(/^listening-port=3478$/m);
    const min = /^min-port=(\d+)$/m.exec(conf)?.[1];
    const max = /^max-port=(\d+)$/m.exec(conf)?.[1];
    expect(read('infra/docker-compose.yml')).toContain(`${min}-${max}`);
    // compose가 넘기는 비밀(TURN_SECRET)은 서버가 읽는 이름과 같다
    expect(read('infra/docker-compose.yml')).toMatch(/TURN_SECRET: \$\{TURN_SECRET:\?/);
    expect(keys).toContain('TURN_SECRET');
  });

  it('IT-86 [NFR-04,NFR-13,SEC-09] 기본 정원(6명) mesh의 릴레이 할당 수(참가자당 5개, ICE 재시작 중첩 시 2배)가 coturn user-quota 안에 들어간다', () => {
    const conf = read('infra/coturn/turnserver.conf');
    const quota = Number(/^user-quota=(\d+)$/m.exec(conf)?.[1]);
    const maxP = loadConfig(baseEnv).MAX_PARTICIPANTS;
    expect(maxP).toBe(6);
    expect(quota).toBeGreaterThanOrEqual(2 * (maxP - 1));
    // 같은 사람의 모든 PeerConnection이 같은 username을 쓴다 → user-quota는 사람 단위로 센다(turn.ts)
    expect(read('apps/server/src/security/turn.ts')).toMatch(/`\$\{[^}]*\}:\$\{[^}]*\}`|:\${/);
  });
});

function makeConfigFromExample(): ReturnType<typeof loadConfig> {
  const env: NodeJS.ProcessEnv = {};
  for (const line of read('.env.example').split('\n')) {
    const m = /^([A-Z][A-Z_]+)=(.*)$/.exec(line);
    if (m) env[m[1] as string] = m[2] as string;
  }
  return loadConfig(env);
}

// ---------------------------------------------------------------- 실제 서버로 모든 S→C 이벤트를 발생시켜 v:1 확인
const socks: Socket[] = [];
let server: RunningServer | undefined;
afterEach(async () => {
  while (socks.length) socks.pop()?.close();
  await server?.close();
  server = undefined;
});

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const p = (s.address() as net.AddressInfo).port;
      s.close(() => resolve(p));
    });
  });
}

describe('F1·F4·F5 서버→클라이언트 이벤트 실발생', () => {
  it('IT-87 [NFR-12,SEC-04,FR-13,FR-14,FR-15,FR-16,FR-17,POL-19] 10종 이벤트를 실제로 모두 발생시켜 모든 페이로드가 v:1이고, 발신자 필드(from·by·id)는 서버가 부여한 참가자 ID이며, 이벤트 목록이 shared와 같다', async () => {
    const adminPort = await freePort();
    const token = 'admin-token-admin-token-admin-token-ZZ';
    server = await startServer(makeConfig({ RATE_LIMIT_SCALE: '100', ADMIN_PORT: String(adminPort), ADMIN_TOKEN: token }), createLogger('silent'));
    const port = server.port;
    const seen: { event: string; payload: Record<string, unknown>; who: string }[] = [];
    const watch = (s: Socket, who: string): void => {
      s.onAny((event: string, payload: Record<string, unknown>) => seen.push({ event, payload, who }));
      socks.push(s);
    };

    const { roomId, hostClaim } = await createRoom(port);
    const host = await join(port, roomId, 'Host', { hostClaim });
    watch(host.socket, 'host');
    const g1 = await join(port, roomId, 'Guest1');
    watch(g1.socket, 'g1');
    const g2 = await join(port, roomId, 'Guest2');
    watch(g2.socket, 'g2');
    await sleep(100);

    expect((await emit(g1.socket, 'media:state', { v: 1, audio: false, video: true })).ok).toBe(true);
    const sig = once(g2.socket, 'signal:recv');
    expect((await emit(g1.socket, 'signal:send', { v: 1, to: g2.id, description: { type: 'offer', sdp: 'v=0' } })).ok).toBe(true);
    expect((await sig).from).toBe(g1.id);
    expect((await emit(g1.socket, 'chat:send', { v: 1, text: 'hello' })).ok).toBe(true);
    expect((await emit(host.socket, 'host:lock', { v: 1, locked: true })).ok).toBe(true);
    expect((await emit(host.socket, 'host:muteAll', { v: 1 })).ok).toBe(true);
    expect((await emit(host.socket, 'host:kick', { v: 1, targetId: g2.id })).ok).toBe(true);
    expect((await emit(host.socket, 'room:leave', { v: 1 })).ok).toBe(true);
    await sleep(150);

    const closedRoom = await createRoom(port);
    const h2 = await join(port, closedRoom.roomId, 'Host', { hostClaim: closedRoom.hostClaim });
    watch(h2.socket, 'closedHost');
    const res = await fetch(`http://127.0.0.1:${server.adminPort}/admin/rooms/${closedRoom.roomId}/close`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
    expect(res.status).toBe(200);
    await sleep(150);

    expect([...new Set(seen.map((e) => e.event))].sort()).toEqual(s2c);
    for (const e of seen) expect(e.payload.v, `${e.event} → ${e.who}`).toBe(1);
    const ids = new Set([host.id, g1.id, g2.id, h2.id]);
    for (const e of seen) {
      for (const f of ['from', 'by', 'hostId']) if (typeof e.payload[f] === 'string') expect(ids.has(e.payload[f] as string), `${e.event}.${f}`).toBe(true);
    }
    expect(seen.find((e) => e.event === 'room:participantLeft' && e.payload.reason === 'kicked')).toBeDefined();
    expect(seen.find((e) => e.event === 'room:kicked' && e.who === 'g2')).toBeDefined();
    expect(seen.find((e) => e.event === 'host:muteAll' && e.who === 'host')).toBeUndefined(); // 호스트 자신에게는 가지 않는다
    // 추가: 보내지 않은 소켓에 연결 직후 아무 이벤트도 가지 않는다(채널 격리)
    const outsider = await connect(port);
    watch(outsider, 'outsider');
    await emit(g1.socket, 'chat:send', { v: 1, text: 'after leave' }).catch(() => undefined);
    await sleep(100);
    expect(seen.filter((e) => e.who === 'outsider')).toEqual([]);
  }, 20_000);
});
