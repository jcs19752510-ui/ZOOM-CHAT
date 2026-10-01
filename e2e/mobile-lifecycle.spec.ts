import type { BrowserContext, Page } from '@playwright/test';
import { closeAll, expect, expectRemoteMedia, hostMeeting, test } from './fixtures';

const mine: BrowserContext[] = [];
test.afterEach(async () => {
  await closeAll();
  while (mine.length) await mine.pop()?.close();
});

async function guestWith(browser: Parameters<typeof hostMeeting>[0], url: string, initScript: () => void, userAgent?: string): Promise<Page> {
  const context = await browser.newContext({ permissions: ['camera', 'microphone'], ...(userAgent ? { userAgent } : {}) });
  mine.push(context);
  await context.addInitScript(initScript);
  const page = await context.newPage();
  await page.goto(url);
  await page.getByTestId('lobby-nickname').fill('민지');
  await page.getByTestId('join-button').click();
  await page.getByTestId('room').waitFor();
  return page;
}

/** 시험용: window.__blockPlay가 켜져 있는 동안 원격(muted 아님) 요소의 play()를 자동재생 정책처럼 거부한다. */
const BLOCK_PLAY = (): void => {
  const w = window as unknown as { __blockPlay: boolean; __playOk: number };
  w.__blockPlay = true;
  w.__playOk = 0;
  const orig = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
    if (w.__blockPlay && !this.muted) return Promise.reject(new DOMException('blocked', 'NotAllowedError'));
    w.__playOk++;
    return orig.call(this);
  };
};

test('IT-35 [UX-15] 자동재생이 거부되면 방 단위 배너가 보이고, 탭하면 재생되며 배너가 사라지고 포커스가 회의 화면으로 간다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const page = await guestWith(browser, host.url, BLOCK_PLAY);
  const banner = page.getByTestId('autoplay-banner');
  await expect(banner).toBeVisible();
  await expect(banner).toHaveAttribute('role', 'status');
  const box = await page.getByTestId('autoplay-button').boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  // 막힌 요소가 둘이어도 배너는 하나다
  await expect(page.getByTestId('autoplay-banner')).toHaveCount(1);

  await page.evaluate(() => ((window as unknown as { __blockPlay: boolean }).__blockPlay = false));
  await page.getByTestId('autoplay-button').click();
  await expect(banner).toBeHidden();
  expect(await page.evaluate(() => (window as unknown as { __playOk: number }).__playOk)).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => document.activeElement?.tagName)).toBe('MAIN');
  await expectRemoteMedia(page, 1);
  await expect(page.locator('video[data-peer-id][data-kind="camera"]:not([muted])').first()).toHaveJSProperty('paused', false);
});

test('IT-35b [UX-15] 거부되지 않으면 배너가 없다(기존 동작 유지)', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const page = await guestWith(browser, host.url, () => undefined);
  await expectRemoteMedia(page, 1);
  await expect(page.getByTestId('autoplay-banner')).toHaveCount(0);
});

/** 시험용: window.__killWs()를 부르면 그 시점까지 쓰던 WebSocket의 송신을 조용히 버려 "응답 없는 죽은 소켓"을 흉내 낸다(새로 여는 소켓은 정상). */
const DROP_WS = (): void => {
  const seen = new Set<WebSocket>();
  const dead = new WeakSet<WebSocket>();
  (window as unknown as { __killWs: () => void }).__killWs = () => seen.forEach((ws) => dead.add(ws));
  const orig = WebSocket.prototype.send;
  WebSocket.prototype.send = function (this: WebSocket, ...args: Parameters<WebSocket['send']>) {
    seen.add(this);
    if (dead.has(this)) return;
    orig.apply(this, args);
  };
};

const selfPeerId = (page: Page): Promise<string | null> => page.evaluate(() => [...document.querySelectorAll<HTMLVideoElement>('video[data-peer-id]')].find((v) => v.muted)?.dataset.peerId ?? null);

