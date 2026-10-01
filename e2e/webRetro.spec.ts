import type { Browser, BrowserContext, Page, Route } from '@playwright/test';
import { S } from '../apps/web/src/strings';
import { closeAll, expect, expectRemoteMedia, extraServer, guestMeeting, hostMeeting, test } from './fixtures';

// 소급 6단계(unit-06~12) 보강 시험. 기존 dist를 쓰며 서버는 시험마다 무작위 포트로 띄운다.
test.afterEach(async () => {
  await closeAll();
});

const FAKE_ID = 'B'.repeat(22);
const status = (over: Record<string, unknown> = {}): Record<string, unknown> => ({ v: 1, exists: true, locked: false, needsPassword: false, full: false, hostPresent: true, ...over });
const json = (route: Route, body: unknown, code = 200): Promise<void> => route.fulfill({ status: code, contentType: 'application/json', body: JSON.stringify(body) });
const noHScroll = async (page: Page, label: string): Promise<void> => {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over, `${label}: 가로 스크롤 ${over}px`).toBeLessThanOrEqual(0);
};
async function lobbyOf(browser: Browser, url: string, opts: { init?: () => void; viewport?: { width: number; height: number }; perms?: boolean } = {}): Promise<{ ctx: BrowserContext; page: Page }> {
  const ctx = await browser.newContext({ ...(opts.perms === false ? {} : { permissions: ['camera', 'microphone'] as string[] }), ...(opts.viewport ? { viewport: opts.viewport } : {}) });
  if (opts.init) await ctx.addInitScript(opts.init);
  const page = await ctx.newPage();
  await page.goto(url);
  return { ctx, page };
}

test('IT-50 [FR-01,FR-03,UX-03,NFR-01] 랜딩 입력 검증: 닉네임·비밀번호 길이·링크 형식 오류는 role=alert로 원인과 해결을 알리고, 서버 오류·속도 제한·대기 중 상태가 구분된다', async ({ browser, env }) => {
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const page = await ctx.newPage();
  await page.goto(env.base);
  const err = page.getByTestId('create-error');
  // 닉네임: 빈 값, 허용되지 않는 문자(HTML), 21자(경계 초과)
  for (const bad of ['', '   ', '<b>해커</b>', '가'.repeat(21)]) {
    await page.getByTestId('nickname').fill(bad);
    await page.getByTestId('create-room').click();
    await expect(err, `닉네임 ${JSON.stringify(bad)}`).toHaveText(S.lobby.invalidNickname);
    await expect(err).toHaveAttribute('role', 'alert');
    expect(page.url()).toBe(`${env.base}/`);
  }
  // 비밀번호: 3자(경계 미만)는 거부, 오류 문구는 규칙을 알려 준다
  await page.getByTestId('nickname').fill('민지');
  await page.getByTestId('use-password').check();
  await page.getByTestId('room-password').fill('123');
  await page.getByTestId('create-room').click();
  await expect(err).toHaveText(S.landing.passwordHint);
  // 서버 오류 유형별 문구: 속도 제한 / 일반 오류 / 네트워크 단절
  await page.getByTestId('use-password').uncheck();
  await page.route('**/api/rooms', (r) => (r.request().method() === 'POST' ? json(r, { code: 'RATE_LIMITED' }, 429) : r.continue()));
  await page.getByTestId('create-room').click();
  await expect(err).toHaveText(S.lobby.rateLimited);
  await page.unroute('**/api/rooms');
  await page.route('**/api/rooms', (r) => (r.request().method() === 'POST' ? json(r, { code: 'INTERNAL' }, 500) : r.continue()));
  await page.getByTestId('create-room').click();
  await expect(err).toHaveText(S.state.error.body);
  await page.unroute('**/api/rooms');
  await page.route('**/api/rooms', (r) => (r.request().method() === 'POST' ? r.abort('failed') : r.continue()));
  await page.getByTestId('create-room').click();
  await expect(err).toHaveText(S.state.error.body);
  await page.unroute('**/api/rooms');
  // 대기 중: 버튼은 비활성이고 문구가 바뀐다
  await page.route('**/api/rooms', async (r) => {
    await new Promise((res) => setTimeout(res, 800));
    await r.continue();
  });
  await page.getByTestId('create-room').click();
  await expect(page.getByTestId('create-room')).toBeDisabled();
  await expect(page.getByTestId('create-room')).toHaveText(S.landing.creating);
  await page.waitForURL(/\/r\/[A-Za-z0-9_-]{22}$/);
  await page.unroute('**/api/rooms');
  // 비밀번호 경계: 4자와 32자는 서버가 받아들인다
  for (const pw of ['abcd', 'x'.repeat(32)]) {
    await page.goto(env.base);
    await page.getByTestId('nickname').fill('민지');
    await page.getByTestId('use-password').check();
    await page.getByTestId('room-password').fill(pw);
    await page.getByTestId('create-room').click();
    await page.waitForURL(/\/r\/[A-Za-z0-9_-]{22}$/);
    await expect(page.getByTestId('lobby-nickname')).toBeVisible();
  }
  // 링크로 입장: 잘못된 형식은 오류, 올바른 링크·방 코드·공백이 낀 링크는 같은 출처의 방 화면으로 이동한다
  await page.goto(env.base);
  for (const bad of ['garbage', 'javascript:alert(1)', `${env.base}/r/short`, `${env.base}/x/${FAKE_ID}`]) {
    await page.getByTestId('join-link').fill(bad);
    await page.getByTestId('join-by-link').click();
    await expect(page.getByRole('alert').filter({ hasText: S.landing.joinInvalid }), bad).toBeVisible();
    expect(page.url()).toBe(`${env.base}/`);
  }
  for (const ok of [FAKE_ID, `  ${env.base}/r/${FAKE_ID}  `, `https://other.example/r/${FAKE_ID}`]) {
    await page.goto(env.base);
    await page.getByTestId('join-link').fill(ok);
    await page.getByTestId('join-by-link').click();
    await expect(page).toHaveURL(`${env.base}/r/${FAKE_ID}`); // 외부 호스트가 섞여도 이동은 항상 같은 출처
    await expect(page.getByRole('alert')).toContainText(S.state.gone.title);
  }
  await ctx.close();
});

