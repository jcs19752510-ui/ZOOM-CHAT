import type * as React from 'react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byTestId, byType, fire, findAll, mount, submitEvent, textOf, type Mounted } from '../testing/hookHarness';

vi.mock('react', async (orig) => {
  const actual = await orig<typeof React>();
  const { fakeHooks } = await import('../testing/hookHarness');
  return { ...actual, ...fakeHooks, default: { ...actual, ...fakeHooks } };
});

import { LIMITS } from '@meetlite/shared';
import type { ChatItem } from '../state/MeetingController';
import { S } from '../strings';
import { ChatPanel } from './ChatPanel';

type P = { messages: ChatItem[]; onSend: (t: string) => Promise<string | null>; onClose: () => void };
const item = (id: string, over: Partial<ChatItem> = {}): ChatItem => ({ id, from: 'p1', nickname: 'nick', text: 'hi', ts: Date.UTC(2026, 9, 1, 3, 4), mine: false, ...over });
let onSend: ReturnType<typeof vi.fn<(t: string) => Promise<string | null>>>;
let onClose: ReturnType<typeof vi.fn<() => void>>;
let view: Mounted<P>;

const input = (): ReactElement<Record<string, unknown>> | undefined => byTestId(view.tree, 'chat-input');
const type = (value: string): void => void fire(input(), 'onChange', { target: { value } });
const submit = async (): Promise<ReturnType<typeof submitEvent>> => {
  const ev = submitEvent();
  await fire(byType(view.tree, 'form')[0], 'onSubmit', ev);
  return ev;
};
const alerts = (): string[] => findAll(view.tree, (e) => e.props.role === 'alert').map(textOf);
const inputValue = (): unknown => input()?.props.value;
const sendDisabled = (): unknown => byTestId(view.tree, 'chat-send')?.props.disabled;
const counter = (): string => textOf(findAll(view.tree, (e) => typeof e.props.className === 'string' && e.props.className.includes('text-right')).map((e) => e.props.children as React.ReactNode));
const counterClass = (): string => String(findAll(view.tree, (e) => typeof e.props.className === 'string' && e.props.className.includes('text-right'))[0]?.props.className);

beforeEach(() => {
  onSend = vi.fn<(t: string) => Promise<string | null>>(() => Promise.resolve(null));
  onClose = vi.fn<() => void>();
  view = mount<P>(ChatPanel, { messages: [], onSend, onClose });
});
afterEach(() => view.unmount());

