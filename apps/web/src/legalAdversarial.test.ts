import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMeta } from './lib/api';
import { contactLink, parseMeta } from './lib/legalMeta';
import { ContactValue, MetaSlot, type MetaState } from './pages/Legal';
import { S } from './strings';

// unit-15 6단계(적대적·경계값) 추가 시험. 제품 코드는 건드리지 않는다.

const ATTACK = [
  'javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'JaVaScRiPt:alert(1)', 'java\tscript:alert(1)', 'java\nscript:alert(1)', ' javascript:alert(1)', '\u0001javascript:alert(1)',
  'data:text/html,<script>alert(1)</script>', 'DATA:text/html;base64,PHNjcmlwdD4=', 'vbscript:msgbox(1)', 'file:///etc/passwd', 'blob:https://evil.example/x', 'about:blank', 'tel:+8210', 'sms:+8210',
  'ops@example.com\u0000', 'ops@example.com\n', 'ops@example.com\r\nBcc:victim@example.com', 'ops @example.com', 'ops@example.com ', 'ops@example.com ',
  'орѕ@example.com', 'ｏｐｓ@example.com', 'ops@exämple.com', 'ops@example.com‮', '‮moc.elpmaxe@spo',
  'mailto:mailto:a@b.com', 'mailto:a@b.com', 'mailto:a@b.com?subject=x', 'a@b@c.com', 'a@b.com@c.com', 'a@[127.0.0.1]', 'a:b@example.com',
  '<script>alert(1)</script>', '<script>alert(1)</script>@x.com', '" onmouseover="alert(1)', '" onmouseover="alert(1)@x.com', "' onfocus='alert(1)", 'x"><img src=x onerror=alert(1)>',
  'https://', 'https:///x', 'https://exa mple.com', 'http://example.com', '//evil.example', 'https:\\\\evil.example', 'https:/evil.example', 'https:evil.example',
  'a'.repeat(5000), `${'a'.repeat(5000)}@example.com`, `https://${'a'.repeat(5000)}.com/`,
];

