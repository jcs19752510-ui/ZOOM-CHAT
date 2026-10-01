import type { BrowserContext, Page } from '@playwright/test';
import { closeAll, expect, expectRemoteMedia, hostMeeting, test } from './fixtures';

const mine: BrowserContext[] = [];
test.afterEach(async () => {
  await closeAll();
  while (mine.length) await mine.pop()?.close();
});

/** 시험용: 만들어진 WebSocket 수를 window.__wsCount에 세고, window.__killWs()로 그때까지의 소켓 송신을 조용히 버린다. */
const COUNT_AND_DROP_WS = (): void => {
  const w = window as unknown as { __wsCount: number; __killWs: () => void };
  w.__wsCount = 0;
  const seen = new Set<WebSocket>();
  const dead = new WeakSet<WebSocket>();
  w.__killWs = () => seen.forEach((ws) => dead.add(ws));
  const Orig = window.WebSocket;
  window.WebSocket = new Proxy(Orig, {
    construct(target, args: ConstructorParameters<typeof WebSocket>) {
      w.__wsCount++;
      return Reflect.construct(target, args) as WebSocket;
    },
  });
  const send = Orig.prototype.send;
  Orig.prototype.send = function (this: WebSocket, ...a: Parameters<WebSocket['send']>) {
    seen.add(this);
    if (dead.has(this)) return;
    send.apply(this, a);
  };
};

async function guest(browser: Parameters<typeof hostMeeting>[0], url: string): Promise<Page> {
  const context = await browser.newContext({ permissions: ['camera', 'microphone'] });
  mine.push(context);
  await context.addInitScript(COUNT_AND_DROP_WS);
  const page = await context.newPage();
  await page.goto(url);
  await page.getByTestId('lobby-nickname').fill('민지');
  await page.getByTestId('join-button').click();
  await page.getByTestId('room').waitFor();
  return page;
}

const wsCount = (page: Page): Promise<number> => page.evaluate(() => (window as unknown as { __wsCount: number }).__wsCount);
const selfPeerId = (page: Page): Promise<string | null> => page.evaluate(() => [...document.querySelectorAll<HTMLVideoElement>('video[data-peer-id]')].find((v) => v.muted)?.dataset.peerId ?? null);

test('IT-39 [UX-14] 서버가 이미 자리를 정리했는데(PARTICIPANT_GONE) 복귀하면, 재연결 상태에 갇히지 않고 새 소켓 한 번으로 만료 화면에 도달한다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const page = await guest(browser, host.url);
  await expectRemoteMedia(page, 1);
  expect(await wsCount(page)).toBe(1);

  // 서버 쪽에서만 참가자를 지운다(소켓은 그대로 그 자리에 묶여 있다)
  const room = env.server.rooms.get(host.roomId);
  const pid = [...(room?.participants.values() ?? [])].find((p) => p.nickname === '민지')?.id;
  expect(pid).toBeTruthy();
  env.server.rooms.leave(host.roomId, pid ?? '');

  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByText('연결이 오래 끊겨 회의에서 나갔습니다')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('room')).toHaveCount(0);
  // 새 소켓은 정확히 한 번 만들어졌다(무한 재연결 아님)
  const after = await wsCount(page);
  await page.waitForTimeout(3000);
  expect(await wsCount(page)).toBe(after);
  expect(after).toBe(2);
});

test('IT-40 [UX-14] 죽은 소켓 상태에서 복귀 이벤트가 연속으로 쏟아져도 소켓은 한 번만 다시 열리고 같은 자리로 돌아오며 이후 추가 연결이 없다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const page = await guest(browser, host.url);
  await expectRemoteMedia(page, 1);
  const before = await selfPeerId(page);
  expect(await wsCount(page)).toBe(1);

  await page.evaluate(() => (window as unknown as { __killWs: () => void }).__killWs());
  // 약 7초 동안 120ms 간격으로 visibilitychange/pageshow를 번갈아 발생
  for (let i = 0; i < 60; i++) {
    await page.evaluate((n) => (n % 2 ? window.dispatchEvent(new Event('pageshow')) : document.dispatchEvent(new Event('visibilitychange'))), i);
    await page.waitForTimeout(120);
  }
  await expect(page.getByTestId('conn-badge')).toHaveAttribute('data-state', /live|poor/, { timeout: 20_000 });
  expect(await selfPeerId(page)).toBe(before);
  await expect(host.page.locator('[data-testid^="tile-"]')).toHaveCount(2);
  expect(env.server.rooms.participantsOf(host.roomId)).toHaveLength(2);
  const after = await wsCount(page);
  expect(after).toBe(2);
  await page.waitForTimeout(4000);
  expect(await wsCount(page)).toBe(after);
  await expectRemoteMedia(page, 1);
});