test('IT-51 [FR-06,FR-07,POL-01,UX-02] 방 상태 조회와 입장 사이에 정원이 차거나 방이 잠기면, 입력 화면에 갇히지 않고 가득 참·잠김 화면으로 바뀐다', async ({ browser }) => {
  const small = await extraServer({ MAX_PARTICIPANTS: '2' });
  try {
    const env = { server: small.server, base: small.base };
    const host = await hostMeeting(browser, env);
    await guestMeeting(browser, host.url, '민지');
    // 상태 조회는 "여유 있음"이라고 거짓 응답(경쟁 상황 모사). 입장 시도에서 서버가 ROOM_FULL로 거부한다.
    const c2 = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const p2 = await c2.newPage();
    await p2.route(`**/api/rooms/${host.roomId}`, (r) => json(r, status({ full: false })));
    await p2.goto(host.url);
    await p2.getByTestId('lobby-nickname').fill('늦은이');
    await p2.getByTestId('join-button').click();
    const alert = p2.getByRole('alert');
    await expect(alert).toContainText(S.state.full.title);
    await expect(alert).toContainText(S.state.full.body);
    await expect(p2.getByRole('button', { name: S.state.full.retry })).toBeVisible();
    await expect(p2.getByRole('button', { name: S.state.error.home })).toBeVisible();
    await expect(p2.getByTestId('room')).toHaveCount(0);
    // 다시 시도: 상태 조회가 여전히 거짓이면 다시 입력 화면으로 돌아온다(막다른 길이 아님)
    await p2.getByRole('button', { name: S.state.full.retry }).click();
    await expect(p2.getByTestId('lobby-nickname')).toBeVisible();
    await c2.close();
  } finally {
    await small.server.close();
  }
  // 잠금 경쟁
  const h2 = await extraServer();
  try {
    const env = { server: h2.server, base: h2.base };
    const host = await hostMeeting(browser, env);
    await host.page.getByTestId('btn-people').click();
    await host.page.getByTestId('btn-lock').click();
    const c3 = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const p3 = await c3.newPage();
    await p3.route(`**/api/rooms/${host.roomId}`, (r) => json(r, status({ locked: false })));
    await p3.goto(host.url);
    await p3.getByTestId('lobby-nickname').fill('늦은이');
    await p3.getByTestId('join-button').click();
    await expect(p3.getByRole('alert')).toContainText(S.state.locked.title);
    await expect(p3.getByRole('alert')).toContainText(S.state.locked.body);
    await c3.close();
  } finally {
    await h2.server.close();
  }
});

