import { describe, expect, it } from 'vitest';
import { JoinRequestSchema, MetricsPathRequestSchema, SignalRequestSchema } from './schemas';

const roomId = 'A'.repeat(22);

describe('schemas (SEC-04, SEC-06)', () => {
  it('TC-240 [FR-03,SEC-06] 정상 입장 요청을 통과시킨다', () => {
    expect(JoinRequestSchema.safeParse({ v: 1, roomId, nickname: '민지' }).success).toBe(true);
  });
  it('TC-241 [NFR-12,SEC-06] 버전이 다르면 거부한다', () => {
    expect(JoinRequestSchema.safeParse({ v: 2, roomId, nickname: '민지' }).success).toBe(false);
  });
  it('TC-242 [SEC-04,SEC-06] 발신자 필드(from)처럼 모르는 키는 거부한다', () => {
    expect(JoinRequestSchema.safeParse({ v: 1, roomId, nickname: '민지', from: 'x' }).success).toBe(false);
    expect(SignalRequestSchema.safeParse({ v: 1, to: 'abcdefgh', from: 'evil', candidate: { candidate: 'c' } }).success).toBe(false);
  });
  it('TC-243 [SEC-04,SEC-06] signal은 description과 candidate 중 정확히 하나만 허용한다', () => {
    const base = { v: 1, to: 'abcdefgh' };
    expect(SignalRequestSchema.safeParse(base).success).toBe(false);
    expect(SignalRequestSchema.safeParse({ ...base, description: { type: 'offer', sdp: 'x' }, candidate: { candidate: 'c' } }).success).toBe(false);
    expect(SignalRequestSchema.safeParse({ ...base, description: { type: 'offer', sdp: 'x' } }).success).toBe(true);
  });
  it('TC-244 [SEC-06] SDP 16KB 초과를 거부한다', () => {
    const big = 'x'.repeat(16_385);
    expect(SignalRequestSchema.safeParse({ v: 1, to: 'abcdefgh', description: { type: 'offer', sdp: big } }).success).toBe(false);
  });
  it('TC-245 [SEC-01,SEC-06] 방 ID 형식이 아니면 거부한다', () => {
    expect(JoinRequestSchema.safeParse({ v: 1, roomId: 'short', nickname: '민지' }).success).toBe(false);
    expect(JoinRequestSchema.safeParse({ v: 1, roomId: '../../etc/passwd-----', nickname: '민지' }).success).toBe(false);
  });
  it('TC-302 [NFR-15,SEC-06] metrics:path는 direct|relay만 허용하고 모르는 키(식별자 등)는 거부한다', () => {
    expect(MetricsPathRequestSchema.safeParse({ v: 1, path: 'relay' }).success).toBe(true);
    expect(MetricsPathRequestSchema.safeParse({ v: 1, path: 'direct' }).success).toBe(true);
    expect(MetricsPathRequestSchema.safeParse({ v: 1, path: 'other' }).success).toBe(false);
    expect(MetricsPathRequestSchema.safeParse({ v: 1, path: 'relay', peerId: 'abcdefgh' }).success).toBe(false);
    expect(MetricsPathRequestSchema.safeParse({ v: 2, path: 'relay' }).success).toBe(false);
  });
  it('TC-304 [NFR-15,SEC-06] metrics:path 경계·예외 입력: 빈값·대소문자·공백·잘못된 타입·버전·추가 식별자 키를 모두 거부한다', () => {
    const ok = { v: 1, path: 'relay' };
    for (const bad of [
      undefined, null, 'relay', 42, [], {},
      { v: 1 }, { path: 'relay' }, { v: 1, path: undefined }, { v: 1, path: null }, { v: 1, path: '' }, { v: 1, path: ' relay' }, { v: 1, path: 'relay ' },
      { v: 1, path: 'RELAY' }, { v: 1, path: 'Direct' }, { v: 1, path: ['relay'] }, { v: 1, path: { type: 'relay' } }, { v: 1, path: 1 },
      { v: '1', path: 'relay' }, { v: 0, path: 'relay' }, { v: 2, path: 'direct' }, { v: null, path: 'relay' },
      { ...ok, peerId: 'abcdefgh' }, { ...ok, from: 'x' }, { ...ok, to: 'abcdefgh' }, { ...ok, ip: '1.2.3.4' }, { ...ok, ts: 1 },
    ]) {
      expect(MetricsPathRequestSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
    // 통과한 값은 알려진 두 키만 남는다
    expect(MetricsPathRequestSchema.parse({ v: 1, path: 'direct' })).toEqual({ v: 1, path: 'direct' });
  });
});
