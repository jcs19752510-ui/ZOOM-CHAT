import { closeAll, expect, expectRemoteMedia, guestMeeting, hostMeeting, test } from './fixtures';

test.afterEach(async () => {
  await closeAll();
});

test('IT-01 [FR-01,FR-03,FR-04,FR-07,NFR-01] 3명이 입장해 서로의 비디오·오디오 트랙을 수신한다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env, '호스트');
  const a = await guestMeeting(browser, host.url, '민지');
  const b = await guestMeeting(browser, host.url, '철수');
  for (const m of [host, a, b]) {
    await expect(m.page.locator('[data-testid^="tile-"]')).toHaveCount(3);
    await expectRemoteMedia(m.page, 2);
  }
  // 참가자 목록: 3명, 호스트 표시
  await host.page.getByTestId('btn-people').click();
  await expect(host.page.getByTestId('people-list').locator('li')).toHaveCount(3);
});

test('IT-02 [FR-08,FR-13,UX-05] 마이크·카메라를 끄면 다른 참가자의 목록과 타일에 반영된다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const a = await guestMeeting(browser, host.url, '민지');
  await expectRemoteMedia(host.page, 1);
  await a.page.getByTestId('btn-mic').click();
  await a.page.getByTestId('btn-camera').click();
  await host.page.getByTestId('btn-people').click();
  const row = host.page.getByTestId('people-list').locator('li', { hasText: '민지' });
  await expect(row.getByLabel('마이크 꺼짐')).toBeVisible();
  await expect(row.getByLabel('카메라 꺼짐')).toBeVisible();
  // 카메라를 다시 켜면 영상이 다시 흐른다
  await a.page.getByTestId('btn-camera').click();
  await expect(row.getByLabel('카메라 켜짐')).toBeVisible();
  await expectRemoteMedia(host.page, 1);
});

test('IT-03 [FR-20,FR-19,NFR-03] 네트워크가 끊겼다 복구되면 같은 자리로 돌아오고 영상이 다시 흐른다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const a = await guestMeeting(browser, host.url, '민지');
  await expectRemoteMedia(host.page, 1);
  await expectRemoteMedia(a.page, 1);
  env.server.disconnectAll();
  await expect(a.page.getByTestId('conn-badge')).toHaveAttribute('data-state', 'reconnecting');
  await expect(a.page.getByTestId('conn-badge')).toHaveAttribute('data-state', /live|poor/, { timeout: 20_000 });
  await expect(host.page.getByTestId('conn-badge')).toHaveAttribute('data-state', /live|poor/, { timeout: 20_000 });
  // 같은 참가자 수, 퇴장 처리 없음
  await expect(host.page.locator('[data-testid^="tile-"]')).toHaveCount(2);
  await expectRemoteMedia(host.page, 1);
  await expectRemoteMedia(a.page, 1);
});

test('IT-04 [FR-11,SEC-07] 채팅의 XSS 페이로드는 텍스트로만 표시되고 http 링크만 안전하게 열린다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const a = await guestMeeting(browser, host.url, '민지');
  await host.page.getByTestId('btn-chat').click();
  await a.page.getByTestId('btn-chat').click();
  const payloads = ['<img src=x onerror="window.__xss=1">', '<script>window.__xss=2</script>', 'javascript:window.__xss=3', '"><svg onload=window.__xss=4>'];
  for (const p of payloads) {
    await a.page.getByTestId('chat-input').fill(p);
    await a.page.getByTestId('chat-send').click();
  }
  const texts = host.page.getByTestId('chat-text');
  await expect(texts).toHaveCount(payloads.length);
  for (const [i, p] of payloads.entries()) await expect(texts.nth(i)).toHaveText(p);
  expect(await host.page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  expect(await host.page.getByTestId('chat-panel').locator('img, script, svg[onload]').count()).toBe(0);
  expect(await host.page.getByTestId('chat-panel').locator('a').count()).toBe(0); // javascript: 는 링크가 되지 않는다
  await a.page.getByTestId('chat-input').fill('참고 https://example.com/page 입니다');
  await a.page.getByTestId('chat-send').click();
  const link = host.page.getByTestId('chat-panel').locator('a');
  await expect(link).toHaveCount(1);
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('href', 'https://example.com/page');
});

