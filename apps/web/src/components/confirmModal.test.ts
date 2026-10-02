import type * as ReactTypes from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findAll, findOne, textOf } from '../testUtil';
import { S } from '../strings';

const h = vi.hoisted(() => ({ refs: [] as { current: unknown }[], effects: [] as (() => void | (() => void))[] }));
vi.mock('react', async (orig) => ({
  ...(await orig<typeof ReactTypes>()),
  useRef: (init: unknown) => {
    const r = { current: init };
    h.refs.push(r);
    return r;
  },
  useEffect: (fn: () => void | (() => void)) => {
    h.effects.push(fn);
  },
}));

import { ConfirmModal } from './ConfirmModal';

type FakeBtn = { focus: ReturnType<typeof vi.fn> };
const btn = (): FakeBtn => ({ focus: vi.fn() });

beforeEach(() => {
  h.refs.length = 0;
  h.effects.length = 0;
});
afterEach(() => vi.unstubAllGlobals());

const setup = (over: Partial<Parameters<typeof ConfirmModal>[0]> = {}) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const tree = ConfirmModal({ title: '제목', body: '본문', confirmLabel: '확인함', onConfirm, onCancel, ...over });
  const [cancelRef, boxRef] = h.refs as [{ current: unknown }, { current: unknown }];
  const first = btn();
  const last = btn();
  boxRef.current = { querySelectorAll: () => [first, last] };
  const root = tree as unknown as { props: { onKeyDown: (e: unknown) => void } };
  const key = (k: string, shiftKey = false) => {
    const e = { key: k, shiftKey, stopPropagation: vi.fn(), preventDefault: vi.fn() };
    root.props.onKeyDown(e);
    return e;
  };
  return { tree, onConfirm, onCancel, cancelRef, first, last, key };
};

describe('확인창 (unit-09, UX-10, NFR-09, FR-22, FR-14, FR-15)', () => {
  it('TC-466d [UX-10] Esc는 취소를 호출하고 전파를 막는다(방 패널 닫기와 겹치지 않게). 다른 키는 무시한다', () => {
    const t = setup();
    const e = t.key('Escape');
    expect(t.onCancel).toHaveBeenCalledTimes(1);
    expect(e.stopPropagation).toHaveBeenCalledTimes(1);
    const other = t.key('Enter');
    expect(t.onCancel).toHaveBeenCalledTimes(1);
    expect(other.stopPropagation).not.toHaveBeenCalled();
    expect(t.onConfirm).not.toHaveBeenCalled();
  });

  it('TC-466e [UX-10,NFR-09] Tab은 마지막 버튼에서 첫 버튼으로, Shift+Tab은 첫 버튼에서 마지막으로 돈다. 중간에서는 가로채지 않는다', () => {
    const t = setup();
    vi.stubGlobal('document', { activeElement: t.last });
    let e = t.key('Tab');
    expect(e.preventDefault).toHaveBeenCalledTimes(1);
    expect(t.first.focus).toHaveBeenCalledTimes(1);
    expect(t.last.focus).not.toHaveBeenCalled();
    // 마지막이 아닌 곳에서 Tab: 기본 동작 유지
    vi.stubGlobal('document', { activeElement: t.first });
    e = t.key('Tab');
    expect(e.preventDefault).not.toHaveBeenCalled();
    // Shift+Tab 첫 버튼 -> 마지막
    e = t.key('Tab', true);
    expect(e.preventDefault).toHaveBeenCalledTimes(1);
    expect(t.last.focus).toHaveBeenCalledTimes(1);
    // Shift+Tab 마지막 버튼은 기본 동작 유지
    vi.stubGlobal('document', { activeElement: t.last });
    e = t.key('Tab', true);
    expect(e.preventDefault).not.toHaveBeenCalled();
    // Shift 없이 첫 버튼에서 Tab: 기본 동작
    vi.stubGlobal('document', { activeElement: t.first });
    expect(t.key('Tab').preventDefault).not.toHaveBeenCalled();
  });

  it('TC-466f [UX-10] 버튼 목록이 비어 있어도 Tab 처리가 예외 없이 끝난다', () => {
    const t = setup();
    const boxRef = h.refs[1] as { current: unknown };
    boxRef.current = { querySelectorAll: () => [] };
    vi.stubGlobal('document', { activeElement: null });
    expect(() => t.key('Tab')).not.toThrow();
    boxRef.current = null;
    expect(() => t.key('Tab')).not.toThrow();
  });

  it('TC-466g [UX-10,NFR-09] 열릴 때 취소 버튼에 포커스하고, 닫히면(cleanup) 열기 전에 포커스돼 있던 요소로 돌려준다', () => {
    const opener = btn();
    vi.stubGlobal('document', { activeElement: opener });
    const t = setup();
    const cancel = btn();
    t.cancelRef.current = cancel;
    expect(h.effects.length).toBe(1);
    const cleanup = (h.effects[0] as () => () => void)();
    expect(cancel.focus).toHaveBeenCalledTimes(1);
    expect(opener.focus).not.toHaveBeenCalled();
    cleanup();
    expect(opener.focus).toHaveBeenCalledTimes(1);
    // 열기 전 포커스가 없었거나 focus가 없는 객체여도 예외가 없다
    vi.stubGlobal('document', { activeElement: null });
    const t2 = setup();
    t2.cancelRef.current = cancel;
    expect(() => (h.effects[1] as () => () => void)()()).not.toThrow();
  });

  it('TC-466h [FR-22,FR-14,FR-15] 구조: role=dialog·aria-modal·제목/본문 연결, 취소가 먼저·확인이 나중, danger만 위험 버튼, 각 버튼은 자기 콜백만 부른다', () => {
    const t = setup({ danger: true });
    const dialog = findOne(t.tree, (e) => e.props.role === 'dialog', 'dialog').props;
    expect(dialog['aria-modal']).toBe('true');
    expect(dialog['aria-labelledby']).toBe('confirm-title');
    expect(dialog['aria-describedby']).toBe('confirm-body');
    const title = findOne(t.tree, (e) => e.props.id === 'confirm-title', 'title');
    const body = findOne(t.tree, (e) => e.props.id === 'confirm-body', 'body');
    expect(textOf(title)).toBe('제목');
    expect(textOf(body)).toBe('본문');
    const buttons = findAll(t.tree, (e) => e.type === 'button');
    expect(buttons.map((b) => textOf(b))).toEqual([S.confirm.cancel, '확인함']);
    expect(buttons.map((b) => b.props.className)).toEqual(['btn-secondary', 'btn-danger']);
    expect(buttons.every((b) => b.props.type === 'button')).toBe(true);
    (buttons[0]?.props.onClick as () => void)();
    expect([t.onCancel.mock.calls.length, t.onConfirm.mock.calls.length]).toEqual([1, 0]);
    (buttons[1]?.props.onClick as () => void)();
    expect([t.onCancel.mock.calls.length, t.onConfirm.mock.calls.length]).toEqual([1, 1]);
    const plain = setup();
    expect(findAll(plain.tree, (e) => e.type === 'button').map((b) => b.props.className)).toEqual(['btn-secondary', 'btn-primary']);
  });
});