test('IT-52 [FR-04,UX-02,UX-03] 장치 오류 4종(차단·없음·사용 중·알 수 없음)은 각각 원인과 해결 문구를 role=alert로 보이고 장치 없이 입장할 수 있으며, 다시 확인하면 복구된다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const cases: [string, string][] = [
    ['NotAllowedError', S.state.permission.denied],
    ['NotFoundError', S.state.permission.notFound],
    ['NotReadableError', S.state.permission.inUse],
    ['TypeError', S.state.permission.unknown],
  ];
  for (const [name, text] of cases) {
    const { ctx, page } = await lobbyOf(browser, host.url, {
      perms: false,
      init: () => {
        navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('x', 'NotAllowedError'));
      },
    });
    // 오류 이름은 init 스크립트에서 고정할 수 없으므로 페이지 안에서 교체한다
    await page.evaluate((n) => {
      navigator.mediaDevices.getUserMedia = () => Promise.reject(n === 'TypeError' ? new TypeError('x') : new DOMException('x', n));
    }, name);
    await page.getByRole('button', { name: S.state.permission.retry }).click().catch(() => undefined);
    const box = page.getByTestId('permission-problem');
    await expect(box, name).toContainText(text);
    await expect(box).toContainText(S.state.permission.title);
    await expect(box).toHaveAttribute('role', 'alert');
    await expect(box.getByRole('button', { name: S.state.permission.retry })).toBeVisible();
    await expect(page.getByTestId('join-button')).toHaveText(S.lobby.joinWithoutDevices);
    await ctx.close();
  }
  // 복구: 실패 → 허용 → [다시 확인] → 안내가 사라지고 미리보기가 보인다
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    (window as unknown as { __allow: boolean }).__allow = false;
    navigator.mediaDevices.getUserMedia = (c?: MediaStreamConstraints) => ((window as unknown as { __allow: boolean }).__allow ? orig(c) : Promise.reject(new DOMException('x', 'NotAllowedError')));
  });
  await page.goto(host.url);
  await expect(page.getByTestId('permission-problem')).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { __allow: boolean }).__allow = true;
  });
  await page.getByRole('button', { name: S.state.permission.retry }).click();
  await expect(page.getByTestId('permission-problem')).toHaveCount(0);
  await expect(page.getByTestId('preview-video')).toBeVisible();
  await expect(page.getByTestId('join-button')).toHaveText(S.lobby.join);
  await ctx.close();
});

test('IT-53 [FR-14,FR-15,FR-16,SEC-05,UX-10] 호스트 도구 UI: 참가자에게는 도구·내보내기가 하나도 없고, 호스트에게는 자기 자신 외 모두에게 내보내기가 있으며, 확인창에서 취소하면 아무 일도 일어나지 않는다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const a = await guestMeeting(browser, host.url, '민지');
  const b = await guestMeeting(browser, host.url, '철수');
  await expectRemoteMedia(host.page, 2);
  for (const g of [a, b]) {
    await g.page.getByTestId('btn-people').click();
    await expect(g.page.getByTestId('people-list').locator('li')).toHaveCount(3);
    await expect(g.page.getByTestId('btn-lock')).toHaveCount(0);
    await expect(g.page.getByTestId('btn-mute-all')).toHaveCount(0);
    await expect(g.page.locator('[data-testid^="kick-"]')).toHaveCount(0);
    await expect(g.page.getByText(S.people.hostOnly)).toHaveCount(0);
  }
  await host.page.getByTestId('btn-people').click();
  await expect(host.page.locator('[data-testid^="kick-"]')).toHaveCount(2); // 자기 자신은 없다
  await expect(host.page.getByTestId('btn-lock')).toHaveAttribute('aria-pressed', 'false');
  await expect(host.page.getByTestId('btn-lock')).toHaveText(S.people.lock);
  await host.page.getByTestId('btn-lock').click();
  await expect(host.page.getByTestId('btn-lock')).toHaveAttribute('aria-pressed', 'true');
  await expect(host.page.getByTestId('btn-lock')).toHaveText(S.people.unlock);
  await expect(host.page.getByTestId('room').locator('svg[aria-label="' + S.room.locked + '"]')).toBeVisible(); // 헤더 잠금 표시
  await host.page.getByTestId('btn-lock').click();
  // 전체 음소거를 취소하면 아무도 음소거되지 않는다
  await host.page.getByTestId('btn-mute-all').click();
  await expect(host.page.getByRole('dialog')).toContainText(S.confirm.muteAllTitle);
  await host.page.getByRole('button', { name: S.confirm.cancel }).click();
  await expect(host.page.getByRole('dialog')).toHaveCount(0);
  await expect(a.page.getByTestId('btn-mic')).toHaveAttribute('aria-pressed', 'false');
  // 내보내기를 취소하면 참가자가 그대로 남는다
  await host.page.locator('[data-testid^="kick-"]').first().click();
  await expect(host.page.getByRole('dialog')).toContainText('님을 내보낼까요?');
  await host.page.keyboard.press('Escape');
  await expect(host.page.getByRole('dialog')).toHaveCount(0);
  await expect(host.page.getByTestId('people-list').locator('li')).toHaveCount(3);
  // 호스트 위임 뒤에는 도구가 새 호스트로 옮겨 가고 이전 호스트에게서는 사라진다
  await host.page.getByTestId('btn-leave').click();
  await host.page.getByRole('button', { name: S.confirm.leaveConfirm }).last().click();
  await expect.poll(async () => (await a.page.getByTestId('btn-lock').count()) + (await b.page.getByTestId('btn-lock').count()), { timeout: 10_000 }).toBe(1); // 호스트는 정확히 한 명
});