test('IT-36 [UX-14] 조용히 죽은 소켓은 화면 복귀 후 5초 안에 재연결 배너(복귀 문구)가 보이고, 복구되면 같은 자리로 돌아온다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const page = await guestWith(browser, host.url, DROP_WS);
  await expectRemoteMedia(page, 1);
  const before = await selfPeerId(page);
  expect(before).toBeTruthy();

  // 소켓이 곧바로 복구되면 배너가 잠깐만 보이므로 DOM 변화를 기록해 확인한다.
  await page.evaluate(() => {
    const w = window as unknown as { __killWs: () => void; __seen: { states: string[]; returnedText: boolean; t0: number; reconnectingAt: number } };
    w.__seen = { states: [], returnedText: false, t0: Date.now(), reconnectingAt: 0 };
    new MutationObserver(() => {
      const st = document.querySelector('[data-testid="conn-badge"]')?.getAttribute('data-state');
      if (st && w.__seen.states.at(-1) !== st) {
        w.__seen.states.push(st);
        if (st === 'reconnecting') w.__seen.reconnectingAt = Date.now();
      }
      if (document.body.innerText.includes('앱으로 돌아와 연결을 다시 확인하고 있습니다')) w.__seen.returnedText = true;
    }).observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    w.__killWs();
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { __seen: { states: string[] } }).__seen.states.join('>')), { timeout: 25_000 }).toMatch(/reconnecting>(live|poor)/);
  const seen = await page.evaluate(() => (window as unknown as { __seen: { returnedText: boolean; t0: number; reconnectingAt: number } }).__seen);
  expect(seen.returnedText).toBe(true);
  expect(seen.reconnectingAt - seen.t0).toBeLessThanOrEqual(5000);
  expect(await selfPeerId(page)).toBe(before);
  await expect(host.page.locator('[data-testid^="tile-"]')).toHaveCount(2);
  await expectRemoteMedia(page, 1);
});

test('IT-36b [UX-14] 정상 연결에서 복귀(visibilitychange·pageshow)해도 재연결 배너가 뜨지 않고 통화가 유지된다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const page = await guestWith(browser, host.url, () => undefined);
  await expectRemoteMedia(page, 1);
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pageshow'));
  });
  await page.waitForTimeout(4500);
  await expect(page.getByTestId('conn-badge')).toHaveAttribute('data-state', /live|poor/);
  await expectRemoteMedia(page, 1);
});

test('IT-36c [UX-14] 서버가 연결을 끊은 뒤 복귀 이벤트가 겹쳐도 같은 자리로 돌아온다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const page = await guestWith(browser, host.url, () => undefined);
  await expectRemoteMedia(page, 1);
  const before = await selfPeerId(page);
  env.server.disconnectAll();
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByTestId('conn-badge')).toHaveAttribute('data-state', /live|poor/, { timeout: 20_000 });
  expect(await selfPeerId(page)).toBe(before);
  await expect(host.page.locator('[data-testid^="tile-"]')).toHaveCount(2);
});

const KAKAO_UA = 'Mozilla/5.0 (Linux; Android 13; SM-S918N Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 KAKAOTALK 2510';

test('IT-35c [UX-13] 인앱 UA: 랜딩·대기실에 접힌 안내가 보이고 입장을 막지 않으며, 닫으면 닉네임으로 포커스가 가고 일반 UA에는 없다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const context = await browser.newContext({ permissions: ['camera', 'microphone'], userAgent: KAKAO_UA, viewport: { width: 360, height: 740 } });
  mine.push(context);
  const page = await context.newPage();
  await page.goto(env.base);
  const notice = page.getByTestId('inapp-notice');
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute('data-expanded', 'false');
  expect((await notice.boundingBox())?.height ?? 999).toBeLessThanOrEqual(130);
  await page.getByTestId('inapp-toggle').click();
  await expect(page.getByTestId('inapp-details')).toBeVisible();
  await page.getByTestId('inapp-toggle').click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  // 대기실: 안내가 있어도 입장은 그대로 된다(조작 횟수 불변: 닉네임 → 입장)
  await page.goto(host.url);
  await expect(page.getByTestId('inapp-notice')).toBeVisible();
  await page.getByTestId('inapp-dismiss').click();
  await expect(page.getByTestId('inapp-notice')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('lobby-nickname');
  await page.getByTestId('lobby-nickname').fill('민지');
  await page.getByTestId('join-button').click();
  await page.getByTestId('room').waitFor();

  // 일반 UA에는 보이지 않는다
  await expect(host.page.getByTestId('inapp-notice')).toHaveCount(0);
});

test('IT-35d [UX-13] 인앱 UA에서 카메라·마이크 권한이 거부되면 안내가 강제로 펼쳐지고 닫기 버튼이 없다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const context = await browser.newContext({ userAgent: KAKAO_UA });
  mine.push(context);
  await context.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError'));
  });
  const page = await context.newPage();
  await page.goto(host.url);
  await expect(page.getByTestId('permission-problem')).toBeVisible();
  const notice = page.getByTestId('inapp-notice');
  await expect(notice).toHaveAttribute('data-expanded', 'true');
  await expect(page.getByTestId('inapp-dismiss')).toHaveCount(0);
  await expect(page.getByTestId('inapp-toggle')).toHaveCount(0);
});
