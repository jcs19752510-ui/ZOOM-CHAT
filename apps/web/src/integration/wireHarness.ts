// 7단계(업무 단위 통합) 시험 공용 도구. 실제 서버(apps/server)를 같은 프로세스에서 띄우고 웹의 실제 SignalingClient·MeetingController를 붙인다.
// 화면 문구는 쓰지 않는다(TC-213): 모든 문구 비교는 strings.ts의 S를 통해서만 한다.
import { loadConfig, type Config } from '../../../server/src/config';
import { createLogger } from '../../../server/src/logger';
import { startServer, type RunningServer } from '../../../server/src/server';
import type { LocalMedia } from '../lib/media';
import type { MeetingController, MeetingState } from '../state/MeetingController';

export const ORIGIN = 'http://localhost:5173';
export const SECRET = 'wire-test-secret-wire-test-secret-1234';

export const baseEnv: NodeJS.ProcessEnv = { NODE_ENV: 'test', PORT: '0', ALLOWED_ORIGINS: ORIGIN, SESSION_SECRET: SECRET, LOG_LEVEL: 'silent', RATE_LIMIT_SCALE: '100' };

export function makeConfig(over: Record<string, string> = {}): Config {
  return loadConfig({ ...baseEnv, ...over });
}

export async function boot(over: Record<string, string> = {}, logLines?: string[]): Promise<RunningServer> {
  const logger = logLines ? createLogger('info', { write: (l: string) => void logLines.push(l) }) : createLogger('silent');
  return startServer(makeConfig(over), logger);
}

/** 사용 가능한 빈 포트를 하나 얻는다(admin 리스너·재시작 시험용). */
export async function freePort(): Promise<number> {
  const net = await import('node:net');
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as { port: number };
      s.close(() => resolve(port));
    });
  });
}

/** 장치 없는 LocalMedia 대역(컨트롤러가 쓰는 표면만). */
export function fakeMedia(): LocalMedia {
  const m = {
    audio: null,
    video: null,
    micOn: true,
    camOn: true,
    setMic(on: boolean): void {
      m.micOn = on;
    },
    stopAll(): void {},
    start: () => Promise.resolve(),
    setCamera: () => Promise.resolve(true),
    switchDevice: () => Promise.resolve(true),
    reconcile: () => ({ audioLost: false, videoLost: false }),
  };
  return m as unknown as LocalMedia;
}

export async function until(pred: () => boolean, what: string, ms = 5000): Promise<void> {
  const t0 = Date.now();
  while (!pred()) {
    if (Date.now() - t0 > ms) throw new Error(`timeout waiting for: ${what}`);
    await new Promise((r) => setTimeout(r, 15));
  }
}

export const snap = (c: MeetingController): MeetingState => c.getSnapshot();
export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** 상대 URL 호출(api.ts)이 실제 서버로 가게 한다. */
export function fetchTo(base: string): typeof fetch {
  const real = globalThis.fetch.bind(globalThis);
  return ((input: RequestInfo | URL, init?: RequestInit) => real(typeof input === 'string' && input.startsWith('/') ? `${base}${input}` : input, init)) as typeof fetch;
}