test('IT-54 [UX-10,NFR-09] 포커스 관리: 확인창은 취소에 포커스를 두고 Tab·Shift+Tab을 창 안에 가두며 닫으면 열었던 버튼으로 돌려주고, 장치 시트는 닫기에 포커스를 두고 Esc로 닫힌다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const p = host.page;
  const active = (): Promise<string> => p.evaluate(() => (document.activeElement as HTMLElement | null)?.textContent?.trim() || (document.activeElement as HTMLElement | null)?.getAttribute('aria-label') || '');
  const inDialog = (): Promise<boolean> => p.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
  await p.getByTestId('btn-leave').focus();
  await p.keyboard.press('Enter');
  await expect(p.getByRole('dialog')).toBeVisible();
  expect(await active()).toBe(S.confirm.cancel);
  for (let i = 0; i < 5; i++) {
    await p.keyboard.press('Tab');
    expect(await inDialog(), `Tab ${i + 1}회 후 포커스가 창 밖으로 나감`).toBe(true);
  }
  for (let i = 0; i < 5; i++) {
    await p.keyboard.press('Shift+Tab');
    expect(await inDialog(), `Shift+Tab ${i + 1}회 후 포커스가 창 밖으로 나감`).toBe(true);
  }
  await expect(p.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
  await expect(p.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'confirm-title');
  await p.keyboard.press('Escape');
  await expect(p.getByRole('dialog')).toHaveCount(0);
  await expect(p.getByTestId('btn-leave')).toBeFocused(); // 열었던 버튼으로 복원
  // 장치 시트
  await p.getByTestId('btn-devices').focus();
  await p.keyboard.press('Enter');
  const sheet = p.getByRole('dialog', { name: S.devices.title });
  await expect(sheet).toBeVisible();
  await expect(p.getByRole('button', { name: S.devices.close })).toBeFocused();
  await p.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(p.getByTestId('btn-devices')).toBeFocused();
});

test('IT-54b [UX-10,NFR-09] 장치 시트(aria-modal)도 Tab을 창 안에 가둬야 한다(G-2 수정)', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const p = host.page;
  await p.getByTestId('btn-devices').focus();
  await p.keyboard.press('Enter');
  await expect(p.getByRole('dialog', { name: S.devices.title })).toBeVisible();
  for (let i = 0; i < 8; i++) {
    await p.keyboard.press('Tab');
    const inside = await p.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'));
    expect(inside, `Tab ${i + 1}회 후 포커스가 시트 밖으로 나감`).toBe(true);
  }
});

