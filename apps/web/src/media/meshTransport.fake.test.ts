import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MeshTransport } from './MeshTransport';
import type { MediaTransportEvents } from './MediaTransport';

interface FakeSender {
  tracks: unknown[];
  params: { encodings?: { maxBitrate?: number; scaleResolutionDownBy?: number }[] };
  replaceTrack: (t: unknown) => Promise<void>;
  getParameters: () => FakeSender['params'];
  setParameters: (p: FakeSender['params']) => Promise<void>;
}
interface FakeTransceiver {
  kind: 'audio' | 'video';
  direction: string;
  sender: FakeSender;
  receiver: { track: { kind: 'audio' | 'video' } };
}
const pcs: FakePC[] = [];
class FakePC {
  transceivers: FakeTransceiver[] = [];
  signalingState = 'stable';
  iceConnectionState = 'new';
  connectionState = 'new';
  localDescription: { type: string; sdp: string } | null = null;
  remote: unknown[] = [];
  candidates: unknown[] = [];
  closed = false;
  restarts = 0;
  stats: Record<string, unknown>[] = [];
  onnegotiationneeded: (() => Promise<void>) | null = null;
  onicecandidate: ((e: { candidate: { toJSON: () => unknown } | null }) => void) | null = null;
  ontrack: unknown = null;
  oniceconnectionstatechange: (() => void) | null = null;
  onconnectionstatechange: (() => void) | null = null;
  onsignalingstatechange: (() => void) | null = null;
  constructor(public config: unknown) {
    pcs.push(this);
  }
  addTransceiver(kind: 'audio' | 'video', init: { direction: string }): FakeTransceiver {
    const sender: FakeSender = {
      tracks: [],
      params: {},
      replaceTrack(t) {
        sender.tracks.push(t);
        return Promise.resolve();
      },
      getParameters: () => sender.params,
      setParameters(p) {
        sender.params = JSON.parse(JSON.stringify(p));
        return Promise.resolve();
      },
    };
    const t: FakeTransceiver = { kind, direction: init.direction, sender, receiver: { track: { kind } } };
    this.transceivers.push(t);
    return t;
  }
  getTransceivers(): FakeTransceiver[] {
    return this.transceivers;
  }
  setLocalDescription(): Promise<void> {
    this.localDescription = { type: this.signalingState === 'have-remote-offer' ? 'answer' : 'offer', sdp: 'sdp' };
    return Promise.resolve();
  }
  setRemoteDescription(d: unknown): Promise<void> {
    this.remote.push(d);
    return Promise.resolve();
  }
  addIceCandidate(c: unknown): Promise<void> {
    this.candidates.push(c);
    return Promise.resolve();
  }
  restartIce(): void {
    this.restarts++;
  }
  getStats(): Promise<{ forEach: (cb: (r: unknown) => void) => void }> {
    return Promise.resolve({ forEach: (cb) => this.stats.forEach(cb) });
  }
  close(): void {
    this.closed = true;
  }
}

let events: { signal: unknown[]; remote: unknown[]; state: [string, string][]; path: [string, string][] };
const mkEvents = (): MediaTransportEvents => ({
  signal: (to, msg) => events.signal.push({ to, msg }),
  remoteStream: (id, kind) => events.remote.push({ id, kind }),
  peerState: (id, s) => events.state.push([id, s]),
  pathType: (id, p) => events.path.push([id, p]),
});
const last = (): FakePC => {
  const p = pcs[pcs.length - 1];
  if (!p) throw new Error('no pc');
  return p;
};

