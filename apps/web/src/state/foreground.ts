import type { PeerConnState } from '../media/MediaTransport';

export type ForegroundAction = 'reconcileMedia' | 'connectNow' | 'probe' | 'kickSocket' | 'resumeNow' | 'restartIce';
export type ProbeResult = 'ok' | 'timeout' | 'notBound';

export interface ForegroundInput {
  status: 'idle' | 'joining' | 'live' | 'reconnecting' | 'ended';
  socketConnected: boolean;
  peerStates: PeerConnState[];
  /** 프로브 전에는 undefined */
  probe?: ProbeResult | undefined;
}

/**
 * 화면 복귀 시 무엇을 할지 결정하는 순수 함수(UX-14, 03 §4.5).
 * 프로브 전(probe 없음)에는 미디어 정합과 연결 확인을, 프로브 결과가 나온 뒤에는 복구 동작을 돌려준다.
 */
export function decideForeground(i: ForegroundInput): ForegroundAction[] {
  if (i.status !== 'live' && i.status !== 'reconnecting') return [];
  if (i.probe === undefined) {
    if (i.status === 'reconnecting') return ['reconcileMedia', i.socketConnected ? 'resumeNow' : 'connectNow'];
    return i.socketConnected ? ['reconcileMedia', 'probe'] : ['reconcileMedia', 'kickSocket'];
  }
  if (i.probe === 'timeout') return ['kickSocket'];
  if (i.probe === 'notBound') return ['resumeNow'];
  return i.peerStates.some((s) => s === 'failed' || s === 'disconnected') ? ['restartIce'] : [];
}