test('IT-55 [UX-10,UX-11,NFR-09] 키보드 포커스 표시(2px 이상, 포커스 색)가 랜딩·회의실 버튼에 보이고, prefers-reduced-motion이면 회의실 버튼의 전환도 꺼진다', async ({ browser, env }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce', permissions: ['camera', 'microphone'] });
  const page = await ctx.newPage();
  await page.goto(env.base);
  await page.keyboard.press('Tab');
  const outline = (): Promise<{ style: string; width: number; color: string; offset: number }> =>
    page.evaluate(() => {
      const cs = getComputedStyle(document.activeElement as HTMLElement);
      return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth), color: cs.outlineColor, offset: parseFloat(cs.outlineOffset) };
    });
  for (let i = 0; i < 4; i++) {
    // reduced-motion 규칙(전환 0.01ms)이 outline 폭에도 걸려 포커스 직후 한 프레임은 0일 수 있어 안정될 때까지 기다린다
    await expect.poll(async () => (await outline()).width, { message: `랜딩 Tab ${i + 1} 포커스 링 폭` }).toBeGreaterThanOrEqual(2);
    const o = await outline();
    expect(o.style, `랜딩 Tab ${i + 1}`).not.toBe('none');
    expect(o.color).toBe('rgb(143, 180, 255)'); // tokens.color.focus
    expect(o.offset).toBeGreaterThanOrEqual(2);
    await page.keyboard.press('Tab');
  }
  await page.getByTestId('nickname').fill('키보드');
  await page.getByTestId('create-room').click();
  await page.getByTestId('join-button').click();
  await page.getByTestId('room').waitFor();
  for (const id of ['btn-mic', 'btn-camera', 'btn-chat', 'btn-people', 'btn-leave']) {
    await page.getByTestId(id).focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect.poll(async () => (await outline()).width, { message: `${id} 포커스 링 폭` }).toBeGreaterThanOrEqual(2);
    expect((await outline()).style, id).not.toBe('none');
    const dur = await page.getByTestId(id).evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
    expect(dur, `${id} 전환 시간`).toBeLessThanOrEqual(0.001);
  }
  await ctx.close();
});

test('IT-56 [UX-02,UX-03,FR-06,FR-23] 상태 화면: 로딩·오류·방 없음·호스트 대기·잠김·가득 참 화면이 각각 올바른 role·h1·행동 버튼을 갖고, 360px에서 가로 스크롤이 없으며, 오류·호스트 대기는 복구된다', async ({ browser, env }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, permissions: ['camera', 'microphone'] });
  const page = await ctx.newPage();
  const url = `${env.base}/r/${FAKE_ID}`;
  const route = `**/api/rooms/${FAKE_ID}`;
  const check = async (title: string, role: 'alert' | 'status', actions: string[]): Promise<void> => {
    const box = page.getByRole(role).filter({ has: page.getByRole('heading', { level: 1, name: title }) });
    await expect(box, title).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    for (const a of actions) await expect(page.getByRole('button', { name: a }).or(page.getByRole('link', { name: a })), `${title}: ${a}`).toBeVisible();
    await noHScroll(page, title);
    const small = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('main button, main a')].map((e) => e.getBoundingClientRect()).filter((r) => r.height < 43.5));
    expect(small, `${title}: 터치 타깃`).toEqual([]);
  };
  // 로딩(SCR-11): 응답이 늦으면 중립 status
  await page.route(route, async (r) => {
    await new Promise((res) => setTimeout(res, 1200));
    await json(r, status());
  });
  await page.goto(url);
  await check(S.state.loading.title, 'status', []);
  await expect(page.getByTestId('lobby-nickname')).toBeVisible();
  await page.unroute(route);
  // 일반 오류(SCR-13): 서버 오류 → 다시 시도 → 복구
  await page.route(route, (r) => json(r, { code: 'INTERNAL' }, 500));
  await page.goto(url);
  await check(S.state.error.title, 'alert', [S.state.error.retry, S.state.error.home]);
  await expect(page.getByRole('alert')).toContainText(S.state.error.body);
  await page.unroute(route);
  await page.route(route, (r) => json(r, status()));
  await page.getByRole('button', { name: S.state.error.retry }).click();
  await expect(page.getByTestId('lobby-nickname')).toBeVisible();
  await page.unroute(route);
  // 네트워크 단절도 같은 화면
  await page.route(route, (r) => r.abort('failed'));
  await page.goto(url);
  await check(S.state.error.title, 'alert', [S.state.error.retry]);
  await page.unroute(route);
  // 방 없음(SCR-19), 잠김(SCR-16), 가득 참(SCR-15)
  const table: [Record<string, unknown>, string, 'alert' | 'status', string[]][] = [
    [{ exists: false }, S.state.gone.title, 'alert', [S.state.gone.newRoom]],
    [{ locked: true }, S.state.locked.title, 'alert', [S.state.locked.retry, S.state.error.home]],
    [{ full: true }, S.state.full.title, 'alert', [S.state.full.retry, S.state.error.home]],
  ];
  for (const [over, title, role, actions] of table) {
    await page.route(route, (r) => json(r, status(over)));
    await page.goto(url);
    await check(title, role, actions);
    await page.unroute(route);
  }
  // 호스트 대기(SCR-22): 중립 status, 호스트가 들어오면 2.5초 주기 확인으로 자동 진행
  let hostPresent = false;
  await page.route(route, (r) => json(r, status({ hostPresent })));
  await page.goto(url);
  await check(S.state.waitHost.title, 'status', [S.state.waitHost.cancel]);
  await expect(page.getByRole('alert')).toHaveCount(0);
  hostPresent = true;
  await expect(page.getByTestId('lobby-nickname')).toBeVisible({ timeout: 8000 });
  await ctx.close();
});