test('IT-40b [UX-14] 정상 연결에서 복귀 이벤트가 연속으로 와도 소켓을 다시 열지 않는다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const page = await guest(browser, host.url);
  await expectRemoteMedia(page, 1);
  for (let i = 0; i < 40; i++) {
    await page.evaluate((n) => (n % 2 ? window.dispatchEvent(new Event('pageshow')) : document.dispatchEvent(new Event('visibilitychange'))), i);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(3500);
  expect(await wsCount(page)).toBe(1);
  await expect(page.getByTestId('conn-badge')).toHaveAttribute('data-state', /live|poor/);
  await expect(page.getByTestId('room')).toHaveAttribute('data-status', 'live');
});

const KAKAO_UA = 'Mozilla/5.0 (Linux; Android 13; SM-S918N Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 KAKAOTALK 2510';

test('IT-40c [UX-15] play()가 NotAllowedError가 아닌 이유(AbortError)로 실패하면 자동재생 배너를 띄우지 않는다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const context = await browser.newContext({ permissions: ['camera', 'microphone'] });
  mine.push(context);
  await context.addInitScript(() => {
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (!this.muted) return Promise.reject(new DOMException('interrupted', 'AbortError'));
      return orig.call(this);
    };
  });
  const page = await context.newPage();
  await page.goto(host.url);
  await page.getByTestId('lobby-nickname').fill('민지');
  await page.getByTestId('join-button').click();
  await page.getByTestId('room').waitFor();
  await expect(page.locator('video[data-peer-id][data-kind="camera"]:not([muted])').first()).toBeAttached();
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('autoplay-banner')).toHaveCount(0);
});

test('IT-40d [UX-13] 같은 실행에서 안내를 닫았어도, 이후 권한 실패 화면에서는 안내가 강제로 다시 펼쳐진다(닫기 없음)', async ({ browser, env }) => {
  const context = await browser.newContext({ userAgent: KAKAO_UA });
  mine.push(context);
  await context.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError'));
  });
  const page = await context.newPage();
  await page.goto(env.base);
  await page.getByTestId('inapp-dismiss').click();
  await expect(page.getByTestId('inapp-notice')).toHaveCount(0);
  await page.getByTestId('nickname').fill('민지');
  await page.getByTestId('create-room').click();
  await page.waitForURL(/\/r\/[A-Za-z0-9_-]{22}$/);
  await expect(page.getByTestId('permission-problem')).toBeVisible();
  await expect(page.getByTestId('inapp-notice')).toHaveAttribute('data-expanded', 'true');
  await expect(page.getByTestId('inapp-dismiss')).toHaveCount(0);
  await expect(page.getByTestId('permission-problem')).toContainText('앱');
});

