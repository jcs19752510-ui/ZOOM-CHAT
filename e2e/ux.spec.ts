import { closeAll, expect, guestMeeting, hostMeeting, test } from './fixtures';

test.afterEach(async () => {
  await closeAll();
});

test('IT-23 [FR-02,UX-12] 링크 복사 버튼은 링크를 클립보드에 복사하고 결과를 알린다. 클립보드가 막히면 선택 가능한 링크를 보여 준다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  await host.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: env.base });
  await host.page.getByTestId('copy-link').first().click();
  await expect(host.page.getByTestId('copy-link').first()).toHaveAttribute('aria-label', '링크를 복사했습니다');
  expect(await host.page.evaluate(() => navigator.clipboard.readText())).toBe(`${env.base}/r/${host.roomId}`);

  // 클립보드가 거부되는 환경
  const g = await guestMeeting(browser, host.url, '민지');
  await g.page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) }, configurable: true });
  });
  await g.page.getByTestId('copy-link').first().click();
  await expect(g.page.locator('input[readonly]')).toHaveValue(`${env.base}/r/${host.roomId}`);
});

test('IT-24 [NFR-02,KPI-03] 입장 버튼을 누른 뒤 첫 원격 영상까지 걸리는 시간(로컬 루프백 기준, 중앙값 5초·최대 10초 이내)', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const samples: number[] = [];
  for (let i = 0; i < 5; i++) {
    const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const page = await ctx.newPage();
    await page.goto(host.url);
    await page.getByTestId('lobby-nickname').fill(`측정${i}`);
    await page.waitForTimeout(500); // 미리보기 준비
    const t0 = Date.now();
    await page.getByTestId('join-button').click();
    await expect
      .poll(() => page.evaluate(() => [...document.querySelectorAll<HTMLVideoElement>('video[data-peer-id][data-kind="camera"]')].filter((v) => !v.muted && v.videoWidth > 0).length), { timeout: 10_000 })
      .toBeGreaterThan(0);
    samples.push(Date.now() - t0);
    await ctx.close();
  }
  samples.sort((a, b) => a - b);
  console.log(`첫 영상까지(ms): ${samples.join(', ')}`);
  expect(samples[2] ?? Infinity).toBeLessThanOrEqual(5000);
  expect(samples[samples.length - 1] ?? Infinity).toBeLessThanOrEqual(10_000);
});

test('IT-25 [UX-04] 컨트롤바 순서는 마이크, 카메라, 화면공유, 채팅, 참가자, 나가기이고 나가기는 분리되어 위험색이다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const order = await host.page.evaluate(() => [...document.querySelectorAll('nav button[data-testid]')].map((b) => b.getAttribute('data-testid')).filter((id) => id !== 'btn-devices'));
  expect(order).toEqual(['btn-mic', 'btn-camera', 'btn-share', 'btn-chat', 'btn-people', 'btn-leave']);
  const leave = host.page.getByTestId('btn-leave');
  expect(await leave.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(201, 50, 59)');
  expect(await leave.evaluate((el) => getComputedStyle(el.parentElement as HTMLElement).borderLeftWidth)).toBe('1px');
});

test('IT-26 [UX-09] 대기실에 네트워크 정보(IP) 노출 가능성 고지가 보인다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const page = await ctx.newPage();
  await page.goto(host.url);
  await expect(page.getByTestId('privacy-notice')).toBeVisible();
  await expect(page.getByTestId('privacy-notice')).toContainText('IP');
  await ctx.close();
});

test('IT-27 [UX-11] prefers-reduced-motion이면 전환·애니메이션이 사실상 꺼진다', async ({ browser, env }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(env.base);
  const d = await page.getByTestId('create-room').evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration));
  expect(d).toBeLessThanOrEqual(0.001);
  await ctx.close();
});

test('IT-28 [UX-12,FR-13] 입장·퇴장 알림은 aria-live 영역에 표시된다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const live = host.page.locator('[role="status"][aria-live="polite"]');
  const g = await guestMeeting(browser, host.url, '민지');
  await expect(live.getByText('민지님이 입장했습니다')).toBeVisible();
  await g.page.getByTestId('btn-leave').click();
  await g.page.getByRole('button', { name: '나가기' }).last().click();
  await expect(live.getByText('민지님이 나갔습니다')).toBeVisible();
});
