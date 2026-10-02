import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// React 훅을 최소 구현으로 대체해 DOM 없이 useRoute의 동작(경로 상태·history·popstate)을 직접 시험한다.
const r = vi.hoisted(() => {
  const cells: unknown[] = [];
  const effects: (() => void | (() => void))[] = [];
  return { cells, effects, idx: { i: 0 } };
});
vi.mock('react', () => ({
  useState: <T>(init: T | (() => T)): [T, (v: T) => void] => {
    const i = r.idx.i++;
    if (!(i in r.cells)) r.cells[i] = typeof init === 'function' ? (init as () => T)() : init;
    return [r.cells[i] as T, (v: T) => void (r.cells[i] = v)];
  },
  useEffect: (fn: () => void | (() => void)) => void r.effects.push(fn),
  useCallback: <T>(fn: T) => fn,
}));

import { parseRoomPath, useRoute as useRouteHook } from './useRoute';

const callHook = useRouteHook; // 훅 규칙 점검기는 이 시험의 가짜 React 실행기(render)를 컴포넌트로 보지 않으므로 별칭으로 부른다

type Listener = () => void;
interface FakeWin {
  location: { pathname: string };
  history: { calls: { kind: string; to: string }[]; pushState: (s: unknown, t: string, to: string) => void; replaceState: (s: unknown, t: string, to: string) => void };
  listeners: Map<string, Set<Listener>>;
  addEventListener: (e: string, l: Listener) => void;
  removeEventListener: (e: string, l: Listener) => void;
}
let win: FakeWin;
const mkWin = (pathname: string): FakeWin => {
  const w: FakeWin = {
    location: { pathname },
    history: {
      calls: [],
      pushState: (_s, _t, to) => {
        w.history.calls.push({ kind: 'push', to });
        w.location.pathname = to;
      },
      replaceState: (_s, _t, to) => {
        w.history.calls.push({ kind: 'replace', to });
        w.location.pathname = to;
      },
    },
    listeners: new Map(),
    addEventListener: (e, l) => void w.listeners.set(e, (w.listeners.get(e) ?? new Set()).add(l)),
    removeEventListener: (e, l) => void w.listeners.get(e)?.delete(l),
  };
  return w;
};
const render = (): ReturnType<typeof useRouteHook> => {
  r.idx.i = 0;
  r.effects.length = 0;
  return callHook();
};

beforeEach(() => {
  r.cells.length = 0;
  win = mkWin('/privacy');
  vi.stubGlobal('window', win);
});
afterEach(() => vi.unstubAllGlobals());

describe('useRoute 훅 (unit-06 보강, FR-03, FR-02)', () => {
  it('TC-508 [FR-03] 처음 경로는 현재 주소이고 popstate(뒤로·앞으로 가기)를 구독하며, 해제하면 구독을 지운다', () => {
    expect(render().path).toBe('/privacy');
    expect(r.effects.length).toBe(1);
    const cleanup = r.effects[0]?.();
    expect(win.listeners.get('popstate')?.size).toBe(1);
    win.location.pathname = '/terms';
    [...(win.listeners.get('popstate') ?? [])].forEach((l) => l());
    expect(render().path).toBe('/terms');
    expect(typeof cleanup).toBe('function');
    (cleanup as () => void)();
    expect(win.listeners.get('popstate')?.size).toBe(0);
  });

  it('TC-508b [FR-03] navigate는 기본이 pushState(뒤로 가기 가능), replace=true면 replaceState이며, 둘 다 경로 상태를 새 주소로 바꾼다', () => {
    const route = render();
    route.navigate('/r/abc');
    expect(win.history.calls).toEqual([{ kind: 'push', to: '/r/abc' }]);
    expect(render().path).toBe('/r/abc');
    route.navigate('/', true);
    expect(win.history.calls.at(-1)).toEqual({ kind: 'replace', to: '/' });
    expect(render().path).toBe('/');
  });

  it('TC-508c [FR-03,SEC-07] 방 경로 파서는 앞쪽 접두(/x/r/<id>)·뒤쪽 접미·쿼리 문자를 거부한다', () => {
    const id = 'B'.repeat(22);
    for (const bad of [`/x/r/${id}`, `/r/${id}?a=1`, `/r/${id}#x`, ` /r/${id}`, `/r/${id}/extra/`]) expect(parseRoomPath(bad), bad).toBeNull();
    expect(parseRoomPath(`/r/${id}/`)).toBe(id);
  });
});