test('IT-57 [FR-11,SEC-07,NFR-10] 채팅 경계·XSS(360px): 500자(이모지 500개 포함)는 전달되고 501자는 막히며 입력이 보존되고, 초장문·악성 URL이 레이아웃·속성을 깨지 못한다', async ({ browser, env }) => {
  const vp = { width: 360, height: 740 };
  const host = await hostMeeting(browser, env, '호스트', { viewport: vp });
  const g = await guestMeeting(browser, host.url, '민지', { viewport: vp });
  await host.page.getByTestId('btn-chat').click();
  await g.page.getByTestId('btn-chat').click();
  const send = async (text: string): Promise<void> => {
    await g.page.getByTestId('chat-input').fill(text);
    await g.page.getByTestId('chat-send').click();
  };
  const texts = host.page.getByTestId('chat-text');
  // 경계: 정확히 500자
  const ok500 = 'a'.repeat(500);
  await send(ok500);
  await expect(texts).toHaveCount(1);
  expect(await texts.first().textContent()).toBe(ok500);
  await expect(g.page.getByTestId('chat-input')).toHaveValue(''); // 전송 즉시 비움
  // 이모지 500개(UTF-16 1000단위)도 코드포인트로 센다
  const emoji500 = '😀'.repeat(500);
  await g.page.getByTestId('chat-input').fill(emoji500);
  await expect(g.page.getByText(S.chat.counter(500))).not.toHaveClass(/danger-text/); // 글자 수는 코드포인트 단위
  await g.page.getByTestId('chat-send').click();
  await expect(texts).toHaveCount(2);
  expect([...((await texts.nth(1).textContent()) ?? '')].length).toBe(500);
  // 경계 초과: 501자는 서버로 가지 않고 오류와 입력 보존
  const tooLong = 'b'.repeat(501);
  await g.page.getByTestId('chat-input').fill(tooLong);
  await expect(g.page.getByText(S.chat.counter(501))).toHaveClass(/danger-text/);
  await g.page.getByTestId('chat-send').click();
  await expect(g.page.getByRole('alert').filter({ hasText: S.chat.tooLong })).toBeVisible();
  await expect(g.page.getByTestId('chat-input')).toHaveValue(tooLong);
  await expect(texts).toHaveCount(2);
  // 공백만: 보내기 비활성
  await g.page.getByTestId('chat-input').fill('    ');
  await expect(g.page.getByTestId('chat-send')).toBeDisabled();
  // 초장문 단어·긴 URL·악성 URL: 가로 스크롤과 속성 주입이 없다
  await send('c'.repeat(400));
  await send(`https://example.com/${'d'.repeat(300)}`);
  await send('https://evil.test/"onmouseover="window.__xss=1" x=<img src=x onerror=window.__xss=2>');
  await expect(texts).toHaveCount(5);
  await noHScroll(host.page, '채팅 패널');
  const overflow = await host.page.getByTestId('chat-panel').evaluate((el) => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const attrs = await host.page.getByTestId('chat-panel').locator('a').evaluateAll((as) => as.map((a) => [...a.attributes].map((x) => x.name).sort().join(',')));
  expect(attrs.length).toBe(2);
  for (const a of attrs) expect(a).toBe('class,href,rel,target');
  expect(await host.page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  expect(await host.page.getByTestId('chat-panel').locator('img').count()).toBe(0);
});

test('IT-57b [FR-11,UX-03] 보이지 않는 문자만 있는 메시지가 서버에서 거부되면 "500자까지"가 아니라 실제 원인에 맞는 안내가 나와야 한다 (DEF-W01 수정)', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  await host.page.getByTestId('btn-chat').click();
  await host.page.getByTestId('chat-input').fill('​​');
  await host.page.getByTestId('chat-send').click();
  const alert = host.page.getByRole('alert').filter({ hasText: /./ });
  await expect(alert.first()).toBeVisible();
  await expect(alert.first()).not.toContainText(S.chat.tooLong, { timeout: 2000 });
});

test('IT-58 [NFR-10,UX-02,UX-10] 360px 터치 타깃: 랜딩·대기실·회의실(채팅·참가자 패널, 확인창, 장치 시트)의 버튼·입력·링크가 44px 이상이다(인라인 링크와 알려진 결함 DEF-W02·W03 제외)', async ({ browser, env }) => {
  const vp = { width: 360, height: 740 };
  const found: string[] = [];
  const small = (page: Page, label: string): Promise<void> =>
    page
      .evaluate(() => {
        const out: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [role="button"]')) {
          if (!el.offsetWidth && !el.offsetHeight) continue;
          if (el.closest('.sr-only')) continue;
          if (el.tagName === 'A' && el.closest('p, [data-testid="chat-text"]')) continue; // 문장 속 인라인 링크
          const target = el instanceof HTMLInputElement && el.type === 'checkbox' ? (el.closest('label') ?? el) : el;
          const r = target.getBoundingClientRect();
          if (r.height < 43.5 || r.width < 43.5) out.push(`${el.tagName.toLowerCase()}[${el.getAttribute('data-testid') ?? el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 12)}] ${Math.round(r.width)}x${Math.round(r.height)}`);
        }
        return out;
      })
      .then((list) => void found.push(...list.map((x) => `${label}: ${x}`)));
  const land = await browser.newContext({ viewport: vp });
  const lp = await land.newPage();
  await lp.goto(env.base);
  await small(lp, '랜딩');
  await lp.getByTestId('use-password').check();
  await small(lp, '랜딩(비밀번호)');
  await land.close();
  const host = await hostMeeting(browser, env, '호스트', { viewport: vp });
  const { ctx, page } = await lobbyOf(browser, host.url, { viewport: vp });
  await page.getByTestId('lobby-nickname').waitFor();
  await page.waitForTimeout(600);
  await small(page, '대기실');
  await ctx.close();
  const g = await guestMeeting(browser, host.url, '민지', { viewport: vp });
  await expectRemoteMedia(host.page, 1);
  await small(host.page, '회의실');
  await host.page.getByTestId('btn-chat').click();
  await host.page.getByTestId('chat-input').fill('https://example.com');
  await host.page.getByTestId('chat-send').click();
  await small(host.page, '채팅 패널');
  await host.page.getByTestId('btn-people').click();
  await small(host.page, '참가자 패널(호스트)');
  await g.page.getByTestId('btn-people').click();
  await small(g.page, '참가자 패널(참가자)');
  await host.page.locator('[data-testid^="kick-"]').first().click();
  await small(host.page, '내보내기 확인창');
  await host.page.keyboard.press('Escape');
  await host.page.getByTestId('btn-devices-top').click();
  await small(host.page, '장치 시트');
  expect(found, '44px 미만 요소').toEqual([]);
});

