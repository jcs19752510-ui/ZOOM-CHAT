import net from 'node:net';
import path from 'node:path';
import { expect, test as base, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { loadConfig } from '../apps/server/src/config';
import { createLogger } from '../apps/server/src/logger';
import { startServer, type RunningServer } from '../apps/server/src/server';

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.listen(0, () => {
      const port = (s.address() as net.AddressInfo).port;
      s.close(() => resolve(port));
    });
    s.on('error', reject);
  });
}

/** 설정이 다른 서버를 따로 띄운다(정원 2명, 재시작 시험 등). 같은 포트로 다시 띄울 수도 있다. */
export async function extraServer(overrides: Record<string, string> = {}, port?: number, logLines?: string[]): Promise<{ server: RunningServer; base: string; port: number }> {
  const p = port ?? (await freePort());
  const origin = `http://localhost:${p}`;
  const config = loadConfig({
    NODE_ENV: 'test',
    PORT: String(p),
    ALLOWED_ORIGINS: origin,
    SESSION_SECRET: 'e2e-secret-e2e-secret-e2e-secret-e2e-secret',
    STUN_URLS: '',
    WEB_DIST: path.resolve(process.cwd(), 'apps/web/dist'),
    RATE_LIMIT_SCALE: '1000',
    LOG_LEVEL: 'silent',
    ...overrides,
  } as NodeJS.ProcessEnv);
  // logLines는 로그 내용을 시험에서 확인할 때만 쓴다
  const server = await startServer(config, logLines ? createLogger('info', { write: (l: string) => void logLines.push(l) }) : createLogger('silent'));
  return { server, base: origin, port: p };
}

export interface Env {
  server: RunningServer;
  base: string;
}

export const test = base.extend<object, { env: Env }>({
  env: [
    // eslint-disable-next-line no-empty-pattern -- Playwright 픽스처는 첫 인자로 구조 분해 패턴을 요구한다
    async ({}, use) => {
      const port = await freePort();
      const origin = `http://localhost:${port}`;
      const config = loadConfig({
        NODE_ENV: 'test',
        PORT: String(port),
        ALLOWED_ORIGINS: origin,
        SESSION_SECRET: 'e2e-secret-e2e-secret-e2e-secret-e2e-secret',
        STUN_URLS: '',
        WEB_DIST: path.resolve(process.cwd(), 'apps/web/dist'),
        RATE_LIMIT_SCALE: '1000',
        LOG_LEVEL: 'silent',
        RECONNECT_GRACE_SEC: '20',
      } as NodeJS.ProcessEnv);
      const server = await startServer(config, createLogger('silent'));
      await use({ server, base: origin });
      await server.close();
    },
    { scope: 'worker' },
  ],
});
export { expect };

export interface Member {
  page: Page;
  context: BrowserContext;
}

const contexts: BrowserContext[] = [];
export async function closeAll(): Promise<void> {
  while (contexts.length) await contexts.pop()?.close();
}

/** 시험용: 페이지가 만드는 모든 RTCPeerConnection을 window.__pcs에 모아 송신 파라미터 등을 읽을 수 있게 한다. */
export const CAPTURE_PCS = (): void => {
  const Orig = window.RTCPeerConnection;
  const pcs: RTCPeerConnection[] = [];
  (window as unknown as { __pcs: RTCPeerConnection[] }).__pcs = pcs;
  const Wrapped = function (this: unknown, ...args: ConstructorParameters<typeof RTCPeerConnection>) {
    const pc = new Orig(...args);
    pcs.push(pc);
    return pc;
  } as unknown as typeof RTCPeerConnection;
  Wrapped.prototype = Orig.prototype;
  window.RTCPeerConnection = Wrapped;
};

async function newMember(browser: Browser, viewport?: { width: number; height: number }, initScript?: () => void): Promise<Member> {
  const context = await browser.newContext({ permissions: ['camera', 'microphone'], ...(viewport ? { viewport } : {}) });
  if (initScript) await context.addInitScript(initScript);
  contexts.push(context);
  return { context, page: await context.newPage() };
}

/** 호스트: 랜딩에서 닉네임 입력 → 새 회의 → 대기실 → 입장 */
export async function hostMeeting(browser: Browser, env: Env, nickname = '호스트', opts: { password?: string; viewport?: { width: number; height: number }; initScript?: () => void } = {}): Promise<Member & { url: string; roomId: string }> {
  const m = await newMember(browser, opts.viewport, opts.initScript);
  await m.page.goto(env.base);
  await m.page.getByTestId('nickname').fill(nickname);
  if (opts.password) {
    await m.page.getByTestId('use-password').check();
    await m.page.getByTestId('room-password').fill(opts.password);
  }
  await m.page.getByTestId('create-room').click();
  await m.page.waitForURL(/\/r\/[A-Za-z0-9_-]{22}$/);
  const url = m.page.url();
  const roomId = url.split('/r/')[1] ?? '';
  await m.page.getByTestId('join-button').click();
  await m.page.getByTestId('room').waitFor();
  return { ...m, url, roomId };
}

/** 참가자: 링크 열기 → 닉네임 입력 → 입장 (대기실에서 권한은 자동 허용) */
export async function guestMeeting(browser: Browser, url: string, nickname: string, opts: { password?: string; viewport?: { width: number; height: number } } = {}): Promise<Member> {
  const m = await newMember(browser, opts.viewport);
  await m.page.goto(url);
  await m.page.getByTestId('lobby-nickname').fill(nickname);
  if (opts.password) await m.page.getByTestId('lobby-password').fill(opts.password);
  await m.page.getByTestId('join-button').click();
  await m.page.getByTestId('room').waitFor();
  return m;
}

/** 다른 참가자의 영상(비디오+오디오 트랙)이 실제로 재생되는지 기다린다 */
export async function expectRemoteMedia(page: Page, count: number, timeout = 40_000): Promise<void> {
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          [...document.querySelectorAll<HTMLVideoElement>('video[data-peer-id][data-kind="camera"]')]
            .filter((v) => !v.muted)
            .map((v) => {
              const s = v.srcObject as MediaStream | null;
              return !!s && s.getVideoTracks().some((t) => t.readyState === 'live') && s.getAudioTracks().some((t) => t.readyState === 'live') && v.videoWidth > 0;
            })
            .filter(Boolean).length,
        ),
      { timeout, message: `원격 영상 ${count}개` },
    )
    .toBe(count);
}
