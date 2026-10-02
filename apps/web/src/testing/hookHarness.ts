// 시험 전용 최소 훅 실행기: jsdom 없이 함수 컴포넌트의 상태·이벤트 핸들러를 직접 구동한다(unit-08 6단계 소급).
// 사용: 시험 파일에서 vi.mock('react', ...)로 아래 fakeHooks를 주입한 뒤 mount()로 컴포넌트를 올린다.
// 한계: 실제 DOM·포커스·레이아웃은 없다(그쪽은 e2e). 자식 "컴포넌트"는 펼치지 않고 props.children만 따라간다.
import type { ReactElement, ReactNode } from 'react';

type Cleanup = (() => void) | void;
interface EffectSlot {
  deps: readonly unknown[] | undefined;
  cleanup: Cleanup;
}
interface Runtime {
  slots: unknown[];
  idx: number;
  tree: ReactNode;
  effects: Array<() => void>;
  mounted: boolean;
  render: () => void;
}

let current: Runtime | null = null;
const rt = (): Runtime => {
  if (!current) throw new Error('hookHarness: hook called outside render');
  return current;
};
const sameDeps = (a: readonly unknown[] | undefined, b: readonly unknown[] | undefined): boolean => !!a && !!b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

function useState<T>(init: T | (() => T)): [T, (v: T | ((p: T) => T)) => void] {
  const r = rt();
  const i = r.idx++;
  if (!(i in r.slots)) r.slots[i] = { v: typeof init === 'function' ? (init as () => T)() : init };
  const slot = r.slots[i] as { v: T };
  return [
    slot.v,
    (next) => {
      const nv = typeof next === 'function' ? (next as (p: T) => T)(slot.v) : next;
      if (Object.is(nv, slot.v)) return;
      slot.v = nv;
      if (r.mounted) r.render();
    },
  ];
}
function useRef<T>(init: T): { current: T } {
  const r = rt();
  const i = r.idx++;
  if (!(i in r.slots)) r.slots[i] = { current: init };
  return r.slots[i] as { current: T };
}
function useMemo<T>(fn: () => T, deps: readonly unknown[]): T {
  const r = rt();
  const i = r.idx++;
  const slot = r.slots[i] as { deps: readonly unknown[]; v: T } | undefined;
  if (slot && sameDeps(slot.deps, deps)) return slot.v;
  const next = { deps, v: fn() };
  r.slots[i] = next;
  return next.v;
}
function useEffect(fn: () => Cleanup, deps?: readonly unknown[]): void {
  const r = rt();
  const i = r.idx++;
  const prev = r.slots[i] as EffectSlot | undefined;
  if (prev && deps && sameDeps(prev.deps, deps)) return;
  const slot: EffectSlot = prev ?? { deps, cleanup: undefined };
  r.slots[i] = slot;
  r.effects.push(() => {
    slot.cleanup?.();
    slot.deps = deps;
    slot.cleanup = fn();
  });
}
function useSyncExternalStore<T>(_subscribe: (cb: () => void) => () => void, getSnapshot: () => T): T {
  return getSnapshot();
}

export const fakeHooks = { useState, useRef, useMemo, useEffect, useSyncExternalStore };

export interface Mounted<P> {
  /** 현재 렌더 결과 */
  readonly tree: ReactNode;
  rerender: (props: P) => void;
  unmount: () => void;
}

/** 함수 컴포넌트를 올린다. 상태가 바뀌면 동기적으로 다시 그린다. */
export interface MountOptions {
  /** 첫 렌더 직후, 효과를 실행하기 전에 불린다(예: ref에 가짜 DOM 요소를 꽂아 두기 위해) */
  beforeEffects?: (tree: ReactNode) => void;
  /** React StrictMode(개발)처럼 첫 효과를 정리했다가 한 번 더 실행한다 */
  strict?: boolean;
}
export function mount<P>(Comp: (p: P) => ReactElement | null, props: P, opts: MountOptions = {}): Mounted<P> {
  let cur = props;
  const r: Runtime = {
    slots: [],
    idx: 0,
    tree: null,
    effects: [],
    mounted: false,
    render: () => {
      current = r;
      r.idx = 0;
      r.effects = [];
      try {
        r.tree = Comp(cur);
      } finally {
        current = null;
      }
      const run = r.effects;
      r.effects = [];
      if (!r.mounted) opts.beforeEffects?.(r.tree);
      for (const e of run) e();
      if (!r.mounted && opts.strict) for (const e of run) e();
    },
  };
  r.render();
  r.mounted = true;
  return {
    get tree() {
      return r.tree;
    },
    rerender: (p) => {
      cur = p;
      r.render();
    },
    unmount: () => {
      for (const s of r.slots) (s as Partial<EffectSlot> | undefined)?.cleanup?.();
    },
  };
}

type Props = Record<string, unknown>;
const isEl = (n: unknown): n is ReactElement<Props> => typeof n === 'object' && n !== null && 'props' in n && 'type' in n;

/** 트리를 깊이 우선으로 훑어 조건에 맞는 요소를 모두 돌려준다. */
export function findAll(node: ReactNode, pred: (el: ReactElement<Props>) => boolean, out: ReactElement<Props>[] = []): ReactElement<Props>[] {
  if (Array.isArray(node)) {
    for (const c of node as ReactNode[]) findAll(c, pred, out);
  } else if (isEl(node)) {
    if (pred(node)) out.push(node);
    findAll(node.props.children as ReactNode, pred, out);
  }
  return out;
}
export const byTestId = (node: ReactNode, id: string): ReactElement<Props> | undefined => findAll(node, (e) => e.props['data-testid'] === id)[0];
export const byId = (node: ReactNode, id: string): ReactElement<Props> | undefined => findAll(node, (e) => e.props.id === id)[0];
export const byType = (node: ReactNode, type: string): ReactElement<Props>[] => findAll(node, (e) => e.type === type);

/** 노드 아래의 모든 글자를 이어 붙인다(컴포넌트 요소는 펼치지 않는다). */
export function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return (node as ReactNode[]).map(textOf).join('');
  return isEl(node) ? textOf(node.props.children as ReactNode) : '';
}

/** 요소의 이벤트 핸들러를 부른다. 없으면 시험을 실패시킨다. */
export function fire(el: ReactElement<Props> | undefined, handler: string, event: unknown = {}): unknown {
  const fn = el?.props[handler];
  if (typeof fn !== 'function') throw new Error(`handler ${handler} not found`);
  return (fn as (e: unknown) => unknown)(event);
}
export const submitEvent = (): { preventDefault: () => void; prevented: () => boolean } => {
  let p = false;
  return { preventDefault: () => (p = true), prevented: () => p };
};
