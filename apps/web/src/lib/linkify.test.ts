import { describe, expect, it } from 'vitest';
import { extractRoomId, linkify } from './linkify';

describe('linkify (SEC-07)', () => {
  it('TC-200 [FR-11,SEC-07] http/https 링크만 링크로 만들고 나머지는 텍스트다', () => {
    const segs = linkify('보세요 https://example.com/a?b=1 입니다');
    expect(segs).toEqual([
      { type: 'text', value: '보세요 ' },
      { type: 'link', href: 'https://example.com/a?b=1', label: 'https://example.com/a?b=1' },
      { type: 'text', value: ' 입니다' },
    ]);
  });
  it('TC-201 [SEC-07] javascript:, data:, 상대 경로, HTML 태그는 링크가 되지 않는다', () => {
    for (const t of ['javascript:alert(1)', 'data:text/html,<script>1</script>', '<a href="javascript:x">x</a>', '//evil.example', 'ftp://x.example']) {
      expect(linkify(t).every((s) => s.type === 'text'), t).toBe(true);
    }
  });
  it('TC-202 [SEC-07] 문장부호는 링크에서 떼어 낸다', () => {
    const segs = linkify('(https://a.com).');
    expect(segs.find((s) => s.type === 'link')).toMatchObject({ href: 'https://a.com/' });
  });
  it('TC-203 [SEC-07] 모든 조각을 이어 붙이면 원문이 보존된다(텍스트로 표시)', () => {
    const text = '<img src=x onerror=alert(1)> http://a.com x';
    const joined = linkify(text).map((s) => (s.type === 'text' ? s.value : s.label)).join('');
    expect(joined).toBe(text);
  });
});

describe('extractRoomId (FR-03)', () => {
  const id = 'abcdefghijklmnopqrstuv';
  it('TC-204 [FR-03] 링크 또는 방 코드에서 방 ID를 뽑는다', () => {
    expect(extractRoomId(id)).toBe(id);
    expect(extractRoomId(`https://meet.example.com/r/${id}`)).toBe(id);
    expect(extractRoomId(`  http://localhost:5173/r/${id}/ `)).toBe(id);
  });
  it('TC-205 [FR-03] 잘못된 입력은 null', () => {
    for (const s of ['', 'hello', 'https://x.com/', `https://x.com/r/short`, `https://x.com/other/${id}`]) expect(extractRoomId(s), s).toBeNull();
  });
});
