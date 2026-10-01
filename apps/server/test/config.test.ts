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
});
