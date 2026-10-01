import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { tokens } from '../design/tokens';
import { S, errorText } from '../strings';
import { StateScreen } from './StateScreen';

const WEB = path.resolve(__dirname, '..', '..');
const SRC = path.join(WEB, 'src');
const read = (rel: string, base = SRC): string => fs.readFileSync(path.join(base, rel), 'utf8');
const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) out.push(full);
  }
  return out;
};
const sources = walk(SRC);

describe('상태 화면 틀과 문구 (unit-12, UX-01~03)', () => {
  it('TC-480 [UX-02,UX-03,UX-10] 오류 계열은 role=alert, 중립 계열은 role=status이고 h1 제목·본문·버튼 영역이 있다', () => {
    const alert = renderToStaticMarkup(createElement(StateScreen, { alert: true, title: '제목', body: '본문', icon: createElement('i') }, createElement('button', null, '다시')));
    expect(alert).toContain('role="alert"');
    expect(alert).toMatch(/<h1[^>]*>제목<\/h1>/);
    expect(alert).toContain('본문');
    expect(alert).toContain('<button>다시</button>');
    expect(alert).toMatch(/<main[^>]*>/);
    expect(alert).toMatch(/aria-hidden="true"[^>]*><i>/); // 장식 아이콘은 스크린리더에서 숨긴다
    const status = renderToStaticMarkup(createElement(StateScreen, { title: '로딩', body: '잠시' }));
    expect(status).toContain('role="status"');
    expect(status).not.toContain('role="alert"');
    expect(status).not.toContain('mt-5'); // 버튼이 없으면 빈 영역을 만들지 않는다
  });

  it('TC-481 [UX-02] 상태 화면 문구가 7종 이상 정의돼 있고 모두 제목·본문이 비어 있지 않다', () => {
    const st = S.state as Record<string, Record<string, string>>;
    const keys = Object.keys(st);
    expect(keys.length).toBeGreaterThanOrEqual(7);
    for (const k of ['loading', 'error', 'permission', 'full', 'locked', 'kicked', 'gone', 'unsupported', 'left', 'expired', 'waitHost']) {
      expect(st[k], k).toBeDefined();
      expect(st[k]?.title?.trim(), `${k}.title`).toBeTruthy();
    }
    expect(S.state.loading.body.trim()).toBeTruthy();
  });

  it('TC-482 [UX-03] 오류·거부 문구는 원인과 해결 방법(다음 행동)을 함께 담는다 — 행동 어휘가 없는 본문은 실패', () => {
    const action = /(주세요|보세요|쓸 수 있|확인|시도|문의)/;
    const bodies: Record<string, string> = {
      'error.body': S.state.error.body,
      'permission.denied': S.state.permission.denied,
      'permission.notFound': S.state.permission.notFound,
      'permission.inUse': S.state.permission.inUse,
      'permission.unknown': S.state.permission.unknown,
      'full.body': S.state.full.body,
      'locked.body': S.state.locked.body,
      'kicked.body': S.state.kicked.body,
      'gone.closed': S.state.gone.closed,
      'gone.restarted': S.state.gone.restarted,
      'gone.operator': S.state.gone.operator,
      'unsupported.body': S.state.unsupported.body,
      'expired.body': S.state.expired.body,
      'lobby.wrongPassword': S.lobby.wrongPassword,
      'lobby.tooManyAttempts': S.lobby.tooManyAttempts,
      'lobby.invalidNickname': S.lobby.invalidNickname,
      'lobby.rateLimited': S.lobby.rateLimited,
      'chat.failed': S.chat.failed,
      'room.cameraFailed': S.room.cameraFailed,
      'room.micFailed': S.room.micFailed,
      'room.deviceChangeFailed': S.room.deviceChangeFailed,
      'room.shareDenied': S.room.shareDenied,
      'room.actionFailed': S.room.actionFailed,
      'landing.joinInvalid': S.landing.joinInvalid,
    };
    for (const [k, v] of Object.entries(bodies)) {
      expect(v.trim().length, k).toBeGreaterThan(15);
      expect(v, `${k}: 해결 방법 없음`).toMatch(action);
      expect(v, `${k}: 내부 코드 노출`).not.toMatch(/\b[A-Z_]{6,}\b|undefined|\[object|Error:|stack/);
    }
  });

  it('TC-483 [UX-03,SEC-06] errorText는 모든 서버 오류 코드에 사용자 문구를 주고 코드·내부 정보를 노출하지 않는다', () => {
    for (const code of ['RATE_LIMITED', 'FORBIDDEN', 'INVALID_PAYLOAD', 'NOT_JOINED', 'INTERNAL', 'TOKEN_INVALID', '', '<script>']) {
      const t = errorText(code);
      expect(t.trim().length, code).toBeGreaterThan(5);
      expect(t).not.toContain(code || '\u0000');
      expect(t).not.toMatch(/[A-Z_]{6,}/);
    }
    expect(errorText('FORBIDDEN')).toBe(S.room.forbidden);
    expect(errorText('RATE_LIMITED')).toBe(S.lobby.rateLimited);
  });
});

describe('접근성·디자인 정적 점검 (unit-12, UX-08, UX-10, UX-11, NFR-09, NFR-10)', () => {
  it('TC-484 [UX-11] index.css에 prefers-reduced-motion 규칙이 있고 animation·transition 시간을 사실상 0으로 만든다', () => {
    const css = read('index.css');
    const block = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
    expect(block).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(block).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
    expect(block).toMatch(/scroll-behavior:\s*auto\s*!important/);
  });

  it('TC-485 [NFR-10,UX-10] 터치 최소 크기 토큰은 44px이고 .btn·.input이 이를 쓰며, 포커스 링은 outline 2px 이상이다', () => {
    expect(tokens.touch).toBe('44px');
    const css = read('index.css');
    expect(css).toMatch(/\.btn\s*\{[^}]*min-h-touch/);
    expect(css).toMatch(/\.input\s*\{[^}]*min-h-touch/);
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline-2/);
    expect(css).not.toMatch(/outline:\s*none|outline-none/);
    const cfg = read('tailwind.config.ts', WEB);
    expect(cfg).toContain('minHeight: { touch: tokens.touch }');
    expect(cfg).toContain('minWidth: { touch: tokens.touch }');
    expect(cfg).toContain('colors: tokens.color');
  });

  it('TC-486 [UX-08] index.html의 theme-color는 design 토큰 bg와 같고 lang=ko, viewport-fit=cover가 있다(G-7)', () => {
    const html = read('index.html', WEB);
    expect(html).toContain(`<meta name="theme-color" content="${tokens.color.bg}" />`);
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain('viewport-fit=cover');
  });

  it('TC-487 [SEC-07] 앱 소스(테스트 제외)에 dangerouslySetInnerHTML·innerHTML·eval·document.write가 없다', () => {
    const offenders = sources.filter((f) => /dangerouslySetInnerHTML|\.innerHTML\s*=|\binsertAdjacentHTML\b|\beval\(|document\.write\(/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(SRC, f));
    expect(offenders).toEqual([]);
  });

  it('TC-488 [SEC-07] target="_blank"인 모든 링크는 같은 태그에 rel="noopener noreferrer"를 가진다', () => {
    const offenders: string[] = [];
    for (const f of sources) {
      const text = fs.readFileSync(f, 'utf8');
      for (const m of text.matchAll(/<a\b[^>]*?>/gs)) {
        if (/target=/.test(m[0]) && !/rel="noopener noreferrer"/.test(m[0])) offenders.push(`${path.relative(SRC, f)}: ${m[0].slice(0, 80)}`);
      }
      for (const m of text.matchAll(/window\.open\([^)]*\)/g)) if (!/noopener/.test(m[0])) offenders.push(`${path.relative(SRC, f)}: ${m[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  it('TC-489 [UX-10] 모든 아이콘 전용 버튼 소스는 aria-label을 갖는다(텍스트 없는 button 태그 정적 점검)', () => {
    const offenders: string[] = [];
    for (const f of sources.filter((x) => x.endsWith('.tsx'))) {
      const text = fs.readFileSync(f, 'utf8');
      for (const m of text.matchAll(/<button\b([^>]*)>\s*<([A-Z][A-Za-z0-9]*)\s[^>]*aria-hidden="true"[^>]*\/>\s*<\/button>/gs)) {
        if (!/aria-label=/.test(m[1] ?? '')) offenders.push(`${path.relative(SRC, f)}: <${m[2]}> 아이콘만 있는 버튼`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('TC-489b [UX-01,UX-10] 접근성 속성·placeholder·title의 글자는 리터럴이 아니라 strings 키에서만 온다(영문 리터럴 포함, 정적 점검)', () => {
    const offenders: string[] = [];
    for (const f of sources.filter((x) => x.endsWith('.tsx'))) {
      const text = fs.readFileSync(f, 'utf8');
      for (const m of text.matchAll(/\b(aria-label|aria-description|placeholder|title|alt)="([^"]+)"/g)) offenders.push(`${path.relative(SRC, f)}: ${m[1]}="${m[2]}"`);
    }
    expect(offenders).toEqual([]);
  });
});