test('IT-05 [FR-14,FR-15,FR-16,SEC-05] 호스트가 방을 잠그고, 전체 음소거하고, 참가자를 내보낸다(재입장 차단)', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const a = await guestMeeting(browser, host.url, '민지');
  const b = await guestMeeting(browser, host.url, '철수');
  await host.page.getByTestId('btn-people').click();

  // 비호스트에게는 호스트 도구가 보이지 않는다
  await a.page.getByTestId('btn-people').click();
  await expect(a.page.getByTestId('btn-lock')).toHaveCount(0);

  // 전체 음소거
  await host.page.getByTestId('btn-mute-all').click();
  await host.page.getByRole('button', { name: '전체 음소거' }).last().click();
  await expect(a.page.getByTestId('btn-mic')).toHaveAttribute('aria-pressed', 'true');
  await expect(b.page.getByTestId('btn-mic')).toHaveAttribute('aria-pressed', 'true');

  // 방 잠금: 새 참가자는 입장할 수 없다
  await host.page.getByTestId('btn-lock').click();
  const late = await (await browser.newContext({ permissions: ['camera', 'microphone'] })).newPage();
  await late.goto(host.url);
  await expect(late.getByText('방이 잠겨 있습니다')).toBeVisible();
  await late.context().close();

  // 강제 퇴장 + 같은 링크로 재입장 차단
  await host.page.locator(`[data-testid^="kick-"]`).first().click();
  await host.page.getByRole('button', { name: '내보내기' }).last().click();
  const kickedText = (page: typeof a.page) => page.getByText('회의에서 내보내졌습니다');
  await expect.poll(async () => (await kickedText(a.page).isVisible()) || (await kickedText(b.page).isVisible())).toBe(true);
  await host.page.getByTestId('btn-lock').click(); // 잠금 해제 후에도 강퇴된 사람은 들어올 수 없어야 한다
  const kickedPage = (await kickedText(a.page).isVisible()) ? a.page : b.page;
  await kickedPage.reload();
  await kickedPage.getByTestId('lobby-nickname').fill('다시');
  await kickedPage.getByTestId('join-button').click();
  await expect(kickedPage.getByText('회의에서 내보내졌습니다')).toBeVisible();
});

test('IT-06 [FR-23,POL-13] 호스트가 입장하기 전에는 대기 화면이 보이고, 호스트가 입장하면 자동으로 진행된다', async ({ browser, env }) => {
  const hostCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const host = await hostCtx.newPage();
  await host.goto(env.base);
  await host.getByTestId('nickname').fill('호스트');
  await host.getByTestId('create-room').click();
  await host.waitForURL(/\/r\//);
  const url = host.url();
  // 호스트는 아직 [입장]을 누르지 않았다
  const guestCtx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const guest = await guestCtx.newPage();
  await guest.goto(url);
  await expect(guest.getByText('호스트를 기다리고 있습니다')).toBeVisible();
  await host.getByTestId('join-button').click();
  await host.getByTestId('room').waitFor();
  await expect(guest.getByTestId('lobby-nickname')).toBeVisible({ timeout: 10_000 });
  await hostCtx.close();
  await guestCtx.close();
});

test('IT-07 [FR-05,SEC-02] 비밀번호 방: 틀린 비밀번호는 거부되고 올바르면 입장한다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env, '호스트', { password: 'room-pass-1' });
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const page = await ctx.newPage();
  await page.goto(host.url);
  await page.getByTestId('lobby-nickname').fill('민지');
  await page.getByTestId('lobby-password').fill('wrong-pass');
  await page.getByTestId('join-button').click();
  await expect(page.getByTestId('join-error')).toContainText('비밀번호가 맞지 않습니다');
  await page.getByTestId('lobby-password').fill('room-pass-1');
  await page.getByTestId('join-button').click();
  await page.getByTestId('room').waitFor();
  await ctx.close();
});

test('IT-08 [FR-12,POL-12,UX-06] 화면공유: 공유 화면은 크게, 다른 사람은 시작할 수 없고, 중지하면 그리드로 돌아온다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const a = await guestMeeting(browser, host.url, '민지');
  await expectRemoteMedia(host.page, 1);
  await a.page.getByTestId('btn-share').click();
  await expect(host.page.getByTestId('share-layout')).toBeVisible();
  await expect(a.page.getByTestId('share-layout')).toBeVisible();
  // 공유 화면이 실제로 수신된다
  await expect
    .poll(() => host.page.evaluate(() => [...document.querySelectorAll<HTMLVideoElement>('video[data-kind="screen"]')].some((v) => v.videoWidth > 0)), { timeout: 30_000 })
    .toBe(true);
  // 다른 사람은 이미 공유 중이라 시작할 수 없다
  await host.page.getByTestId('btn-share').click();
  await expect(host.page.getByText('이미 화면을 공유 중입니다')).toBeVisible();
  await a.page.getByTestId('btn-share').click();
  await expect(host.page.getByTestId('gallery')).toBeVisible();
});

test('IT-09 [FR-17] 호스트가 나가면 다음 참가자가 호스트가 되어 호스트 도구를 쓸 수 있다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const a = await guestMeeting(browser, host.url, '민지');
  await host.page.getByTestId('btn-leave').click();
  await host.page.getByRole('button', { name: '나가기' }).last().click();
  await expect(host.page.getByText('회의에서 나왔습니다')).toBeVisible();
  await a.page.getByTestId('btn-people').click();
  await expect(a.page.getByTestId('btn-lock')).toBeVisible({ timeout: 10_000 });
  await expect(a.page.getByText('이제 내가 호스트입니다')).toBeVisible();
});
