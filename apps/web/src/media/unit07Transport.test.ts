import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MeshTransport } from './MeshTransport';
import type { MediaTransportEvents, RemoteKind } from './MediaTransport';

// unit-07 소급 6단계 변이 시험이 찾은 빈틈 보강(MeshTransport.ts). 기존 meshTransport.fake.test.ts(TC-479~479j)와 겹치지 않는 경로만 다룬다.

type Params = { encodings?: { maxBitrate?: number; scaleResolutionDownBy?: number }[] };
interface FakeTrack {
  kind: 'audio' | 'video';
  id: string;
}
interface FakeSender {
  tracks: unknown[];
  params: Params;
  replaceTrack: (t: unknown) => Promise<void>;
  getParameters: () => Params;
  setParameters: (p: Params) => Promise<void>;
}
interface FakeTransceiver {
  kind: 'audio' | 'video';
  direction: string;
  sender: FakeSender;
  receiver: { track: { kind: 'audio' | 'video' } };
}
type StatsRow = Record<string, unknown>;

const pcs: FakePC[] = [];
class FakePC {
  transceivers: FakeTransceiver[] = [];
  signalingState = 'stable';
  iceConnectionState = 'new';
  connectionState = 'new';
  localDescription: { type: string; sdp: string } | null = null;
  remote: unknown[] = [];
  candidates: unknown[] = [];
  restarts = 0;
  stats: StatsRow[] = [];
  statsError: Error | null = null;
  localDescGate: Promise<void> | null = null;
  onnegotiationneeded: (() => Promise<void>) | null = null;
  onicecandidate: ((e: { candidate: { toJSON: () => unknown } | null }) => void) | null = null;
  ontrack: ((e: { track: FakeTrack; transceiver: FakeTransceiver }) => void) | null = null;
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
        sender.params = JSON.parse(JSON.stringify(p)) as Params;
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
  async setLocalDescription(): Promise<void> {
    if (this.localDescGate) await this.localDescGate;
    this.localDescription = { type: this.signalingState === 'have-remote-offer' ? 'answer' : 'offer', sdp: 'sdp' };
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
    if (this.statsError) return Promise.reject(this.statsError);
    return Promise.resolve({ forEach: (cb) => this.stats.forEach(cb) });
  }
  close(): void {}
}

let events: { signal: { to: string; msg: unknown }[]; remote: { id: string; kind: RemoteKind; stream: { tracks: FakeTrack[] } }[]; state: [string, string][] };
const mkEvents = (): MediaTransportEvents => ({
  signal: (to, msg) => events.signal.push({ to, msg }),
  remoteStream: (id, kind, stream) => events.remote.push({ id, kind, stream: stream as unknown as { tracks: FakeTrack[] } }),
  peerState: (id, s) => events.state.push([id, s]),
  pathType: () => undefined,
});
const last = (): FakePC => {
  const p = pcs[pcs.length - 1];
  if (!p) throw new Error('no pc');
  return p;
};
const tr = (pc: FakePC, i: number): FakeTransceiver => {
  const t = pc.transceivers[i];
  if (!t) throw new Error('no transceiver');
  return t;
};
const mesh = (self = 'm'): MeshTransport => {
  const t = new MeshTransport(self, mkEvents());
  t.start([{ urls: ['stun:x'] }]);
  return t;
};
const flush = async (): Promise<void> => void (await vi.advanceTimersByTimeAsync(0));

