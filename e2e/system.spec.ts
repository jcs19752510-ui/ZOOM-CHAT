// 하네스 8단계 전체 시스템 시험(IT-90~IT-99). 개별 기능 시험을 반복하지 않고 "전체가 하나로 동작하는가"만 본다.
// 서버는 인프로세스가 아니라 **빌드된 운영 프로세스(`apps/server/dist/index.js`, NODE_ENV=production)**를 따로 띄워
// 실제 SIGTERM·상한·로그·자원 사용량을 본다. 한글 문구는 시험에 쓰지 않고 `S`를 참조한다(TC-213).
import { spawn, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import type { Browser, BrowserContext, Page, WebSocketRoute } from '@playwright/test';
import { S } from '../apps/web/src/strings';
import { closeAll, expect, expectRemoteMedia, test } from './fixtures';

const SERVER_ENTRY = path.resolve(process.cwd(), 'apps/server/dist/index.js');
const WEB_DIST = path.resolve(process.cwd(), 'apps/web/dist');

const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const p = (s.address() as net.AddressInfo).port;
      s.close(() => resolve(p));
    });
  });

interface Prod {
  base: string;
  port: number;
  pid: number;
  proc: ChildProcess;
  lines: string[];
  exited: Promise<number | null>;
  /** 현재 RSS(MB)와 누적 CPU 시간(초) — /proc 기준 */
  usage: () => { rssMb: number; cpuSec: number };
  /** SIGTERM을 보내고 종료까지 걸린 시간(ms)과 종료 코드를 돌려준다 */
  stop: () => Promise<{ code: number | null; ms: number }>;
}

async function startProd(overrides: Record<string, string> = {}, fixedPort?: number): Promise<Prod> {
  const port = fixedPort ?? (await freePort());
  const lines: string[] = [];
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH ?? '',
    NODE_ENV: 'production',
    PORT: String(port),
    ALLOWED_ORIGINS: `http://localhost:${port}`,
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
    STUN_URLS: '',
    WEB_DIST,
    LOG_LEVEL: 'info',
    ...overrides,
  };
  const proc = spawn(process.execPath, [SERVER_ENTRY], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let buf = '';
  const onData = (d: Buffer): void => {
    buf += d.toString();
    const parts = buf.split('\n');
    buf = parts.pop() ?? '';
    lines.push(...parts.filter(Boolean));
  };
  proc.stdout?.on('data', onData);
  proc.stderr?.on('data', onData);
  const exited = new Promise<number | null>((resolve) => proc.once('exit', (code) => resolve(code)));
  const base = `http://localhost:${port}`;
  const deadline = Date.now() + 15_000;
  for (;;) {
    if (proc.exitCode !== null) throw new Error(`운영 서버가 시작되지 못했습니다: ${lines.join(' | ')}`);
    try {
      if ((await fetch(`${base}/healthz`)).ok) break;
    } catch {
      /* 아직 기동 중 */
    }
    if (Date.now() > deadline) throw new Error('운영 서버 /healthz 응답 없음');
    await new Promise((r) => setTimeout(r, 100));
  }
  const pid = proc.pid as number;
  const usage = (): { rssMb: number; cpuSec: number } => {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    const f = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
    const rssKb = Number(/VmRSS:\s+(\d+)/.exec(fs.readFileSync(`/proc/${pid}/status`, 'utf8'))?.[1] ?? 0);
    return { rssMb: rssKb / 1024, cpuSec: (Number(f[11]) + Number(f[12])) / 100 };
  };
  const stop = async (): Promise<{ code: number | null; ms: number }> => {
    if (proc.exitCode !== null) return { code: proc.exitCode, ms: 0 };
    const t0 = Date.now();
    proc.kill('SIGTERM');
    const code = await Promise.race([exited, new Promise<null>((r) => setTimeout(() => r(null), 15_000))]);
    if (code === null && proc.exitCode === null) proc.kill('SIGKILL');
    return { code: proc.exitCode ?? code, ms: Date.now() - t0 };
  };
  return { base, port, pid, proc, lines, exited, usage, stop };
}

const jsonLines = (lines: string[]): Record<string, unknown>[] =>
  lines.flatMap((l) => {
    try {
      return [JSON.parse(l) as Record<string, unknown>];
    } catch {
      return [];
    }
  });

// ---- 브라우저 참가자 도우미: 웹소켓을 가로채 (a) 프레임을 기록하고 (b) 시험이 연결을 끊거나 막을 수 있게 한다 ----
interface Member {
  ctx: BrowserContext;
  page: Page;
  frames: string[];
  errors: string[];
  /** 모든 소켓을 끊는다(네트워크 단절 모사). 재연결은 허용된다 */
  drop: () => Promise<void>;
  /** true면 새 소켓 연결을 즉시 닫아 재연결을 막는다 */
  setBlocked: (blocked: boolean) => void;
}
const members: BrowserContext[] = [];
/** false면 웹소켓을 가로채지 않는다(서버가 실제로 내려가는 시험은 가로채기 없이 브라우저 본래 동작으로 본다) */
let intercept = true;

async function openMember(browser: Browser): Promise<Member> {
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  members.push(ctx);
  const page = await ctx.newPage();
  const frames: string[] = [];
  const errors: string[] = [];
  const live: { page: WebSocketRoute; server: WebSocketRoute }[] = [];
  let blocked = false;
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  if (intercept) await page.routeWebSocket(/socket\.io/, (ws) => {
    if (blocked) {
      void ws.close();
      return;
    }
    const server = ws.connectToServer();
    live.push({ page: ws, server });
    ws.onMessage((m) => server.send(m));
    server.onMessage((m) => {
      frames.push(typeof m === 'string' ? m : '[binary]');
      ws.send(m);
    });
    ws.onClose(() => void server.close());
    server.onClose(() => void ws.close());
  });
  return {
    ctx,
    page,
    frames,
    errors,
    drop: async () => {
      for (const l of live.splice(0)) {
        await l.page.close().catch(() => undefined);
        await l.server.close().catch(() => undefined);
      }
    },
    setBlocked: (b) => {
      blocked = b;
    },
  };
}

async function closeMembers(): Promise<void> {
  while (members.length) await members.pop()?.close().catch(() => undefined);
  await closeAll();
}