describe('채팅 패널 전송 동작 (unit-10, FR-11, SEC-07, POL-07)', () => {
  it('TC-450b [FR-11] 비었거나 공백뿐인 입력은 보내지 않고 오류도 띄우지 않으며, 보내기 버튼은 꺼져 있다', async () => {
    expect(sendDisabled()).toBe(true);
    for (const v of ['', '   ', '\n\t ']) {
      type(v);
      expect(sendDisabled(), JSON.stringify(v)).toBe(true);
      const ev = await submit();
      expect(ev.prevented()).toBe(true); // 폼 기본 제출(페이지 이동) 방지
    }
    expect(onSend).not.toHaveBeenCalled();
    expect(alerts()).toEqual([]);
    type('a');
    expect(sendDisabled()).toBe(false);
  });

  it('TC-450c [FR-11] 앞뒤 공백을 떼어 보내고, 보내는 즉시 입력창이 비며 이전 오류가 사라진다', async () => {
    let finish: (v: string | null) => void = () => undefined;
    onSend.mockImplementationOnce(() => new Promise((r) => (finish = r)));
    type('  hello  world \n');
    const pending = submit();
    expect(onSend).toHaveBeenCalledWith('hello  world'); // 안쪽 공백은 보존
    expect(inputValue()).toBe(''); // 응답 전에 이미 비어 있다
    finish(null);
    await pending;
    expect(inputValue()).toBe('');
    expect(alerts()).toEqual([]);
  });

  it('TC-450d [FR-11,SEC-07] 길이 경계: 500자는 전송, 501자는 전송 없이 tooLong 안내하고 글은 남는다', async () => {
    type('a'.repeat(LIMITS.chatMax));
    await submit();
    expect(onSend).toHaveBeenCalledTimes(1);
    onSend.mockClear();
    const over = 'a'.repeat(LIMITS.chatMax + 1);
    type(over);
    await submit();
    expect(onSend).not.toHaveBeenCalled();
    expect(alerts()).toEqual([S.chat.tooLong]);
    expect(inputValue()).toBe(over); // 지워지지 않는다
  });

  it('TC-450e [FR-11,SEC-07] 길이는 UTF-16이 아닌 코드포인트로 센다(이모지 500개 허용·501개 거부), 카운터 표시와 초과 색', async () => {
    const emoji = String.fromCodePoint(0x1f600);
    type(emoji.repeat(LIMITS.chatMax));
    expect(counter()).toBe(S.chat.counter(LIMITS.chatMax));
    expect(counterClass()).not.toContain('danger');
    await submit();
    expect(onSend).toHaveBeenCalledTimes(1);
    onSend.mockClear();
    type(emoji.repeat(LIMITS.chatMax + 1));
    expect(counter()).toBe(S.chat.counter(LIMITS.chatMax + 1));
    expect(counterClass()).toContain('danger');
    await submit();
    expect(onSend).not.toHaveBeenCalled();
    expect(alerts()).toEqual([S.chat.tooLong]);
  });

  it('TC-450f [FR-11,POL-07] 길이 검사는 앞뒤 공백을 뗀 뒤 한다(공백 포함 501자라도 본문 500자면 전송)', async () => {
    type(` ${'a'.repeat(LIMITS.chatMax)} `);
    await submit();
    expect(onSend).toHaveBeenCalledWith('a'.repeat(LIMITS.chatMax));
    expect(alerts()).toEqual([]);
  });

  it('TC-450g [FR-11,POL-07] 서버 오류 코드별 안내: RATE_LIMITED, INVALID_PAYLOAD, 그 밖은 failed. 글은 입력창으로 되돌아온다', async () => {
    const cases: Array<[string, string]> = [
      ['RATE_LIMITED', S.chat.rateLimited],
      ['INVALID_PAYLOAD', S.chat.invalid],
      ['NOT_IN_ROOM', S.chat.failed],
    ];
    for (const [code, expected] of cases) {
      onSend.mockResolvedValueOnce(code);
      type('msg');
      await submit();
      expect(alerts(), code).toEqual([expected]);
      expect(inputValue(), code).toBe('msg');
    }
    expect(new Set([S.chat.rateLimited, S.chat.invalid, S.chat.failed]).size).toBe(3); // 세 문구가 서로 다르다
  });

  it('TC-450h [FR-11] 실패 중에 사용자가 새로 쓰기 시작했다면 그 글을 덮어쓰지 않고, 이후 성공하면 오류가 지워진다', async () => {
    let finish: (v: string | null) => void = () => undefined;
    onSend.mockImplementationOnce(() => new Promise((r) => (finish = r)));
    type('first');
    const pending = submit();
    type('second'); // 응답을 기다리는 동안 다음 글 작성
    finish('RATE_LIMITED');
    await pending;
    expect(inputValue()).toBe('second');
    expect(alerts()).toEqual([S.chat.rateLimited]);
    await submit(); // 성공
    expect(alerts()).toEqual([]);
    expect(inputValue()).toBe('');
  });

  it('TC-450i [FR-11] 오류는 role=alert로 나오고 정상일 때는 alert 요소가 없다', async () => {
    expect(alerts()).toEqual([]);
    onSend.mockResolvedValueOnce('INVALID_PAYLOAD');
    type('x');
    await submit();
    expect(findAll(view.tree, (e) => e.props.role === 'alert').length).toBe(1);
  });

  it('TC-450j [SEC-07] 본문에 HTML이 있어도 onSend에는 가공 없이 문자열 그대로 가고(서버가 정리), 입력창은 자동완성이 꺼져 있다', async () => {
    type('<img src=x onerror=1> a');
    await submit();
    expect(onSend).toHaveBeenCalledWith('<img src=x onerror=1> a');
    expect(input()?.props.autoComplete).toBe('off');
  });
});

describe('채팅 패널 목록·스크롤·닫기 (unit-10)', () => {
  it('TC-450k [FR-11] 닫기 버튼은 onClose를 한 번 부른다', () => {
    const close = byType(view.tree, 'button').find((b) => b.props['aria-label'] === S.chat.close);
    fire(close, 'onClick');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('TC-450l [FR-11] 메시지 수가 바뀔 때만 맨 아래로 스크롤한다(같은 길이 재렌더는 안 함)', () => {
    const scrollIntoView = vi.fn();
    const v = mount<P>(ChatPanel, { messages: [], onSend, onClose }, { beforeEffects: (t) => void (findAll(t, (e) => e.type === 'div' && 'ref' in e.props).forEach((d) => ((d.props.ref as { current: unknown }).current = { scrollIntoView }))) });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'end' });
    v.rerender({ messages: [], onSend, onClose });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    v.rerender({ messages: [item('a')], onSend, onClose });
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    v.rerender({ messages: [item('a'), item('b')], onSend, onClose });
    expect(scrollIntoView).toHaveBeenCalledTimes(3);
    v.unmount();
  });

  it('TC-450m [FR-11] 목록: 메시지 개수만큼 항목, 내 메시지는 오른쪽 정렬·강조색이며 빈 상태 문구는 사라진다', () => {
    view.rerender({ messages: [item('a', { mine: true, nickname: 'me' }), item('b', { nickname: 'other' })], onSend, onClose });
    const lis = byType(view.tree, 'li');
    expect(lis).toHaveLength(2);
    expect(String(lis[0]?.props.className)).toContain('items-end');
    expect(String(lis[1]?.props.className)).toContain('items-start');
    const all = textOf(view.tree);
    expect(all).toContain('me');
    expect(all).toContain('other');
    expect(all).not.toContain(S.chat.empty);
    expect(lis.map((l) => (l as { key: unknown }).key)).toEqual(['a', 'b']);
  });
});
