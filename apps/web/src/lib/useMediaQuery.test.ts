import type * as ReactTypes from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ args: [] as unknown[][] }));
vi.mock('react', async (orig) => ({
  ...(await orig<typeof ReactTypes>()),
  useSyncExternalStore: (...a: unknown[]) => {
    h.args.push(a);
    return (a[1] as () => boolean)();
  },
}));

import { useMediaQuery } from './useMediaQuery';

afterEach(() => {
  vi.unstubAllGlobals();
  h.args.length = 0;
});

const fakeWindow = (matches: boolean) => {
  const listeners = new Set<() => void>();
  const m = { matches, addEventListener: vi.fn((_: string, cb: () => void) => listeners.add(cb)), removeEventListener: vi.fn((_: string, cb: () => void) => listeners.delete(cb)) };
  const matchMedia = vi.fn(() => m);
  vi.stubGlobal('window', { matchMedia });
  return { m, matchMedia, listeners };
};

describe('useMediaQuery (unit-09, NFR-10, UX-05)', () => {
  it('TC-459c [NFR-10] 현재 일치 여부를 그대로 돌려주고 질의 문자열을 matchMedia에 넘긴다', () => {
    const w = fakeWindow(true);
    expect(useMediaQuery('(max-width: 767px)')).toBe(true);
    expect(w.matchMedia).toHaveBeenCalledWith('(max-width: 767px)');
    fakeWindow(false);
    expect(useMediaQuery('(max-width: 639px)')).toBe(false);
  });

  it('TC-459d [NFR-10] 구독은 change 리스너를 달고, 해제는 같은 리스너를 뗀다(누수 없음). 변경 알림이 콜백으로 전달된다', () => {
    const w = fakeWindow(false);
    useMediaQuery('(max-width: 767px)');
    const subscribe = h.args[0]?.[0] as (cb: () => void) => () => void;
    const cb = vi.fn();
    const unsubscribe = subscribe(cb);
    expect(w.m.addEventListener).toHaveBeenCalledWith('change', cb);
    expect(w.listeners.size).toBe(1);
    for (const l of w.listeners) l();
    expect(cb).toHaveBeenCalledTimes(1);
    unsubscribe();
    expect(w.m.removeEventListener).toHaveBeenCalledWith('change', cb);
    expect(w.listeners.size).toBe(0);
  });

  it('TC-459e [UX-05] 서버/첫 렌더 스냅샷은 false(넓은 화면 기준)이다', () => {
    fakeWindow(true);
    useMediaQuery('(max-width: 767px)');
    expect((h.args[0]?.[2] as () => boolean)()).toBe(false);
  });
});