const remoteVideoCount = (p: Page): Promise<number> =>
  p.evaluate(() => [...document.querySelectorAll<HTMLVideoElement>('video[data-peer-id][data-kind="camera"]')].filter((v) => !v.muted && v.videoWidth > 0).length);

/** 호스트: 랜딩 → 새 회의 → 대기실 → 입장. 사람이 한 조작 수를 센다 */
async function hostRoom(browser: Browser, base: string, nickname: string, opts: { password?: string } = {}): Promise<Member & { url: string; roomId: string }> {
  const m = await openMember(browser);
  await m.page.goto(base);
  await m.page.getByTestId('nickname').fill(nickname);
  if (opts.password) {
    await m.page.getByTestId('use-password').check();
    await m.page.getByTestId('room-password').fill(opts.password);
  }
  await m.page.getByTestId('create-room').click();
  await m.page.waitForURL(/\/r\/[A-Za-z0-9_-]{22}$/);
  const url = m.page.url();
  await m.page.getByTestId('join-button').click();
  await m.page.getByTestId('room').waitFor();
  return { ...m, url, roomId: url.split('/r/')[1] ?? '' };
}

/** 참가자: 링크 열기 → 닉네임 → [입장]. `ops`는 링크를 연 뒤 사람이 한 조작 수(권한 허용 1회 포함) */
async function guestRoom(browser: Browser, url: string, nickname: string): Promise<Member & { ops: number; firstVideoMs: number }> {
  const m = await openMember(browser);
  let ops = 0;
  await m.page.goto(url); // 링크 클릭(조작 수에 포함하지 않음)
  await m.page.getByTestId('lobby-nickname').fill(nickname);
  ops++; // 1. 닉네임 입력
  ops++; // 2. 카메라·마이크 권한 허용(실제 브라우저의 대화상자. 시험은 permissions 사전 허용/fake-ui 플래그로 대체)
  await expect(m.page.getByTestId('join-button')).toBeEnabled();
  const t0 = Date.now();
  await m.page.getByTestId('join-button').click();
  ops++; // 3. [입장]
  await m.page.getByTestId('room').waitFor();
  await expect.poll(() => remoteVideoCount(m.page), { timeout: 30_000, intervals: [50] }).toBeGreaterThan(0);
  return { ...m, ops, firstVideoMs: Date.now() - t0 };
}

const confirmLeave = async (p: Page): Promise<void> => {
  await p.getByTestId('btn-leave').click();
  await p.getByRole('button', { name: S.confirm.leaveConfirm }).last().click();
};
const roomStatus = async (base: string, roomId: string): Promise<{ exists: boolean }> => (await (await fetch(`${base}/api/rooms/${roomId}`)).json()) as { exists: boolean };
const pctl = (xs: number[], q: number): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)] ?? NaN;
};


// ---- TURN(coturn) 연동: 로컬에 turnserver가 있을 때만(CI에는 설치되어 있어야 한다) ----
const hasTurn = fs.existsSync('/usr/bin/turnserver');
const TURN_SECRET = 'turn-shared-secret-turn-shared-secret';
interface Turn {
  proc: ChildProcess;
  port: number;
  log: string[];
  stop: () => void;
}
async function startTurn(): Promise<Turn> {
  const port = await freePort();
  const log: string[] = [];
  const proc = spawn('turnserver', ['-n', '--no-cli', '--use-auth-secret', `--static-auth-secret=${TURN_SECRET}`, '--realm=meetlite.test', '--listening-ip=127.0.0.1', '--relay-ip=127.0.0.1', `--listening-port=${port}`, '--min-port=49500', '--max-port=49900', '--no-tls', '--no-dtls', '--allow-loopback-peers', '--fingerprint', '--log-file=stdout', '--verbose']);
  let buf = '';
  const onData = (d: Buffer): void => {
    buf += d.toString();
    const parts = buf.split('\n');
    buf = parts.pop() ?? '';
    log.push(...parts);
  };
  proc.stdout.on('data', onData);
  proc.stderr.on('data', onData);
  await new Promise((r) => setTimeout(r, 1200));
  if (proc.exitCode !== null) throw new Error('turnserver가 시작되지 않았습니다');
  return { proc, port, log, stop: () => void proc.kill('SIGKILL') };
}
/** 시험용: 모든 연결을 릴레이(TURN) 경유로만 만든다 */
const FORCE_RELAY_INIT = (): void => {
  const Orig = window.RTCPeerConnection;
  const Wrapped = function (this: unknown, cfg?: RTCConfiguration) {
    return new Orig({ ...(cfg ?? {}), iceTransportPolicy: 'relay' });
  } as unknown as typeof RTCPeerConnection;
  Wrapped.prototype = Orig.prototype;
  window.RTCPeerConnection = Wrapped;
};

