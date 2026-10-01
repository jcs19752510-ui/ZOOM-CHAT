import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import type { Page } from '@playwright/test';
import { closeAll, expect, expectRemoteMedia, extraServer, guestMeeting, hostMeeting, test } from './fixtures';

const TURN_PORT = 34780;
const hasTurn = fs.existsSync('/usr/bin/turnserver');

let turn: ChildProcess | undefined;
const startTurn = async (secret: string): Promise<void> => {
  turn = spawn('turnserver', [
    '-n',
    '--no-cli',
    '--use-auth-secret',
    `--static-auth-secret=${secret}`,
    '--realm=meetlite.test',
    '--listening-ip=127.0.0.1',
    '--relay-ip=127.0.0.1',
    `--listening-port=${TURN_PORT}`,
    '--min-port=49300',
    '--max-port=49400',
    '--no-tls',
    '--no-dtls',
    '--allow-loopback-peers',
    '--fingerprint',
    '--simple-log',
    '--log-file=/dev/null',
  ]);
  await new Promise((r) => setTimeout(r, 1200));
  if (turn.exitCode !== null) throw new Error('turnserver가 시작되지 않았습니다');
};
const stopTurn = (): void => {
  turn?.kill('SIGKILL');
  turn = undefined;
};

/** 시험용: 모든 연결을 릴레이(TURN) 경유로만 만들도록 강제하고 PC를 수집한다. */
const FORCE_RELAY = (): void => {
  const Orig = window.RTCPeerConnection;
  const pcs: RTCPeerConnection[] = [];
  (window as unknown as { __pcs: RTCPeerConnection[] }).__pcs = pcs;
  const Wrapped = function (this: unknown, cfg?: RTCConfiguration) {
    const pc = new Orig({ ...(cfg ?? {}), iceTransportPolicy: 'relay' });
    pcs.push(pc);
    return pc;
  } as unknown as typeof RTCPeerConnection;
  Wrapped.prototype = Orig.prototype;
  window.RTCPeerConnection = Wrapped;
};

const selectedTypes = (page: Page): Promise<string[]> =>
  page.evaluate(async () => {
    const pcs = (window as unknown as { __pcs: RTCPeerConnection[] }).__pcs;
    const out: string[] = [];
    for (const pc of pcs) {
      const stats = await pc.getStats();
      const byId = new Map<string, Record<string, unknown>>();
      stats.forEach((r) => byId.set(r.id, r as unknown as Record<string, unknown>));
      stats.forEach((r) => {
        const s = r as unknown as Record<string, unknown>;
        if (s.type === 'candidate-pair' && s.state === 'succeeded' && s.nominated) {
          const local = byId.get(String(s.localCandidateId));
          out.push(String(local?.candidateType));
        }
      });
    }
    return out;
  });

test.describe('TURN 경유 (SEC-09)', () => {
  test.skip(!hasTurn, 'turnserver(coturn)가 설치되어 있지 않아 건너뜀');
  test.afterEach(async () => {
    await closeAll();
    stopTurn();
  });

  test('IT-21 [SEC-09,FR-07] 서버가 발급한 HMAC 임시 자격증명으로 TURN 릴레이 연결이 되고 영상·오디오가 흐른다', async ({ browser }) => {
    const secret = 'turn-shared-secret-turn-shared-secret';
    await startTurn(secret);
    const s = await extraServer({ TURN_URLS: `turn:127.0.0.1:${TURN_PORT}?transport=udp`, TURN_SECRET: secret, TURN_TTL_SEC: '3600' });
    try {
      const env = { server: s.server, base: s.base };
      const host = await hostMeeting(browser, env, '호스트', { initScript: FORCE_RELAY });
      const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
      await ctx.addInitScript(FORCE_RELAY);
      const page = await ctx.newPage();
      await page.goto(host.url);
      await page.getByTestId('lobby-nickname').fill('릴레이');
      await page.getByTestId('join-button').click();
      await page.getByTestId('room').waitFor();
      await expectRemoteMedia(host.page, 1, 40_000);
      await expectRemoteMedia(page, 1, 40_000);
      // 실제로 릴레이 후보가 선택되었다
      expect(await selectedTypes(host.page)).toEqual(['relay']);
      expect(await selectedTypes(page)).toEqual(['relay']);
      await ctx.close();
    } finally {
      await s.server.close();
    }
  });

  test('IT-46 [NFR-15,KPI-05,SEC-09] TURN 릴레이로만 연결되면 각 참가자가 relay를 보고하고 direct 보고는 없다', async ({ browser }) => {
    const secret = 'turn-shared-secret-turn-shared-secret';
    await startTurn(secret);
    const lines: string[] = [];
    const s = await extraServer({ TURN_URLS: `turn:127.0.0.1:${TURN_PORT}?transport=udp`, TURN_SECRET: secret, TURN_TTL_SEC: '3600' }, undefined, lines);
    try {
      const env = { server: s.server, base: s.base };
      const host = await hostMeeting(browser, env, '호스트', { initScript: FORCE_RELAY });
      const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
      await ctx.addInitScript(FORCE_RELAY);
      const page = await ctx.newPage();
      await page.goto(host.url);
      await page.getByTestId('lobby-nickname').fill('릴레이');
      await page.getByTestId('join-button').click();
      await page.getByTestId('room').waitFor();
      await expectRemoteMedia(host.page, 1, 40_000);
      await expectRemoteMedia(page, 1, 40_000);
      const paths = (): unknown[] => lines.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.msg === 'peer path').map((l) => l.path);
      await expect.poll(() => paths().length, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
      await page.waitForTimeout(2000);
      expect(paths()).toEqual(['relay', 'relay']);
      await ctx.close();
    } finally {
      await s.server.close();
    }
  });

  test('IT-22 [SEC-09] TURN 공유 비밀이 다르면(자격증명 위조·불일치) 릴레이 연결이 만들어지지 않는다', async ({ browser }) => {
    await startTurn('turn-shared-secret-turn-shared-secret');
    const s = await extraServer({ TURN_URLS: `turn:127.0.0.1:${TURN_PORT}?transport=udp`, TURN_SECRET: 'a-different-secret-a-different-secret' });
    try {
      const env = { server: s.server, base: s.base };
      const host = await hostMeeting(browser, env, '호스트', { initScript: FORCE_RELAY });
      const guest = await guestMeeting(browser, host.url, '불일치');
      await guest.context.addInitScript(FORCE_RELAY);
      await host.page.waitForTimeout(8000);
      const connected = await host.page.evaluate(() => (window as unknown as { __pcs: RTCPeerConnection[] }).__pcs.some((pc) => pc.connectionState === 'connected'));
      expect(connected).toBe(false);
    } finally {
      await s.server.close();
    }
  });
});