test('IT-40e [UX-13] 안내의 복사 버튼: 랜딩은 사이트 주소, 대기실·지원 불가 화면은 초대 링크를 복사하고 안내에는 외부 링크·target이 없다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const context = await browser.newContext({ permissions: ['camera', 'microphone', 'clipboard-read', 'clipboard-write'], userAgent: KAKAO_UA });
  mine.push(context);
  const page = await context.newPage();
  await page.goto(env.base);
  await page.getByTestId('inapp-copy').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(env.base);
  expect(await page.locator('[data-testid="inapp-notice"] a, [data-testid="inapp-notice"] [target]').count()).toBe(0);

  await page.goto(host.url);
  await page.getByTestId('inapp-copy').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${env.base}/r/${host.roomId}`);

  const ctx2 = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'], userAgent: KAKAO_UA });
  mine.push(ctx2);
  await ctx2.addInitScript(() => Object.defineProperty(window, 'RTCPeerConnection', { value: undefined, configurable: true }));
  const p2 = await ctx2.newPage();
  await p2.goto(host.url);
  await expect(p2.getByTestId('inapp-notice')).toHaveAttribute('data-expanded', 'true');
  await expect(p2.getByTestId('inapp-dismiss')).toHaveCount(0);
  await p2.getByTestId('inapp-copy').click();
  expect(await p2.evaluate(() => navigator.clipboard.readText())).toBe(`${env.base}/r/${host.roomId}`);
});

test('IT-40f [UX-14] 화면이 꺼진 동안 카메라 트랙이 끝났으면(ended) 복귀 시 카메라 버튼이 꺼지고 경고 토스트가 뜨며 상대 화면에도 반영된다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const context = await browser.newContext({ permissions: ['camera', 'microphone'] });
  mine.push(context);
  await context.addInitScript(() => {
    const w = window as unknown as { __tracks: MediaStreamTrack[] };
    w.__tracks = [];
    const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (c) => {
      const s = await orig(c);
      w.__tracks.push(...s.getTracks());
      return s;
    };
  });
  const page = await context.newPage();
  await page.goto(host.url);
  await page.getByTestId('lobby-nickname').fill('민지');
  await page.getByTestId('join-button').click();
  await page.getByTestId('room').waitFor();
  await expectRemoteMedia(page, 1);
  await expect(page.getByTestId('btn-camera')).toHaveAttribute('aria-pressed', 'false');
  // stop()은 'ended' 이벤트 없이 readyState만 ended로 바꾼다(iOS가 백그라운드에서 트랙을 끊는 모습)
  await page.evaluate(() => (window as unknown as { __tracks: MediaStreamTrack[] }).__tracks.filter((t) => t.kind === 'video').forEach((t) => t.stop()));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByTestId('btn-camera')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('화면이 꺼져 있는 동안 카메라가 중단되었습니다')).toBeVisible();
  await expect(page.getByTestId('btn-mic')).toHaveAttribute('aria-pressed', 'false');
  await expect(host.page.locator('[aria-label="민지: 카메라 꺼짐"]')).toBeVisible({ timeout: 8000 });
});

test('IT-40g [UX-13,UX-15] 접근성: 안내 바·배너의 이름·역할·상태 속성, 터치 44px, 키보드 순서(안내 → 입력), prefers-reduced-motion에서 전환이 꺼진다', async ({ browser, env }) => {
  const context = await browser.newContext({ userAgent: KAKAO_UA, viewport: { width: 360, height: 740 }, reducedMotion: 'reduce' });
  mine.push(context);
  const page = await context.newPage();
  await page.goto(env.base);
  const notice = page.getByTestId('inapp-notice');
  await expect(notice).toBeVisible();
  // 이름 있는 영역(aside + aria-labelledby → 제목)
  await expect(notice).toHaveAttribute('aria-labelledby', 'inapp-title');
  await expect(page.locator('#inapp-title')).not.toBeEmpty();
  for (const id of ['inapp-copy', 'inapp-toggle', 'inapp-dismiss']) {
    const box = await page.getByTestId(id).boundingBox();
    expect(box?.height ?? 0, `${id} 높이`).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0, `${id} 너비`).toBeGreaterThanOrEqual(44);
  }
  await expect(page.getByTestId('inapp-dismiss')).toHaveAttribute('aria-label', /.+/);
  await expect(page.getByTestId('inapp-toggle')).toHaveAttribute('aria-expanded', 'false');
  await page.getByTestId('inapp-toggle').click();
  await expect(page.getByTestId('inapp-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#inapp-details')).toBeVisible();
  // 키보드 순서: 안내 바의 버튼들이 본문 입력보다 먼저 온다
  const order = await page.evaluate(() => {
    const focusables = [...document.querySelectorAll<HTMLElement>('button, input, a[href], select, textarea')].filter((e) => e.offsetParent !== null);
    const idx = (sel: string): number => focusables.indexOf(document.querySelector<HTMLElement>(sel) as HTMLElement);
    return { copy: idx('[data-testid="inapp-copy"]'), toggle: idx('[data-testid="inapp-toggle"]'), dismiss: idx('[data-testid="inapp-dismiss"]'), nick: idx('[data-testid="nickname"]') };
  });
  expect(order.copy).toBeGreaterThanOrEqual(0);
  expect(order.copy).toBeLessThan(order.toggle);
  expect(order.toggle).toBeLessThan(order.dismiss);
  expect(order.dismiss).toBeLessThan(order.nick);
  // reduced-motion: 버튼 전환 시간이 사실상 0
  const dur = await page.getByTestId('inapp-toggle').evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
  expect(dur).toBeLessThanOrEqual(0.01);

  // 자동재생 배너: role=status, 버튼 44px+ (IT-35와 별개로 360px에서도)
  const host = await hostMeeting(browser, env);
  const ctx2 = await browser.newContext({ permissions: ['camera', 'microphone'], viewport: { width: 360, height: 740 } });
  mine.push(ctx2);
  await ctx2.addInitScript(() => {
    const orig = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      return !this.muted ? Promise.reject(new DOMException('b', 'NotAllowedError')) : orig.call(this);
    };
  });
  const p2 = await ctx2.newPage();
  await p2.goto(host.url);
  await p2.getByTestId('lobby-nickname').fill('민지');
  await p2.getByTestId('join-button').click();
  await p2.getByTestId('room').waitFor();
  const banner = p2.getByTestId('autoplay-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toHaveAttribute('role', 'status');
  const bb = await p2.getByTestId('autoplay-button').boundingBox();
  expect(bb?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(await p2.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // 배너 버튼은 키보드로 눌러진다
  await p2.getByTestId('autoplay-button').focus();
  await expect(p2.getByTestId('autoplay-button')).toBeFocused();
});

test('IT-40h [UX-13] 360×740 대기실: 접힌 안내가 [회의 입장] 버튼을 밀어내는 양은 안내 높이(≤130px) 이내이고(04 §2.3.4 의도적 비용), 펼쳐도 스크롤로 닿을 수 있으며 입장이 막히지 않는다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const context = await browser.newContext({ permissions: ['camera', 'microphone'], userAgent: KAKAO_UA, viewport: { width: 360, height: 740 } });
  mine.push(context);
  const page = await context.newPage();
  await page.goto(host.url);
  await expect(page.getByTestId('inapp-notice')).toHaveAttribute('data-expanded', 'false');
  await page.getByTestId('lobby-nickname').fill('민지');
  const box = await page.getByTestId('join-button').boundingBox();
  expect(box).not.toBeNull();
  // 일반 UA 기준 버튼 하단은 약 690px(여유 50px). 안내가 들어가도 밀림은 안내 높이(≤130px) + 그 여유 이내여야 한다(스크롤 1회 비용).
  expect((box?.y ?? 9999) + (box?.height ?? 0), '접힘: 입장 버튼 하단').toBeLessThanOrEqual(740 + 130);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByTestId('inapp-toggle').click();
  await page.getByTestId('join-button').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('join-button')).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByTestId('join-button').click();
  await page.getByTestId('room').waitFor();
});

test('IT-40i [UX-14] visibilitychange 없이 pageshow(뒤로가기 캐시 복원)만 와도 5초 안에 죽은 소켓을 감지해 같은 자리로 복구한다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const page = await guest(browser, host.url);
  await expectRemoteMedia(page, 1);
  const before = await selfPeerId(page);
  await page.evaluate(() => {
    const w = window as unknown as { __killWs: () => void; __states: string[]; __t0: number; __reconnectingAt: number };
    w.__states = [];
    w.__reconnectingAt = 0;
    new MutationObserver(() => {
      const st = document.querySelector('[data-testid="conn-badge"]')?.getAttribute('data-state');
      if (st && w.__states.at(-1) !== st) {
        w.__states.push(st);
        if (st === 'reconnecting' && !w.__reconnectingAt) w.__reconnectingAt = Date.now();
      }
    }).observe(document.body, { subtree: true, childList: true, attributes: true });
    w.__killWs();
    w.__t0 = Date.now();
    window.dispatchEvent(new Event('pageshow'));
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __states: string[] }).__states.join('>')), { timeout: 25_000 }).toMatch(/reconnecting>(live|poor)/);
  const t = await page.evaluate(() => {
    const w = window as unknown as { __t0: number; __reconnectingAt: number };
    return w.__reconnectingAt - w.__t0;
  });
  expect(t).toBeLessThanOrEqual(5000);
  expect(await selfPeerId(page)).toBe(before);
  expect(await wsCount(page)).toBe(2);
});

test('IT-40j [UX-14] 프로브 응답이 NOT_JOINED(소켓이 자리에 안 묶임)면 소켓을 새로 열지 않고 같은 소켓으로 즉시 room:resume을 보낸다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const page = await guest(browser, host.url);
  await expectRemoteMedia(page, 1);
  await page.evaluate(() => {
    const w = window as unknown as { __sent: string[] };
    w.__sent = [];
    const prev = WebSocket.prototype.send;
    WebSocket.prototype.send = function (this: WebSocket, data: Parameters<WebSocket['send']>[0]) {
      const text = typeof data === 'string' ? data : '';
      w.__sent.push(text);
      const m = /^42(\d+)\["media:state"/.exec(text);
      if (m) {
        // 서버가 NOT_JOINED로 답한 것처럼 ack 프레임을 주입하고, 실제 서버에는 보내지 않는다
        setTimeout(() => this.dispatchEvent(new MessageEvent('message', { data: `43${m[1]}[{"ok":false,"code":"NOT_JOINED","message":"x"}]` })), 50);
        return;
      }
      prev.call(this, data);
    };
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __sent: string[] }).__sent.some((t) => t.includes('"room:resume"')), { timeout: 8000 })).toBe(true);
  expect(await wsCount(page)).toBe(1);
});
