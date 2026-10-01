import { CAPTURE_PCS, closeAll, expect, expectRemoteMedia, guestMeeting, hostMeeting, test, type Member } from './fixtures';

test.afterEach(async () => {
  await closeAll();
});

test('IT-20 [FR-07,NFR-04,NFR-13,UX-05] 정원 6명이 모두 입장해 서로 5개씩 영상·오디오를 받고, 7번째는 거부된다', async ({ browser, env }) => {
  test.setTimeout(180_000);
  const started = Date.now();
  const host = await hostMeeting(browser, env, '호스트', { initScript: CAPTURE_PCS });
  const members: Member[] = [host];
  for (const name of ['가', '나', '다', '라', '마']) members.push(await guestMeeting(browser, host.url, name));
  for (const m of members) {
    await expect(m.page.locator('[data-testid^="tile-"]')).toHaveCount(6);
    await expectRemoteMedia(m.page, 5, 90_000);
  }
  console.log(`6명 연결 완료까지 ${Math.round((Date.now() - started) / 1000)}초`);
  // 6명일 때 갤러리는 3열 배치
  await expect(host.page.getByTestId('gallery')).toHaveAttribute('data-count', '6');
  // 송신 해상도·비트레이트 상한(NFR-13): 6명이면 카메라 송신이 400kbps 이하, 해상도 1/2로 제한된다
  await expect
    .poll(
      () =>
        host.page.evaluate(() => {
          const pcs = (window as unknown as { __pcs: RTCPeerConnection[] }).__pcs;
          const cams = pcs.flatMap((pc) => pc.getSenders().filter((s, i) => s.track?.kind === 'video' && i === 1 && s.track !== null));
          return cams.map((s) => s.getParameters().encodings?.[0]).map((e) => ({ max: e?.maxBitrate ?? 0, scale: e?.scaleResolutionDownBy ?? 0 }));
        }),
      { timeout: 20_000 },
    )
    .toEqual(Array(5).fill({ max: 400_000, scale: 2 }));
  // 7번째 입장은 거부
  const late = await (await browser.newContext({ permissions: ['camera', 'microphone'] })).newPage();
  await late.goto(host.url);
  await expect(late.getByRole('alert')).toContainText('방이 가득 찼습니다');
  await late.context().close();
});
