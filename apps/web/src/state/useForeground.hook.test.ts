import type * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../testing/hookHarness';

vi.mock('react', async (orig) => {
  const actual = await orig<typeof React>();
  const { fakeHooks } = await import('../testing/hookHarness');
  return { ...actual, ...fakeHooks, default: { ...actual, ...fakeHooks } };
});

import type { MeetingController } from './MeetingController';
import { useForeground } from './useForeground';

// 소급 6단계(unit-06): 화면 복귀 신호 훅(UX-14)의 구독·중복 제거·해제를 DOM 없이 시험한다.
type Listener = () => void;
const mkTarget = (): { listeners: Map<string, Set<Listener>>; addEventListener: (e: string, l: Listener) => void; removeEventListener: (e: string, l: Listener) => void; emit: (e: string) => void; count: (e: string) => number } => {
  const listeners = new Map<string, Set<Listener>>();
  return {
    listeners,
    addEventListener: (e, l) => void listeners.set(e, (listeners.get(e) ?? new Set()).add(l)),
    removeEventListener: (e, l) => void listeners.get(e)?.delete(l),
    emit: (e) => listeners.get(e)?.forEach((l) => l()),
    count: (e) => listeners.get(e)?.size ?? 0,
  };
};
let doc: ReturnType<typeof mkTarget> & { visibilityState: string };
let win: ReturnType<typeof mkTarget>;
let onForeground: ReturnType<typeof vi.fn>;
const Probe = ({ c }: { c: MeetingController }): null => {
  useForeground(c);
  return null;
};
const up = (): ReturnType<typeof mount<{ c: MeetingController }>> => mount(Probe as (p: { c: MeetingController }) => null, { c: { onForeground } as unknown as MeetingController });

beforeEach(() => {
  vi.useFakeTimers();
  doc = Object.assign(mkTarget(), { visibilityState: 'visible' });
  win = mkTarget();
  onForeground = vi.fn(() => Promise.resolve());
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', win);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useForeground (unit-06 보강, UX-14)', () => {
  it('TC-523 [UX-14] 화면이 다시 보이면(visible) 컨트롤러에 알리고, 숨겨질 때(hidden)는 알리지 않으며, pageshow도 알린다', () => {
    up();
    doc.visibilityState = 'hidden';
    doc.emit('visibilitychange');
    expect(onForeground).not.toHaveBeenCalled();
    doc.visibilityState = 'visible';
    doc.emit('visibilitychange');
    expect(onForeground).toHaveBeenLastCalledWith('visibility');
    vi.advanceTimersByTime(600);
    win.emit('pageshow');
    expect(onForeground).toHaveBeenLastCalledWith('pageshow');
    expect(onForeground).toHaveBeenCalledTimes(2);
  });

  it('TC-523b [UX-14] visibilitychange와 pageshow가 500ms 안에 겹쳐도 한 번만 전달하고, 500ms가 지나면 다시 전달한다', () => {
    up();
    doc.emit('visibilitychange');
    win.emit('pageshow');
    expect(onForeground).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(499);
    win.emit('pageshow');
    expect(onForeground).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    win.emit('pageshow');
    expect(onForeground).toHaveBeenCalledTimes(2);
  });

  it('TC-523c [UX-14] 언마운트하면 두 구독을 모두 해제해 이후 신호가 컨트롤러에 가지 않는다', () => {
    const m = up();
    expect(doc.count('visibilitychange')).toBe(1);
    expect(win.count('pageshow')).toBe(1);
    m.unmount();
    expect(doc.count('visibilitychange')).toBe(0);
    expect(win.count('pageshow')).toBe(0);
  });
});
