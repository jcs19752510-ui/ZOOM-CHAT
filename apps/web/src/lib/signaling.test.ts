import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Fn = (...a: unknown[]) => void;
const h = vi.hoisted(() => {
  const s = {
    opts: null as Record<string, unknown> | null,
    sock: null as null | {
      connected: boolean;
      handlers: Map<string, Fn[]>;
      emitted: { event: string; payload: unknown; cb: (r: unknown) => void }[];
      removedAll: number;
      disconnected: number;
    },
  };
  return s;
});

vi.mock('socket.io-client', () => ({
  io: (opts: Record<string, unknown>) => {
    h.opts = opts;
    const handlers = new Map<string, Fn[]>();
    const sock = {
      connected: false,
      handlers,
      emitted: [] as { event: string; payload: unknown; cb: (r: unknown) => void }[],
      removedAll: 0,
      disconnected: 0,
      once(e: string, fn: Fn) {
        const w: Fn = (...a) => {
          sock.off(e, w);
          fn(...a);
        };
        (w as Fn & { orig?: Fn }).orig = fn;
        handlers.set(e, [...(handlers.get(e) ?? []), w]);
      },
      off(e: string, fn: Fn) {
        handlers.set(e, (handlers.get(e) ?? []).filter((x) => x !== fn && (x as Fn & { orig?: Fn }).orig !== fn));
      },
      emit(event: string, payload: unknown, cb: (r: unknown) => void) {
        sock.emitted.push({ event, payload, cb });
      },
      removeAllListeners() {
        sock.removedAll++;
      },
      disconnect() {
        sock.disconnected++;
      },
    };
    h.sock = sock;
    return sock;
  },
}));

import { SignalingClient } from './signaling';

const fire = (e: string, ...a: unknown[]): void => {
  for (const fn of [...(h.sock?.handlers.get(e) ?? [])]) fn(...a);
};

beforeEach(() => {
  vi.useFakeTimers();
  h.opts = null;
  h.sock = null;
});
afterEach(() => vi.useRealTimers());

describe('SignalingClient (unit-06, FR-20, NFR-03)', () => {
  it('TC-468s [FR-20,NFR-03] WebSocket 전용·무한 재연결·지수 백오프(0.4~3초) 설정으로 연결한다', () => {
    new SignalingClient();
    expect(h.opts).toMatchObject({ path: '/socket.io', transports: ['websocket'], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 400, reconnectionDelayMax: 3000 });
  });

  it('TC-468t [FR-01,FR-20] connect는 연결되면 해결, 오류·10초 초과면 거부하며 대기 리스너를 정리하고, 이미 연결돼 있으면 즉시 해결한다', async () => {
    const c = new SignalingClient();
    const p = c.connect();
    fire('connect');
    await expect(p).resolves.toBeUndefined();
    expect(h.sock?.handlers.get('connect')?.length).toBe(0);
    expect(h.sock?.handlers.get('connect_error')?.length).toBe(0);
    const c2 = new SignalingClient();
    const p2 = c2.connect();
    fire('connect_error', new Error('refused'));
    await expect(p2).rejects.toThrow('refused');
    const c3 = new SignalingClient();
    const p3 = c3.connect().catch((e: Error) => e.message);
    await vi.advanceTimersByTimeAsync(10_001);
    expect(await p3).toBe('timeout');
    expect(h.sock?.handlers.get('connect')?.length).toBe(0);
    const c4 = new SignalingClient();
    if (h.sock) h.sock.connected = true;
    await expect(c4.connect()).resolves.toBeUndefined();
  });

  it('TC-468u [FR-20,SEC-03] request는 ack를 그대로 돌려주고, 응답이 없으면 지정 시간(기본 8초) 뒤 NETWORK 오류로 끝나며, 늦은 ack는 결과를 바꾸지 못한다', async () => {
    const c = new SignalingClient();
    const p = c.request('chat:send', { v: 1, text: 'x' });
    expect(h.sock?.emitted[0]).toMatchObject({ event: 'chat:send', payload: { v: 1, text: 'x' } });
    h.sock?.emitted[0]?.cb({ ok: true });
    await expect(p).resolves.toEqual({ ok: true });
    const slow = c.request('chat:send', { v: 1, text: 'y' });
    await vi.advanceTimersByTimeAsync(7_900);
    let done = false;
    void slow.then(() => (done = true));
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(200);
    await expect(slow).resolves.toEqual({ ok: false, code: 'NETWORK', message: 'timeout' });
    h.sock?.emitted[1]?.cb({ ok: true }); // 늦게 온 ack는 이미 끝난 결과를 바꾸지 않는다
    const short = c.request('media:state', { v: 1, audio: true, video: true }, 3000);
    await vi.advanceTimersByTimeAsync(3_001);
    await expect(short).resolves.toMatchObject({ ok: false, code: 'NETWORK' });
  });

  it('TC-468v [FR-22] close는 모든 리스너를 제거하고 소켓을 끊는다', () => {
    const c = new SignalingClient();
    c.close();
    expect(h.sock?.removedAll).toBe(1);
    expect(h.sock?.disconnected).toBe(1);
  });
});
