import fs from 'node:fs';
import path from 'node:path';
import { isValidElement, createElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LIMITS } from '@meetlite/shared';
import { describe, expect, it } from 'vitest';
import { S, errorText } from '../strings';
import * as icons from './icons';
import { StateScreen } from './StateScreen';

// unit-12 6th-stage retro gap tests: structure of the shared state frame, who uses which state screen, strings function outputs, errorText mapping, icon set.
const SRC = path.resolve(__dirname, '..');
const read = (rel: string): string => fs.readFileSync(path.join(SRC, rel), 'utf8');

type El = ReactElement<{ className?: string; children?: ReactNode; role?: string; 'aria-hidden'?: string }>;
const kids = (n: ReactNode): El[] => {
  const out: El[] = [];
  const visit = (x: ReactNode): void => {
    if (Array.isArray(x)) x.forEach(visit);
    else if (isValidElement(x)) out.push(x as El);
  };
  visit(n);
  return out;
};
const frame = (props: Parameters<typeof StateScreen>[0]): { main: El; section: El } => {
  const main = StateScreen(props) as El;
  const section = kids(main.props.children)[0] as El;
  return { main, section };
};

describe('StateScreen frame structure (UX-02, UX-03, NFR-10)', () => {
  it('TC-480b [UX-02,NFR-10] main fills the viewport and centers the card; the card is full-width capped (max-w-md) so 360px screens do not overflow; uses surface/line/shadow tokens', () => {
    const { main, section } = frame({ title: 'T', body: 'B' });
    expect(main.type).toBe('main');
    expect(main.props.className).toMatch(/\bmin-h-full\b/);
    expect(main.props.className).toMatch(/\bitems-center\b/);
    expect(main.props.className).toMatch(/\bjustify-center\b/);
    expect(main.props.className).toMatch(/\bp-4\b/);
    const cls = section.props.className ?? '';
    for (const k of ['w-full', 'max-w-md', 'bg-surface', 'border-line', 'shadow-pop', 'text-center']) expect(cls, k).toMatch(new RegExp(`(^|\\s)${k}(\\s|$)`));
  });

  it('TC-480c [UX-03] the action area wraps (flex-wrap) and centers so two buttons fit a 360px card, and renders only when children are truthy (null/undefined/false/0/empty string render nothing)', () => {
    const btn = createElement('button', null, 'x');
    const { section } = frame({ title: 'T', body: 'B', children: [btn, btn] });
    const wrap = kids(section.props.children).find((e) => /flex-wrap/.test(e.props.className ?? ''));
    expect(wrap?.props.className).toMatch(/\bflex\b/);
    expect(wrap?.props.className).toMatch(/\bjustify-center\b/);
    expect(wrap?.props.className).toMatch(/\bgap-2\b/);
    for (const falsy of [null, undefined, false, 0, '']) {
      const f = frame({ title: 'T', body: 'B', children: falsy as ReactNode });
      expect(kids(f.section.props.children).some((e) => /flex-wrap/.test(e.props.className ?? '')), String(falsy)).toBe(false);
    }
  });

  it('TC-480d [UX-10] icon wrapper is aria-hidden and muted, absent when no icon; the body paragraph is the muted token; exactly one h1', () => {
    const withIcon = frame({ title: 'T', body: 'B', icon: createElement('i') });
    const wrap = kids(withIcon.section.props.children).find((e) => e.props['aria-hidden'] === 'true');
    expect(wrap?.props.className).toMatch(/\btext-muted\b/);
    expect(frame({ title: 'T', body: 'B' }).section.props.children).toBeDefined();
    const none = renderToStaticMarkup(createElement(StateScreen, { title: 'T', body: 'B' }));
    expect(none).not.toContain('aria-hidden');
    expect(none.match(/<h1\b/g)?.length).toBe(1);
    expect(none).toMatch(/<p class="[^"]*\btext-muted\b[^"]*">B<\/p>/);
  });

  it('TC-480e [UX-02,SEC-07] title and body are rendered as escaped text, never as HTML; explicit alert=false is a status region', () => {
    const html = renderToStaticMarkup(createElement(StateScreen, { alert: false, title: '<img src=x onerror=1>', body: '<script>1</script>' }));
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;img');
    expect(html).toContain('role="status"');
  });
});

