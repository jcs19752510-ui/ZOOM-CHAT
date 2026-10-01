import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../src/config';
import { baseEnv } from './helpers';

describe('환경변수 검증 (NFR-08)', () => {
  it('TC-120 [NFR-08] 필수값이 없으면 읽기 쉬운 오류로 시작이 실패한다', () => {
    expect(() => loadConfig({ NODE_ENV: 'test' })).toThrow(ConfigError);
    try {
      loadConfig({ NODE_ENV: 'test' });
    } catch (e) {
      expect((e as Error).message).toContain('SESSION_SECRET');
      expect((e as Error).message).toContain('ALLOWED_ORIGINS');
    }
  });
  it('TC-121 [SEC-10] 짧은 시크릿은 거부한다', () => {
    expect(() => loadConfig({ ...baseEnv, SESSION_SECRET: 'short' })).toThrow(/SESSION_SECRET/);
  });
  it('TC-122 [SEC-08] Origin 와일드카드와 형식 오류를 거부한다', () => {
    expect(() => loadConfig({ ...baseEnv, ALLOWED_ORIGINS: '*' })).toThrow(/ALLOWED_ORIGINS/);
    expect(() => loadConfig({ ...baseEnv, ALLOWED_ORIGINS: 'http://a.com/path' })).toThrow(/ALLOWED_ORIGINS/);
    expect(loadConfig({ ...baseEnv, ALLOWED_ORIGINS: 'https://a.com, http://localhost:5173' }).ALLOWED_ORIGINS).toEqual(['https://a.com', 'http://localhost:5173']);
  });
  it('TC-123 [SEC-09] TURN_URLS는 TURN_SECRET 없이 쓸 수 없다', () => {
    expect(() => loadConfig({ ...baseEnv, TURN_URLS: 'turn:t.example:3478' })).toThrow(/TURN_SECRET/);
  });
  it('TC-124 [FR-07,NFR-04] 기본값: 방당 6명, 방 100개, 유예 20초, 빈 방 10분', () => {
    const c = loadConfig(baseEnv);
    expect([c.MAX_PARTICIPANTS, c.MAX_ROOMS, c.RECONNECT_GRACE_SEC, c.ROOM_EMPTY_TTL_MIN, c.TURN_TTL_SEC]).toEqual([6, 100, 20, 10, 3600]);
  });
  it('TC-125 [SEC-10] 운영 모드에서는 .env.example의 예시 비밀값을 거부한다', () => {
    const placeholder = 'change-me-change-me-change-me-change-me';
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: 'production', SESSION_SECRET: placeholder })).toThrow(/예시 비밀값/);
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: 'production', TURN_URLS: 'turn:t:3478', TURN_SECRET: 'change-me-turn-secret-change-me' })).toThrow(/예시 비밀값/);
    expect(loadConfig({ ...baseEnv, NODE_ENV: 'development', SESSION_SECRET: placeholder }).SESSION_SECRET).toBe(placeholder);
  });
  it('TC-301 [POL-19,POL-20] 운영자 설정은 선택이며 빈 값은 없음으로 본다', () => {
    const c = loadConfig({ ...baseEnv, OPERATOR_CONTACT: '', PRIVACY_OFFICER: ' ', LEGAL_EFFECTIVE_DATE: '', ADMIN_PORT: '', ADMIN_TOKEN: '' });
    expect([c.OPERATOR_CONTACT, c.PRIVACY_OFFICER, c.LEGAL_EFFECTIVE_DATE, c.ADMIN_PORT, c.ADMIN_TOKEN]).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });
  it('TC-301b [POL-19] OPERATOR_CONTACT는 이메일 또는 https URL, 200자 이하만 허용한다', () => {
    expect(loadConfig({ ...baseEnv, OPERATOR_CONTACT: 'ops@example.com' }).OPERATOR_CONTACT).toBe('ops@example.com');
    expect(loadConfig({ ...baseEnv, OPERATOR_CONTACT: 'https://example.com/report' }).OPERATOR_CONTACT).toBe('https://example.com/report');
    for (const bad of ['http://example.com', 'javascript:alert(1)', 'not a contact', 'a@b', `${'a'.repeat(200)}@x.com`]) {
      expect(() => loadConfig({ ...baseEnv, OPERATOR_CONTACT: bad }), bad).toThrow(/OPERATOR_CONTACT/);
    }
  });
  it('TC-301c [POL-20] LEGAL_EFFECTIVE_DATE는 존재하는 YYYY-MM-DD, PRIVACY_OFFICER는 100자 이하', () => {
    expect(loadConfig({ ...baseEnv, LEGAL_EFFECTIVE_DATE: '2026-10-01' }).LEGAL_EFFECTIVE_DATE).toBe('2026-10-01');
    for (const bad of ['2026-13-01', '2026-02-30', '26-10-01', '2026/10/01']) {
      expect(() => loadConfig({ ...baseEnv, LEGAL_EFFECTIVE_DATE: bad }), bad).toThrow(/LEGAL_EFFECTIVE_DATE/);
    }
    expect(() => loadConfig({ ...baseEnv, PRIVACY_OFFICER: 'a'.repeat(101) })).toThrow(/PRIVACY_OFFICER/);
  });
  it('TC-301d [POL-19] ADMIN_PORT와 ADMIN_TOKEN은 함께만 허용하고 PORT와 같을 수 없으며 토큰은 32자 이상', () => {
    const token = 'a'.repeat(32);
    expect(() => loadConfig({ ...baseEnv, ADMIN_PORT: '3002' })).toThrow(/ADMIN_TOKEN/);
    expect(() => loadConfig({ ...baseEnv, ADMIN_TOKEN: token })).toThrow(/ADMIN_TOKEN/);
    expect(() => loadConfig({ ...baseEnv, PORT: '3001', ADMIN_PORT: '3001', ADMIN_TOKEN: token })).toThrow(/ADMIN_PORT/);
    expect(() => loadConfig({ ...baseEnv, ADMIN_PORT: '3002', ADMIN_TOKEN: 'short' })).toThrow(/ADMIN_TOKEN/);
    expect(() => loadConfig({ ...baseEnv, ADMIN_PORT: '70000', ADMIN_TOKEN: token })).toThrow(/ADMIN_PORT/);
    const c = loadConfig({ ...baseEnv, ADMIN_PORT: '3002', ADMIN_TOKEN: token });
    expect([c.ADMIN_PORT, c.ADMIN_TOKEN]).toEqual([3002, token]);
  });
  it('TC-301e [SEC-10] 운영 모드에서는 ADMIN_TOKEN 예시 값도 거부한다', () => {
    const t = 'change-me-admin-token-change-me-admin';
    expect(() => loadConfig({ ...baseEnv, NODE_ENV: 'production', ADMIN_PORT: '3002', ADMIN_TOKEN: t })).toThrow(/예시 비밀값/);
    expect(loadConfig({ ...baseEnv, ADMIN_PORT: '3002', ADMIN_TOKEN: t }).ADMIN_TOKEN).toBe(t);
  });
  it('TC-303 [POL-19] OPERATOR_CONTACT 경계값: 200자 통과·201자 거부, 공백 포함·스킴만 있는 값 거부', () => {
    const ok200 = `${'a'.repeat(200 - '@x.com'.length)}@x.com`;
    const ok200url = `https://${'a'.repeat(200 - 'https://'.length)}`;
    expect(ok200).toHaveLength(200);
    expect(ok200url).toHaveLength(200);
    expect(loadConfig({ ...baseEnv, OPERATOR_CONTACT: ok200 }).OPERATOR_CONTACT).toBe(ok200);
    expect(loadConfig({ ...baseEnv, OPERATOR_CONTACT: ok200url }).OPERATOR_CONTACT).toBe(ok200url);
    for (const bad of [`a${ok200}`, `${ok200url}a`, 'ops @example.com', 'ops@exa mple.com', 'https://exa mple.com', ' ops@example.com', 'ops@example.com ', 'https://', 'https:// x.com', 'ftp://example.com', 'HTTP://example.com', 'mailto:ops@example.com@', '@example.com', 'ops@@example.com', 'ops@example']) {
      expect(() => loadConfig({ ...baseEnv, OPERATOR_CONTACT: bad }), JSON.stringify(bad)).toThrow(/OPERATOR_CONTACT/);
    }
  });
  it('TC-303b [POL-20] LEGAL_EFFECTIVE_DATE 경계값(윤년·월말·0값)과 PRIVACY_OFFICER 100자 경계', () => {
    for (const ok of ['2028-02-29', '2026-12-31', '2026-01-01', '2026-04-30']) {
      expect(loadConfig({ ...baseEnv, LEGAL_EFFECTIVE_DATE: ok }).LEGAL_EFFECTIVE_DATE, ok).toBe(ok);
    }
    for (const bad of ['2026-02-29', '2025-02-29', '2026-04-31', '2026-00-10', '2026-10-00', '2026-02-32', '2026-10-1', '2026-1-01', '20261001', '2026-10-01T00:00:00Z', ' 2026-10-01', '2026-10-01 ', 'abcd-ef-gh']) {
      expect(() => loadConfig({ ...baseEnv, LEGAL_EFFECTIVE_DATE: bad }), JSON.stringify(bad)).toThrow(/LEGAL_EFFECTIVE_DATE/);
    }
    expect(loadConfig({ ...baseEnv, PRIVACY_OFFICER: 'a'.repeat(100) }).PRIVACY_OFFICER).toBe('a'.repeat(100));
    expect(loadConfig({ ...baseEnv, PRIVACY_OFFICER: '홍길동' }).PRIVACY_OFFICER).toBe('홍길동');
  });
  it('TC-303c [POL-19] ADMIN_PORT·ADMIN_TOKEN 경계값: 포트 1·65535 통과, 0·65536·비정수·문자 거부, 토큰 31자 거부·32자 통과', () => {
    const token = 'b'.repeat(32);
    for (const [raw, num] of [['1', 1], ['65535', 65535], ['3002', 3002]] as const) {
      expect(loadConfig({ ...baseEnv, ADMIN_PORT: raw, ADMIN_TOKEN: token }).ADMIN_PORT, raw).toBe(num);
    }
    for (const bad of ['0', '-1', '65536', '3002.5', 'abc', '3002abc']) {
      expect(() => loadConfig({ ...baseEnv, ADMIN_PORT: bad, ADMIN_TOKEN: token }), bad).toThrow(/ADMIN_PORT/);
    }
    expect(() => loadConfig({ ...baseEnv, ADMIN_PORT: '3002', ADMIN_TOKEN: 'b'.repeat(31) })).toThrow(/ADMIN_TOKEN/);
    expect(loadConfig({ ...baseEnv, ADMIN_PORT: '3002', ADMIN_TOKEN: 'b'.repeat(33) }).ADMIN_TOKEN).toBe('b'.repeat(33));
    // 공백만 있는 값은 "없음"이므로 반대편만 설정된 것으로 보아 거부된다(둘 다 공백이면 통과)
    expect(() => loadConfig({ ...baseEnv, ADMIN_PORT: '3002', ADMIN_TOKEN: '   ' })).toThrow(/ADMIN_TOKEN/);
    expect(() => loadConfig({ ...baseEnv, ADMIN_PORT: '  ', ADMIN_TOKEN: token })).toThrow(/ADMIN_TOKEN/);
    expect(loadConfig({ ...baseEnv, ADMIN_PORT: '  ', ADMIN_TOKEN: '   ' }).ADMIN_PORT).toBeUndefined();
    // PORT와 같은 값은 최대 경계에서도 거부, 다르면(65534 vs 65535) 통과
    expect(() => loadConfig({ ...baseEnv, PORT: '65535', ADMIN_PORT: '65535', ADMIN_TOKEN: token })).toThrow(/ADMIN_PORT/);
    expect(loadConfig({ ...baseEnv, PORT: '65534', ADMIN_PORT: '65535', ADMIN_TOKEN: token }).ADMIN_PORT).toBe(65535);
  });
  it('TC-303d [SEC-10,POL-19] 운영 모드 예시값: 정상 운영 값은 통과하고 change-me 접두 ADMIN_TOKEN만 거부, 개발 모드는 허용', () => {
    const prodOk = { ...baseEnv, NODE_ENV: 'production', OPERATOR_CONTACT: 'ops@example.com', PRIVACY_OFFICER: '홍길동', LEGAL_EFFECTIVE_DATE: '2026-10-01', ADMIN_PORT: '3002', ADMIN_TOKEN: 'c'.repeat(32) };
    const c = loadConfig(prodOk);
    expect([c.OPERATOR_CONTACT, c.PRIVACY_OFFICER, c.LEGAL_EFFECTIVE_DATE, c.ADMIN_PORT, c.ADMIN_TOKEN]).toEqual(['ops@example.com', '홍길동', '2026-10-01', 3002, 'c'.repeat(32)]);
    expect(() => loadConfig({ ...prodOk, ADMIN_TOKEN: `change-me${'c'.repeat(24)}` })).toThrow(/예시 비밀값/);
    expect(loadConfig({ ...prodOk, NODE_ENV: 'development', ADMIN_TOKEN: `change-me${'c'.repeat(24)}` }).ADMIN_TOKEN).toBe(`change-me${'c'.repeat(24)}`);
    // 운영에서 ADMIN을 설정하지 않아도 기동은 막지 않는다(선택 기능)
    expect(loadConfig({ ...baseEnv, NODE_ENV: 'production' }).ADMIN_PORT).toBeUndefined();
  });
  it('TC-303e [POL-19,POL-20] 환경변수를 전혀 주지 않아도 기동 설정이 만들어지고 5종은 undefined다(키 자체가 없음)', () => {
    const c = loadConfig(baseEnv);
    for (const k of ['OPERATOR_CONTACT', 'PRIVACY_OFFICER', 'LEGAL_EFFECTIVE_DATE', 'ADMIN_PORT', 'ADMIN_TOKEN'] as const) expect(c[k], k).toBeUndefined();
  });
  it('TC-344 [POL-19,SEC-07] OPERATOR_CONTACT 이메일은 javascript:·data: 같은 스킴을 숨긴 값을 통과시키지 않는다(R-1, 링크 주입 방지)', () => {
    for (const bad of ['javascript:alert(1)@x.com', 'JaVaScRiPt:alert(1)@x.com', 'data:text/html,<script>@x.com', 'vbscript:msgbox@x.com', 'mailto:ops@example.com', 'ops(1)@example.com', 'ops"x@example.com', 'ops<x>@example.com', 'a:b@example.com', 'ops@exa_mple.com', 'ops@example..com', 'ops@.example.com', 'javascript:alert(1)']) {
      expect(() => loadConfig({ ...baseEnv, OPERATOR_CONTACT: bad }), JSON.stringify(bad)).toThrow(/OPERATOR_CONTACT/);
    }
    for (const ok of ['ops@example.com', 'first.last+tag@sub.example.co.kr', 'a_b%c-d@x-y.io']) {
      expect(loadConfig({ ...baseEnv, OPERATOR_CONTACT: ok }).OPERATOR_CONTACT, ok).toBe(ok);
    }
  });
});
