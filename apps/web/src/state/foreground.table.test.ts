import { describe, expect, it } from 'vitest';
import type { PeerConnState } from '../media/MediaTransport';
import { decideForeground, type ForegroundInput, type ProbeResult } from './foreground';

const STATUSES: ForegroundInput['status'][] = ['idle', 'joining', 'live', 'reconnecting', 'ended'];
const PROBES: Array<ProbeResult | undefined> = [undefined, 'ok', 'timeout', 'notBound'];
const PEERS: PeerConnState[][] = [[], ['connected'], ['connecting'], ['failed'], ['disconnected'], ['connected', 'failed'], ['connected', 'disconnected', 'connecting']];

describe('decideForeground 전수 조합 (UX-14)', () => {
  it('TC-364 [UX-14] 모든 상태×소켓×프로브×피어 조합에서 불변식을 지킨다(비라이브 무동작, probe 결과 후엔 probe 액션 없음, 중복 액션 없음, timeout은 항상 kickSocket)', () => {
    let n = 0;
    for (const status of STATUSES)
      for (const socketConnected of [true, false])
        for (const probe of PROBES)
          for (const peerStates of PEERS) {
            const out = decideForeground({ status, socketConnected, peerStates, probe });
            const label = JSON.stringify({ status, socketConnected, probe, peerStates });
            n++;
            if (status !== 'live' && status !== 'reconnecting') expect(out, label).toEqual([]);
            expect(new Set(out).size, label).toBe(out.length);
            if (probe !== undefined) expect(out, label).not.toContain('probe');
            if (probe !== undefined && (status === 'live' || status === 'reconnecting')) {
              if (probe === 'timeout') expect(out, label).toEqual(['kickSocket']);
              if (probe === 'notBound') expect(out, label).toEqual(['resumeNow']);
              if (probe === 'ok') expect(out, label).toEqual(peerStates.some((s) => s === 'failed' || s === 'disconnected') ? ['restartIce'] : []);
            }
            // 프로브 전: 라이브·소켓 연결 → probe 포함, 소켓 끊김 → kickSocket 포함, 항상 미디어 정합이 먼저
            if (probe === undefined && (status === 'live' || status === 'reconnecting')) {
              expect(out[0], label).toBe('reconcileMedia');
              if (status === 'live') expect(out, label).toContain(socketConnected ? 'probe' : 'kickSocket');
              if (status === 'reconnecting') expect(out, label).toContain(socketConnected ? 'resumeNow' : 'connectNow');
              expect(out, label).not.toContain('restartIce');
            }
          }
    expect(n).toBe(STATUSES.length * 2 * PROBES.length * PEERS.length);
  });
});