describe('state screen usage across pages (UX-02, UX-03)', () => {
  const room = read('pages/RoomPage.tsx');
  const chunks = room.split('<StateScreen').slice(1).map((c) => c.split('</StateScreen>')[0] ?? c);

  it('TC-481b [UX-02] RoomPage renders 10 StateScreen variants whose title/body come only from S.state (no literals), covering loading/unsupported/error/gone(2)/waitHost/full/locked/kicked/expired/left', () => {
    expect(chunks.length).toBe(11);
    const keys = chunks.map((c) => c.match(/title=\{S\.state\.(\w+)\.(\w+)\}/)).map((m) => (m ? `${m[1]}.${m[2]}` : 'LITERAL'));
    expect(keys).toEqual(['loading.title', 'unsupported.title', 'error.title', 'gone.operatorTitle', 'gone.title', 'waitHost.title', 'full.title', 'locked.title', 'kicked.title', 'expired.title', 'left.title']);
    for (const c of chunks) {
      expect(c).toMatch(/body=\{(S\.state\.|`\$\{S\.state\.|phase\.why === 'restarted' \? S\.state\.)/);
      // the body must come from the same S.state group as the title (a locked title over a full-room body would pass every other check)
      const titleGroup = c.match(/title=\{S\.state\.(\w+)\./)?.[1];
      const bodyGroups = [...(c.match(/body=\{[^}]*\}/)?.[0] ?? '').matchAll(/S\.state\.(\w+)\./g)].map((m) => m[1]);
      expect(bodyGroups.length).toBeGreaterThan(0);
      for (const g of bodyGroups) expect(g, `title ${titleGroup} vs body ${g}`).toBe(titleGroup);
    }
  });

  it('TC-481c [UX-02,UX-10] error-class screens announce as alert (unsupported/error/gone/full/locked/kicked/expired); neutral screens (loading/waitHost/left) do not', () => {
    const alertKeys = ['unsupported', 'error', 'gone', 'full', 'locked', 'kicked', 'expired'];
    const neutralKeys = ['loading', 'waitHost', 'left'];
    for (const c of chunks) {
      const key = c.match(/title=\{S\.state\.(\w+)\./)?.[1] ?? '';
      const isAlert = /^\s*alert\b/.test(c);
      if (alertKeys.includes(key)) expect(isAlert, `${key} should be alert`).toBe(true);
      else expect(neutralKeys, key).toContain(key);
      if (neutralKeys.includes(key)) expect(isAlert, `${key} should not be alert`).toBe(false);
    }
  });

  it('TC-481d [UX-03] every screen except loading offers at least one next-action button (retry / home / new room) with a strings label', () => {
    for (const c of chunks) {
      const key = c.match(/title=\{S\.state\.(\w+)\./)?.[1] ?? '';
      if (['loading'].includes(key)) continue;
      if (key === 'unsupported') {
        expect(c, key).toMatch(/<CopyLink\b/); // the action is the copy-link control (its own label comes from strings)
        continue;
      }
      // `{home}` is a shared button element defined in the same file
      const resolved = c.includes('{home}') ? `${c} ${room.match(/const home = \([\s\S]*?\n {2}\);/)?.[0] ?? ''}` : c;
      expect(resolved, key).toMatch(/<button\b[^>]*onClick=/);
      expect(resolved, key).toMatch(/\{S\.(state|landing|lobby)\.\w+(\.\w+)?\}/);
    }
  });

  it('TC-481e [UX-02] every S.state group is referenced by real UI code (a screen text that nothing renders would silently reduce the 7+ state screens)', () => {
    const all = ['pages/RoomPage.tsx', 'pages/Lobby.tsx', 'pages/Landing.tsx', 'pages/Room.tsx', 'components/InAppNotice.tsx'].map(read).join('\n');
    for (const group of Object.keys(S.state)) expect(all, `S.state.${group} unused`).toMatch(new RegExp(`S\\.state\\.${group}\\b`));
    // distinct screens a user can reach: StateScreen variants + the lobby's inline permission alert
    expect(new Set(chunks.map((c) => c.match(/S\.state\.(\w+)/)?.[1])).size + 1).toBeGreaterThanOrEqual(7);
  });

  it('TC-481f [UX-03] every state-screen body/title string in S.state has no raw placeholder, double space or trailing whitespace, and bodies end with a sentence mark', () => {
    const bad: string[] = [];
    const visit = (v: unknown, p: string): void => {
      if (typeof v === 'string') {
        if (v !== v.trim() || /\s{2,}/.test(v) || /\{\w*\}|\$\{|%s/.test(v)) bad.push(p);
        if (!/title$|Title$|retry$|home$|newRoom$|rejoin$|cancel$|copy$/.test(p) && !/[.!?]$/.test(v)) bad.push(`${p}: no sentence end`);
      } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) visit(x, `${p}.${k}`);
    };
    visit(S.state, 'state');
    expect(bad).toEqual([]);
  });
});

describe('Korean-only UI strings (UX-01)', () => {
  it('TC-305h [UX-01] every user-facing string in S contains Hangul (UI is Korean-only), except the brand name and pure number/symbol formats', () => {
    const offenders: string[] = [];
    const visit = (v: unknown, p: string): void => {
      if (typeof v === 'string') {
        if (!/[\u3131-\u318E\uAC00-\uD7A3]/.test(v) && v !== S.app.name && p !== 'S.legal.status' && !/\.id$|\.slots\[\d+\]$/.test(p)) offenders.push(`${p}=${v}`);
      } else if (Array.isArray(v)) v.forEach((x, i) => visit(x, `${p}[${i}]`));
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) visit(x, `${p}.${k}`);
    };
    visit(S, 'S');
    expect(offenders).toEqual([]);
  });
});

describe('every failure message has a next step (UX-03)', () => {
  const action = /(\uC8FC\uC138\uC694|\uBCF4\uC138\uC694|\uC4F8 \uC218 \uC788|\uD655\uC778|\uC2DC\uB3C4|\uBB38\uC758|\uC2DC\uC791\uD574|\uD558\uC138\uC694|\uB204\uB974\uC138\uC694|\uB2EB\uC9C0 \uB9C8\uC138\uC694)/;
  const failure = /(\uBABB\uD588|\uC2E4\uD328|\uB9DE\uC9C0 \uC54A|\uCC28\uB2E8|\uB9C9\uC558|\uD2C0\uB824|\uB108\uBB34 (\uB9CE|\uBE60\uB974)|\uC62C\uBC14\uB978|\uC9C0\uC6D0\uD558\uC9C0 \uC54A|\uC774\uBBF8 .*\uC911\uC785\uB2C8\uB2E4|\uC0AC\uC6A9\uD560 \uC218 \uC5C6|\uCC3E\uC744 \uC218 \uC5C6|\uC785\uC7A5\uD560 \uC218 \uC5C6|\uAC00\uB4DD|\uC7A0\uACA8)/;
  const collect = (v: unknown, p: string, out: [string, string][]): void => {
    if (typeof v === 'string') out.push([p, v]);
    else if (typeof v === 'function') {
      try {
        const r = (v as (...a: unknown[]) => unknown)('Kim');
        if (typeof r === 'string') out.push([p, r]);
      } catch {
        /* functions taking non-string args are covered elsewhere */
      }
    } else if (v && typeof v === 'object' && p !== 'S.legal') for (const [k, x] of Object.entries(v)) collect(x, `${p}.${k}`, out);
  };
  it('TC-482b [UX-03] every S string that reports a failure/blocked state (any group, not just a hand list) also contains an action word; the scan finds at least 20 such strings', () => {
    const all: [string, string][] = [];
    collect(S, 'S', all);
    const reports = all.filter(([k, v]) => failure.test(v) && !/[tT]itle$/.test(k)); // headings only name the problem; their body carries the fix (TC-482)
    expect(reports.length).toBeGreaterThanOrEqual(20);
    // known informational/diagnostic sentences that report a state but are not errors the user must resolve (kept explicit so a new one needs a decision)
    const informational = new Set(['S.room.locked', 'S.room.lockedToast', 'S.room.timedOut']);
    const missing = reports.filter(([k, v]) => !action.test(v) && !informational.has(k)).map(([k, v]) => `${k}=${v}`);
    expect(missing).toEqual([]);
  });
});

describe('strings consistency with shared limits and server codes (UX-01, UX-03)', () => {
  it('TC-305f [UX-01] numbers shown to users match the shared limits (chat 500, nickname 1~20, password 4~32)', () => {
    expect(LIMITS.chatMax).toBe(500);
    expect(S.chat.counter(0)).toBe(`0/${LIMITS.chatMax}`);
    expect(S.chat.counter(LIMITS.chatMax)).toBe(`${LIMITS.chatMax}/${LIMITS.chatMax}`);
    expect(S.chat.placeholder.match(/\d+/g)).toEqual([String(LIMITS.chatMax)]);
    expect(S.chat.tooLong.match(/\d+/g)).toEqual([String(LIMITS.chatMax)]);
    const nick = `${LIMITS.nicknameMin}~${LIMITS.nicknameMax}`;
    expect(S.landing.nicknameHint).toContain(nick);
    expect(S.lobby.invalidNickname).toContain(nick);
    const pw = `${LIMITS.passwordMin}~${LIMITS.passwordMax}`;
    expect(S.landing.passwordHint).toContain(pw);
  });

  it('TC-305g [UX-01] name-taking message functions include the name verbatim (also hostile text, which stays a plain string for React to escape) and exactly once', () => {
    for (const name of ['Kim', '<b>x</b>', '${x}', 'a b']) {
      for (const fn of [S.room.sharingNow, S.room.shareBusy, S.room.joined, S.room.left, S.room.timedOut, S.room.hostChanged, S.confirm.kickTitle]) {
        const t = fn(name);
        expect(t, `${fn.name}`).toContain(name);
        expect(t.split(name).length - 1).toBe(1);
        expect(t).not.toMatch(/undefined|\[object/);
      }
    }
    for (const n of [0, 1, 6]) expect(S.people.count(n).match(/\d+/g)).toEqual([String(n)]);
    expect(S.legal.dateFormat(2026, 10, 2)).toMatch(/^2026\D+10\D+2\D*$/);
  });

  it('TC-483b [UX-03] errorText maps each server code exactly: RATE_LIMITED->lobby.rateLimited, FORBIDDEN->room.forbidden, INVALID_PAYLOAD->lobby.invalidNickname, everything else (incl. prototype keys) -> room.actionFailed', () => {
    expect(errorText('RATE_LIMITED')).toBe(S.lobby.rateLimited);
    expect(errorText('FORBIDDEN')).toBe(S.room.forbidden);
    expect(errorText('INVALID_PAYLOAD')).toBe(S.lobby.invalidNickname);
    for (const other of ['NOT_JOINED', 'TOKEN_INVALID', 'INTERNAL', 'ROOM_FULL', 'SERVER_BUSY', '', 'rate_limited', 'RATE_LIMITED ', '__proto__', 'constructor', 'toString']) expect(errorText(other), other).toBe(S.room.actionFailed);
    expect(new Set([S.lobby.rateLimited, S.room.forbidden, S.lobby.invalidNickname, S.room.actionFailed]).size).toBe(4);
    // DEF-W01 regression guard: chat.invalid (unseeable text) must not be the length message and must not mention the 500 limit
    expect(S.chat.invalid).not.toBe(S.chat.tooLong);
    expect(S.chat.invalid).not.toContain(String(LIMITS.chatMax));
  });
});

describe('icon set (UX-10, NFR-10)', () => {
  const names = Object.keys(icons);

  it('TC-489c [UX-10] icons.tsx is the single lucide-react entry point (no other source imports lucide-react) and exports 25 renderable SVG icons', () => {
    expect(names.length).toBe(25);
    for (const n of names) {
      const Icon = (icons as unknown as Record<string, (p: object) => ReactElement>)[n] as unknown as React.ComponentType<{ size?: number }>;
      const html = renderToStaticMarkup(createElement(Icon, { size: 20 }));
      expect(html, n).toMatch(/^<svg\b/);
      expect(html, n).toContain('width="20"');
    }
    const markups = names.map((n) => renderToStaticMarkup(createElement((icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[n] as React.ComponentType<{ size?: number }>, { size: 20 })));
    expect(new Set(markups).size, 'icons must be visually distinct (an alias export would make two controls look the same)').toBe(names.length);
    const offenders: string[] = [];
    const walk = (d: string): void => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) walk(f);
        else if (/\.tsx?$/.test(e.name) && !/\.(test|spec)\./.test(e.name) && e.name !== 'icons.tsx' && /from 'lucide-react'/.test(fs.readFileSync(f, 'utf8'))) offenders.push(path.relative(SRC, f));
      }
    };
    walk(SRC);
    expect(offenders).toEqual([]);
  });

  it('TC-489d [UX-10] every icon element used in UI code is decorative (aria-hidden="true"), labelled through a strings aria-label, or passed through StateScreen icon (whose wrapper hides it)', () => {
    const offenders: string[] = [];
    const walk = (d: string): void => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) walk(f);
        else if (/\.tsx$/.test(e.name) && !/\.(test|spec)\./.test(e.name) && e.name !== 'icons.tsx') {
          const text = fs.readFileSync(f, 'utf8');
          for (const n of names) {
            for (const m of text.matchAll(new RegExp(`<${n}\\b[^>]*?/>`, 'g'))) {
              const before = text.slice(Math.max(0, (m.index ?? 0) - 8), m.index);
              if (!/aria-hidden="true"|aria-label=\{S\.[\w.]+\}/.test(m[0]) && !/icon=\{$/.test(before)) offenders.push(`${path.relative(SRC, f)}: ${m[0]}`);
            }
          }
        }
      }
    };
    walk(SRC);
    expect(offenders).toEqual([]);
  });
});
