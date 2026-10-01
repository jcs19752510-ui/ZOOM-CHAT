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
});
