import { afterEach, describe, expect, it, vi } from 'vitest';

// unit-19 6단계: 구 서버(metrics:path 핸들러 없음 = ack가 오지 않음)에서도 클라이언트 요청이 예외·무한 대기 없이 끝난다(NFR-15)
const emitted: { event: string; payload: unknown }[] = [];
vi.mock('socket.io-client', () => ({
  io: () => ({
    connected: true,
    emit: (event: string, payload: unknown) => void emitted.push({ event, payload }), // ack 콜백을 부르지 않는다
  }),
}));

afterEach(() => {
  vi.useRealTimers();
  emitted.length = 0;
});

describe('구 서버 호환 (NFR-15)', () => {
  it('TC-419f [NFR-15] ack가 오지 않아도 metrics:path 요청은 지정한 시간 뒤 NETWORK 결과로 끝나고 거부(예외)가 나지 않으며, 보낸 페이로드는 {v,path}뿐이다', async () => {
    vi.useFakeTimers();
    const { SignalingClient } = await import('./signaling');
    const c = new SignalingClient();
    const p = c.request('metrics:path', { v: 1, path: 'relay' }, 3000);
    let settled = false;
    void p.then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(2999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await p).toMatchObject({ ok: false, code: 'NETWORK' });
    expect(emitted).toEqual([{ event: 'metrics:path', payload: { v: 1, path: 'relay' } }]);
    expect(vi.getTimerCount()).toBe(0);
  });
});
