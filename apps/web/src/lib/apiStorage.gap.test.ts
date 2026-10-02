import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoom, getMeta, getRoomStatus } from './api';
import { loadNickname } from './storage';

afterEach(() => vi.unstubAllGlobals());

const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('REST·저장소 보강 (unit-06, FR-01, FR-06)', () => {
  it('TC-511 [FR-01,SEC-02] 모든 REST 요청은 content-type JSON을 보내고, 방 상태 조회는 본문 없는 GET이다', async () => {
    const f = vi.fn((_u: string, _i?: RequestInit) => Promise.resolve(json(200, { v: 1, exists: true, hostPresent: true, locked: false, full: false, needsPassword: false })));
    vi.stubGlobal('fetch', f);
    await createRoom('pw');
    await getRoomStatus('abc');
    const [, post] = f.mock.calls[0] ?? [];
    const [, get] = f.mock.calls[1] ?? [];
    expect(new Headers(post?.headers).get('content-type')).toBe('application/json');
    expect(new Headers(get?.headers).get('content-type')).toBe('application/json');
    expect(get?.method).toBeUndefined();
    expect(get?.body).toBeUndefined();
  });

  it('TC-511b [FR-06] 메타 조회 성공은 /api/meta의 검증된 값을 돌려주고, 오류 응답 코드는 그대로 전달한다', async () => {
    const f = vi.fn((_u: string) => Promise.resolve(json(200, { nonsense: 1 })));
    vi.stubGlobal('fetch', f);
    expect((await getMeta()).ok).toBe(false);
    expect(f.mock.calls[0]?.[0]).toBe('/api/meta');
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(json(503, { code: 'INTERNAL' }))));
    expect(await getMeta()).toEqual({ ok: false, code: 'INTERNAL' });
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('x'))));
    expect(await getMeta()).toEqual({ ok: false, code: 'NETWORK' });
  });

  it('TC-512 [FR-03] 저장된 닉네임이 없으면 빈 문자열이다(기본값을 지어내지 않는다)', () => {
    vi.stubGlobal('localStorage', { getItem: () => null });
    expect(loadNickname()).toBe('');
  });
});

describe('SignalingClient 보강 (unit-06, NFR-03)', () => {
  it('TC-513 [NFR-03] ack가 오면 대기 타이머를 정리한다(8초 뒤 늦은 타임아웃 타이머가 남지 않는다)', async () => {
    vi.useFakeTimers();
    try {
      vi.resetModules();
      vi.doMock('socket.io-client', () => ({
        io: () => ({ connected: true, emit: (_e: string, _p: unknown, cb: (r: unknown) => void) => cb({ ok: true }), once: () => undefined, off: () => undefined, removeAllListeners: () => undefined, disconnect: () => undefined }),
      }));
      const { SignalingClient: Fresh } = await import('./signaling');
      const c = new Fresh();
      expect(await c.request('chat:send', { v: 1, text: 'x' })).toEqual({ ok: true });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.doUnmock('socket.io-client');
      vi.useRealTimers();
    }
  });
});
