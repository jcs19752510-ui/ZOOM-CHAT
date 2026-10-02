import { describe, expect, it } from 'vitest';
import { linkify, type Segment } from './linkify';

const links = (t: string): Extract<Segment, { type: 'link' }>[] => linkify(t).filter((s): s is Extract<Segment, { type: 'link' }> => s.type === 'link');
const joined = (t: string): string => linkify(t).map((s) => (s.type === 'text' ? s.value : s.label)).join('');

describe('linkify 경계·악용 입력 (unit-10, SEC-07, FR-11)', () => {
  it('TC-450n [SEC-07] 위험 스킴은 대소문자·공백 변형이 있어도 링크가 되지 않는다', () => {
    for (const t of ['JaVaScRiPt:alert(1)', 'java\nscript:alert(1)', 'vbscript:x', 'file:///etc/passwd', 'ws://a.com', 'mailto:a@b.c', '  data:text/html;base64,AAAA']) {
      expect(links(t), t).toEqual([]);
    }
  });

  it('TC-450o [SEC-07] 스킴 대소문자는 구분하지 않아 HTTPS://도 링크이고 href는 정규화된 http(s)다', () => {
    const l = links('HTTPS://Example.COM/Path');
    expect(l).toHaveLength(1);
    expect(l[0]?.href).toBe('https://example.com/Path');
    expect(l[0]?.label).toBe('HTTPS://Example.COM/Path'); // 표시는 사용자가 쓴 그대로
  });

  it('TC-450p [SEC-07] URL은 공백·꺾쇠·따옴표·백틱에서 끝나 속성 주입 문자가 href에 들어가지 않는다', () => {
    for (const t of ['https://a.com/x"onmouseover="1', "https://a.com/x'onmouseover='1", 'https://a.com/x`y', 'https://a.com/x<script>', 'https://a.com/x>y']) {
      const l = links(t);
      expect(l, t).toHaveLength(1);
      expect(l[0]?.href, t).not.toMatch(/["'`<>\s]/);
      expect(l[0]?.label, t).toBe('https://a.com/x'); // 링크는 속성 주입 문자 앞에서 끝나고 나머지는 텍스트로 남는다
      expect(joined(t), t).toBe(t);
    }
  });

  it('TC-450q [FR-11] 끝 문장부호 여러 개와 전각 마침표를 떼고 원문 순서를 보존한다', () => {
    expect(linkify('https://a.com/x?!.,;:')).toEqual([
      { type: 'link', href: 'https://a.com/x', label: 'https://a.com/x' },
      { type: 'text', value: '?!.,;:' },
    ]);
    const full = linkify('https://a.com/x。');
    expect(full[0]).toMatchObject({ type: 'link', label: 'https://a.com/x' });
    expect(full[1]).toEqual({ type: 'text', value: '。' });
    for (const ch of ['\uFF0C', '\u3001']) expect(linkify(`https://a.com/x${ch}`).map((x) => (x.type === 'link' ? x.label : x.value)), ch).toEqual(['https://a.com/x', ch]);
  });

  it('TC-450r [FR-11] 스킴만 있거나 호스트가 없으면 텍스트로 남는다(링크 조각 0개, 원문 보존)', () => {
    for (const t of ['http://', 'https://.', 'https:// a.com', 'http://[', 'https://:80']) {
      expect(links(t), t).toEqual([]);
      expect(joined(t), t).toBe(t);
    }
  });

  it('TC-450s [FR-11] 한 메시지의 여러 링크와 사이 텍스트를 모두 순서대로 만든다', () => {
    expect(linkify('a http://x.io b https://y.io c')).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'link', href: 'http://x.io/', label: 'http://x.io' },
      { type: 'text', value: ' b ' },
      { type: 'link', href: 'https://y.io/', label: 'https://y.io' },
      { type: 'text', value: ' c' },
    ]);
  });

  it('TC-450t [FR-11] 빈 문자열은 조각 0개, 링크 없는 글은 텍스트 1조각이다', () => {
    expect(linkify('')).toEqual([]);
    expect(linkify('plain')).toEqual([{ type: 'text', value: 'plain' }]);
  });

  it('TC-450u [SEC-07] 무작위 입력 3000개에서 조각을 이어 붙이면 항상 원문이고, 링크 href는 항상 http(s)이다', () => {
    const alphabet = ['http://', 'https://', 'a.com', '/', '.', ',', '"', '<', '>', ' ', '\n', ')', '(', 'javascript:', '。', "'", '`', '%', '@', ':', '['];
    let seed = 12345;
    const rnd = (n: number): number => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) % n);
    for (let i = 0; i < 3000; i++) {
      const t = Array.from({ length: 1 + rnd(10) }, () => alphabet[rnd(alphabet.length)]).join('');
      expect(joined(t), t).toBe(t);
      for (const l of links(t)) expect(l.href, t).toMatch(/^https?:\/\//);
    }
  });

  it('TC-450v [FR-11] 매우 긴 입력(2만 자)도 빠르게 처리된다(정규식 폭주 없음)', () => {
    const t0 = Date.now();
    const text = `${'http://a.com/'.repeat(1500)}${'.'.repeat(5000)}`;
    expect(joined(text)).toBe(text);
    expect(Date.now() - t0).toBeLessThan(2000);
  });
});