const SAFE_HREF = /^(mailto:[A-Za-z0-9._%+@-]+\.[A-Za-z0-9.-]+|https:\/\/[^\s"'<>]+)$/;
const attrsIn = (markup: string): string[] => [...markup.matchAll(/<[a-zA-Z][^>]*>/g)].map((m) => m[0]);

describe('TC-347b 연락처 링크 적대 입력 매트릭스 (SEC-07, R-1)', () => {
  it('TC-347b [SEC-07,POL-19] 위험 스킴·제어문자·유니코드 혼동·속성 주입 문자열은 href가 없거나 안전한 mailto:/https:뿐이고, 렌더 결과에 이벤트 핸들러 속성이 없다', () => {
    for (const v of ATTACK) {
      const link = contactLink(v);
      if ('href' in link) expect(link.href, JSON.stringify(v.slice(0, 80))).toMatch(SAFE_HREF);
      const out = renderToStaticMarkup(createElement(ContactValue, { value: v }));
      for (const tag of attrsIn(out)) {
        expect(tag, `태그에 이벤트 핸들러/위험 href: ${JSON.stringify(v.slice(0, 60))}`).not.toMatch(/\son[a-z]+\s*=/i);
        expect(tag).not.toMatch(/href="\s*(javascript|data|vbscript|file|blob):/i);
      }
      // 입력의 "<" 는 항상 이스케이프되어 새 태그를 만들지 못한다
      expect(out).not.toContain('<script');
      expect(out).not.toContain('<img');
      // 모든 태그 이름은 a·span(허용 목록)
      for (const m of out.matchAll(/<\/?([a-zA-Z0-9]+)/g)) expect(['a', 'span'], v.slice(0, 40)).toContain(m[1]);
    }
    // 위험 스킴으로 시작하는 값은 전부 링크 없음
    for (const v of ATTACK.filter((x) => /^[\s\p{Cc}]*(javascript|data|vbscript|file|blob|about|tel|sms):/iu.test(x))) expect(contactLink(v).kind, v).toBe('text');
  });

  it('TC-347d [SEC-07] 경계: 정상 mailto/https는 링크가 되고, 대문자 HTTPS는 https로 정규화되며, URL 자격 정보(userinfo)·제어 문자가 든 값은 링크가 아니라 텍스트로만 표시된다(표시 텍스트 ≠ 대상 방지, DEF-003 수정; 참조)', () => {
    expect(contactLink('a@b.co')).toMatchObject({ kind: 'mail', href: 'mailto:a@b.co' });
    expect(contactLink('HTTPS://Example.com/x')).toMatchObject({ kind: 'web', href: 'https://example.com/x' });
    expect(contactLink('https://example.com/\u0000x').kind).toBe('text');
    expect(contactLink('https://good.example@evil.example/').kind).toBe('text');
    expect(contactLink('https:///x').kind).toBe('text');
    expect(contactLink('a%2cvictim@x.com').kind).toBe('text');
  });

  it('TC-347e [SEC-07] 책임자·시행일·호스트 값에 악성 문자열이 와도 어떤 슬롯도 a 태그·이벤트 속성을 만들지 않는다', () => {
    const evil = '<img src=x onerror=alert(1)>" onmouseover="alert(1) https://evil.example javascript:alert(1)';
    const state: MetaState = { status: 'ok', meta: { v: 1, operator: { contact: null, privacyOfficer: evil }, legal: { effectiveDate: evil }, network: { stunHosts: [evil], turnHosts: [evil] } } };
    for (const slot of ['officer', 'effectiveDate', 'networkHosts', 'contact'] as const) {
      const out = renderToStaticMarkup(createElement(MetaSlot, { slot, state, reload: () => undefined }));
      expect(out, slot).not.toMatch(/<a[\s>]/);
      expect(out, slot).not.toContain('<img');
      // 이벤트 핸들러는 태그(속성) 안에서만 의미가 있다. 이스케이프된 텍스트 속 "onerror="는 무해하다
      for (const tag of attrsIn(out)) expect(tag, slot).not.toMatch(/\son[a-z]+\s*=/i);
    }
  });
});

describe('TC-348g 악성 서버 응답에 대한 웹 방어 (시스템 경계, SEC-06)', () => {
  afterEach(() => vi.unstubAllGlobals());
  const okBody = { v: 1, operator: { contact: 'ops@example.com', privacyOfficer: null }, legal: { effectiveDate: '2026-10-01' }, network: { stunHosts: ['a.example'], turnHosts: [] } };
  const stub = (body: () => Response | Promise<Response>): void => void vi.stubGlobal('fetch', vi.fn(async () => body()));

  it('TC-348g [SEC-06] parseMeta: 추가 필드는 버리고, 타입 오류(숫자·객체·배열 혼입·null 프로토타입)·v 불일치는 null이다', () => {
    const parsed = parseMeta({ ...okBody, evil: '<script>', operator: { ...okBody.operator, extra: 'x', __proto__: { polluted: true } } });
    expect(parsed).toEqual(okBody);
    expect(JSON.stringify(parsed)).not.toContain('evil');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    const bad: unknown[] = [
      [], [okBody], 'v', 0, undefined, { ...okBody, v: '1' }, { ...okBody, v: 1.5 }, { ...okBody, operator: [] }, { ...okBody, operator: { contact: undefined, privacyOfficer: null } },
      { ...okBody, operator: { contact: ['a'], privacyOfficer: null } }, { ...okBody, operator: { contact: { toString: 'x' }, privacyOfficer: null } },
      { ...okBody, legal: null }, { ...okBody, legal: { effectiveDate: 20261001 } }, { ...okBody, network: null },
      { ...okBody, network: { stunHosts: [null], turnHosts: [] } }, { ...okBody, network: { stunHosts: [], turnHosts: {} } }, { ...okBody, network: { stunHosts: ['a'] } },
    ];
    for (const b of bad) expect(parseMeta(b), JSON.stringify(b)).toBeNull();
  });

  it('TC-348h [SEC-06] getMeta: 200이지만 JSON이 아님·빈 본문·배열·거대 문자열·429·500은 모두 실패 결과이며 예외를 던지지 않는다', async () => {
    const huge = { ...okBody, operator: { contact: 'a'.repeat(2_000_000), privacyOfficer: null } };
    const cases: Array<[string, () => Response]> = [
      ['html 200', () => new Response('<html>hi</html>', { status: 200, headers: { 'content-type': 'text/html' } })],
      ['빈 200', () => new Response('', { status: 200 })],
      ['배열', () => Response.json([1, 2, 3])],
      ['null', () => Response.json(null)],
      ['v 오류', () => Response.json({ ...okBody, v: 2 })],
      ['429', () => Response.json({ code: 'RATE_LIMITED' }, { status: 429 })],
      ['500', () => new Response('boom', { status: 500 })],
    ];
    for (const [name, make] of cases) {
      stub(make);
      const r = await getMeta();
      expect(r.ok, name).toBe(false);
    }
    stub(() => Response.json(okBody));
    expect(await getMeta()).toEqual({ ok: true, data: okBody });
    // 거대 응답: 모양이 맞으면 받아들이되(서버 신뢰), 렌더는 텍스트라 안전 — 여기서는 예외 없이 처리되는지만 본다
    stub(() => Response.json(huge));
    const big = await getMeta();
    expect(big.ok).toBe(true);
    // 네트워크 단절
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    expect(await getMeta()).toEqual({ ok: false, code: 'NETWORK' });
  });
});

describe('TC-349g 법률 문구 전수 점검 (SEC-13, POL-17·19·20)', () => {
  const docs = [S.legal.privacy, S.legal.terms, S.legal.contact];
  const paras = docs.flatMap((d) => d.sections.flatMap((s) => s.paragraphs.map((p) => ({ doc: d.title, id: s.id, p }))));

  it('TC-349g [SEC-13] 법령명·조문·항·호·시행일·기한(N일 이내)·과태료 금액을 단정해 쓰지 않는다', () => {
    const forbidden: Array<[string, RegExp]> = [
      ['조문 번호', /제\s*\d+\s*조/],
      ['항·호', /제\s*\d+\s*(항|호)/],
      ['시행일 단정', /\d{4}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일/],
      ['법령명', /(개인정보\s*보호법|정보통신망|통신비밀보호법|전기통신사업법|정보통신망법|GDPR|CCPA|PIPA|COPPA)/i],
      ['기한 단정', /\d+\s*(일|시간)\s*이내/],
      ['금액·처벌', /(과태료|벌금|징역|\d+\s*만\s*원)/],
      ['적법·준수 단정', /(법령을 준수합니다|적법합니다|법적으로 문제(가)? 없|완전히 안전|절대 (안전|유출))/],
    ];
    for (const [name, re] of forbidden) for (const { doc, id, p } of paras) expect(p, `${doc}/${id}: ${name}`).not.toMatch(re);
  });

  it('TC-349h [SEC-13] 연령(14세)·국외 이전·제3자 제공·유출 통지·열람/삭제·면책·신고 처리 의무처럼 법적 판단이 걸린 문단은 같은 문단에 "확인 필요"(또는 법률 검토 후 확정) 표기가 있다', () => {
    const legalJudgement = /(14세|국외로|제3자 제공이나 위탁|통지 의무|열람·삭제|면책 범위|법적 의무|책임 범위|책임자 지정)/;
    const hits = paras.filter(({ p }) => legalJudgement.test(p));
    expect(hits.length).toBeGreaterThanOrEqual(7);
    for (const { doc, id, p } of hits) expect(p, `${doc}/${id}`).toMatch(/(확인 필요|법률 검토 후)/);
  });

  it('TC-349i [SEC-13] 초안 표기는 3개 문서 어디서나 같은 상수에서 나오고(status=draft), 운영자 정보 슬롯은 서버 값이 없을 때 빈칸이 아니라 눈에 띄는 미정 문구가 된다', () => {
    expect(S.legal.status).toBe('draft');
    expect(S.legal.draftRibbon).toMatch(/초안/);
    expect(S.legal.notAdvice).toMatch(/법률 자문이 아닌 초안/);
    const empty: MetaState = { status: 'ok', meta: { v: 1, operator: { contact: null, privacyOfficer: null }, legal: { effectiveDate: null }, network: { stunHosts: [], turnHosts: [] } } };
    for (const [slot, text] of [['contact', S.legal.meta.pending], ['officer', S.legal.meta.officerPending], ['effectiveDate', S.legal.meta.datePending]] as const) {
      const out = renderToStaticMarkup(createElement(MetaSlot, { slot, state: empty, reload: () => undefined }));
      expect(out, slot).toContain(text);
      expect(out, slot).toContain('data-state="pending"');
      expect(out.replace(/<[^>]*>/g, ''), slot).not.toMatch(/(000|example|홍길동)/); // 태그(svg xmlns 등)는 제외하고 보이는 텍스트만
    }
    // 어떤 문단도 연락처·이메일·전화번호를 직접 박아 넣지 않았다(운영자 값은 슬롯으로만)
    for (const { doc, id, p } of paras) {
      expect(p, `${doc}/${id}`).not.toMatch(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/);
      expect(p, `${doc}/${id}`).not.toMatch(/\b0\d{1,2}-\d{3,4}-\d{4}\b/);
      expect(p, `${doc}/${id}`).not.toMatch(/https?:\/\//);
    }
  });
});

describe('처리방침 보유기간 문구의 사실성 (DEF-001, POL-17·POL-18)', () => {
  it('TC-349j [POL-17,POL-18] 앱 서버 로그 비식별 문구에 영상 중계(TURN) 서버 로그에는 IP·사용자명이 남을 수 있다는 단서가 있고, 비밀번호를 "암호화"라고 표현하지 않는다', () => {
    const retention = S.legal.privacy.sections.find((sec) => sec.id === 'retention');
    expect(retention).toBeDefined();
    const text = (retention?.paragraphs ?? []).join('\n');
    expect(text).toMatch(/앱 서버 로그에는 IP 주소·닉네임·채팅·토큰을 남기지 않습니다/);
    expect(text).toMatch(/중계\(TURN\) 서버/);
    expect(text).toMatch(/접속 IP 주소와 사용자명/);
    expect(text).not.toMatch(/암호화된 해시/);
    expect(text).not.toMatch(/(^|[^앱] )서버 로그에는 IP 주소·닉네임·채팅·토큰을 남기지 않습니다\./);
  });
});
