import { closeAll, expect, expectRemoteMedia, extraServer, guestMeeting, hostMeeting, test } from './fixtures';

// unit-19 6단계 추가 시험: 3인 mesh에서 연결 수만큼만 보고되고 사용자 화면은 변하지 않는다(NFR-15)
const pathLogs = (lines: string[]): Record<string, unknown>[] =>
  lines.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.msg === 'peer path');

test.afterEach(async () => {
  await closeAll();
});

test('IT-47 [NFR-15,KPI-05] 3인 통화에서 연결 6개 끝(참가자당 2개)이 direct를 정확히 6줄 보고하고, 로그에 식별자가 없으며, 화면에 알림·경고가 뜨지 않는다', async ({ browser }) => {
  test.setTimeout(120_000);
  const lines: string[] = [];
  const s = await extraServer({}, undefined, lines);
  try {
    const host = await hostMeeting(browser, { server: s.server, base: s.base }, '경로삼호스트');
    const g1 = await guestMeeting(browser, host.url, '경로삼가');
    const g2 = await guestMeeting(browser, host.url, '경로삼나');
    for (const m of [host, g1, g2]) await expectRemoteMedia(m.page, 2, 60_000);
    await expect.poll(() => pathLogs(lines).length, { timeout: 20_000 }).toBeGreaterThanOrEqual(6);
    await host.page.waitForTimeout(4000); // 재시도·중복 보고가 있다면 이 사이에 나타난다
    const found = pathLogs(lines);
    expect(found.map((l) => [l.kpi, l.path])).toEqual(Array(6).fill(['path', 'direct']));
    const raw = lines.filter((l) => l.includes('peer path')).join('');
    for (const needle of [host.roomId, host.roomId.slice(0, 6), '경로삼호스트', '경로삼가', '경로삼나', '127.0.0.1']) expect(raw.includes(needle)).toBe(false);
    for (const m of [host, g1, g2]) await expect(m.page.getByRole('alert')).toHaveCount(0);
  } finally {
    await s.server.close();
  }
});
