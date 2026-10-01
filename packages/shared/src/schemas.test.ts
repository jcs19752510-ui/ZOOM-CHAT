import { describe, expect, it } from 'vitest';
import { JoinRequestSchema, SignalRequestSchema } from './schemas';

const roomId = 'A'.repeat(22);

describe('schemas (SEC-04, SEC-06)', () => {
  it('정상 입장 요청을 통과시킨다', () => {
    expect(JoinRequestSchema.safeParse({ v: 1, roomId, nickname: '민지' }).success).toBe(true);
  });
  it('버전이 다르면 거부한다', () => {
    expect(JoinRequestSchema.safeParse({ v: 2, roomId, nickname: '민지' }).success).toBe(false);
  });
  it('발신자 필드(from)처럼 모르는 키는 거부한다', () => {
    expect(JoinRequestSchema.safeParse({ v: 1, roomId, nickname: '민지', from: 'x' }).success).toBe(false);
    expect(SignalRequestSchema.safeParse({ v: 1, to: 'abcdefgh', from: 'evil', candidate: { candidate: 'c' } }).success).toBe(false);
  });
  it('signal은 description과 candidate 중 정확히 하나만 허용한다', () => {
    const base = { v: 1, to: 'abcdefgh' };
    expect(SignalRequestSchema.safeParse(base).success).toBe(false);
    expect(SignalRequestSchema.safeParse({ ...base, description: { type: 'offer', sdp: 'x' }, candidate: { candidate: 'c' } }).success).toBe(false);
    expect(SignalRequestSchema.safeParse({ ...base, description: { type: 'offer', sdp: 'x' } }).success).toBe(true);
  });
  it('SDP 16KB 초과를 거부한다', () => {
    const big = 'x'.repeat(16_385);
    expect(SignalRequestSchema.safeParse({ v: 1, to: 'abcdefgh', description: { type: 'offer', sdp: big } }).success).toBe(false);
  });
  it('방 ID 형식이 아니면 거부한다', () => {
    expect(JoinRequestSchema.safeParse({ v: 1, roomId: 'short', nickname: '민지' }).success).toBe(false);
    expect(JoinRequestSchema.safeParse({ v: 1, roomId: '../../etc/passwd-----', nickname: '민지' }).success).toBe(false);
  });
});
