import { describe, expect, it } from 'vitest';
import { decideForeground } from './foreground';

describe('decideForeground (UX-14)', () => {
  it('TC-361 [UX-14] 라이브가 아니면 아무것도 하지 않는다', () => {
    for (const status of ['idle', 'joining', 'ended'] as const) expect(decideForeground({ status, socketConnected: true, peerStates: [] })).toEqual([]);
  });

  it('TC-361b [UX-14] 이미 끊김을 알면 즉시 재연결한다(소켓이 없으면 connectNow, 붙어 있으면 resumeNow)', () => {
    expect(decideForeground({ status: 'reconnecting', socketConnected: false, peerStates: [] })).toEqual(['reconcileMedia', 'connectNow']);
    expect(decideForeground({ status: 'reconnecting', socketConnected: true, peerStates: [] })).toEqual(['reconcileMedia', 'resumeNow']);
  });

  it('TC-361c [UX-14] 연결된 것처럼 보이면 프로브를 먼저 하고, 소켓이 이미 죽었으면 바로 끊고 다시 연결한다', () => {
    expect(decideForeground({ status: 'live', socketConnected: true, peerStates: [] })).toEqual(['reconcileMedia', 'probe']);
    expect(decideForeground({ status: 'live', socketConnected: false, peerStates: [] })).toEqual(['reconcileMedia', 'kickSocket']);
  });

  it('TC-361d [UX-14] 프로브 결과별 후속 동작: 시간 초과는 kickSocket, 자리에 안 묶였으면 resumeNow, 정상이면 ICE 문제가 있을 때만 restartIce', () => {
    const base = { status: 'live', socketConnected: true } as const;
    expect(decideForeground({ ...base, peerStates: [], probe: 'timeout' })).toEqual(['kickSocket']);
    expect(decideForeground({ ...base, peerStates: [], probe: 'notBound' })).toEqual(['resumeNow']);
    expect(decideForeground({ ...base, peerStates: ['connected', 'connecting'], probe: 'ok' })).toEqual([]);
    expect(decideForeground({ ...base, peerStates: ['connected', 'failed'], probe: 'ok' })).toEqual(['restartIce']);
    expect(decideForeground({ ...base, peerStates: ['disconnected'], probe: 'ok' })).toEqual(['restartIce']);
  });
});