beforeEach(() => {
  pcs.length = 0;
  events = { signal: [], remote: [], state: [], path: [] };
  vi.useFakeTimers();
  vi.stubGlobal('RTCPeerConnection', FakePC);
  vi.stubGlobal('MediaStream', class {
    tracks: unknown[] = [];
    getTracks() {
      return this.tracks;
    }
    addTrack(t: unknown) {
      this.tracks.push(t);
    }
    removeTrack(t: unknown) {
      this.tracks = this.tracks.filter((x) => x !== t);
    }
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const mesh = (self = 'm'): MeshTransport => {
  const t = new MeshTransport(self, mkEvents());
  t.start([{ urls: ['stun:x'] }, { urls: ['turn:t'], username: 'u', credential: 'c' }]);
  return t;
};

describe('MeshTransport 연결 구성 (unit-07, FR-07, NFR-13, SEC-09)', () => {
  it('TC-479 [FR-07] offer를 만드는 쪽은 마이크·카메라·화면 순서의 sendrecv m-line 3개를 만들고, 응답하는 쪽은 만들지 않는다(중복 m-line 방지)', () => {
    const t = mesh();
    t.addPeer('a', true);
    expect(last().transceivers.map((x) => [x.kind, x.direction])).toEqual([['audio', 'sendrecv'], ['video', 'sendrecv'], ['video', 'sendrecv']]);
    t.addPeer('b', false);
    expect(last().transceivers.length).toBe(0);
    const before = pcs.length;
    t.addPeer('a', true); // 중복
    t.addPeer('m', true); // 나 자신
    expect(pcs.length).toBe(before);
  });

  it('TC-479b [SEC-09] ICE 서버는 서버가 준 STUN/TURN 자격증명 그대로 쓰고, 자격증명이 없는 항목에는 빈 필드를 만들지 않는다', () => {
    const t = mesh();
    t.addPeer('a', false);
    expect((last().config as { iceServers: unknown[] }).iceServers).toEqual([{ urls: ['stun:x'] }, { urls: ['turn:t'], username: 'u', credential: 'c' }]);
  });

  it('TC-479c [NFR-13] 인원 수에 맞춰 카메라 송신 비트레이트·해상도를 적용하고(2명 1.5Mbps, 6명 400kbps·1/2), 화면 송신은 1.5Mbps로 고정한다', async () => {
    const t = mesh();
    t.addPeer('a', true);
    t.applyQuality(2);
    await vi.advanceTimersByTimeAsync(0);
    const cam = last().transceivers[1];
    expect(cam?.sender.params.encodings?.[0]).toMatchObject({ maxBitrate: 1_500_000, scaleResolutionDownBy: 1 });
    t.applyQuality(6);
    await vi.advanceTimersByTimeAsync(0);
    expect(cam?.sender.params.encodings?.[0]).toMatchObject({ maxBitrate: 400_000, scaleResolutionDownBy: 2 });
    expect(last().transceivers[2]?.sender.params.encodings?.[0]).toMatchObject({ maxBitrate: 1_500_000, scaleResolutionDownBy: 1 });
    t.applyQuality(0); // 비정상 입력도 1명으로 본다
    await vi.advanceTimersByTimeAsync(0);
    expect(cam?.sender.params.encodings?.[0]?.maxBitrate).toBe(1_500_000);
  });

  it('TC-479d [FR-08,FR-12] 마이크·카메라·화면 트랙 교체는 모든 연결의 해당 m-line에만 적용되고, 화면 트랙에는 contentHint=detail을 둔다', async () => {
    const t = mesh();
    t.addPeer('a', true);
    t.addPeer('b', true);
    const a = { kind: 'audio' } as unknown as MediaStreamTrack;
    const v = { kind: 'video' } as unknown as MediaStreamTrack;
    const s = { kind: 'video', contentHint: '' } as unknown as MediaStreamTrack;
    await t.setAudioTrack(a);
    await t.setVideoTrack(v);
    await t.setScreenTrack(s);
    for (const pc of pcs) {
      expect(pc.transceivers[0]?.sender.tracks.at(-1)).toBe(a);
      expect(pc.transceivers[1]?.sender.tracks.at(-1)).toBe(v);
      expect(pc.transceivers[2]?.sender.tracks.at(-1)).toBe(s);
    }
    expect(s.contentHint).toBe('detail');
    await t.setScreenTrack(null);
    for (const pc of pcs) expect(pc.transceivers[2]?.sender.tracks.at(-1)).toBeNull();
    expect(pcs[0]?.transceivers[1]?.sender.tracks.at(-1)).toBe(v); // 카메라는 그대로
  });
});

describe('MeshTransport 협상·복구 (unit-07, FR-20, NFR-03)', () => {
  it('TC-479e [FR-07] 동시 offer 충돌: 양보하는 쪽(ID가 더 큰 쪽)은 상대 offer를 받아들이고, 양보하지 않는 쪽은 무시한다', async () => {
    const offer = { description: { type: 'offer' as const, sdp: 'o' } };
    const impolite = mesh('a'); // 'a' < 'b' 이므로 a는 양보하지 않는다
    impolite.addPeer('b', false);
    const pcI = last();
    pcI.signalingState = 'have-local-offer'; // 내가 이미 offer를 낸 상태 = 충돌
    await impolite.handleSignal('b', offer);
    expect(pcI.remote.length).toBe(0);
    const polite = mesh('b');
    polite.addPeer('a', false);
    const pcP = last();
    pcP.signalingState = 'have-local-offer';
    await polite.handleSignal('a', offer);
    expect(pcP.remote.length).toBe(1);
  });

  it('TC-479f [FR-07] 충돌이 없으면 offer에 answer를 만들어 보내고 응답 쪽이 m-line에 송신 트랙을 붙이며, 모르는 상대의 시그널은 연결을 만든다', async () => {
    const t = mesh('z');
    const a = { kind: 'audio' } as unknown as MediaStreamTrack;
    await t.setAudioTrack(a);
    // 응답 쪽은 상대 offer로 생긴 m-line(오디오, 비디오, 비디오)에 붙는다. 가짜 PC는 setRemoteDescription에서 m-line을 만든다.
    const orig = FakePC.prototype.setRemoteDescription;
    FakePC.prototype.setRemoteDescription = function (this: FakePC, d: unknown) {
      this.addTransceiver('audio', { direction: 'recvonly' });
      this.addTransceiver('video', { direction: 'recvonly' });
      this.addTransceiver('video', { direction: 'recvonly' });
      this.signalingState = 'have-remote-offer';
      return orig.call(this, d);
    };
    try {
      await t.handleSignal('x', { description: { type: 'offer', sdp: 'o' } });
    } finally {
      FakePC.prototype.setRemoteDescription = orig;
    }
    const pc = last();
    expect(pc.transceivers.map((x) => x.direction)).toEqual(['sendrecv', 'sendrecv', 'sendrecv']);
    expect(pc.transceivers[0]?.sender.tracks.at(-1)).toBe(a);
    expect(events.signal).toEqual([{ to: 'x', msg: { description: { type: 'answer', sdp: 'sdp' } } }]);
  });

  it('TC-479g [FR-20,SEC-07] 잘못된 시그널(예외를 던지는 후보·설명)은 삼키고 다른 연결에 영향을 주지 않으며, 닫힌 뒤의 시그널은 무시한다', async () => {
    const t = mesh();
    t.addPeer('a', false);
    last().addIceCandidate = () => Promise.reject(new Error('bad candidate'));
    await expect(t.handleSignal('a', { candidate: { candidate: 'garbage', sdpMid: '0', sdpMLineIndex: 0 } })).resolves.toBeUndefined();
    last().setRemoteDescription = () => Promise.reject(new Error('bad sdp'));
    await expect(t.handleSignal('a', { description: { type: 'answer', sdp: '???' } })).resolves.toBeUndefined();
    t.close();
    const n = pcs.length;
    await t.handleSignal('new', { description: { type: 'offer', sdp: 'o' } });
    expect(pcs.length).toBe(n);
  });

  it('TC-479h [NFR-03] ICE disconnected는 4초 기다린 뒤에도 그대로면 재시작하고, 그 사이 복구되면 재시작하지 않으며, failed는 즉시 재시작하되 3회까지만 한다', async () => {
    const t = mesh();
    t.addPeer('a', false);
    const pc = last();
    pc.iceConnectionState = 'disconnected';
    pc.oniceconnectionstatechange?.();
    expect(events.state.at(-1)).toEqual(['a', 'disconnected']);
    await vi.advanceTimersByTimeAsync(3900);
    expect(pc.restarts).toBe(0);
    pc.iceConnectionState = 'connected';
    pc.oniceconnectionstatechange?.();
    await vi.advanceTimersByTimeAsync(5000);
    expect(pc.restarts).toBe(0);
    expect(events.state.at(-1)).toEqual(['a', 'connected']);
    pc.iceConnectionState = 'disconnected';
    pc.oniceconnectionstatechange?.();
    await vi.advanceTimersByTimeAsync(4100);
    expect(pc.restarts).toBe(1);
    pc.iceConnectionState = 'failed';
    for (let i = 0; i < 6; i++) pc.oniceconnectionstatechange?.();
    expect(events.state.at(-1)).toEqual(['a', 'failed']);
    expect(pc.restarts).toBe(1 + 2); // 이미 1회 → 최대 3회까지만
    t.restartIce(); // 소켓 복구 뒤에는 횟수가 초기화돼 다시 시도한다
    expect(pc.restarts).toBe(4);
    pc.oniceconnectionstatechange?.();
    expect(pc.restarts).toBe(5);
  });

  it('TC-479i [NFR-15] 경로 판정은 연결 직후 한 번만 보고하고(같은 값 반복 없음), 통계가 비어 있으면 최대 2번 더 재시도한 뒤 포기한다', async () => {
    const t = mesh();
    t.addPeer('a', false);
    const pc = last();
    pc.stats = [
      { id: 'T', type: 'transport', selectedCandidatePairId: 'P' },
      { id: 'P', type: 'candidate-pair', localCandidateId: 'L', remoteCandidateId: 'R', nominated: true, state: 'succeeded' },
      { id: 'L', type: 'local-candidate', candidateType: 'host' },
      { id: 'R', type: 'remote-candidate', candidateType: 'srflx' },
    ];
    pc.iceConnectionState = 'connected';
    pc.oniceconnectionstatechange?.();
    await vi.advanceTimersByTimeAsync(0);
    pc.oniceconnectionstatechange?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(events.path).toEqual([['a', 'direct']]);
    pc.stats = [{ id: 'T', type: 'transport', selectedCandidatePairId: 'P' }, { id: 'P', type: 'candidate-pair', localCandidateId: 'L', remoteCandidateId: 'R' }, { id: 'L', type: 'local-candidate', candidateType: 'relay' }, { id: 'R', type: 'remote-candidate', candidateType: 'host' }];
    pc.oniceconnectionstatechange?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(events.path).toEqual([['a', 'direct'], ['a', 'relay']]); // 경로가 바뀌면 다시 보고
    // 통계가 비어 있는 새 연결
    const t2 = mesh('q');
    t2.addPeer('b', false);
    const pc2 = last();
    pc2.iceConnectionState = 'connected';
    let calls = 0;
    pc2.getStats = () => {
      calls++;
      return Promise.resolve({ forEach: () => undefined });
    };
    pc2.oniceconnectionstatechange?.();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(calls).toBe(3);
    expect(events.path.length).toBe(2);
  });

  it('TC-479j [FR-22] close()와 removePeer()는 연결을 닫고 이벤트 핸들러를 떼어 이후 콜백이 아무 일도 하지 않게 한다', () => {
    const t = mesh();
    t.addPeer('a', true);
    t.addPeer('b', true);
    const [pa, pb] = pcs;
    t.removePeer('a');
    expect(pa?.closed).toBe(true);
    expect(pa?.oniceconnectionstatechange).toBeNull();
    expect(pa?.ontrack).toBeNull();
    t.close();
    expect(pb?.closed).toBe(true);
    const n = pcs.length;
    t.addPeer('c', true);
    expect(pcs.length).toBe(n);
  });
});
