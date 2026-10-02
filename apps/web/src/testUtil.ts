import type { ReactNode } from 'react';

/** Test-only helper: walk element trees from directly called function components (no DOM). */
export interface TreeEl {
  type: unknown;
  props: Record<string, unknown>;
}

const isEl = (n: unknown): n is TreeEl => typeof n === 'object' && n !== null && 'props' in n && 'type' in n;

export function walk(node: ReactNode | unknown, visit: (e: TreeEl) => void): void {
  if (Array.isArray(node)) {
    for (const c of node) walk(c, visit);
    return;
  }
  if (!isEl(node)) return;
  visit(node);
  walk(node.props.children, visit);
}

export function findAll(node: unknown, pred: (e: TreeEl) => boolean): TreeEl[] {
  const out: TreeEl[] = [];
  walk(node, (e) => {
    if (pred(e)) out.push(e);
  });
  return out;
}

export function findOne(node: unknown, pred: (e: TreeEl) => boolean, what = 'element'): TreeEl {
  const r = findAll(node, pred);
  if (r.length !== 1) throw new Error(`${what}: found ${r.length}, expected exactly 1`);
  return r[0] as TreeEl;
}

export const byTestId = (id: string) => (e: TreeEl): boolean => e.props['data-testid'] === id || e.props.testId === id;

export const textOf = (node: unknown): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isEl(node)) return textOf(node.props.children);
  return '';
};
