import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ChatItem } from '../state/MeetingController';
import { S } from '../strings';
import { ChatPanel } from './ChatPanel';

const msg = (text: string, over: Partial<ChatItem> = {}): ChatItem => ({ id: Math.random().toString(36).slice(2), from: 'p1', nickname: '민지', text, ts: Date.UTC(2026, 9, 1, 3, 4), mine: false, ...over });
const render = (messages: ChatItem[]): string => renderToStaticMarkup(createElement(ChatPanel, { messages, onSend: () => Promise.resolve(null), onClose: () => undefined }));
const anchors = (html: string): string[] => html.match(/<a [^>]*>/g) ?? [];

describe('채팅 패널 렌더링 (unit-10, FR-11, SEC-07)', () => {
  it('TC-450 [FR-11,SEC-07] 악성 HTML 페이로드는 이스케이프된 텍스트로만 그려지고 요소·이벤트 속성·링크가 생기지 않는다', () => {
    const payloads = ['<img src=x onerror="window.__xss=1">', '<script>window.__xss=2</script>', 'javascript:window.__xss=3', '"><svg onload=window.__xss=4>', '&lt;b&gt;굵게&lt;/b&gt;', '<a href="javascript:alert(1)">클릭</a>'];
    const html = render(payloads.map((p) => msg(p)));
    expect(html).not.toMatch(/<img/i);
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<[a-z][^>]*\son(error|load|click|mouseover)\s*=/i);
    expect(anchors(html)).toEqual([]); // javascript: 는 링크가 되지 않는다
    expect(html).toContain('&lt;img src=x onerror=&quot;window.__xss=1&quot;&gt;');
    expect(html).toContain('&lt;script&gt;window.__xss=2&lt;/script&gt;');
    expect(html).toContain('&amp;lt;b&amp;gt;'); // 엔티티 문자열은 한 번 더 이스케이프되어 그대로 보인다
  });

  it('TC-451 [FR-11,SEC-07] http/https 링크만 새 탭·rel noopener noreferrer로 열리고, URL 안의 따옴표·꺾쇠로 속성이 새지 않는다', () => {
    const html = render([msg('참고 https://example.com/a?b=1 와 http://example.org/x 입니다'), msg('https://evil.test/"onmouseover="alert(1) 와 http://a.test/<img src=x onerror=1>'), msg('ftp://x.test/file 와 data:text/html,<b>x</b>')]);
    const tags = anchors(html);
    expect(tags.length).toBeGreaterThanOrEqual(4);
    for (const t of tags) {
      expect(t).toContain('target="_blank"');
      expect(t).toContain('rel="noopener noreferrer"');
      expect(t).toMatch(/href="https?:\/\//);
      expect(t).not.toMatch(/onmouseover|onerror/);
    }
    expect(html).not.toMatch(/href="(ftp|data|javascript):/i);
    expect(html).not.toMatch(/<img/i);
  });

  it('TC-452 [FR-11,UX-10,UX-12] 목록은 aria-live log이고 이름이 있으며, 빈 상태 문구와 닫기 버튼 이름이 있다', () => {
    const empty = render([]);
    expect(empty).toContain('role="log"');
    expect(empty).toContain('aria-live="polite"');
    expect(empty).toContain(S.chat.empty);
    expect(empty).toContain(S.chat.emptyHint);
    expect(empty).toContain(`aria-label="${S.chat.close}"`);
    expect(empty).toContain(`aria-label="${S.chat.send}"`);
    expect(empty).toMatch(/<button[^>]*data-testid="chat-send"[^>]*disabled/); // 비어 있으면 보내기 비활성
    expect(empty).toContain(S.chat.counter(0));
    const full = render([msg('안녕')]);
    expect(full).not.toContain(S.chat.empty);
    expect(full).toContain('민지');
  });

  it('TC-453 [FR-11] 닉네임에 HTML이 있어도 이스케이프되고, 초장문 단어는 줄바꿈 가능한 클래스로 그려진다', () => {
    const html = render([msg('가'.repeat(2000), { nickname: '<b>해커</b>' })]);
    expect(html).not.toContain('<b>해커</b>');
    expect(html).toContain('&lt;b&gt;해커&lt;/b&gt;');
    expect(html).toMatch(/class="[^"]*break-words[^"]*"[^>]*data-testid="chat-text"/);
    expect(html).toMatch(/whitespace-pre-wrap/);
  });
});
