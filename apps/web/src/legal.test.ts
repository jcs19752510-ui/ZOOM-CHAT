import fs from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MetaResponse } from '@meetlite/shared';
import { contactLink, parseDate, parseLegalPath, parseMeta } from './lib/legalMeta';
import { ContactValue, MetaSlot, type MetaState } from './pages/Legal';
import { S, type LegalDoc } from './strings';

const PRIVACY_REQUIRED = ['collected', 'purpose', 'retention', 'destruction', 'thirdParty', 'overseas', 'contact', 'rights', 'breach', 'effectiveDate'];
const DOCS = { privacy: S.legal.privacy, terms: S.legal.terms, contact: S.legal.contact } as const satisfies Record<string, LegalDoc>;
const noop = (): void => undefined;

const meta = (over: Partial<{ contact: string | null; officer: string | null; date: string | null; stun: string[]; turn: string[] }> = {}): MetaState => {
  const m: MetaResponse = {
    v: 1,
    operator: { contact: over.contact === undefined ? 'ops@example.com' : over.contact, privacyOfficer: over.officer === undefined ? '홍길동' : over.officer },
    legal: { effectiveDate: over.date === undefined ? '2026-10-01' : over.date },
    network: { stunHosts: over.stun ?? ['stun.example.org'], turnHosts: over.turn ?? [] },
  };
  return { status: 'ok', meta: m };
};
const html = (slot: Parameters<typeof MetaSlot>[0]['slot'], state: MetaState): string => renderToStaticMarkup(createElement(MetaSlot, { slot, state, reload: noop }));
const hrefs = (markup: string): string[] => [...markup.matchAll(/href="([^"]*)"/g)].map((m) => m[1] as string);

describe('법률 문서 구조 (SCR-23~25, POL-17·19·20)', () => {
  it('TC-341 [POL-17,SEC-13] 처리방침은 필수 섹션 id를 모두 갖고 모든 문서의 제목·섹션·문단이 비어 있지 않다', () => {
    expect(S.legal.privacy.sections.map((s) => s.id)).toEqual(expect.arrayContaining(PRIVACY_REQUIRED));
    for (const [kind, doc] of Object.entries(DOCS)) {
      expect(doc.title.trim(), kind).not.toBe('');
      expect(doc.sections.length, kind).toBeGreaterThan(0);
      const ids = doc.sections.map((s) => s.id);
      expect(new Set(ids).size, `${kind} 섹션 id 중복`).toBe(ids.length);
      for (const s of doc.sections) {
        expect(s.heading.trim(), `${kind}/${s.id} 제목`).not.toBe('');
        expect(s.paragraphs.length, `${kind}/${s.id} 문단`).toBeGreaterThan(0);
        for (const p of s.paragraphs) expect(p.trim(), `${kind}/${s.id}`).not.toBe('');
      }
    }
    expect(S.legal.privacy.title).toBe(S.legalLinks.privacy);
    expect(S.legal.terms.title).toBe(S.legalLinks.terms);
    expect(S.legal.contact.title).toBe(S.legalLinks.contact);
  });

  it('TC-341b [POL-17,POL-19] 슬롯 자리: 처리방침은 STUN/TURN·연락처·책임자·시행일, 문의·신고는 첫 섹션에 연락처, 약관은 연령 문구를 갖는다', () => {
    const slots = (doc: LegalDoc, id: string): readonly string[] => doc.sections.find((s) => s.id === id)?.slots ?? [];
    expect(slots(S.legal.privacy, 'thirdParty')).toEqual(['networkHosts']);
    expect(slots(S.legal.privacy, 'contact')).toEqual(['contact', 'officer']);
    expect(slots(S.legal.privacy, 'effectiveDate')).toEqual(['effectiveDate']);
    expect(S.legal.contact.sections[0]?.slots).toEqual(['contact']);
    expect(S.legal.terms.sections.flatMap((s) => s.slots ?? [])).toEqual(expect.arrayContaining(['contact', 'effectiveDate']));
    expect(S.legal.terms.sections.find((s) => s.id === 'age')?.paragraphs.join('')).toContain('14세');
  });

  it('TC-341c [SEC-13,POL-17] 초안 상태에서는 "법률 자문이 아닌 초안" 고지가 있고, 확인하지 못한 조문 번호·법령 시행일을 단정해 쓰지 않는다', () => {
    expect(S.legal.status).toBe('draft');
    expect(S.legal.draftRibbon).toContain('초안(법률 검토 전)');
    expect(S.legal.notAdvice).toContain('법률 자문이 아닌 초안');
    const all = Object.values(DOCS).flatMap((d) => d.sections.flatMap((s) => [s.heading, ...s.paragraphs])).join('\n');
    expect(all).not.toMatch(/제\s*\d+\s*조/);
    expect(all).not.toMatch(/\d{4}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일\s*시행/);
    expect(all).toContain('확인 필요');
    // 사실과 맞는 서술: IP 원문은 메모리에 일시 보관(D-6), 로그에는 남기지 않음
    const retention = S.legal.privacy.sections.find((s) => s.id === 'retention')?.paragraphs.join('') ?? '';
    expect(retention).toContain('메모리에 일시 보관');
    expect(retention).toContain('로그에는 IP 주소');
  });

  it('TC-341d [UX-01] 라우팅: /privacy /terms /contact(끝 슬래시 허용)만 문서로 인식한다(대소문자 구분)', () => {
    for (const k of ['privacy', 'terms', 'contact'] as const) {
      expect(parseLegalPath(`/${k}`)).toBe(k);
      expect(parseLegalPath(`/${k}/`)).toBe(k);
    }
    for (const bad of ['/', '/Privacy', '/privacy/x', '/privacy.html', '/r/abc', '/terms//', '/privacyy', '']) expect(parseLegalPath(bad), bad).toBeNull();
  });
});