beforeEach(() => {
  pcs.length = 0;
  events = { signal: [], remote: [], state: [] };
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

describe('MeshTransport 수신 트랙 역할 분배 (unit-07, FR-07, FR-12)', () => {
  it('TC-479k [FR-07,FR-12] 수신 트랙은 m-line 순서로 역할이 정해진다: 오디오#0·비디오#0은 camera 스트림, 비디오#1은 screen 스트림, 그 밖의 m-line은 무시한다', () => {
    const t = mesh();
    t.addPeer('a', true);
    const pc = last();
    pc.transceivers.push({ kind: 'video', direction: 'sendrecv', sender: tr(pc, 2).sender, receiver: { track: { kind: 'video' } } }); // 예상 밖의 4번째 m-line
    const audio: FakeTrack = { kind: 'audio', id: 'au' };
    const cam: FakeTrack = { kind: 'video', id: 'cam' };
    const scr: FakeTrack = { kind: 'video', id: 'scr' };
    pc.ontrack?.({ track: audio, transceiver: tr(pc, 0) });
    pc.ontrack?.({ track: cam, transceiver: tr(pc, 1) });
    pc.ontrack?.({ track: scr, transceiver: tr(pc, 2) });
    expect(events.remote.map((e) => [e.id, e.kind])).toEqual([['a', 'camera'], ['a', 'camera'], ['a', 'screen']]);
    const camStream = events.remote[1]?.stream;
    expect(camStream?.tracks.map((x) => x.id).sort(), '카메라 스트림은 마이크+카메라').toEqual(['au', 'cam']);
    expect(events.remote[2]?.stream.tracks.map((x) => x.id), '화면 스트림에는 화면 트랙만').toEqual(['scr']);
    pc.ontrack?.({ track: { kind: 'video', id: 'extra' }, transceiver: tr(pc, 3) });
    expect(events.remote.length, '3번째 비디오 m-line은 보고하지 않는다').toBe(3);
  });

  it('TC-479l [FR-09,FR-12] 같은 역할의 트랙이 새로 오면 이전 트랙을 스트림에서 빼고(교체) 다른 종류 트랙은 유지한다', () => {
    const t = mesh();
    t.addPeer('a', true);
    const pc = last();
    pc.ontrack?.({ track: { kind: 'audio', id: 'au' }, transceiver: tr(pc, 0) });
    pc.ontrack?.({ track: { kind: 'video', id: 'cam1' }, transceiver: tr(pc, 1) });
    pc.ontrack?.({ track: { kind: 'video', id: 'cam2' }, transceiver: tr(pc, 1) });
    expect(events.remote.at(-1)?.stream.tracks.map((x) => x.id).sort(), '이전 카메라 트랙 제거, 마이크 유지').toEqual(['au', 'cam2']);
    pc.ontrack?.({ track: { kind: 'audio', id: 'au2' }, transceiver: tr(pc, 0) });
    expect(events.remote.at(-1)?.stream.tracks.map((x) => x.id).sort(), '새 마이크로 교체, 카메라 유지').toEqual(['au2', 'cam2']);
    pc.ontrack?.({ track: { kind: 'video', id: 's1' }, transceiver: tr(pc, 2) });
    pc.ontrack?.({ track: { kind: 'video', id: 's2' }, transceiver: tr(pc, 2) });
    expect(events.remote.at(-1)?.stream.tracks.map((x) => x.id), '화면 스트림은 항상 최신 1개').toEqual(['s2']);
  });
});

describe('MeshTransport 시그널 송신·상태 보고 (unit-07, FR-07, FR-19)', () => {
  it('TC-479m [FR-07] 로컬 ICE 후보와 협상(offer)은 서버로 보낼 시그널이 되고, 후보 끝(null)은 보내지 않으며, offer·answer 이외 설명은 보내지 않는다', async () => {
    const t = mesh();
    t.addPeer('a', true);
    const pc = last();
    pc.onicecandidate?.({ candidate: { toJSON: () => ({ candidate: 'cand', sdpMid: '0', sdpMLineIndex: 0 }) } });
    pc.onicecandidate?.({ candidate: null });
    expect(events.signal).toEqual([{ to: 'a', msg: { candidate: { candidate: 'cand', sdpMid: '0', sdpMLineIndex: 0 } } }]);
    await pc.onnegotiationneeded?.();
    expect(events.signal.at(-1)).toEqual({ to: 'a', msg: { description: { type: 'offer', sdp: 'sdp' } } });
    const n = events.signal.length;
    pc.localDescription = { type: 'rollback', sdp: '' };
    pc.setLocalDescription = () => Promise.resolve();
    await pc.onnegotiationneeded?.();
    expect(events.signal.length, 'rollback은 보내지 않는다').toBe(n);
  });

  it('TC-479n [FR-20] 협상 중 오류가 나도 예외를 밖으로 내지 않고 makingOffer를 풀어, 이후 상대 offer를 정상 처리한다', async () => {
    const t = mesh('a'); // a < b : 양보하지 않는 쪽
    t.addPeer('b', true);
    const pc = last();
    pc.setLocalDescription = () => Promise.reject(new Error('boom'));
    await expect(pc.onnegotiationneeded?.()).resolves.toBeUndefined();
    await t.handleSignal('b', { description: { type: 'offer', sdp: 'o' } });
    expect(pc.remote.length, '오류 뒤에도 makingOffer가 남아 충돌로 오판하지 않는다').toBe(1);
  });

  it('TC-479o [FR-07] 내가 offer를 만드는 중(makingOffer)에 상대 offer가 오면 양보하지 않는 쪽은 무시하고, 협상이 끝난 뒤의 offer는 받아들인다', async () => {
    const t = mesh('a');
    t.addPeer('b', true);
    const pc = last();
    let release: () => void = () => undefined;
    pc.localDescGate = new Promise<void>((r) => (release = r));
    const negotiating = pc.onnegotiationneeded?.();
    await t.handleSignal('b', { description: { type: 'offer', sdp: 'o1' } }); // signalingState는 아직 stable
    expect(pc.remote.length, '협상 중 도착한 offer는 무시').toBe(0);
    release();
    await negotiating;
    await t.handleSignal('b', { description: { type: 'offer', sdp: 'o2' } });
    expect(pc.remote.length).toBe(1);
  });

  it('TC-479p [FR-07] ICE 후보 시그널은 연결에 전달되고, answer 설명도 그대로 적용된다', async () => {
    const t = mesh();
    t.addPeer('a', true);
    const pc = last();
    const cand = { candidate: 'candidate:1 1 udp 1 1.2.3.4 5 typ host', sdpMid: '0', sdpMLineIndex: 0 };
    await t.handleSignal('a', { candidate: cand });
    expect(pc.candidates).toEqual([cand]);
    await t.handleSignal('a', { description: { type: 'answer', sdp: 'ans' } });
    expect(pc.remote).toEqual([{ type: 'answer', sdp: 'ans' }]);
    expect(events.signal.some((e) => (e.msg as { description?: unknown }).description), 'answer를 받은 쪽은 응답하지 않는다').toBe(false);
  });

  it('TC-479q [FR-19] PeerConnection 상태는 connected·connecting(new 포함)·failed만 보고하고 disconnected·closed는 ICE 경로가 담당하므로 보고하지 않는다', () => {
    const t = mesh();
    t.addPeer('a', false);
    const pc = last();
    for (const s of ['connecting', 'connected', 'new', 'disconnected', 'failed', 'closed']) {
      pc.connectionState = s;
      pc.onconnectionstatechange?.();
    }
    expect(events.state).toEqual([['a', 'connecting'], ['a', 'connected'], ['a', 'connecting'], ['a', 'failed']]);
  });
});

describe('MeshTransport 네트워크 품질 판정 (unit-07, FR-19)', () => {
  const pair = (rtt: number, extra: StatsRow = {}): StatsRow => ({ id: 'P', type: 'candidate-pair', state: 'succeeded', nominated: true, currentRoundTripTime: rtt, ...extra });
  const rtp = (lost: number, received: number): StatsRow => ({ id: `r${lost}-${received}`, type: 'inbound-rtp', packetsLost: lost, packetsReceived: received });
  const peerWith = (t: MeshTransport, id: string, stats: StatsRow[], state = 'connected'): FakePC => {
    t.addPeer(id, false);
    const pc = last();
    pc.stats = stats;
    pc.connectionState = state;
    return pc;
  };

  it('TC-479r [FR-19] 연결이 없으면 good이고, 왕복 지연은 0.4초 초과일 때만 poor다(0.4초는 경계: good)', async () => {
    const t = mesh();
    expect(await t.getQuality()).toBe('good');
    const pc = peerWith(t, 'a', [pair(0.39)]);
    expect(await t.getQuality()).toBe('good');
    pc.stats = [pair(0.4)];
    expect(await t.getQuality(), '경계 0.4').toBe('good');
    pc.stats = [pair(0.41)];
    expect(await t.getQuality()).toBe('poor');
  });

  it('TC-479s [FR-19] 왕복 지연은 선택된(nominated·succeeded) 쌍의 값만 보고, 후보 쌍이 여럿이면 가장 큰 값을 쓴다', async () => {
    const t = mesh();
    const pc = peerWith(t, 'a', [pair(0.9, { nominated: false }), pair(0.9, { state: 'in-progress' }), { id: 'x', type: 'transport', currentRoundTripTime: 0.9 }]);
    expect(await t.getQuality(), '선택되지 않은 쌍은 무시').toBe('good');
    pc.stats = [pair(0.1), pair(0.7, { id: 'P2' })];
    expect(await t.getQuality()).toBe('poor');
  });

  it('TC-479t [FR-19] 패킷 손실은 표본이 200개를 넘고 손실률이 8%를 넘을 때만 poor이며, 여러 수신 스트림은 합산한다', async () => {
    const t = mesh();
    const pc = peerWith(t, 'a', [rtp(50, 100)]);
    expect(await t.getQuality(), '표본 150개(손실 33%)는 판단 보류').toBe('good');
    pc.stats = [rtp(20, 180)];
    expect(await t.getQuality(), '경계: 표본 정확히 200개').toBe('good');
    pc.stats = [rtp(20, 181)];
    expect(await t.getQuality(), '표본 201개, 손실 약 9.9%').toBe('poor');
    pc.stats = [rtp(5, 295)];
    expect(await t.getQuality(), '손실 1.7%').toBe('good');
    pc.stats = [rtp(10, 100), rtp(10, 100)];
    expect(await t.getQuality(), '두 스트림 합산: 표본 220개, 손실 9.1%').toBe('poor');
    pc.stats = [{ id: 'z', type: 'inbound-rtp', packetsLost: 'NaN', packetsReceived: undefined }];
    expect(await t.getQuality(), '숫자가 아닌 값은 무시').toBe('good');
  });

  it('TC-479u [FR-19] 연결되지 않은 상대의 통계는 무시하고, 한 상대의 통계 오류는 다른 상대의 판정을 막지 않으며, 하나라도 나쁘면 poor다', async () => {
    const t = mesh();
    peerWith(t, 'a', [pair(0.9)], 'connecting');
    expect(await t.getQuality(), '연결 중인 상대는 제외').toBe('good');
    const b = peerWith(t, 'b', [], 'connected');
    b.statsError = new Error('stats');
    await expect(t.getQuality()).resolves.toBe('good');
    peerWith(t, 'c', [pair(0.8)], 'connected');
    expect(await t.getQuality(), 'b의 오류에도 c의 불량을 잡는다').toBe('poor');
  });
});

describe('MeshTransport ICE 복구 상한·정리 (unit-07, NFR-03)', () => {
  const ice = (pc: FakePC, s: string): void => {
    pc.iceConnectionState = s;
    pc.oniceconnectionstatechange?.();
  };

  it('TC-479v [NFR-03] failed 재시작은 3회로 제한되지만 연결이 한 번 복구되면 횟수가 초기화되고, disconnected의 4초 재시작은 상한과 무관하다', async () => {
    const t = mesh();
    t.addPeer('a', false);
    const pc = last();
    for (let i = 0; i < 5; i++) ice(pc, 'failed');
    expect(pc.restarts).toBe(3);
    ice(pc, 'connected');
    ice(pc, 'failed');
    expect(pc.restarts, '복구 후 다시 시도 가능').toBe(4);
    ice(pc, 'failed');
    ice(pc, 'failed');
    ice(pc, 'failed');
    expect(pc.restarts).toBe(6);
    ice(pc, 'disconnected');
    await vi.advanceTimersByTimeAsync(4100);
    expect(pc.restarts, '상한을 넘은 뒤에도 disconnected 복구 시도는 1회 한다').toBe(7);
  });

  it('TC-479w [NFR-03] 연결을 제거하면 대기 중이던 재시작 타이머도 사라지고 제거된 연결을 다시 건드리지 않는다', async () => {
    const t = mesh();
    t.addPeer('a', false);
    const pc = last();
    ice(pc, 'disconnected');
    expect(vi.getTimerCount()).toBe(1);
    t.removePeer('a');
    expect(vi.getTimerCount(), '타이머 누수 없음').toBe(0);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(pc.restarts).toBe(0);
  });
});

describe('MeshTransport 송신 품질 재적용 (unit-07, NFR-13)', () => {
  it('TC-479x [NFR-13] 협상이 끝나 안정(stable) 상태가 될 때마다 카메라·화면 송신 파라미터를 다시 적용하고, 안정이 아닐 때는 적용하지 않는다', async () => {
    const t = mesh();
    t.addPeer('a', true);
    t.applyQuality(5);
    const pc = last();
    await flush();
    tr(pc, 1).sender.params = {};
    tr(pc, 2).sender.params = {};
    pc.signalingState = 'have-local-offer';
    pc.onsignalingstatechange?.();
    await flush();
    expect(tr(pc, 1).sender.params.encodings, '협상 중에는 건드리지 않는다').toBeUndefined();
    pc.signalingState = 'stable';
    pc.onsignalingstatechange?.();
    await flush();
    expect(tr(pc, 1).sender.params.encodings?.[0]).toMatchObject({ maxBitrate: 400_000, scaleResolutionDownBy: 2 });
    expect(tr(pc, 2).sender.params.encodings?.[0]).toMatchObject({ maxBitrate: 1_500_000, scaleResolutionDownBy: 1 });
  });

  it('TC-479y [NFR-13] 카메라 트랙을 바꾸면 현재 인원 기준 송신 상한을 다시 적용한다', async () => {
    const t = mesh();
    t.addPeer('a', true);
    t.applyQuality(6);
    const pc = last();
    await flush();
    tr(pc, 1).sender.params = {};
    await t.setVideoTrack({ kind: 'video' } as unknown as MediaStreamTrack);
    await flush();
    expect(tr(pc, 1).sender.params.encodings?.[0]).toMatchObject({ maxBitrate: 400_000, scaleResolutionDownBy: 2 });
  });

  it('TC-479z [SEC-09] ICE 서버 변환은 값이 없는 username·credential 키를 만들지 않는다(빈 문자열 포함, 엄격 비교)', () => {
    const t = new MeshTransport('m', mkEvents());
    t.start([{ urls: ['stun:x'] }, { urls: ['turn:t'], username: 'u', credential: 'c' }, { urls: ['turn:u'], username: '', credential: '' }]);
    t.addPeer('a', false);
    expect((last().config as { iceServers: unknown[] }).iceServers).toStrictEqual([{ urls: ['stun:x'] }, { urls: ['turn:t'], username: 'u', credential: 'c' }, { urls: ['turn:u'] }]);
  });

  it('TC-479aa [FR-07] 응답하는 쪽은 첫 offer에서만 m-line을 송신 겸용으로 묶고, 재협상 offer에서는 트랙을 다시 붙이지 않는다', async () => {
    const t = mesh('z');
    await t.setAudioTrack({ kind: 'audio' } as unknown as MediaStreamTrack);
    const orig = FakePC.prototype.setRemoteDescription;
    FakePC.prototype.setRemoteDescription = function (this: FakePC, d: unknown) {
      if (this.transceivers.length === 0) {
        this.addTransceiver('audio', { direction: 'recvonly' });
        this.addTransceiver('video', { direction: 'recvonly' });
        this.addTransceiver('video', { direction: 'recvonly' });
      }
      this.signalingState = 'have-remote-offer';
      return orig.call(this, d);
    };
    try {
      await t.handleSignal('x', { description: { type: 'offer', sdp: 'o1' } });
      const pc = last();
      const attached = tr(pc, 0).sender.tracks.length;
      expect(attached).toBe(1);
      pc.signalingState = 'stable';
      await t.handleSignal('x', { description: { type: 'offer', sdp: 'o2' } });
      expect(tr(pc, 0).sender.tracks.length, '재협상에서 중복으로 붙이지 않는다').toBe(attached);
      expect(events.signal.length, '두 번 모두 answer로 응답').toBe(2);
    } finally {
      FakePC.prototype.setRemoteDescription = orig;
    }
  });

  it('TC-479ab [FR-07,FR-08] 이미 켜 둔 마이크·카메라·화면 트랙은 나중에 연결되는 상대(offer를 만드는 쪽)에게도 처음부터 붙고, 없는 트랙은 비워 둔다', async () => {
    const t = mesh();
    const a = { kind: 'audio' } as unknown as MediaStreamTrack;
    const v = { kind: 'video' } as unknown as MediaStreamTrack;
    await t.setAudioTrack(a);
    await t.setVideoTrack(v);
    t.addPeer('late', true);
    const pc = last();
    expect(tr(pc, 0).sender.tracks).toEqual([a]);
    expect(tr(pc, 1).sender.tracks).toEqual([v]);
    expect(tr(pc, 2).sender.tracks, '화면은 아직 없음(null로 비움)').toEqual([null]);
  });

  it('TC-479ac [NFR-03] ICE가 completed가 되어도 connected와 같이 보고하고 재시작 횟수를 초기화한다', () => {
    const t = mesh();
    t.addPeer('a', false);
    const pc = last();
    pc.iceConnectionState = 'failed';
    for (let i = 0; i < 3; i++) pc.oniceconnectionstatechange?.();
    expect(pc.restarts).toBe(3);
    pc.iceConnectionState = 'completed';
    pc.oniceconnectionstatechange?.();
    expect(events.state.at(-1)).toEqual(['a', 'connected']);
    pc.iceConnectionState = 'failed';
    pc.oniceconnectionstatechange?.();
    expect(pc.restarts, 'completed도 복구로 보고 횟수를 초기화').toBe(4);
  });
});

describe('MeshTransport 2차 변이 보강 (unit-07)', () => {
  it('TC-479ad [NFR-13] 송신 파라미터는 setParameters로 실제 적용되고(복사본 기준), 3~4명은 700kbps·1.5배 축소다', async () => {
    const t = mesh();
    t.addPeer('a', true);
    const pc = last();
    await flush();
    for (const i of [1, 2]) {
      const snd = tr(pc, i).sender;
      snd.params = {};
      snd.getParameters = () => JSON.parse(JSON.stringify(snd.params)) as Params; // 실제 브라우저처럼 복사본을 돌려준다
    }
    t.applyQuality(3);
    await flush();
    expect(tr(pc, 1).sender.params.encodings?.[0]).toEqual({ maxBitrate: 700_000, scaleResolutionDownBy: 1.5 });
    t.applyQuality(4);
    await flush();
    expect(tr(pc, 1).sender.params.encodings?.[0], '경계 4명').toEqual({ maxBitrate: 700_000, scaleResolutionDownBy: 1.5 });
    t.applyQuality(2);
    await flush();
    expect(tr(pc, 1).sender.params.encodings?.[0]).toEqual({ maxBitrate: 1_500_000, scaleResolutionDownBy: 1 });
  });

  it('TC-479ae [FR-22] removePeer는 모든 콜백을 떼고, 같은 ID로 다시 연결을 만들 수 있으며, 없는 ID는 조용히 무시한다', () => {
    const t = mesh();
    expect(() => t.removePeer('nobody')).not.toThrow();
    t.addPeer('a', true);
    const pc = last();
    t.removePeer('a');
    expect([pc.onnegotiationneeded, pc.onicecandidate, pc.ontrack, pc.oniceconnectionstatechange, pc.onconnectionstatechange, pc.onsignalingstatechange]).toEqual([null, null, null, null, null, null]);
    const n = pcs.length;
    t.addPeer('a', true);
    expect(pcs.length, '제거 뒤 같은 ID로 새 연결').toBe(n + 1);
  });

  it('TC-479af [FR-07] 응답하는 쪽은 offer에 m-line 3개가 갖춰지지 않으면 송신 겸용으로 바꾸지 않고, 내가 offer를 보낸 상태에서 받은 answer는 양보하지 않는 쪽도 적용한다', async () => {
    const t = mesh('z');
    const orig = FakePC.prototype.setRemoteDescription;
    FakePC.prototype.setRemoteDescription = function (this: FakePC, d: unknown) {
      if (this.transceivers.length === 0) this.addTransceiver('audio', { direction: 'recvonly' }); // 오디오 m-line만 있는 불완전 offer
      this.signalingState = 'have-remote-offer';
      return orig.call(this, d);
    };
    try {
      await t.handleSignal('x', { description: { type: 'offer', sdp: 'o' } });
      expect(tr(last(), 0).direction).toBe('recvonly');
    } finally {
      FakePC.prototype.setRemoteDescription = orig;
    }
    const impolite = mesh('a'); // 'a' < 'b' : 양보하지 않는 쪽
    impolite.addPeer('b', true);
    const pc = last();
    pc.signalingState = 'have-local-offer';
    await impolite.handleSignal('b', { description: { type: 'answer', sdp: 'ans' } });
    expect(pc.remote, 'offer를 보낸 상태에서 받은 answer는 충돌이 아니다').toEqual([{ type: 'answer', sdp: 'ans' }]);
  });

  it('TC-479ag [FR-19] 후보 쌍이 여럿일 때 가장 큰 왕복 지연이 앞에 있어도 poor로 판정한다', async () => {
    const t = mesh();
    t.addPeer('a', false);
    const pc = last();
    pc.connectionState = 'connected';
    const pair = (id: string, rtt: number): StatsRow => ({ id, type: 'candidate-pair', state: 'succeeded', nominated: true, currentRoundTripTime: rtt });
    pc.stats = [pair('P1', 0.7), pair('P2', 0.1)];
    expect(await t.getQuality()).toBe('poor');
  });
});