test('IT-58b [NFR-10,UX-10] 360px에서 회의실 머리글의 링크 복사 버튼과 채팅 보내기 버튼도 가로 44px 이상이어야 한다 (DEF-W02·W03 수정)', async ({ browser, env }) => {
  const vp = { width: 360, height: 740 };
  const host = await hostMeeting(browser, env, '호스트', { viewport: vp });
  await host.page.getByTestId('btn-chat').click();
  for (const id of ['copy-link', 'chat-send']) {
    const box = await host.page.getByTestId(id).first().boundingBox();
    expect(box?.width ?? 0, `${id} 가로`).toBeGreaterThanOrEqual(43.5);
    expect(box?.height ?? 0, `${id} 세로`).toBeGreaterThanOrEqual(43.5);
  }
});

test('IT-57c [FR-11,UX-03] 채팅 전송 응답이 오지 않으면(8초 시간 초과) 보낸 글이 입력창에 복원되고 원인·해결 문구가 role=alert로 나온다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const page = await ctx.newPage();
  let drop = false;
  await page.routeWebSocket(/socket\.io/, (ws) => {
    const server = ws.connectToServer();
    ws.onMessage((m) => {
      if (drop && String(m).includes('chat:send')) return; // 서버로 보내지 않는다 = ack가 오지 않는다
      server.send(m);
    });
    server.onMessage((m) => ws.send(m));
  });
  await page.goto(host.url);
  await page.getByTestId('lobby-nickname').fill('민지');
  await page.getByTestId('join-button').click();
  await page.getByTestId('room').waitFor();
  await page.getByTestId('btn-chat').click();
  drop = true;
  await page.getByTestId('chat-input').fill('전달되지 않는 글');
  await page.getByTestId('chat-send').click();
  await expect(page.getByTestId('chat-input')).toHaveValue(''); // 보내는 즉시 비운다
  await expect(page.getByRole('alert').filter({ hasText: S.chat.failed })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('chat-input')).toHaveValue('전달되지 않는 글'); // 실패하면 글을 되돌린다
  await expect(host.page.getByTestId('chat-text')).toHaveCount(0);
  await ctx.close();
});