describe('운영자 연락처 링크 안전성 (SEC-07, R-1)', () => {
  const EVIL = ['javascript:alert(1)@x.com', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>alert(1)</script>', 'vbscript:msgbox(1)', 'file:///etc/passwd', 'http://example.com', 'https://', 'https://exa mple.com', 'ops@example.com?cc=a@b.c', 'ops@example.com\n', ' ops@example.com', '//evil.example', 'x"onmouseover="alert(1)'];

  it('TC-345 [SEC-07,POL-19] contactLink: href는 mailto:(엄격한 이메일)와 https:만 만들고 javascript:·data: 등 그 밖의 값은 링크 없이 텍스트가 된다', () => {
    expect(contactLink('ops@example.com')).toEqual({ kind: 'mail', text: 'ops@example.com', href: 'mailto:ops@example.com' });
    expect(contactLink('https://example.com/report?x=1')).toMatchObject({ kind: 'web', href: 'https://example.com/report?x=1' });
    for (const evil of EVIL) {
      const link = contactLink(evil);
      expect(link.kind, JSON.stringify(evil)).toBe('text');
      expect('href' in link, JSON.stringify(evil)).toBe(false);
    }
    // 어떤 입력이든 href가 생기면 mailto: 또는 https:로 시작한다
    for (const v of [...EVIL, 'ops@example.com', 'https://a.b/c']) {
      const link = contactLink(v);
      if ('href' in link) expect(link.href).toMatch(/^(mailto:|https:\/\/)/);
    }
  });

  it('TC-345b [SEC-07,POL-19] 렌더링 결과(HTML)에 javascript:·data: href가 없고, 외부 https 링크는 새 탭 + rel noopener noreferrer, 이메일은 mailto:', () => {
    for (const evil of EVIL) {
      const out = renderToStaticMarkup(createElement(ContactValue, { value: evil }));
      expect(hrefs(out), JSON.stringify(evil)).toEqual([]);
      expect(out).not.toMatch(/href=/i);
    }
    const slotOut = html('contact', meta({ contact: 'javascript:alert(1)@x.com' }));
    expect(hrefs(slotOut)).toEqual([]);
    expect(slotOut).toContain('javascript:alert(1)@x.com'); // 텍스트로만 보인다(태그 안에서 이스케이프되어 실행되지 않음)

    const mail = html('contact', meta({ contact: 'ops@example.com' }));
    expect(hrefs(mail)).toEqual(['mailto:ops@example.com']);
    const web = html('contact', meta({ contact: 'https://example.com/report' }));
    expect(hrefs(web)).toEqual(['https://example.com/report']);
    expect(web).toContain('target="_blank"');
    expect(web).toContain('rel="noopener noreferrer"');
    expect(web).toContain(S.legal.meta.newTab);
  });

  it('TC-345c [SEC-07] 책임자·시행일 값은 링크가 되지 않고 마크업은 이스케이프된다', () => {
    const out = html('officer', meta({ officer: '<img src=x onerror=alert(1)> https://evil.example' }));
    expect(out).not.toContain('<img');
    expect(out).toContain('&lt;img');
    expect(hrefs(out)).toEqual([]);
  });

  it('TC-345d [SEC-07] 법률 페이지·푸터 소스에 dangerouslySetInnerHTML이 없고 href를 직접 조립하지 않는다(정적 점검)', () => {
    for (const f of ['pages/Legal.tsx', 'components/LegalFooter.tsx', 'lib/legalMeta.ts']) {
      const src = fs.readFileSync(path.resolve(__dirname, f), 'utf8');
      expect(src, f).not.toContain('dangerouslySetInnerHTML');
      expect(src, f).not.toMatch(/\.innerHTML/);
    }
    const page = fs.readFileSync(path.resolve(__dirname, 'pages/Legal.tsx'), 'utf8');
    // 운영자 값이 href가 되는 경로는 contactLink 결과(link.href) 한 종류뿐이다
    const hrefProps = [...page.matchAll(/\bhref=([^\s>]+)/g)].map((m) => m[1]);
    expect(hrefProps.sort()).toEqual(['"/"', '{`#${s.id}`}', '{`/${k}`}', '{link.href}', '{link.href}'].sort());
  });
});

describe('운영자 정보 슬롯 상태 (04 §2.3.2)', () => {
  it('TC-346 [POL-19,POL-20] 값 있음: 연락처·책임자·시행일(YYYY년 M월 D일)·STUN 호스트가 표시된다', () => {
    expect(html('contact', meta())).toContain('ops@example.com');
    expect(html('officer', meta())).toContain('홍길동');
    expect(html('effectiveDate', meta())).toContain('2026년 10월 1일');
    const net = html('networkHosts', meta({ stun: ['stun.example.org', '203.0.113.5'], turn: ['turn.example.org'] }));
    for (const h of ['stun.example.org', '203.0.113.5', 'turn.example.org']) expect(net).toContain(h);
    expect(html('contact', meta())).toContain('data-state="ok"');
  });

  it('TC-346b [POL-19,POL-20] 미정(null): 빈칸·가짜 값 없이 "운영자가 아직 정하지 않았습니다" 등 눈에 띄는 문구, 시행일 형식 오류도 미정 취급', () => {
    const c = html('contact', meta({ contact: null }));
    expect(c).toContain(S.legal.meta.pending);
    expect(c).toContain('data-state="pending"');
    expect(c).toContain('role="status"');
    expect(html('officer', meta({ officer: null }))).toContain(S.legal.meta.officerPending);
    for (const d of [null, '2026-02-30', '2026/10/01', '', 'abc']) expect(html('effectiveDate', meta({ date: d })), String(d)).toContain(S.legal.meta.datePending);
    expect(html('networkHosts', meta({ stun: [], turn: [] }))).toContain(S.legal.meta.none);
  });

  it('TC-346c [POL-17] 로딩은 aria-busy, 실패는 안내 문구와 다시 불러오기 버튼(문서 본문 영향 없음 문구 포함)', () => {
    const loading = html('contact', { status: 'loading' });
    expect(loading).toContain('aria-busy="true"');
    expect(loading).toContain(S.legal.meta.loading);
    const err = html('contact', { status: 'error' });
    expect(err).toContain(S.legal.meta.error);
    expect(err).toContain(S.legal.meta.retry);
    expect(err).toContain('data-testid="meta-retry"');
  });

  it('TC-346d [POL-20] parseDate는 존재하는 날짜만 통과시킨다(윤년·월말)', () => {
    expect(parseDate('2024-02-29')).toEqual({ y: 2024, m: 2, d: 29 });
    for (const bad of ['2025-02-29', '2026-13-01', '2026-00-10', '2026-04-31', '2026-1-1', '20261001']) expect(parseDate(bad), bad).toBeNull();
  });

  it('TC-346e [SEC-06] parseMeta는 서버 응답의 모양이 다르면 null이다(시스템 경계 검증)', () => {
    const ok = { v: 1, operator: { contact: null, privacyOfficer: 'a' }, legal: { effectiveDate: null }, network: { stunHosts: [], turnHosts: ['t'] } };
    expect(parseMeta(ok)).toEqual(ok);
    for (const bad of [null, 1, 'x', {}, { ...ok, v: 2 }, { ...ok, operator: null }, { ...ok, operator: { contact: 1, privacyOfficer: null } }, { ...ok, legal: { effectiveDate: 5 } }, { ...ok, network: { stunHosts: 'a', turnHosts: [] } }, { ...ok, network: { stunHosts: [1], turnHosts: [] } }]) {
      expect(parseMeta(bad), JSON.stringify(bad)).toBeNull();
    }
  });
});
