import type * as ReactTypes from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findOne, textOf } from '../testUtil';
import { S } from '../strings';
import type { Toast } from '../state/MeetingController';

const h = vi.hoisted(() => ({ effects: [] as { fn: () => void | (() => void); deps: unknown[] | undefined }[], setNow: vi.fn() }));
vi.mock('react', async (orig) => ({
  ...(await orig<typeof ReactTypes>()),
  useState: (init: () => number) => [init(), h.setNow],
  useEffect: (fn: () => void | (() => void), deps?: unknown[]) => {
    h.effects.push({ fn, deps });
  },
}));

import { ConnectionBadge } from './ConnectionBadge';
import { Toasts } from './Toasts';

type S0 = Parameters<typeof ConnectionBadge>[0]['state'];
const badge = (over: Partial<S0>) => {
  h.effects.length = 0;
  return ConnectionBadge({ state: { status: 'live', quality: 'good', reconnectingSince: null, graceSec: 20, ...over } });
};
const NOW = 1_700_000_000_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  h.setNow.mockClear();
});
afterEach(() => vi.useRealTimers());

describe('연결 배지 남은 시간 (unit-09, FR-19, POL-08)', () => {
  const left = (since: number | null, grace = 20): string => textOf(findOne(badge({ status: 'reconnecting', reconnectingSince: since, graceSec: grace }), (e) => e.props['data-state'] === 'reconnecting', 'badge'));

  it('TC-465b [FR-19] 남은 시간 = 유예 시간 - 경과 시간(초, 올림), 0 아래로 내려가지 않는다', () => {
    expect(left(NOW - 5_000)).toContain('15s');
    expect(left(NOW - 5_001)).toContain('15s'); // 14.999 → 올림 15
    expect(left(NOW - 6_000)).toContain('14s');
    expect(left(NOW - 20_000)).toContain(' 0s');
    expect(left(NOW - 25_000)).toContain(' 0s');
    expect(left(NOW + 3_000)).toContain('23s'); // 시계가 뒤로 간 경우(경과 음수)도 크래시 없이 계산
    expect(left(null, 7)).toContain('7s'); // 시작 시각 불명 → 전체 유예 시간
    expect(left(NOW - 1_000, 0)).toContain(' 0s');
  });

  it('TC-465c [FR-19] 재연결 중일 때만 0.5초 주기로 현재 시각을 갱신하고, cleanup이 타이머를 해제한다', () => {
    for (const status of ['live', 'idle', 'joining', 'ended'] as const) {
      badge({ status });
      expect(h.effects.length).toBe(1);
      expect((h.effects[0] as { fn: () => unknown }).fn(), status).toBeUndefined(); // 타이머 없음
    }
    vi.advanceTimersByTime(5_000);
    expect(h.setNow).not.toHaveBeenCalled();

    badge({ status: 'reconnecting' });
    const cleanup = (h.effects[0] as { fn: () => () => void }).fn();
    expect((h.effects[0] as { deps: unknown[] }).deps).toEqual(['reconnecting']);
    vi.advanceTimersByTime(1_000);
    expect(h.setNow).toHaveBeenCalledTimes(2);
    expect(h.setNow).toHaveBeenLastCalledWith(NOW + 6_000);
    cleanup();
    vi.advanceTimersByTime(5_000);
    expect(h.setNow).toHaveBeenCalledTimes(2);
  });

  it('TC-465d [FR-19] 불안정 배지는 경고색·연결됨은 일반색이며 아이콘은 스크린리더에서 숨긴다(글자가 의미를 전달)', () => {
    const poor = findOne(badge({ quality: 'poor' }), (e) => e.props['data-testid'] === 'conn-badge', 'poor');
    expect(String(poor.props.className)).toContain('bg-warning');
    expect(textOf(poor)).toBe(S.room.poor);
    const live = findOne(badge({}), (e) => e.props['data-testid'] === 'conn-badge', 'live');
    expect(String(live.props.className)).toContain('bg-raised');
    expect(String(live.props.className)).not.toContain('bg-warning');
    // 재연결 중에는 품질이 poor여도 재연결 표시가 우선한다
    const both = findOne(badge({ status: 'reconnecting', quality: 'poor' }), (e) => e.props['data-testid'] === 'conn-badge', 'both');
    expect(both.props['data-state']).toBe('reconnecting');
  });
});

describe('토스트 (unit-09, UX-12)', () => {
  it('TC-466i [UX-12] 알림은 들어온 순서대로, 같은 문구라도 id별로 각각 그려지고 info는 일반 테두리다', () => {
    const toasts: Toast[] = [{ id: 1, text: '같은 글', kind: 'info' }, { id: 2, text: '같은 글', kind: 'warn' }, { id: 3, text: '셋째', kind: 'info' }];
    const tree = Toasts({ toasts });
    const items = (tree as unknown as { props: { children: { key: string; props: { className: string; children: string } }[] } }).props.children;
    expect(items.map((c) => c.key)).toEqual(['1', '2', '3']);
    expect(items.map((c) => c.props.children)).toEqual(['같은 글', '같은 글', '셋째']);
    expect(items.map((c) => c.props.className.includes('border-warning'))).toEqual([false, true, false]);
  });
});
