import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tokens } from './tokens';

const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lum = (h: string): number => {
  const [r, g, b] = hex(h).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
const c = tokens.color;
const WHITE = '#FFFFFF';

describe('색 대비 WCAG AA (NFR-09, UX-08)', () => {
  it('TC-214 [NFR-09,UX-08] 본문·보조 글자는 모든 배경에서 4.5:1 이상이다', () => {
    for (const bg of [c.bg, c.surface, c.raised, c.tile]) {
      expect(contrast(c.text, bg), `text/${bg}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.muted, bg), `muted/${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('TC-215 [NFR-09,UX-08] 버튼(기본·호버) 위 흰 글자는 4.5:1 이상이다', () => {
    for (const bg of [c.accent, c['accent-hover'], c.danger, c['danger-hover']]) expect(contrast(WHITE, bg), `white/${bg}`).toBeGreaterThanOrEqual(4.5);
  });
  it('TC-216 [NFR-09,UX-08] 경고 배지(어두운 글자/경고색)와 아이콘·링크 색은 어두운 면 위에서 4.5:1 이상이다', () => {
    expect(contrast(c.bg, c.warning)).toBeGreaterThanOrEqual(4.5);
    for (const bg of [c.surface, c.raised, c.tile]) {
      expect(contrast(c['danger-text'], bg), `danger-text/${bg}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.warning, bg), `warning/${bg}`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.focus, bg), `focus/${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('TC-217 [NFR-09] 비텍스트 요소(포커스 링, 말하는 사람 강조, 성공 아이콘)는 3:1 이상이다', () => {
    expect(contrast(c.focus, c.bg)).toBeGreaterThanOrEqual(3);
    expect(contrast(c.speaking, c.tile)).toBeGreaterThanOrEqual(3);
    expect(contrast(c.success, c.surface)).toBeGreaterThanOrEqual(3);
    expect(contrast(c.line, c.bg)).toBeGreaterThanOrEqual(1.3); // 구분선은 장식
  });
});

const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|css)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(full);
  }
  return out;
};
const SRC = path.resolve(__dirname, '..');

describe('디자인 토큰·문구 단일 출처 (UX-01, UX-08)', () => {
  it('TC-212 [UX-08] 색상 코드는 design/tokens.ts 밖에 하드코딩하지 않는다', () => {
    const offenders = walk(SRC)
      .filter((f) => !f.endsWith(`design${path.sep}tokens.ts`))
      .flatMap((f) => (fs.readFileSync(f, 'utf8').match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|rgba?\(/g) ? [path.relative(SRC, f)] : []));
    expect(offenders).toEqual([]);
  });
  it('TC-213 [UX-01] 화면에 보이는 한글 문구는 strings.ts에만 있다(컴포넌트·페이지에 직접 쓰지 않는다)', () => {
    const offenders: string[] = [];
    for (const f of walk(SRC)) {
      const rel = path.relative(SRC, f);
      if (rel === 'strings.ts') continue;
      const text = fs.readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .filter((l) => !l.trim().startsWith('//') && !l.includes('eslint-disable'))
        .map((l) => l.replace(/\s\/\/.*$/, ''))
        .join('\n');
      const hits = text.match(/[가-힣]+/g);
      if (hits) offenders.push(`${rel}: ${[...new Set(hits)].slice(0, 5).join(', ')}`);
    }
    expect(offenders).toEqual([]);
  });
});
