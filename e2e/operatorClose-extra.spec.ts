import net from 'node:net';
import { closeAll, expect, extraServer, guestMeeting, hostMeeting, test } from './fixtures';

// unit-16 6단계 보강: 종료 화면의 접근성(1280px·포커스 순서·alert)과 자원 정리(미디어 트랙 중지·재연결 없음), 끊김 유예 중 폐쇄.
const TOKEN = 'e2e-admin-token-e2e-admin-token-YY';

test.afterEach(async () => {
  await closeAll();
});

async function adminServer(extra: Record<string, string> = {}): Promise<Awaited<ReturnType<typeof extraServer>> & { admin: number }> {
  const admin = await new Promise<number>((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const p = (s.address() as net.AddressInfo).port;
      s.close(() => resolve(p));
    });
  });
  const srv = await extraServer({ ADMIN_PORT: String(admin), ADMIN_TOKEN: TOKEN, ...extra });
  return { ...srv, admin };
}
const closeRoom = (admin: number, roomId: string): Promise<Response> =>
  fetch(`http://127.0.0.1:${admin}/admin/rooms/${roomId}/close`, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } });

/** getUserMedia로 만든 트랙과 호출 횟수를 모은다(자원 정리·재획득 여부 확인용). */
const TRACK_SPY = (): void => {
  const w = window as unknown as { __tracks: MediaStreamTrack[]; __gum: number };
  w.__tracks = [];
  w.__gum = 0;
  const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (c) => {
    w.__gum++;
    const s = await orig(c);
    s.getTracks().forEach((t) => w.__tracks.push(t));
    return s;
  };
};

test('IT-43 [POL-19,UX-02] 운영자 종료 화면(1280px): alert 역할·제목, Tab 순서(새 회의 → 문의·신고), 포커스 표시, 가로 스크롤 없음, 모든 카메라·마이크 트랙 중지, 복귀 이벤트가 와도 소켓·장치를 다시 열지 않는다', async ({ browser }) => {
  const s = await adminServer();
  try {
    const env = { server: s.server, base: s.base };
    const host = await hostMeeting(browser, env, '호스트', { viewport: { width: 1280, height: 720 }, initScript: TRACK_SPY });
    const errors: string[] = [];
    host.page.on('pageerror', (e) => errors.push(String(e)));
    host.page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    let sockets = 0;
    host.page.on('websocket', () => sockets++);
    const before = await host.page.evaluate(() => (window as unknown as { __tracks: MediaStreamTrack[] }).__tracks.filter((t) => t.readyState === 'live').length);
    expect(before, '입장 중에는 카메라·마이크 트랙이 살아 있다').toBeGreaterThanOrEqual(2);

    expect((await closeRoom(s.admin, host.roomId)).status).toBe(200);
    const alert = host.page.getByRole('alert');
    await expect(alert).toContainText('운영자가 이 회의를 종료했습니다');
    await expect(alert.getByRole('heading', { level: 1 })).toHaveText('운영자가 이 회의를 종료했습니다');

    // 자원 정리: 모든 트랙 ended, 회의실 DOM 제거
    await expect
      .poll(() => host.page.evaluate(() => (window as unknown as { __tracks: MediaStreamTrack[] }).__tracks.every((t) => t.readyState === 'ended')))
      .toBe(true);
    await expect(host.page.getByTestId('room')).toHaveCount(0);
    expect(await host.page.evaluate(() => document.querySelectorAll('video').length)).toBe(0);

    // 키보드: 1280px에서도 첫 Tab은 [새 회의 만들기], 다음은 [문의·신고], 되돌리면 다시 첫 버튼, 포커스 표시가 보인다
    await host.page.keyboard.press('Tab');
    await expect(host.page.getByTestId('operator-closed')).toBeFocused();
    const ring = await host.page.getByTestId('operator-closed').evaluate((el) => {
      const cs = getComputedStyle(el);
      return { outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0, shadow: cs.boxShadow !== 'none' };
    });
    expect(ring.outline || ring.shadow, '키보드 포커스 표시(outline 또는 box-shadow)').toBe(true);
    await host.page.keyboard.press('Tab');
    await expect(host.page.getByTestId('operator-closed-contact')).toBeFocused();
    await host.page.keyboard.press('Shift+Tab');
    await expect(host.page.getByTestId('operator-closed')).toBeFocused();
    expect(await host.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await host.page.evaluate(() => document.documentElement.lang)).toBe('ko');

    // 복귀·온라인·페이지 표시 이벤트가 몰려도 소켓·getUserMedia를 다시 열지 않는다
    const socketsAtEnd = sockets;
    const gumAtEnd = await host.page.evaluate(() => (window as unknown as { __gum: number }).__gum);
    await host.page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('online'));
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }));
    });
    await host.page.waitForTimeout(6000);
    expect(sockets, '종료 후 새 WebSocket 연결').toBe(socketsAtEnd);
    expect(await host.page.evaluate(() => (window as unknown as { __gum: number }).__gum), '종료 후 장치 재획득').toBe(gumAtEnd);
    expect(s.server.rooms.size).toBe(0);
    await expect(alert).toContainText('운영자가 이 회의를 종료했습니다');
    expect(errors, '콘솔·페이지 오류').toEqual([]);

    // Enter로 문의·신고 → /contact
    await host.page.keyboard.press('Tab');
    await host.page.keyboard.press('Enter');
    await host.page.waitForURL(/\/contact$/);
  } finally {
    await s.server.close();
  }
});

test('IT-44 [POL-19] 끊김 유예 중(소켓 없음)인 참가자가 있는 방을 폐쇄하면 복귀한 참가자는 재연결·무한 재시도 없이 종료 안내를 보고 방은 다시 생기지 않는다', async ({ browser }) => {
  const s = await adminServer({ RECONNECT_GRACE_SEC: '20' });
  try {
    const env = { server: s.server, base: s.base };
    const host = await hostMeeting(browser, env, '호스트');
    const guest = await guestMeeting(browser, host.url, '민지');
    await expect(host.page.getByTestId('room')).toBeVisible();
    // 게스트의 네트워크를 끊어 유예 상태로 만든다
    await guest.context.setOffline(true);
    await s.server.disconnectAll();
    await host.page.waitForTimeout(1500); // 서버가 게스트 소켓 끊김을 유예 상태로 처리할 시간
    expect([...(s.server.rooms.get(host.roomId)?.participants.values() ?? [])].some((p) => !p.connected)).toBe(true);
    const res = await closeRoom(s.admin, host.roomId);
    expect(res.status).toBe(200);
    await guest.context.setOffline(false);
    // 돌아온 게스트: 방이 없으므로 종료 안내(서비스 재시작/찾을 수 없음 계열 또는 운영자 종료)를 보고 방은 되살아나지 않는다
    await expect(guest.page.getByRole('alert')).toContainText(/회의|종료/, { timeout: 40_000 });
    await guest.page.waitForTimeout(3000);
    expect(s.server.rooms.size).toBe(0);
    const shown = (await guest.page.getByRole('alert').innerText()).replace(/\s+/g, ' ');
    test.info().annotations.push({ type: 'guest-screen', description: shown });
    expect(shown).toMatch(/서비스가 재시작되어 회의가 종료|이미 종료되었거나 만료|운영자가 이 회의를 종료/);
  } finally {
    await s.server.close();
  }
});