test('IT-59 [FR-03,FR-04,FR-05,UX-03] 대기실: 닉네임 검증 오류는 입장하지 않고 안내하며, 미리보기 준비 중에는 입장 버튼이 꺼져 있고, 비밀번호 칸은 비밀번호 방의 참가자에게만 보인다', async ({ browser, env }) => {
  // 호스트(비밀번호 방): 대기실에서 비밀번호를 다시 묻지 않고 호스트 배지가 보인다
  const hostCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const hp = await hostCtx.newPage();
  await hp.goto(env.base);
  await hp.getByTestId('nickname').fill('호스트');
  await hp.getByTestId('use-password').check();
  await hp.getByTestId('room-password').fill('room-pass-1');
  await hp.getByTestId('create-room').click();
  await hp.waitForURL(/\/r\/[A-Za-z0-9_-]{22}$/);
  const url = hp.url();
  await expect(hp.getByText(S.lobby.hostBadge)).toBeVisible();
  await expect(hp.getByTestId('lobby-password')).toHaveCount(0);
  await hp.getByTestId('join-button').click();
  await hp.getByTestId('room').waitFor();
  // 참가자: 준비 중에는 입장 버튼 비활성(getUserMedia를 1.5초 지연), 비밀번호 칸 표시
  const { ctx, page } = await lobbyOf(browser, url, {
    init: () => {
      const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (c?: MediaStreamConstraints) => {
        await new Promise((r) => setTimeout(r, 1500));
        return orig(c);
      };
    },
  });
  await expect(page.getByTestId('join-button')).toBeDisabled();
  await expect(page.getByTestId('lobby-password')).toBeVisible();
  await expect(page.getByTestId('join-button')).toBeEnabled({ timeout: 8000 });
  // 닉네임 오류: 빈 값, 허용되지 않는 문자, 21자 → 입장하지 않고 안내
  await page.getByTestId('lobby-password').fill('room-pass-1');
  for (const bad of ['', '<b>x</b>', '가'.repeat(21)]) {
    await page.getByTestId('lobby-nickname').fill(bad);
    await page.getByTestId('join-button').click();
    await expect(page.getByTestId('join-error'), JSON.stringify(bad)).toHaveText(S.lobby.invalidNickname);
    await expect(page.getByTestId('room')).toHaveCount(0);
  }
  // 올바른 닉네임과 비밀번호면 입장한다
  await page.getByTestId('lobby-nickname').fill('민지');
  await page.getByTestId('join-button').click();
  await page.getByTestId('room').waitFor();
  await ctx.close();
  await hostCtx.close();
});

test('IT-59b [FR-02,UX-02,FR-13] 혼자 있을 때만 "아직 아무도 없어요" 빈 상태 카드와 링크 복사가 보이고, 참가자가 들어오면 사라진다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const card = host.page.getByTestId('alone');
  await expect(card).toBeVisible();
  await expect(card).toContainText(S.room.alone);
  await expect(card).toContainText(S.room.aloneHint);
  await expect(card.getByTestId('copy-link')).toBeVisible();
  await guestMeeting(browser, host.url, '민지');
  await expect(card).toHaveCount(0);
});