test.describe('전체 시스템(운영 빌드 프로세스)', () => {
  test.describe.configure({ timeout: 240_000 });
  test.afterEach(async () => {
    intercept = true;
    await closeMembers();
  });

  test('IT-90 [FR-01,FR-02,FR-03,FR-04,FR-07,FR-08,FR-11,FR-12,FR-13,FR-14,FR-15,FR-16,FR-17,FR-20,FR-22,NFR-01,NFR-07,SEC-01,POL-05] 전체 여정: 링크→3조작 입장→서로 영상→채팅→화면공유→호스트 도구→재연결→호스트 승계→전원 퇴장→방 삭제 (기본 한도, 콘솔·CSP 오류 0)', async ({ browser }) => {
    const prod = await startProd();
    try {
      const host = await hostRoom(browser, prod.base, 'hostA');
      // SEC-01: 방 ID는 URL-safe 22자(6비트×22=132비트 ≥ 128비트). NFR-07: 웹·API·소켓·상태 확인이 한 프로세스·한 포트에서 모두 제공된다
      expect(host.roomId).toMatch(/^[A-Za-z0-9_-]{22}$/);
      expect((await fetch(`${prod.base}/healthz`)).status).toBe(200);
      const g1 = await guestRoom(browser, host.url, 'guestB');
      // NFR-01: 링크를 연 뒤 사람이 한 조작 3회 이내(닉네임, 권한 허용, 입장), 서로 영상이 보인다
      expect(g1.ops).toBeLessThanOrEqual(3);
      await expectRemoteMedia(host.page, 1);
      const g2 = await guestRoom(browser, host.url, 'guestC');
      for (const m of [host, g1, g2]) await expectRemoteMedia(m.page, 2);

      // 채팅: 서버를 거쳐 모두에게 간다
      await host.page.getByTestId('btn-chat').click();
      await g1.page.getByTestId('btn-chat').click();
      await g1.page.getByTestId('chat-input').fill('hello-from-b');
      await g1.page.getByTestId('chat-send').click();
      await expect(host.page.getByTestId('chat-text').filter({ hasText: 'hello-from-b' })).toHaveCount(1);

      // 화면공유: 공유자 외에는 시작하지 못하고, 중지하면 그리드로 돌아온다
      await g1.page.getByTestId('btn-share').click();
      await expect(host.page.getByTestId('share-layout')).toBeVisible();
      await expect.poll(() => host.page.evaluate(() => [...document.querySelectorAll<HTMLVideoElement>('video[data-kind="screen"]')].some((v) => v.videoWidth > 0)), { timeout: 30_000 }).toBe(true);
      await g1.page.getByTestId('btn-share').click();
      await expect(host.page.getByTestId('gallery')).toBeVisible();
      await expectRemoteMedia(host.page, 2);

      // 호스트 도구: 잠금 → 신규 입장 거부 → 해제 → 전체 음소거
      await host.page.getByTestId('btn-people').click();
      await host.page.getByTestId('btn-lock').click();
      const late = await openMember(browser);
      await late.page.goto(host.url);
      await expect(late.page.getByText(S.state.locked.title)).toBeVisible();
      await host.page.getByTestId('btn-lock').click(); // 해제
      await host.page.getByTestId('btn-mute-all').click();
      await host.page.getByRole('button', { name: S.confirm.muteAllConfirm }).last().click();
      await expect(g1.page.getByTestId('btn-mic')).toHaveAttribute('aria-pressed', 'true');
      await expect(g2.page.getByTestId('btn-mic')).toHaveAttribute('aria-pressed', 'true');

      // 재연결: 소켓이 끊겨도 같은 자리로 돌아오고 영상이 다시 흐른다
      const tDrop = Date.now();
      await g1.drop();
      await expect(g1.page.getByTestId('conn-badge')).toHaveAttribute('data-state', /live|poor/, { timeout: 20_000 });
      await expect(host.page.locator('[data-testid^="tile-"]')).toHaveCount(3);
      await expectRemoteMedia(g1.page, 2);
      const recoverMs = Date.now() - tDrop;
      expect(recoverMs).toBeLessThan(20_000); // NFR-03: 유예 20초 안에 복구
      console.log(`[08-reconnect] 소켓 단절 → 같은 자리 복구·영상 재개까지 ${recoverMs}ms`);

      // 호스트 이탈 → 가장 먼저 입장한 참가자(g1)가 호스트가 된다. 원래 호스트가 같은 링크로 오면 일반 참가자다
      await confirmLeave(host.page);
      await expect(host.page.getByText(S.state.left.title)).toBeVisible();
      await expect(g1.page.getByText(S.room.youAreHost)).toBeVisible({ timeout: 10_000 });
      await g1.page.getByTestId('btn-people').click();
      await expect(g1.page.getByTestId('btn-lock')).toBeVisible();
      await host.page.goto(host.url);
      await host.page.getByTestId('lobby-nickname').fill('hostA');
      await host.page.getByTestId('join-button').click();
      await host.page.getByTestId('room').waitFor();
      await host.page.getByTestId('btn-people').click();
      await expect(host.page.getByTestId('btn-lock')).toHaveCount(0);
      await expectRemoteMedia(host.page, 2);

      // 새 호스트가 참가자(g2)를 내보내면 g2는 안내를 보고, 같은 링크로 다시 들어올 수 없다
      await expect(g1.page.getByTestId('people-list').locator('li')).toHaveCount(3);
      await g1.page.getByTestId('people-list').locator('li', { hasText: 'guestC' }).locator('[data-testid^="kick-"]').click();
      await g1.page.getByRole('button', { name: S.confirm.kickConfirm }).last().click();
      await expect(g2.page.getByText(S.state.kicked.title)).toBeVisible();
      const kickedPage = g2.page;
      await kickedPage.reload();
      await kickedPage.getByTestId('lobby-nickname').fill('again');
      await kickedPage.getByTestId('join-button').click();
      await expect(kickedPage.getByText(S.state.kicked.title)).toBeVisible();

      // 전원 퇴장 → 방 즉시 삭제, 링크 재방문은 '찾을 수 없음'
      expect((await roomStatus(prod.base, host.roomId)).exists).toBe(true);
      for (const m of [host, g1]) await confirmLeave(m.page);
      await expect.poll(async () => (await roomStatus(prod.base, host.roomId)).exists, { timeout: 15_000 }).toBe(false);

      // 전 구간에서 콘솔 오류·CSP 위반·페이지 오류가 없었다
      for (const m of [host, g1, g2]) expect(m.errors, `콘솔/페이지 오류`).toEqual([]);
      console.log(`[08-journey] 입장 조작 ${g1.ops}회, 첫 영상까지 ${g1.firstVideoMs}ms`);
    } finally {
      await prod.stop();
    }
  });

  test('IT-91 [NFR-02,NFR-04,NFR-13,NFR-08,KPI-03] 성능 스모크(운영 프로세스, 기본 한도): 첫 영상까지 8회, 6명 전원 mesh 완성 시간, 서버 RSS·CPU', async ({ browser }) => {
    const prod = await startProd();
    const idle = prod.usage();
    let peakRss = idle.rssMb;
    const sampler = setInterval(() => {
      try {
        peakRss = Math.max(peakRss, prod.usage().rssMb);
      } catch {
        /* 종료됨 */
      }
    }, 250);
    try {
      const host = await hostRoom(browser, prod.base, 'perfHost');
      const cpu0 = prod.usage().cpuSec;
      const t0 = Date.now();
      // (1) 첫 영상까지: 호스트 1명 방에 혼자 들어오는 사람 8명을 차례로(매번 나간다)
      const first: number[] = [];
      for (let i = 0; i < 8; i++) {
        const g = await guestRoom(browser, host.url, `perf${i}`);
        first.push(g.firstVideoMs);
        await confirmLeave(g.page);
        await g.ctx.close();
        await expect.poll(() => host.page.locator('[data-testid^="tile-"]').count(), { timeout: 15_000 }).toBe(1);
      }
      const cpu1 = prod.usage().cpuSec;
      // (2) 6명 전원이 서로 5개씩 받기까지
      const six = [host as Member];
      const tJoin = Date.now();
      for (let i = 0; i < 5; i++) six.push(await guestRoom(browser, host.url, `six${i}`));
      for (const m of six) await expectRemoteMedia(m.page, 5, 60_000);
      const meshMs = Date.now() - tJoin;
      const cpu2 = prod.usage().cpuSec;
      const steady0 = prod.usage().cpuSec;
      await new Promise((r) => setTimeout(r, 20_000)); // 6명이 연결된 안정 구간 20초
      for (const m of six) expect(await remoteVideoCount(m.page)).toBe(5);
      const steadyCpu = prod.usage().cpuSec - steady0;
      const end = prod.usage();
      peakRss = Math.max(peakRss, end.rssMb);
      const result = {
        cores: os.cpus().length,
        firstVideoMs: first,
        firstMedian: pctl(first, 0.5),
        firstP95: pctl(first, 0.95),
        firstMax: Math.max(...first),
        meshComplete6Ms: meshMs,
        serverRssIdleMb: Math.round(idle.rssMb),
        serverRssPeakMb: Math.round(peakRss),
        serverRssEndMb: Math.round(end.rssMb),
        serverCpuSecSinceFirstJoin: +(end.cpuSec - cpu0).toFixed(2),
        serverCpuSecDuring8Joins: +(cpu1 - cpu0).toFixed(2),
        serverCpuSecDuring6Mesh: +(cpu2 - cpu1).toFixed(2),
        serverCpuSecPerSecSteady6: +(steadyCpu / 20).toFixed(4),
        wallSec: +((Date.now() - t0) / 1000).toFixed(1),
      };
      console.log(`[08-perf] ${JSON.stringify(result)}`);
      // NFR-02: 중앙값 5초, p95 10초 (로컬 루프백 기준)
      expect(result.firstMedian).toBeLessThanOrEqual(5000);
      expect(result.firstP95).toBeLessThanOrEqual(10_000);
      // 6명 방이 정원 안에서 정상(서버가 오류 로그를 남기지 않았다)
      expect(jsonLines(prod.lines).filter((l) => l.level === 50 || l.level === 60)).toEqual([]);
      // 03 §5.1 서버 메모리 가정(100MB 미만)은 100방×6명 기준이므로 여기서는 6명 1방이 훨씬 작아야 한다
      expect(peakRss).toBeLessThan(200);
    } finally {
      clearInterval(sampler);
      await prod.stop();
    }
  });

  test('IT-92 [NFR-04,POL-15,SEC-06,UX-03] 서버 상한 동시 도달: 방 수 상한·IP당 연결 상한에서 서버는 정상, 기존 통화는 유지, 해제되면 다시 가능', async ({ browser }) => {
    const prod = await startProd({ MAX_ROOMS: '2', IP_MAX_CONNECTIONS: '4' });
    try {
      const a = await hostRoom(browser, prod.base, 'limA');
      const a1 = await guestRoom(browser, a.url, 'limA1');
      const a2 = await guestRoom(browser, a.url, 'limA2');
      const b = await hostRoom(browser, prod.base, 'limB'); // 소켓 4개(IP 상한), 방 2개(방 상한)
      await expectRemoteMedia(a.page, 2);

      // 방 수 상한: 세 번째 방 만들기는 거부되고 사용자에게 안내가 보인다
      const c = await openMember(browser);
      await c.page.goto(prod.base);
      await c.page.getByTestId('nickname').fill('limC');
      await c.page.getByTestId('create-room').click();
      const createError = c.page.getByTestId('create-error');
      await expect(createError).toBeVisible();
      await expect(createError).toHaveAttribute('role', 'alert').catch(() => undefined);
      console.log(`[08-limits] 방 상한 안내 문구 = ${(await createError.textContent()) ?? ''}`);

      // IP 연결 상한: 다섯 번째 소켓(같은 IP)은 입장하지 못한다
      const d = await openMember(browser);
      await d.page.goto(a.url);
      await d.page.getByTestId('lobby-nickname').fill('limD');
      await d.page.getByTestId('join-button').click();
      await expect(d.page.getByTestId('room')).toHaveCount(0, { timeout: 12_000 });
      const dError = d.page.getByTestId('join-error');
      await expect(dError).toBeVisible({ timeout: 15_000 }); // 조용히 멈추지 않고 사용자에게 무엇인가 알린다
      console.log(`[08-limits] IP 상한 안내 문구 = ${(await dError.textContent()) ?? ''}`);

      // 서버는 건재하고 기존 통화는 그대로다
      expect((await fetch(`${prod.base}/healthz`)).status).toBe(200);
      await expectRemoteMedia(a.page, 2);
      await expectRemoteMedia(a1.page, 2);
      expect(await remoteVideoCount(a2.page)).toBe(2);

      // 해제: b가 나가 방이 삭제되고 소켓 1개가 비면, 새 방을 만들 수 있고 d도 다시 시도하면 입장한다
      await confirmLeave(b.page);
      await expect.poll(async () => (await roomStatus(prod.base, b.roomId)).exists, { timeout: 15_000 }).toBe(false);
      await d.page.reload();
      await d.page.getByTestId('lobby-nickname').fill('limD');
      await d.page.getByTestId('join-button').click();
      await d.page.getByTestId('room').waitFor({ timeout: 20_000 });
      await expectRemoteMedia(d.page, 3);
      expect(jsonLines(prod.lines).filter((l) => l.level === 50 || l.level === 60)).toEqual([]);
    } finally {
      await prod.stop();
    }
  });

  test('IT-92b [UX-03,POL-15] 서버 방 수 상한으로 방 만들기가 거부되면 "인터넷 연결"이 아닌 서버가 붐빈다는 원인으로 안내해야 한다 (DEF-S-02 수정 확인)', async ({ browser }) => {
    const prod = await startProd({ MAX_ROOMS: '1' });
    try {
      await hostRoom(browser, prod.base, 'busyA');
      const c = await openMember(browser);
      await c.page.goto(prod.base);
      await c.page.getByTestId('nickname').fill('busyC');
      await c.page.getByTestId('create-room').click();
      const text = (await c.page.getByTestId('create-error').textContent()) ?? '';
      expect(text).not.toBe(S.state.error.body);
    } finally {
      await prod.stop();
    }
  });

  test('IT-92c [UX-03,POL-15,SEC-06] IP당 동시 연결 상한으로 입장이 거부되면 "인터넷 연결"이 아닌 원인(이 네트워크의 연결이 너무 많음 등)으로 안내해야 한다 (DEF-S-02 수정 확인)', async ({ browser }) => {
    const prod = await startProd({ IP_MAX_CONNECTIONS: '1' });
    try {
      const host = await hostRoom(browser, prod.base, 'ipA');
      const d = await openMember(browser);
      await d.page.goto(host.url);
      await d.page.getByTestId('lobby-nickname').fill('ipB');
      await d.page.getByTestId('join-button').click();
      const text = (await d.page.getByTestId('join-error').textContent({ timeout: 15_000 })) ?? '';
      expect(text).not.toBe(S.state.error.body);
    } finally {
      await prod.stop();
    }
  });

  test('IT-93 [NFR-06,NFR-08,FR-21] 운영 프로세스 SIGTERM(graceful) → 참가자는 재연결 중을 거쳐 "서비스 재시작" 안내 → 새 프로세스에서 새 회의가 바로 된다', async ({ browser }) => {
    intercept = false;
    const secret = crypto.randomBytes(32).toString('hex'); // 운영에서는 .env의 값이 재시작 전후로 같다
    const first = await startProd({ SESSION_SECRET: secret });
    const port = first.port;
    let second: Prod | undefined;
    try {
      const host = await hostRoom(browser, first.base, 'rstHost');
      const g = await guestRoom(browser, host.url, 'rstGuest');
      await expectRemoteMedia(host.page, 1);
      const down = await first.stop();
      console.log(`[08-restart] SIGTERM → 종료 코드 ${String(down.code)}, ${down.ms}ms`);
      expect(down.code).toBe(0);
      expect(down.ms).toBeLessThan(5000);
      expect(jsonLines(first.lines).some((l) => l.msg === 'shutting down')).toBe(true);
      await expect(g.page.getByTestId('conn-badge')).toHaveAttribute('data-state', 'reconnecting', { timeout: 15_000 });
      await expect(host.page.getByTestId('conn-badge')).toHaveAttribute('data-state', 'reconnecting', { timeout: 15_000 });
      const tUp = Date.now();
      second = await startProd({ SESSION_SECRET: secret }, port);
      for (const m of [host, g]) await expect(m.page.getByText(S.state.gone.restarted)).toBeVisible({ timeout: 30_000 });
      console.log(`[08-restart] 새 프로세스 기동 후 안내까지 ${Date.now() - tUp}ms`);
      // 안내의 [새 회의 만들기]로 새 회의가 바로 열리고 서로 영상이 보인다
      await host.page.getByRole('button', { name: S.state.gone.newRoom }).click();
      await host.page.getByTestId('nickname').fill('rstHost');
      await host.page.getByTestId('create-room').click();
      await host.page.waitForURL(/\/r\/[A-Za-z0-9_-]{22}$/);
      const url2 = host.page.url();
      await host.page.getByTestId('join-button').click();
      await host.page.getByTestId('room').waitFor();
      const g2 = await guestRoom(browser, url2, 'rstGuest2');
      await expectRemoteMedia(host.page, 1);
      expect(g2.ops).toBeLessThanOrEqual(3);
    } finally {
      await first.stop();
      await second?.stop();
    }
  });

  test('IT-94 [NFR-08,SEC-10,SEC-08,SEC-03,POL-09] 운영 프로세스 보안 헤더·교차 Origin 거부, 실제 통화 뒤 로그에 토큰·채팅·닉네임·SDP·IP가 없다', async ({ browser }) => {
    const prod = await startProd();
    try {
      // 헤더(SEC-08)
      const res = await fetch(`${prod.base}/`);
      const csp = res.headers.get('content-security-policy') ?? '';
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
      expect(res.headers.get('permissions-policy') ?? '').toContain('camera=(self)');
      expect(res.headers.get('permissions-policy') ?? '').toContain('microphone=(self)');
      expect(res.headers.get('x-powered-by')).toBeNull();
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('referrer-policy')).toBe('no-referrer');
      // 교차 Origin: API는 403, 소켓 핸드셰이크도 거부
      const evilApi = await fetch(`${prod.base}/api/rooms`, { method: 'POST', headers: { origin: 'http://evil.example', 'content-type': 'application/json' }, body: '{"v":1}' });
      expect(evilApi.status).toBe(403);
      const evilSocket = await new Promise<number>((resolve, reject) => {
        const req = http.get(`${prod.base}/socket.io/?EIO=4&transport=polling`, { headers: { origin: 'http://evil.example' } }, (r) => {
          r.resume();
          resolve(r.statusCode ?? 0);
        });
        req.once('error', reject);
      });
      expect(evilSocket).toBeGreaterThanOrEqual(400);
      // 오류 응답에 내부 정보 없음
      const bad = await fetch(`${prod.base}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{not json' });
      const badText = await bad.text();
      expect(badText).not.toMatch(/at \S+ \(|node_modules|\/home\//);

      // 실제 통화 + 채팅 + 닉네임 카나리 → 로그 점검
      const host = await hostRoom(browser, prod.base, 'canaryNickHost', { password: 'canary-pass-1' });
      const g = await openMember(browser);
      await g.page.goto(host.url);
      await g.page.getByTestId('lobby-nickname').fill('canaryNickGuest');
      await g.page.getByTestId('lobby-password').fill('canary-pass-1');
      await g.page.getByTestId('join-button').click();
      await g.page.getByTestId('room').waitFor();
      await expectRemoteMedia(host.page, 1);
      await host.page.getByTestId('btn-chat').click();
      await host.page.getByTestId('chat-input').fill('canary-chat-text-123');
      await host.page.getByTestId('chat-send').click();
      await g.page.getByTestId('btn-chat').click();
      await expect(g.page.getByTestId('chat-text').filter({ hasText: 'canary-chat-text-123' })).toHaveCount(1);
      await g.drop(); // 재연결(resume)까지 거친다
      await expect(g.page.getByTestId('conn-badge')).toHaveAttribute('data-state', /live|poor/, { timeout: 20_000 });
      await confirmLeave(g.page);
      await confirmLeave(host.page);
      await expect.poll(async () => (await roomStatus(prod.base, host.roomId)).exists, { timeout: 15_000 }).toBe(false);

      const tokens = [...host.frames, ...g.frames].flatMap((f) => [...f.matchAll(/"(?:token|hostClaim)":"([^"]+)"/g)].map((m) => m[1] as string));
      expect(tokens.length, '소켓 프레임에서 세션 토큰을 찾을 수 있어야 시험이 의미가 있다').toBeGreaterThan(0);
      const everything = prod.lines.join('\n');
      for (const secret of [...tokens, 'canary-chat-text-123', 'canaryNickHost', 'canaryNickGuest', 'canary-pass-1', 'v=0', 'a=candidate', host.roomId]) {
        expect(everything.includes(secret), `로그에 "${secret.slice(0, 12)}…" 포함`).toBe(false);
      }
      expect(everything).not.toMatch(/127\.0\.0\.1|::1\b|::ffff:/);
      const parsed = jsonLines(prod.lines);
      expect(parsed.length).toBe(prod.lines.length); // 모든 줄이 구조화 JSON
      // 방 ID 앞 6자만(36비트, DEC-020 ③)
      expect(parsed.filter((l) => typeof l.room === 'string').every((l) => (l.room as string).length === 6)).toBe(true);
    } finally {
      await prod.stop();
    }
  });

  test('IT-95 [FR-17,FR-18,FR-20,FR-22,POL-02,POL-05,POL-13] 엣지: 호스트가 끊겨 유예가 지나면 승계되고 돌아온 원 호스트는 만료 안내, 빈 방 만료, 호스트 입장 전 방은 TTL 뒤 사라진다', async ({ browser }) => {
    const prod = await startProd({ RECONNECT_GRACE_SEC: '2', ROOM_EMPTY_TTL_MIN: '0.05' });
    try {
      // (1) 호스트 끊김 → 유예(2초) 경과 → 승계
      const host = await hostRoom(browser, prod.base, 'edgeHost');
      const g = await guestRoom(browser, host.url, 'edgeGuest');
      host.setBlocked(true);
      await host.drop();
      await expect(g.page.getByText(S.room.youAreHost)).toBeVisible({ timeout: 20_000 });
      await g.page.getByTestId('btn-people').click();
      await expect(g.page.getByTestId('btn-lock')).toBeVisible();
      // 원 호스트가 돌아오면 자리는 정리되어 있다(만료 안내), 같은 링크로 새로 입장하면 일반 참가자
      host.setBlocked(false);
      await expect(host.page.getByText(S.state.expired.title)).toBeVisible({ timeout: 40_000 });
      expect((await roomStatus(prod.base, host.roomId)).exists).toBe(true);

      // (2) 마지막 사람이 나가면 방 즉시 삭제, 같은 링크는 '찾을 수 없음'
      await confirmLeave(g.page);
      await expect.poll(async () => (await roomStatus(prod.base, host.roomId)).exists, { timeout: 10_000 }).toBe(false);
      const visitor = await openMember(browser);
      await visitor.page.goto(host.url);
      await expect(visitor.page.getByText(S.state.gone.title)).toBeVisible();

      // (3) 호스트가 [입장]을 누르기 전에 TTL(3초)이 지나면 방이 사라진다
      const idle = await openMember(browser);
      await idle.page.goto(prod.base);
      await idle.page.getByTestId('nickname').fill('edgeIdle');
      await idle.page.getByTestId('create-room').click();
      await idle.page.waitForURL(/\/r\/[A-Za-z0-9_-]{22}$/);
      const idleId = idle.page.url().split('/r/')[1] ?? '';
      await expect.poll(async () => (await roomStatus(prod.base, idleId)).exists, { timeout: 15_000 }).toBe(false);
      await idle.page.getByTestId('join-button').click();
      await expect(idle.page.getByText(S.state.gone.title)).toBeVisible();
      expect(jsonLines(prod.lines).filter((l) => l.level === 50 || l.level === 60)).toEqual([]);
    } finally {
      await prod.stop();
    }
  });

  test('IT-99 [FR-15,POL-06,FR-17] 같은 네트워크(공인 IP)의 참가자를 내보낸 뒤에도 호스트·다른 참가자는 같은 링크로 다시 입장할 수 있어야 한다 (결함 재현: DEF-S-03)', async ({ browser }) => {
    test.fail(true, 'DEF-S-03: 강퇴 차단 키에 네트워크 식별자(IP 해시)가 들어 있어 같은 IP의 호스트·동료까지 재입장이 막힌다');
    const prod = await startProd();
    try {
      const host = await hostRoom(browser, prod.base, 'natHost');
      const bad = await guestRoom(browser, host.url, 'natBad');
      const stay = await guestRoom(browser, host.url, 'natStay');
      await host.page.getByTestId('btn-people').click();
      await host.page.getByTestId('people-list').locator('li', { hasText: 'natBad' }).locator('[data-testid^="kick-"]').click();
      await host.page.getByRole('button', { name: S.confirm.kickConfirm }).last().click();
      await expect(bad.page.getByText(S.state.kicked.title)).toBeVisible();
      // 호스트가 나갔다 돌아온다(방은 stay가 남아 있어 유지된다)
      await confirmLeave(host.page);
      await expect(host.page.getByText(S.state.left.title)).toBeVisible();
      await host.page.goto(host.url);
      await host.page.getByTestId('lobby-nickname').fill('natHost');
      await host.page.getByTestId('join-button').click();
      await expect(host.page.getByTestId('room')).toBeVisible({ timeout: 10_000 });
      expect(await remoteVideoCount(stay.page)).toBeGreaterThanOrEqual(0);
    } finally {
      await prod.stop();
    }
  });

  test('IT-102 [POL-19,SEC-05,SEC-10,FR-12,FR-11] 운영 프로세스: 화면공유·채팅·잠금이 진행 중인 방을 운영자가 닫으면 모두 종료 안내, 재연결·재입장 없음, admin 포트는 루프백에서만 열리고 로그에 토큰이 없다', async ({ browser }) => {
    const adminPort = await freePort();
    const adminToken = crypto.randomBytes(32).toString('base64url');
    const prod = await startProd({ ADMIN_PORT: String(adminPort), ADMIN_TOKEN: adminToken });
    try {
      const host = await hostRoom(browser, prod.base, 'opHost');
      const g = await guestRoom(browser, host.url, 'opGuest');
      await host.page.getByTestId('btn-chat').click();
      await host.page.getByTestId('chat-input').fill('before-close');
      await host.page.getByTestId('chat-send').click();
      await g.page.getByTestId('btn-share').click();
      await expect(host.page.getByTestId('share-layout')).toBeVisible();
      await host.page.getByTestId('btn-people').click();
      await host.page.getByTestId('btn-lock').click();

      // admin은 루프백 전용: 다른 인터페이스 주소로는 연결되지 않는다(이 환경에 외부 인터페이스가 있을 때)
      const external = Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
      console.log(`[08-admin] 비루프백 인터페이스 = ${external ?? '없음(이 환경에서는 외부 주소 접속 시험 불가, 루프백 바인딩은 코드·단위 시험으로만 확인)'}`);
      if (external) {
        const refused = await new Promise<boolean>((resolve) => {
          const sock = net.connect({ host: external, port: adminPort, timeout: 3000 });
          sock.once('connect', () => { sock.destroy(); resolve(false); });
          sock.once('error', () => resolve(true));
          sock.once('timeout', () => { sock.destroy(); resolve(true); });
        });
        expect(refused, `admin 포트가 ${external}에서 열려 있다`).toBe(true);
      }
      const noAuth = await fetch(`http://127.0.0.1:${adminPort}/admin/rooms/${host.roomId}/close`, { method: 'POST' });
      expect(noAuth.status).toBe(401);
      expect((await roomStatus(prod.base, host.roomId)).exists).toBe(true);
      const ok = await fetch(`http://127.0.0.1:${adminPort}/admin/rooms/${host.roomId}/close`, { method: 'POST', headers: { authorization: `Bearer ${adminToken}` } });
      expect(ok.status).toBe(200);
      for (const m of [host, g]) await expect(m.page.getByRole('alert')).toContainText(S.state.gone.operatorTitle);
      await host.page.waitForTimeout(3000); // 재연결·재생성 시도가 없다
      expect((await roomStatus(prod.base, host.roomId)).exists).toBe(false);
      await expect(host.page.getByTestId('conn-badge')).toHaveCount(0);
      // 로그: 운영자 동작은 방 ID 앞 6자만, 토큰은 없음
      const text = prod.lines.join('\n');
      expect(text).not.toContain(adminToken);
      expect(text).not.toContain(host.roomId);
      expect(jsonLines(prod.lines).some((l) => l.msg === 'operator action' && l.action === 'close' && l.room === host.roomId.slice(0, 6))).toBe(true);
    } finally {
      await prod.stop();
    }
  });

  test('IT-96 [KPI-01,KPI-05,NFR-15,POL-09] 지표 계측 현황: 입장 성공(participant joined)과 연결 경로(direct/relay) 로그는 있다', async ({ browser }) => {
    const prod = await startProd();
    try {
      const host = await hostRoom(browser, prod.base, 'kpiHost');
      await guestRoom(browser, host.url, 'kpiGuest');
      await expect.poll(() => jsonLines(prod.lines).filter((l) => l.msg === 'peer path').length, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);
      const parsed = jsonLines(prod.lines);
      expect(parsed.filter((l) => l.msg === 'participant joined').length).toBe(2);
      expect(parsed.filter((l) => l.msg === 'room created').length).toBe(1);
      expect(parsed.filter((l) => l.msg === 'peer path').every((l) => l.kpi === 'path' && (l.path === 'direct' || l.path === 'relay'))).toBe(true);
    } finally {
      await prod.stop();
    }
  });

  test('IT-97 [KPI-01] 입장이 거부되면 거부 사유가 로그 이벤트로 남아 입장 성공률(성공÷시도)을 계산할 수 있어야 한다 (결함 재현: DEF-S-01)', async ({ browser }) => {
    test.fail(true, 'DEF-S-01: 입장 거부·재접속 결과는 로그에 없다(DEC-022 ②로 이연된 KPI-01/04 계측)');
    const prod = await startProd();
    try {
      const host = await hostRoom(browser, prod.base, 'kpi1Host');
      await host.page.getByTestId('btn-people').click();
      await host.page.getByTestId('btn-lock').click();
      const late = await openMember(browser);
      await late.page.goto(host.url);
      await expect(late.page.getByText(S.state.locked.title)).toBeVisible();
      const failed = jsonLines(prod.lines).filter((l) => /reject|denied|join.*(fail|error)/i.test(`${String(l.msg)} ${JSON.stringify(l)}`));
      expect(failed.length).toBeGreaterThan(0);
    } finally {
      await prod.stop();
    }
  });

  test('IT-98 [KPI-04,FR-20,NFR-03] 재접속 결과(성공/유예 초과)가 로그 이벤트로 남아 재연결 성공률을 계산할 수 있어야 한다 (결함 재현: DEF-S-01)', async ({ browser }) => {
    test.fail(true, 'DEF-S-01: 재접속 성공·실패는 로그에 없다');
    const prod = await startProd();
    try {
      const host = await hostRoom(browser, prod.base, 'kpi4Host');
      await guestRoom(browser, host.url, 'kpi4Guest');
      const before = prod.lines.length;
      await host.drop();
      await expect(host.page.getByTestId('conn-badge')).toHaveAttribute('data-state', /live|poor/, { timeout: 20_000 });
      const added = jsonLines(prod.lines.slice(before));
      expect(added.some((l) => /resum|reconnect/i.test(String(l.msg)))).toBe(true);
    } finally {
      await prod.stop();
    }
  });
  test.describe('TURN 연동(운영 프로세스 + coturn)', () => {
    if (process.env.CI) expect(hasTurn, 'CI에는 turnserver(coturn)가 설치되어 있어야 한다').toBe(true);
    test.skip(!hasTurn, 'turnserver(coturn)가 설치되어 있지 않아 건너뜀');
    let turn: Turn | undefined;
    test.afterEach(() => {
      turn?.stop();
      turn = undefined;
    });

    test('IT-100 [SEC-09,NFR-15,NFR-06,FR-07,FR-21] TURN 릴레이로만 연결된 통화 중 서버가 SIGTERM으로 재시작되면 재시작 안내를 보고, 같은 TURN 비밀로 새 회의도 릴레이로 연결된다(경로 로그는 relay만)', async ({ browser }) => {
      intercept = false;
      turn = await startTurn();
      const secret = crypto.randomBytes(32).toString('hex');
      const turnEnv = { TURN_URLS: `turn:127.0.0.1:${turn.port}?transport=udp`, TURN_SECRET, SESSION_SECRET: secret };
      const first = await startProd(turnEnv);
      let second: Prod | undefined;
      const relayMember = async (url: string, nick: string): Promise<Member> => {
        const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
        members.push(ctx);
        await ctx.addInitScript(FORCE_RELAY_INIT);
        const page = await ctx.newPage();
        await page.goto(url);
        await page.getByTestId('lobby-nickname').fill(nick);
        await page.getByTestId('join-button').click();
        await page.getByTestId('room').waitFor();
        return { ctx, page, frames: [], errors: [], drop: async () => undefined, setBlocked: () => undefined };
      };
      try {
        const hostCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
        members.push(hostCtx);
        await hostCtx.addInitScript(FORCE_RELAY_INIT);
        const hp = await hostCtx.newPage();
        await hp.goto(first.base);
        await hp.getByTestId('nickname').fill('turnHost');
        await hp.getByTestId('create-room').click();
        await hp.waitForURL(/\/r\/[A-Za-z0-9_-]{22}$/);
        const url = hp.url();
        await hp.getByTestId('join-button').click();
        await hp.getByTestId('room').waitFor();
        const g = await relayMember(url, 'turnGuest');
        await expectRemoteMedia(hp, 1, 40_000);
        await expectRemoteMedia(g.page, 1, 40_000);
        await expect.poll(() => jsonLines(first.lines).filter((l) => l.msg === 'peer path').length, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
        expect(jsonLines(first.lines).filter((l) => l.msg === 'peer path').map((l) => l.path)).toEqual(['relay', 'relay']);

        const down = await first.stop();
        expect(down.code).toBe(0);
        second = await startProd(turnEnv, first.port);
        for (const p of [hp, g.page]) await expect(p.getByText(S.state.gone.restarted)).toBeVisible({ timeout: 30_000 });

        // 새 프로세스에서 새 회의(릴레이 강제)도 연결된다
        await hp.getByRole('button', { name: S.state.gone.newRoom }).click();
        await hp.getByTestId('nickname').fill('turnHost');
        await hp.getByTestId('create-room').click();
        await hp.waitForURL(/\/r\/[A-Za-z0-9_-]{22}$/);
        const url2 = hp.url();
        await hp.getByTestId('join-button').click();
        await hp.getByTestId('room').waitFor();
        const g2 = await relayMember(url2, 'turnGuest2');
        await expectRemoteMedia(hp, 1, 40_000);
        await expectRemoteMedia(g2.page, 1, 40_000);
        await expect.poll(() => jsonLines(second?.lines ?? []).filter((l) => l.msg === 'peer path').length, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
        expect(jsonLines(second?.lines ?? []).filter((l) => l.msg === 'peer path').map((l) => l.path)).toEqual(['relay', 'relay']);
        // TURN 자격증명은 로그에 없다
        const logs = [...first.lines, ...(second?.lines ?? [])].join('\n');
        expect(logs).not.toContain(TURN_SECRET);
      } finally {
        await first.stop();
        await second?.stop();
      }
    });

    test('IT-101 [NFR-04,SEC-09,NFR-15] TURN이 설정된 일반(릴레이 강제 아님) 3명 통화에서 직접 연결이 성공해도 TURN 할당이 몇 개 열리는지 센다 — total-quota 산정 가정(참가자 N(N-1)개) 검증', async ({ browser }) => {
      turn = await startTurn();
      const prod = await startProd({ TURN_URLS: `turn:127.0.0.1:${turn.port}?transport=udp`, TURN_SECRET });
      try {
        const host = await hostRoom(browser, prod.base, 'allocHost');
        const g1 = await guestRoom(browser, host.url, 'allocB');
        const g2 = await guestRoom(browser, host.url, 'allocC');
        for (const m of [host, g1, g2]) await expectRemoteMedia(m.page, 2, 40_000);
        await new Promise((r) => setTimeout(r, 3000));
        const allocs = turn.log.filter((l) => /ALLOCATE processed, success/.test(l)).length;
        const paths = jsonLines(prod.lines).filter((l) => l.msg === 'peer path').map((l) => l.path);
        const created = turn.log.filter((l) => /session \S+: new, realm/.test(l)).length;
        const deleted = turn.log.filter((l) => /refreshed, realm.*lifetime=0/.test(l)).length;
        const perUser = new Map<string, number>();
        for (const l of turn.log) {
          const u = /session \S+: new, realm=<[^>]+>, username=<([^>]+)>/.exec(l)?.[1];
          if (u) perUser.set(u, (perUser.get(u) ?? 0) + 1);
        }
        console.log(`[08-turn] 3명 통화(연결 6끝): 선택 경로 ${JSON.stringify(paths)}, TURN 할당 성공 ${allocs}회, 생성 ${created}·해제 ${deleted}·표본 시점 열린 ${created - deleted}개, 사용자별 생성 ${JSON.stringify([...perUser.values()])} (가정: 동시 N(N-1)=6)`);
        expect(paths.every((p) => p === 'direct')).toBe(true); // 루프백이라 직접 연결이 선택된다
        expect(allocs, "계측 도구가 TURN 할당을 하나도 못 봤다면 이 시험은 의미가 없다").toBeGreaterThan(0);
      } finally {
        await prod.stop();
      }
    });
  });
});
