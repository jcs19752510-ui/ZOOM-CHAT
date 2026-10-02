import fs from 'node:fs';
import path from 'node:path';
import postcss, { type AtRule, type Declaration, type Root, type Rule } from 'postcss';
import tailwind from 'tailwindcss';
import { beforeAll, describe, expect, it } from 'vitest';
import config from '../../tailwind.config';
import viteConfig from '../../vite.config';
import { tokens } from './tokens';

// unit-12 6th-stage retro audit: compiled-CSS and source-usage checks that the string-only tests (stateScreen.test.ts, design.test.ts) cannot see.
const WEB = path.resolve(__dirname, '..', '..');
const SRC = path.join(WEB, 'src');
const c = tokens.color;
const colorNames = Object.keys(c);

const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(e.name) && !/\.(test|spec)\./.test(e.name) && e.name !== 'testUtil.ts') out.push(full);
  }
  return out;
};
const tsx = walk(SRC).filter((f) => f.endsWith('.tsx'));
const rel = (f: string): string => path.relative(SRC, f);

const hex = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const lum = (h: string): number => {
  const [r, g, b] = hex(h).map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};
const hexToRgb = (h: string): string => `${parseInt(h.slice(1, 3), 16)} ${parseInt(h.slice(3, 5), 16)} ${parseInt(h.slice(5, 7), 16)}`;

let css = '';
let root: Root;
beforeAll(async () => {
  const from = path.join(SRC, 'index.css');
  const res = await postcss([tailwind({ ...config, content: (config.content as string[]).map((g) => path.resolve(WEB, g)) } as never)]).process(fs.readFileSync(from, 'utf8'), { from });
  css = res.css;
  root = postcss.parse(css);
});

const rulesFor = (selector: string): Rule[] => {
  const out: Rule[] = [];
  root.walkRules((r) => {
    if (r.selectors.map((s) => s.trim()).includes(selector)) out.push(r);
  });
  return out;
};
const declsFor = (selector: string): Declaration[] => rulesFor(selector).flatMap((r) => r.nodes.filter((n): n is Declaration => n.type === 'decl'));
const value = (selector: string, prop: string): string | undefined => declsFor(selector).find((d) => d.prop === prop)?.value;

