import { closeAll, expect, expectRemoteMedia, guestMeeting, hostMeeting, test, type Member } from './fixtures';

test.afterEach(async () => {
  await closeAll();
});

/** 모든 원격 카메라 영상의 누적 재생 프레임 수(영상이 실제로 흐르는지 확인용) */
async function remoteFrames(m: Member): Promise<number[]> {
  return m.page.evaluate(() =>
    [...document.querySelectorAll<HTMLVideoElement>('video[data-peer-id][data-kind="camera"]')]
      .filter((v) => !v.muted)
      .map((v) => v.getVideoPlaybackQuality().totalVideoFrames),
  );
}

test('IT-29 [NFR-03,NFR-04,NFR-13] 6명이 오래 통화해도 모든 원격 영상이 계속 흐르고 페이지 오류가 없다 (SOAK_MINUTES 지정 시에만 실행)', async ({ browser, env }) => {
  const minutes = Number(process.env.SOAK_MINUTES ?? '0');
  test.skip(!(minutes > 0), 'SOAK_MINUTES가 없으면 실행하지 않는다(장시간 시험).');
  test.setTimeout((minutes + 4) * 60_000);
  const host = await hostMeeting(browser, env, '호스트');
  const members: Member[] = [host];
  for (const name of ['가', '나', '다', '라', '마']) members.push(await guestMeeting(browser, host.url, name));
  const errors: string[] = [];
  for (const m of members) {
    m.page.on('pageerror', (e) => errors.push(e.message));
    await expectRemoteMedia(m.page, 5, 90_000);
  }
  const rounds = Math.ceil((minutes * 60) / 30);
  let prev = await Promise.all(members.map(remoteFrames));
  for (let i = 0; i < rounds; i++) {
    await host.page.waitForTimeout(30_000);
    const cur = await Promise.all(members.map(remoteFrames));
    cur.forEach((frames, mi) => {
      expect(frames, `참가자 ${mi} 원격 영상 수`).toHaveLength(5);
      frames.forEach((f, vi) => expect(f, `참가자 ${mi}의 ${vi}번 영상이 ${i + 1}번째 구간에서 멈춤`).toBeGreaterThan(prev[mi]?.[vi] ?? -1));
    });
    prev = cur;
  }
  console.log(`소크 ${minutes}분, ${rounds}회 표본 모두 영상 진행, 페이지 오류 ${errors.length}건`);
  expect(errors).toEqual([]);
});

test('IT-30 [NFR-02,NFR-13] CPU를 4배 느리게 한 저사양 기기 모사에서도 3명 통화가 연결되고 영상이 계속 흐른다', async ({ browser, env }) => {
  test.setTimeout(120_000);
  const host = await hostMeeting(browser, env, '호스트');
  const slow = await guestMeeting(browser, host.url, '저사양');
  const third = await guestMeeting(browser, host.url, '셋째');
  const cdp = await slow.context.newCDPSession(slow.page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  for (const m of [host, slow, third]) await expectRemoteMedia(m.page, 2, 90_000);
  const before = await remoteFrames(slow);
  await slow.page.waitForTimeout(5_000);
  const after = await remoteFrames(slow);
  expect(after).toHaveLength(2);
  after.forEach((f, i) => expect(f).toBeGreaterThan(before[i] ?? -1));
});
