import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ChatItem } from '../state/MeetingController';
import { ChatPanel } from './ChatPanel';

const msg = (text: string, mine: boolean): ChatItem => ({ id: String(mine), from: 'p1', nickname: 'nick', text, ts: 0, mine });
const render = (messages: ChatItem[]): string => renderToStaticMarkup(createElement(ChatPanel, { messages, onSend: () => Promise.resolve(null), onClose: () => undefined }));
const anchor = (html: string): string => html.match(/<a [^>]*>[^<]*<\/a>/)?.[0] ?? '';

describe('채팅 링크 렌더링 상세 (unit-10, SEC-07)', () => {
  it('TC-450w [SEC-07,UX-12] href는 정규화된 URL, 표시 글자는 사용자가 쓴 그대로이며, 내 메시지/남의 메시지 링크 색 클래스가 다르다', () => {
    const mine = anchor(render([msg('see HTTPS://Example.COM/A', true)]));
    expect(mine).toContain('href="https://example.com/A"');
    expect(mine).toContain('>HTTPS://Example.COM/A</a>');
    expect(mine).toContain('text-white');
    const other = anchor(render([msg('see HTTPS://Example.COM/A', false)]));
    expect(other).toContain('text-focus');
    expect(other).not.toContain('text-white');
  });
});
