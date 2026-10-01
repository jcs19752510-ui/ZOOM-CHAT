import net from 'node:net';
import { closeAll, expect, expectRemoteMedia, extraServer, guestMeeting, hostMeeting, test } from './fixtures';

const TOKEN = 'e2e-admin-token-e2e-admin-token-ZZ';

test.afterEach(async () => {
  await closeAll();
});

async function adminServer(): Promise<Awaited<ReturnType<typeof extraServer>> & { admin: number }> {
  const admin = await new Promise<number>((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const p = (s.address() as net.AddressInfo).port;
      s.close(() => resolve(p));
    });
  });
  const srv = await extraServer({ ADMIN_PORT: String(admin), ADMIN_TOKEN: TOKEN });
  return { ...srv, admin };
}
const closeRoom = (admin: number, roomId: string): Promise<Response> =>
  fetch(`http://127.0.0.1:${admin}/admin/rooms/${roomId}/close`, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } });

test('IT-41 [POL-19,EVT-34] 운영자가 방을 닫으면 모든 참가자가 "운영자가 이 회의를 종료했습니다"를 보고, 재연결을 시도하지 않으며, 같은 링크로는 다시 입장할 수 없다', async ({ browser }) => {
  const s = await adminServer();
  try {
    const env = { server: s.server, base: s.base };
    const host = await hostMeeting(browser, env);
    const guest = await guestMeeting(browser, host.url, '민지');
    await expectRemoteMedia(host.page, 1);

    const res = await closeRoom(s.admin, host.roomId);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ closed: true, participants: 2 });

    for (const p of [host.page, guest.page]) {
      await expect(p.getByRole('alert')).toContainText('운영자가 이 회의를 종료했습니다');
      await expect(p.getByRole('alert')).toContainText('이 링크로는 다시 입장할 수 없습니다');
      await expect(p.getByTestId('conn-badge')).toHaveCount(0);
    }
    // 재연결 재시도가 없다: 몇 초 뒤에도 같은 화면이고 서버에 방이 다시 생기지 않는다
    await host.page.waitForTimeout(4000);
    await expect(host.page.getByRole('alert')).toContainText('운영자가 이 회의를 종료했습니다');
    expect(s.server.rooms.size).toBe(0);
    // 사유·시각·신원은 표시하지 않는다
    await expect(host.page.getByRole('alert')).not.toContainText(/사유|\d{1,2}:\d{2}|\d{4}[-.]\d{2}/);

    // 같은 링크 재방문 → 일반 '회의를 찾을 수 없습니다'
    await guest.page.goto(host.url);
    await expect(guest.page.getByRole('alert')).toContainText('회의를 찾을 수 없습니다');

    // 문의 안내로 이동
    await host.page.getByTestId('operator-closed-contact').click();
    await host.page.waitForURL(/\/contact$/);
  } finally {
    await s.server.close();
  }
});

test('IT-42 [POL-19,UX-02] 운영자 종료 화면: 360px에서 버튼 터치 44px 이상, 키보드로 [새 회의 만들기]에 닿고, 새 회의 버튼은 랜딩으로 이동한다', async ({ browser }) => {
  const s = await adminServer();
  try {
    const env = { server: s.server, base: s.base };
    const host = await hostMeeting(browser, env, '호스트', { viewport: { width: 360, height: 740 } });
    await closeRoom(s.admin, host.roomId);
    const alert = host.page.getByRole('alert');
    await expect(alert).toContainText('운영자가 이 회의를 종료했습니다');
    for (const id of ['operator-closed', 'operator-closed-contact']) {
      const box = await host.page.getByTestId(id).boundingBox();
      expect(box?.height ?? 0, id).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0, id).toBeGreaterThanOrEqual(44);
    }
    expect(await host.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await host.page.keyboard.press('Tab');
    await expect(host.page.getByTestId('operator-closed')).toBeFocused();
    await host.page.keyboard.press('Enter');
    await host.page.waitForURL(`${s.base}/`);
  } finally {
    await s.server.close();
  }
});
