import { closeAll, expect, expectRemoteMedia, extraServer, guestMeeting, hostMeeting, test } from './fixtures';

const pathLogs = (lines: string[]): Record<string, unknown>[] =>
  lines.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.msg === 'peer path');

test.afterEach(async () => {
  await closeAll();
});

test('IT-45 [NFR-15,KPI-05] 일반(루프백) 통화에서 각 참가자가 direct를 한 번씩만 보고하고 로그에 식별자가 없다', async ({ browser }) => {
  const lines: string[] = [];
  const s = await extraServer({}, undefined, lines);
  try {
    const host = await hostMeeting(browser, { server: s.server, base: s.base }, '경로호스트');
    const guest = await guestMeeting(browser, host.url, '경로게스트');
    await expectRemoteMedia(host.page, 1, 30_000);
    await expectRemoteMedia(guest.page, 1, 30_000);
    await expect.poll(() => pathLogs(lines).length, { timeout: 15_000 }).toBeGreaterThanOrEqual(2);
    await host.page.waitForTimeout(3000);
    const found = pathLogs(lines);
    expect(found.map((l) => [l.kpi, l.path])).toEqual([['path', 'direct'], ['path', 'direct']]);
    const raw = lines.filter((l) => l.includes('peer path')).join('');
    for (const needle of [host.roomId, host.roomId.slice(0, 6), '경로호스트', '경로게스트', '127.0.0.1']) expect(raw.includes(needle)).toBe(false);
  } finally {
    await s.server.close();
  }
});