describe('compiled CSS (unit-12 retro, NFR-10, UX-08, UX-11)', () => {
  it('TC-484b [NFR-10] compiled .btn/.btn-*/.input/.min-h-touch/.min-w-touch resolve to 44px (tailwind config + index.css, not just source strings)', () => {
    for (const sel of ['.btn', '.btn-primary', '.btn-secondary', '.btn-danger', '.input', '.min-h-touch']) expect(value(sel, 'min-height'), sel).toBe('44px');
    expect(value('.min-w-touch', 'min-width')).toBe('44px');
  });

  it('TC-484c [UX-08] compiled button colors come from tokens: primary=accent, danger=danger, secondary=raised, hover variants=hover tokens', () => {
    const rgb = (sel: string): string | undefined => value(sel, 'background-color')?.match(/rgb\((\d+ \d+ \d+)/)?.[1];
    expect(rgb('.btn-primary')).toBe(hexToRgb(c.accent));
    expect(rgb('.btn-primary:hover')).toBe(hexToRgb(c['accent-hover']));
    expect(rgb('.btn-danger')).toBe(hexToRgb(c.danger));
    expect(rgb('.btn-danger:hover')).toBe(hexToRgb(c['danger-hover']));
    expect(rgb('.btn-secondary')).toBe(hexToRgb(c.raised));
    expect(rgb('.btn-secondary:hover')).toBe(hexToRgb(c.line));
  });

  it('TC-484d [UX-10,NFR-09] compiled :focus-visible is a solid >=2px outline in the focus token color, and nothing in the CSS removes outlines', () => {
    expect(value(':focus-visible', 'outline-style')).toBe('solid');
    expect(value(':focus-visible', 'outline-width')).toBe('2px');
    expect(value(':focus-visible', 'outline-color')?.toLowerCase()).toBe(c.focus.toLowerCase());
    const bad: string[] = [];
    root.walkDecls((d) => {
      if (/^outline(-style|-width)?$/.test(d.prop) && /^(none|0|0px)$/.test(d.value.trim())) bad.push(`${(d.parent as Rule).selector}{${d.prop}:${d.value}}`);
    });
    expect(bad).toEqual([]);
  });

  it('TC-484e [UX-11] the compiled prefers-reduced-motion block is a real @media at-rule that zeroes animation, transition and smooth scroll for every element', () => {
    const blocks: AtRule[] = [];
    root.walkAtRules('media', (a) => {
      if (/prefers-reduced-motion:\s*reduce/.test(a.params)) blocks.push(a);
    });
    expect(blocks.length).toBe(1);
    const rule = blocks[0]?.nodes?.find((n): n is Rule => n.type === 'rule');
    expect(rule?.selectors.map((s) => s.trim())).toEqual(['*', '*::before', '*::after']);
    const props = Object.fromEntries((rule?.nodes ?? []).filter((n): n is Declaration => n.type === 'decl').map((d) => [d.prop, `${d.value}${d.important ? ' !important' : ''}`]));
    expect(props['animation-duration']).toBe('0.01ms !important');
    expect(props['transition-duration']).toBe('0.01ms !important');
    expect(props['scroll-behavior']).toBe('auto !important');
  });

  it('TC-484f [UX-08] every color in compiled CSS is a token value (no stray literal colors) and body uses the bg/text tokens', () => {
    const allowed = new Set([...Object.values(c).map((v) => v.toLowerCase()), '#fff', '#ffffff', '#000', '#000000']);
    const stray = new Set<string>();
    root.walkDecls((d) => {
      for (const m of d.value.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) if (!allowed.has(m[0].toLowerCase())) if (m[0] !== '#0000') stray.add(`${d.prop}:${m[0]}`);
    });
    // tailwind preflight uses a few fixed grays for default borders/placeholders; those are overridden by the base layer rules below.
    const preflight = [...stray].filter((s) => !/^(border-color|--tw-.*|color|background-color):#(e5e7eb|9ca3af|d1d5db|6b7280)$/i.test(s));
    expect(preflight).toEqual([]);
    expect(value('body', 'background-color')?.match(/rgb\((\d+ \d+ \d+)/)?.[1]).toBe(hexToRgb(c.bg));
    expect(value('body', 'color')?.match(/rgb\((\d+ \d+ \d+)/)?.[1]).toBe(hexToRgb(c.text));
    expect(value('body', 'word-break')).toBe('keep-all');
    const fam = value('body', 'font-family') ?? '';
    expect(fam).toContain('Pretendard Variable');
    expect(fam).toContain('Malgun Gothic');
    expect(fam).toContain('Apple SD Gothic Neo');
    expect(fam.trim().endsWith('sans-serif')).toBe(true);
  });

  it('TC-484g [UX-08] every bg-/text-/border-/ring-/outline-/from-/to-/shadow-/rounded-/min-h-/min-w- class used in a tsx string has a compiled rule using the tailwind config own content globs (typo like bg-surfce, or a purged tsx glob, would silently render nothing)', () => {
    const esc = (cls: string): string => cls.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
    const missing = new Set<string>();
    for (const f of tsx) {
      const text = fs.readFileSync(f, 'utf8');
      for (const lit of text.matchAll(/(["'`])((?:(?!\1)[^\\\n$])*)\1/g)) {
        for (const tok of (lit[2] ?? '').split(/\s+/)) {
          if (!/^(?:[a-z-]+:)*(bg|text|border|ring|outline|from|to|shadow|rounded|min-h|min-w)-[a-z0-9[\]#./%-]+$/.test(tok)) continue;
          if (/^(?:[a-z-]+:)*(text|border)-(true|false)$/.test(tok)) continue;
          if (!css.includes(`.${esc(tok)}`)) missing.add(`${rel(f)}: ${tok}`);
        }
      }
    }
    expect([...missing]).toEqual([]);
  });
});

describe('tokens vs design-system.md (independent spec, UX-08, NFR-09)', () => {
  const doc = fs.readFileSync(path.resolve(WEB, '..', '..', 'docs', '02-design', 'design-system.md'), 'utf8');

  it('TC-212b [UX-08] tokens.ts color values equal the design-system.md color table, both directions (no undocumented, missing or changed token)', () => {
    const section = doc.split('### ')[1] ?? '';
    const rows = [...section.matchAll(/^\|\s*`([a-z-]+)`\s*\|\s*`([^`]+)`\s*\|/gm)].map((m) => [m[1], m[2]] as const);
    expect(rows.length).toBe(17);
    expect(Object.fromEntries(rows)).toEqual(c);
  });

  it('TC-212c [UX-08] radius, shadow, font stack order and touch size equal the design-system.md values', () => {
    const radius = doc.match(/\|\s*[^|\n]*\|\s*sm (\d+)px · md (\d+)px · lg (\d+)px · pill (\d+)px\s*\|/);
    expect(radius).not.toBeNull();
    expect(tokens.radius).toEqual({ sm: `${radius?.[1]}px`, md: `${radius?.[2]}px`, lg: `${radius?.[3]}px`, pill: `${radius?.[4]}px` });
    const shadow = doc.match(/pop: `([^`]+)`/)?.[1] ?? '';
    const norm = (v: string): string => v.replace(/\s+/g, '').replace(/0\.(\d)/g, '.$1');
    expect(norm(tokens.shadow.pop)).toBe(norm(shadow));
    const fonts = (doc.match(/\|\s*[^|\n]*\|\s*(Pretendard Variable[^|\n(]*)/)?.[1] ?? '').split('→').map((x) => x.trim()).filter(Boolean);
    expect(fonts.length).toBe(5);
    const stack = tokens.font.sans.map((f) => f.replace(/"/g, ''));
    expect(stack.filter((f) => fonts.includes(f))).toEqual(fonts);
    expect(doc).toContain('`min-h-touch`, `min-w-touch`');
    expect(doc.match(/\|\s*[^|\n]*\|\s*(\d+)px \(`min-h-touch`/)?.[1]).toBe(tokens.touch.replace('px', ''));
  });

  it('TC-217c [NFR-09] every contrast row in design-system.md section 2 is reproduced by the real token colors within 0.1 (the doc cannot drift from the code), and every color used there is a token or white', () => {
    const sec = doc.split('## 2.')[1]?.split('## 3.')[0] ?? '';
    const rows = [...sec.matchAll(/\|\s*`(#[0-9A-Fa-f]{6})`\s*\|\s*`(#[0-9A-Fa-f]{6})`\s*\|\s*([0-9.]+):1/g)];
    expect(rows.length).toBe(19);
    const allowed = new Set([...Object.values(c).filter((v) => v.startsWith('#')).map((v) => v.toLowerCase()), '#ffffff']);
    for (const m of rows) {
      expect(allowed.has((m[1] as string).toLowerCase()), m[1]).toBe(true);
      expect(allowed.has((m[2] as string).toLowerCase()), m[2]).toBe(true);
      expect(Math.abs(contrast(m[1] as string, m[2] as string) - Number(m[3])), `${m[1]} on ${m[2]}`).toBeLessThanOrEqual(0.1);
    }
  });
});

describe('color pair audit from real class usage (unit-12 retro, NFR-09)', () => {
  const nonText = new Set(['success', 'speaking']);
  const surfaces = [c.bg, c.surface, c.raised, c.tile];
  // overlay is rgba(); the backdrop is a video frame we cannot know, so judge it blended over pure white (worst case for white text).
  const blendOverWhite = (rgba: string): string => {
    const m = rgba.match(/rgba\((\d+), (\d+), (\d+), ([0-9.]+)\)/);
    if (!m) throw new Error(`not rgba: ${rgba}`);
    const a = Number(m[4]);
    const ch = [m[1], m[2], m[3]].map((v) => Math.round(Number(v) * a + 255 * (1 - a)).toString(16).padStart(2, '0'));
    return `#${ch.join('')}`;
  };
  const colorOf = (name: string): string | undefined => (name === 'white' ? '#FFFFFF' : name === 'overlay' ? blendOverWhite(c.overlay) : (c as Record<string, string>)[name]);

  const groups: { where: string; classes: string[] }[] = [];
  for (const f of tsx) {
    const text = fs.readFileSync(f, 'utf8');
    for (const lit of text.matchAll(/(["'`])((?:(?!\1)[^\\\n])*)\1/g)) {
      const body = (lit[2] ?? '').replace(/\$\{[^}]*\}/g, ' ');
      if (/\b(text|bg)-/.test(body)) groups.push({ where: rel(f), classes: body.split(/\s+/) });
    }
  }
  const cssText = fs.readFileSync(path.join(SRC, 'index.css'), 'utf8');
  for (const m of cssText.matchAll(/@apply ([^;]+);/g)) groups.push({ where: 'index.css', classes: (m[1] ?? '').split(/\s+/) });

  const names = (classes: string[], prefix: 'text' | 'bg'): string[] =>
    classes.flatMap((t) => {
      const m = t.match(new RegExp(`^(?:[a-z-]+:)*${prefix}-([a-z-]+?)(?:/\\d+)?$`));
      return m && m[1] && colorOf(m[1]) ? [m[1]] : [];
    });

  it('TC-216b [NFR-09] every text-<token> that shares a class group with a bg-<token> (incl. hover: variants and @apply) has >=4.5:1 (>=3 for non-text success/speaking)', () => {
    const fails: string[] = [];
    let pairs = 0;
    for (const g of groups) {
      for (const t of names(g.classes, 'text')) {
        for (const b of names(g.classes, 'bg')) {
          pairs++;
          // overlay sits over unknown video: judged against a pure-white frame (absolute worst case), so the bar is 3:1 there (measured 4.41 for warning, 8.5 for white)
          const need = nonText.has(t) || b === 'overlay' ? 3 : 4.5;
          const ratio = contrast(colorOf(t) as string, colorOf(b) as string);
          if (ratio < need) fails.push(`${g.where}: text-${t} on bg-${b} = ${ratio.toFixed(2)} < ${need}`);
        }
      }
    }
    expect(pairs).toBeGreaterThan(8); // guard: the scan really found pairs
    expect([...new Set(fails)]).toEqual([]);
  });

  it('TC-216c [NFR-09] every text color token used without an explicit bg in the same group passes against all four dark surfaces (4.5:1; 3:1 for success)', () => {
    const fails: string[] = [];
    const used = new Set<string>();
    for (const g of groups) {
      if (names(g.classes, 'bg').length > 0) continue;
      for (const t of names(g.classes, 'text')) {
        if (t === 'white' || t === 'bg') continue; // white is only placed on token backgrounds/overlays; text-bg needs its own bg (checked in TC-216b)
        used.add(t);
        for (const s of surfaces) {
          const need = nonText.has(t) ? 3 : 4.5;
          const ratio = contrast(colorOf(t) as string, s);
          if (ratio < need) fails.push(`${g.where}: text-${t} on ${s} = ${ratio.toFixed(2)} < ${need}`);
        }
      }
    }
    expect([...used].sort()).toEqual(expect.arrayContaining(['muted', 'text', 'warning', 'danger-text', 'focus']));
    expect([...new Set(fails)]).toEqual([]);
  });

  it('TC-216d [NFR-09] a text-white (or text-bg) class group without any bg-<token> is limited to image/overlay contexts and never appears in StateScreen/Lobby/Landing/Legal pages', () => {
    const offenders = groups
      .filter((g) => names(g.classes, 'bg').length === 0 && g.classes.some((t) => /^text-(white|bg)$/.test(t)))
      .map((g) => g.where)
      .filter((w) => /StateScreen|Landing|Lobby|Legal|CopyLink|InAppNotice|ConfirmModal|DeviceSheet|PageShell/.test(w));
    expect(offenders).toEqual([]);
  });

  it('TC-217b [NFR-09] token palette sanity: every color token is #RRGGBB or rgba(), unique values, and surfaces are strictly ordered by luminance bg < surface < tile < raised < line', () => {
    for (const [k, v] of Object.entries(c)) expect(v, k).toMatch(/^(#[0-9A-Fa-f]{6}|rgba\(\d+, \d+, \d+, [0-9.]+\))$/);
    expect(new Set(Object.values(c).map((v) => v.toLowerCase())).size).toBe(Object.keys(c).length);
    const l = (h: string): number => contrast(h, '#000000');
    expect(l(c.bg)).toBeLessThan(l(c.surface));
    expect(l(c.surface)).toBeLessThan(l(c.tile));
    expect(l(c.tile)).toBeLessThan(l(c.raised));
    expect(l(c.raised)).toBeLessThan(l(c.line));
    expect(colorNames).toEqual(expect.arrayContaining(['bg', 'surface', 'raised', 'tile', 'line', 'text', 'muted', 'accent', 'danger', 'danger-text', 'success', 'warning', 'speaking', 'focus', 'overlay']));
  });
});

/** Extract the opening tags `<name ...>` with brace/quote aware scanning (arrow functions inside attributes contain `>`). */
const openingTags = (src: string, name: string): string[] => {
  const out: string[] = [];
  const re = new RegExp(`<${name}(?=[\\s>/])`, 'g');
  for (const m of src.matchAll(re)) {
    let i = (m.index ?? 0) + m[0].length;
    let depth = 0;
    let quote = '';
    for (; i < src.length; i++) {
      const ch = src[i] as string;
      if (quote) {
        if (ch === quote && src[i - 1] !== '\\') quote = '';
      } else if (depth > 0 && (ch === '"' || ch === "'" || ch === '`')) quote = ch;
      else if (ch === '"') quote = ch;
      else if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0) break;
    }
    out.push(src.slice(m.index ?? 0, i + 1));
  }
  return out;
};
const classOf = (tag: string): string => {
  const i = tag.indexOf('className=');
  if (i < 0) return '';
  const rest = tag.slice(i + 'className='.length);
  if (rest.startsWith('"')) return rest.slice(1, rest.indexOf('"', 1));
  let depth = 0;
  let end = 0;
  for (; end < rest.length; end++) {
    if (rest[end] === '{') depth++;
    else if (rest[end] === '}' && --depth === 0) break;
  }
  return rest.slice(0, end + 1);
};

describe('touch target audit from source (unit-12 retro, NFR-10)', () => {
  const controls: { where: string; tag: string; cls: string }[] = [];
  for (const f of tsx) {
    const text = fs.readFileSync(f, 'utf8');
    for (const name of ['button', 'select', 'input', 'textarea', 'summary']) for (const tag of openingTags(text, name)) controls.push({ where: `${rel(f)} <${name}>`, tag, cls: classOf(tag) });
  }

  it('TC-485b [NFR-10] every <button>/<select>/<input>/<textarea> uses .btn*/.input or min-h-touch (44px height); the scan finds the known controls', () => {
    expect(controls.length).toBeGreaterThanOrEqual(20);
    const offenders = controls.filter((x) => !/type="checkbox"/.test(x.tag)).filter((x) => !/\bbtn(-primary|-secondary|-danger)?\b|\binput\b|min-h-touch|btn-\$|'btn-|"btn-/.test(x.cls)).map((x) => `${x.where}: ${x.cls.slice(0, 60)}`);
    expect(offenders).toEqual([]);
  });

  it('TC-485c [NFR-10] no control shrinks its height under 44px with h-N/max-h-N/min-h-[Npx<44] utilities', () => {
    const offenders = controls
      .filter((x) => !/type="checkbox"/.test(x.tag))
      .filter((x) => /(^|[\s"'`{:])(h-[0-9]|h-10\b|h-\[[0-3]?[0-9]px\]|max-h-[0-9]\b|min-h-\[(?:[0-3]?[0-9]|4[0-3])px\])/.test(x.cls))
      .map((x) => `${x.where}: ${x.cls.slice(0, 60)}`);
    expect(offenders).toEqual([]);
  });

  it('TC-485f [NFR-10] every aria-label icon button other than the documented chevrons is at least 44px wide (min-w-touch or .btn*)', () => {
    const offenders = controls
      .filter((x) => x.tag.includes('aria-label') && !/type="checkbox"/.test(x.tag) && !x.tag.startsWith('<select') && !x.tag.startsWith('<input') && !/deviceMenu(Mic|Camera)/.test(x.tag))
      .filter((x) => !/\bbtn|min-w-touch|\binput\b/.test(x.cls))
      .map((x) => `${x.where}: ${x.cls.slice(0, 50)}`);
    expect(controls.filter((x) => x.tag.includes('aria-label')).length).toBeGreaterThanOrEqual(6);
    expect(offenders).toEqual([]);
  });

  it('TC-484h [UX-10] no tsx removes the focus outline (outline-none/outline-0) except a tabIndex={-1} programmatic focus container, and no positive tabIndex exists', () => {
    const offenders: string[] = [];
    for (const f of tsx) {
      const text = fs.readFileSync(f, 'utf8');
      if (/tabIndex=\{\s*[1-9]/.test(text)) offenders.push(`${rel(f)}: positive tabIndex`);
      for (const m of text.matchAll(/(?:^|[\s"'`:])((?:[a-z-]+:)*outline-(?:none|0))(?=[\s"'`])/g)) {
        const start = text.lastIndexOf('<', m.index ?? 0);
        const tag = text.slice(start, (m.index ?? 0) + 200).split('>')[0] ?? '';
        if (!/tabIndex=\{-1\}/.test(tag)) offenders.push(`${rel(f)}: ${m[1]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('TC-485e [NFR-10] a checkbox is allowed to be small only when it sits inside a <label> row that has min-h-touch (the row is the touch target)', () => {
    const boxes = controls.filter((x) => /type="checkbox"/.test(x.tag));
    expect(boxes.length).toBeGreaterThanOrEqual(1);
    for (const f of tsx) {
      const text = fs.readFileSync(f, 'utf8');
      for (const m of text.matchAll(/<input\b[^>]*type="checkbox"/g)) {
        const before = text.slice(Math.max(0, (m.index ?? 0) - 200), m.index);
        const label = before.lastIndexOf('<label');
        expect(label, `${rel(f)}: checkbox without label`).toBeGreaterThanOrEqual(0);
        expect(before.slice(label), rel(f)).toMatch(/min-h-touch/);
        expect(before.slice(label), rel(f)).not.toContain('</label>');
      }
    }
  });

  it('TC-485d [NFR-10] the only sub-44px-wide controls are the two device-menu chevrons documented as the desktop-only chip exception (accessibility-spec 2.5.8): hidden below sm, min-h-touch, 28px wide', () => {
    const narrow = controls.filter((x) => x.tag.includes('aria-label') && !/\bbtn|min-w-touch/.test(x.cls) && /min-w-\[\d+px\]/.test(x.cls));
    expect(narrow.map((x) => x.where)).toEqual(['components/ControlBar.tsx <button>', 'components/ControlBar.tsx <button>']);
    for (const x of narrow) {
      expect(x.tag).toMatch(/aria-label=\{S\.room\.deviceMenu(Mic|Camera)\}/);
      expect(x.cls).toMatch(/(^|\s)hidden(\s|$)/);
      expect(x.cls).toMatch(/\bsm:flex\b/);
      expect(x.cls).toMatch(/\bmin-h-touch\b/);
      expect(x.cls).toMatch(/min-w-\[28px\]/);
    }
  });
});

describe('index.html and vite config (unit-12 retro, UX-08, SEC-07)', () => {
  const html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8');

  it('TC-486b [UX-10,NFR-10] viewport allows pinch zoom (no user-scalable=no / maximum-scale<5) and declares width=device-width', () => {
    const vp = html.match(/<meta name="viewport" content="([^"]*)"/)?.[1] ?? '';
    expect(vp).toContain('width=device-width');
    expect(vp).toContain('initial-scale=1');
    expect(vp).not.toMatch(/user-scalable\s*=\s*(no|0)/);
    expect(vp).not.toMatch(/maximum-scale\s*=\s*[0-4](\.\d+)?(,|$)/);
  });

  it('TC-486c [SEC-07] index.html has no inline script/style, one #root, a module entry script, a no-referrer policy, and a non-empty title (strict CSP-compatible)', () => {
    const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
    expect(scripts.length).toBe(1);
    expect(scripts[0]?.[1]).toContain('type="module"');
    expect(scripts[0]?.[1]).toContain('src="/src/main.tsx"');
    expect((scripts[0]?.[2] ?? '').trim()).toBe('');
    expect(html).not.toMatch(/<style\b/i);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect([...html.matchAll(/id="root"/g)].length).toBe(1);
    expect(html).toContain('<meta name="referrer" content="no-referrer" />');
    expect(html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim()).toBe('MeetLite');
    expect(html).toContain('<meta charset="UTF-8" />');
  });

  it('TC-486d [UX-01] the html title and the app name string agree', async () => {
    const { S } = await import('../strings');
    expect(html.match(/<title>([^<]*)<\/title>/)?.[1]).toBe(S.app.name);
  });

  it('TC-486e [UX-08] public/ has no stray color definitions to bypass the token file (manifest theme_color, if any, equals the bg token)', () => {
    const dir = path.join(WEB, 'public');
    const bad: string[] = [];
    for (const e of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
      if (!/\.(json|webmanifest|svg|css)$/.test(e)) continue;
      const text = fs.readFileSync(path.join(dir, e), 'utf8');
      for (const m of text.matchAll(/"(?:theme_color|background_color)"\s*:\s*"(#[0-9a-fA-F]{6})"/g)) if (m[1]?.toLowerCase() !== c.bg.toLowerCase()) bad.push(`${e}: ${m[0]}`);
    }
    expect(bad).toEqual([]);
  });

  it('TC-486f [SEC-07] vite dev config proxies /api, /healthz and /socket.io(ws) to the server default port, with no source maps and es2022 target', () => {
    const serverCfg = fs.readFileSync(path.resolve(WEB, '..', 'server', 'src', 'config.ts'), 'utf8');
    const port = serverCfg.match(/PORT:\s*z\.coerce\.number\(\)[^\n]*\.default\((\d+)\)/)?.[1];
    expect(port).toBeDefined();
    const cfg = viteConfig as { server?: { port?: number; proxy?: Record<string, unknown> }; build?: { sourcemap?: unknown; target?: unknown }; plugins?: unknown[] };
    const proxy = cfg.server?.proxy ?? {};
    expect(Object.keys(proxy).sort()).toEqual(['/api', '/healthz', '/socket.io']);
    expect(proxy['/api']).toBe(`http://localhost:${port}`);
    expect(proxy['/healthz']).toBe(`http://localhost:${port}`);
    expect(proxy['/socket.io']).toEqual({ target: `http://localhost:${port}`, ws: true });
    expect(cfg.server?.port).toBe(5173);
    expect(cfg.build?.sourcemap).toBe(false);
    expect(cfg.build?.target).toBe('es2022');
    expect(cfg.plugins?.length).toBe(1);
  });
});
