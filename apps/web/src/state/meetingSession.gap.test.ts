import type { PublicParticipant } from '@meetlite/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalMedia } from '../lib/media';
import { S } from '../strings';

// 소급 6단계(unit-06) 변이 시험으로 찾은 빈틈 보강: 복귀(UX-14) 경로, 신호 중계, 종료·정리, 토큰 비노출.
type Handler = (...args: unknown[]) => void;
interface Req {
  event: string;
  payload: Record<string, unknown>;
  timeoutMs: number | undefined;
}

const h = vi.hoisted(() => {
  const state = {
    responses: {} as Record<string, unknown>,
    requests: [] as { event: string; payload: Record<string, unknown>; timeoutMs: number | undefined }[],
    transports: [] as FakeTransport[],
    socket: null as FakeSocket | null,
    closed: 0,
    quality: 'good' as 'good' | 'poor',
  };
  class FakeSocket {
    handlers = new Map<string, Handler[]>();
    connected = true;
    active = true;
    connectCalls = 0;
    disconnectCalls = 0;
    on(e: string, fn: Handler): this {
      this.handlers.set(e, [...(this.handlers.get(e) ?? []), fn]);
      return this;
    }
    fire(e: string, ...a: unknown[]): void {
      for (const fn of this.handlers.get(e) ?? []) fn(...a);
    }
    connect(): void {
      this.connectCalls++;
    }
    disconnect(): void {
      this.disconnectCalls++;
      this.connected = false;
      this.fire('disconnect'); // 실제 소켓처럼 disconnect()가 동기로 disconnect 이벤트를 낸다
    }
  }
  class FakeTransport {
    added: { id: string; initiate: boolean }[] = [];
    removed: string[] = [];
    signals: { from: string; msg: Record<string, unknown> }[] = [];
    quality: number[] = [];
    qualityPolls = 0;
    iceRestarts = 0;
    closed = false;
    audio: unknown = 'unset';
    video: unknown = 'unset';
    constructor(
      public selfId: string,
      public events: Record<string, (...a: unknown[]) => void>,
    ) {
      state.transports.push(this);
    }
    start(): void {}
    addPeer(id: string, initiate: boolean): void {
      this.added.push({ id, initiate });
    }
    removePeer(id: string): void {
      this.removed.push(id);
    }
    handleSignal(from: string, msg: Record<string, unknown>): Promise<void> {
      this.signals.push({ from, msg });
      return Promise.resolve();
    }
    setAudioTrack(t: unknown): Promise<void> {
      this.audio = t;
      return Promise.resolve();
    }
    setVideoTrack(t: unknown): Promise<void> {
      this.video = t;
      return Promise.resolve();
    }
    setScreenTrack(): Promise<void> {
      return Promise.resolve();
    }
    restartIce(): void {
      this.iceRestarts++;
    }
    applyQuality(n: number): void {
      this.quality.push(n);
    }
    getQuality(): Promise<'good' | 'poor'> {
      this.qualityPolls++;
      return Promise.resolve(state.quality);
    }
    close(): void {
      this.closed = true;
    }
  }
  return { state, FakeSocket, FakeTransport };
});

vi.mock('../lib/signaling', () => ({
  SignalingClient: class {
    socket: InstanceType<typeof h.FakeSocket>;
    constructor() {
      this.socket = new h.FakeSocket();
      h.state.socket = this.socket;
    }
    connect(): Promise<void> {
      return Promise.resolve();
    }
    request(event: string, payload: Record<string, unknown>, timeoutMs?: number): Promise<unknown> {
      h.state.requests.push({ event, payload, timeoutMs });
      const r = h.state.responses[event];
      return Promise.resolve(typeof r === 'function' ? (r as (p: unknown) => unknown)(payload) : (r ?? { ok: true }));
    }
    close(): void {
      h.state.closed++;
    }
  },
}));
vi.mock('../media/MeshTransport', () => ({ MeshTransport: h.FakeTransport }));

import { MeetingController } from './MeetingController';

const TOKEN = 'TOKEN-SECRET-XYZ-789';
const person = (id: string, joinSeq: number): PublicParticipant => ({ id, nickname: `사람${joinSeq}`, isHost: joinSeq === 1, audio: true, video: true, screen: false, connection: 'connected', joinSeq });
const joinOk = (): Record<string, unknown> => ({ ok: true, v: 1, token: TOKEN, selfId: 'me', hostId: 'host', locked: false, participants: [person('host', 1), person('me', 2)], iceServers: [], config: { maxParticipants: 6, reconnectGraceSec: 20 } });
const media = (over: Record<string, unknown> = {}): LocalMedia => {
  const m = { audio: { id: 'a' }, video: { id: 'v' }, micOn: true, camOn: true, setMic: vi.fn(), stopAll: vi.fn(), reconcile: () => ({ audioLost: false, videoLost: false }), ...over };
  return m as unknown as LocalMedia;
};
const sent = (event: string): Req[] => h.state.requests.filter((r) => r.event === event);
const sock = (): InstanceType<typeof h.FakeSocket> => {
  if (!h.state.socket) throw new Error('no socket');
  return h.state.socket;
};
const transport = (): InstanceType<typeof h.FakeTransport> => {
  const t = h.state.transports.at(-1);
  if (!t) throw new Error('no transport');
  return t;
};
const flush = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0);
};
const deferred = <T>(): { promise: Promise<T>; resolve: (v: T) => void } => {
  let resolve: (v: T) => void = () => undefined;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
};
const resumeOk = { ok: true, v: 1, hostId: 'host', locked: false, participants: [person('host', 1), person('me', 2)] };

async function joined(m: LocalMedia = media()): Promise<MeetingController> {
  h.state.responses['room:join'] = joinOk();
  const c = new MeetingController();
  expect(await c.join({ roomId: 'R'.repeat(22), nickname: '민지', media: m })).toEqual({ ok: true });
  return c;
}

beforeEach(() => {
  vi.useFakeTimers();
  h.state.responses = { 'room:resume': resumeOk };
  h.state.requests = [];
  h.state.transports = [];
  h.state.socket = null;
  h.state.closed = 0;
  h.state.quality = 'good';
});
afterEach(() => vi.useRealTimers());

describe('입장 요청 모양 (unit-06 보강, FR-01, SEC-03)', () => {
  it('TC-500 [FR-01,FR-03] 입장 요청은 비밀번호·호스트 클레임이 없으면 키 자체를 보내지 않고, 있을 때만 정확히 그 키를 보낸다', async () => {
    await joined();
    expect(Object.keys(sent('room:join')[0]?.payload ?? {}).sort()).toEqual(['nickname', 'roomId', 'v']);
    h.state.responses['room:join'] = joinOk();
    const c = new MeetingController();
    await c.join({ roomId: 'R'.repeat(22), nickname: 'x', password: '', hostClaim: '', media: media() });
    expect(Object.keys(sent('room:join')[1]?.payload ?? {}).sort()).toEqual(['nickname', 'roomId', 'v']);
    expect(transport().quality[0]).toBe(2); // 입장 직후 인원 수로 화질을 맞춘다(NFR-04)
  });

  it('TC-501 [SEC-03,SEC-06] 세션 토큰은 room:resume 외의 어떤 요청에도 실리지 않는다(입장·미디어·채팅·호스트·공유·신호 전체)', async () => {
    const c = await joined();
    await c.sendChat('hi');
    await c.setLocked(true);
    await c.muteAll();
    c.toggleMic();
    transport().events.signal?.('host', { description: { type: 'offer', sdp: 'v=0' } });
    sock().fire('disconnect');
    sock().fire('connect');
    await flush();
    for (const r of h.state.requests) {
      if (r.event === 'room:resume') expect(r.payload).toEqual({ v: 1, token: TOKEN });
      else expect(JSON.stringify(r.payload), r.event).not.toContain(TOKEN);
    }
    expect(sent('room:resume').length).toBe(1);
  });
});

describe('화면 복귀 능동 확인 (unit-06 보강, UX-14, FR-20)', () => {
  it('TC-502 [UX-14] 복귀 시 연결된 소켓은 3초 프로브(media:state, 현재 마이크·카메라 상태)로 확인하고, 응답이 오면 아무것도 건드리지 않는다', async () => {
    const c = await joined(media({ micOn: false }));
    h.state.requests.length = 0;
    await c.onForeground('visibility');
    const probes = sent('media:state');
    expect(probes.length).toBe(1);
    expect(probes[0]?.timeoutMs).toBe(3000);
    expect(probes[0]?.payload).toEqual({ v: 1, audio: false, video: true });
    expect(sock().disconnectCalls).toBe(0);
    expect(sock().connectCalls).toBe(0);
    expect(c.getSnapshot().status).toBe('live');
    expect(transport().iceRestarts).toBe(0);
  });

  it('TC-502b [UX-14,FR-20] 프로브가 시간 초과(NETWORK)면 소켓을 끊고 다시 연결해 끊김 경로에 합류하고(원인 foreground), 재연결되면 토큰으로 resume하며 원인은 network로 돌아간다', async () => {
    const c = await joined();
    h.state.responses['media:state'] = { ok: false, code: 'NETWORK', message: 'timeout' };
    await c.onForeground('pageshow');
    expect(sock().disconnectCalls).toBe(1);
    expect(sock().connectCalls).toBe(1);
    expect(c.getSnapshot().status).toBe('reconnecting');
    expect(c.getSnapshot().reconnectCause).toBe('foreground');
    h.state.responses['media:state'] = { ok: true };
    sock().connected = true;
    sock().fire('connect');
    await flush();
    expect(sent('room:resume')[0]?.payload).toEqual({ v: 1, token: TOKEN });
    expect(c.getSnapshot().status).toBe('live');
    expect(c.getSnapshot().reconnectCause).toBe('network');
    expect(transport().iceRestarts).toBe(1);
  });

  it('TC-502c [UX-14] 프로브 오류 코드 매핑: NOT_JOINED는 즉시 resume(끊김 상태로 전환·원인 foreground), PARTICIPANT_GONE은 소켓 재연결, 그 밖의 서버 오류는 연결이 살아 있는 것으로 보고 무동작이다', async () => {
    // NOT_JOINED -> resumeNow
    let c = await joined();
    const gate = deferred<unknown>();
    h.state.responses['media:state'] = { ok: false, code: 'NOT_JOINED', message: 'x' };
    h.state.responses['room:resume'] = () => gate.promise;
    await c.onForeground('visibility');
    expect(c.getSnapshot().status).toBe('reconnecting');
    expect(c.getSnapshot().reconnectCause).toBe('foreground');
    expect(sent('room:resume').length).toBe(1);
    expect(sock().disconnectCalls).toBe(0);
    gate.resolve(resumeOk);
    await flush();
    expect(c.getSnapshot().status).toBe('live');
    // PARTICIPANT_GONE -> kickSocket
    h.state.requests.length = 0;
    h.state.responses['room:resume'] = resumeOk;
    c = await joined();
    h.state.responses['media:state'] = { ok: false, code: 'PARTICIPANT_GONE', message: 'x' };
    await c.onForeground('visibility');
    expect(sock().disconnectCalls).toBe(1);
    expect(sock().connectCalls).toBe(1);
    // 그 밖의 오류 -> 무동작
    c = await joined();
    h.state.responses['media:state'] = { ok: false, code: 'RATE_LIMITED', message: 'x' };
    await c.onForeground('visibility');
    expect(sock().disconnectCalls).toBe(0);
    expect(sock().connectCalls).toBe(0);
    expect(c.getSnapshot().status).toBe('live');
  });

  it('TC-502d [UX-14] 프로브가 정상이어도 실패·끊김 피어가 있으면 ICE를 다시 시작하고, 모두 정상이면 하지 않는다', async () => {
    const c = await joined();
    transport().events.remoteStream?.('host', 'camera', { fake: true });
    await c.onForeground('visibility');
    expect(transport().iceRestarts).toBe(0);
    transport().events.peerState?.('host', 'failed');
    expect(c.getSnapshot().remote.host?.state).toBe('failed');
    await c.onForeground('visibility');
    expect(transport().iceRestarts).toBe(1);
  });

  it('TC-502e [UX-14] 이미 확인 중이면 중복 복귀 신호는 무시하고(프로브 1회), 확인 중 회의가 끝나면 늦은 결과로 소켓을 건드리지 않으며, 끝난 회의·미입장은 아무것도 보내지 않는다', async () => {
    const idle = new MeetingController();
    await idle.onForeground('visibility');
    expect(h.state.requests.length).toBe(0);
    const c = await joined();
    h.state.requests.length = 0;
    const gate = deferred<unknown>();
    h.state.responses['media:state'] = () => gate.promise;
    const first = c.onForeground('visibility');
    const second = c.onForeground('pageshow');
    await second;
    expect(sent('media:state').length).toBe(1);
    c.end('left');
    gate.resolve({ ok: false, code: 'NETWORK', message: 'timeout' });
    await first;
    expect(sock().disconnectCalls).toBe(0);
    expect(sock().connectCalls).toBe(0);
    expect(c.getSnapshot().status).toBe('ended');
    h.state.requests.length = 0;
    await c.onForeground('visibility');
    expect(h.state.requests.length).toBe(0);
    // 끝난 뒤 새 확인이 가능해야 한다(busy 플래그가 풀린다)
    const c2 = await joined();
    h.state.responses['media:state'] = { ok: true };
    h.state.requests.length = 0;
    await c2.onForeground('visibility');
    await c2.onForeground('visibility');
    expect(sent('media:state').length).toBe(2);
  });

  it('TC-502g [UX-14] 확인 중 회의가 끝나면 늦은 프로브 결과로 미디어 정합(reconcile)도 실행하지 않는다', async () => {
    const reconcile = vi.fn(() => ({ audioLost: true, videoLost: false }));
    const c = await joined(media({ reconcile }));
    const gate = deferred<unknown>();
    h.state.responses['media:state'] = () => gate.promise;
    const pending = c.onForeground('visibility');
    c.end('left');
    gate.resolve({ ok: true });
    await pending;
    expect(reconcile).not.toHaveBeenCalled();
    expect(c.getSnapshot().toasts.length).toBe(0);
  });

  it('TC-502f [UX-14] 끊김(reconnecting) 중 복귀: 소켓이 끊겨 있으면 즉시 다시 연결하고(원인 foreground), 연결돼 있으면 바로 resume한다', async () => {
    const c = await joined();
    sock().fire('disconnect');
    sock().connected = false;
    await c.onForeground('visibility');
    expect(sock().connectCalls).toBe(1);
    expect(c.getSnapshot().reconnectCause).toBe('foreground');
    expect(sent('room:resume').length).toBe(0);
    sock().connected = true;
    await c.onForeground('visibility');
    expect(sent('room:resume').length).toBe(1);
  });

  it('TC-519 [FR-20] 복귀로 먼저 복구돼 live가 되면 남은 재연결 타이머는 소켓을 다시 연결하지 않고 스스로 멈춘다', async () => {
    const c = await joined();
    sock().fire('disconnect'); // 재연결 타이머 시작(소켓은 연결된 것으로 보임)
    expect(c.getSnapshot().status).toBe('reconnecting');
    await c.onForeground('visibility'); // connect 이벤트 없이 resume으로 live 복귀
    expect(c.getSnapshot().status).toBe('live');
    const timersBefore = vi.getTimerCount();
    sock().connected = false;
    sock().active = false;
    await vi.advanceTimersByTimeAsync(1500);
    expect(sock().connectCalls).toBe(0);
    expect(vi.getTimerCount()).toBe(timersBefore - 1);
  });

  it('TC-503 [UX-14,FR-04] 복귀 시 미디어 정합: 켜져 있던 마이크를 잃으면 끄고 서버에 알리며 안내하고, 이미 꺼진 마이크 손실은 안내하지 않으며, 카메라 트랙이 사라졌으면 잃은 것으로 본다', async () => {
    const lostMic = media({ reconcile: () => ({ audioLost: true, videoLost: false }) });
    const c = await joined(lostMic);
    h.state.requests.length = 0;
    await c.onForeground('visibility');
    expect(c.getSnapshot().micOn).toBe(false);
    expect(transport().audio).toBeNull();
    expect(sent('media:state').some((r) => r.payload.audio === false)).toBe(true);
    expect(c.getSnapshot().toasts.at(-1)).toMatchObject({ text: S.background.mediaLost('mic'), kind: 'warn' });
    // 이미 꺼진 마이크는 손실로 안내하지 않는다
    const offMic = media({ micOn: false, reconcile: () => ({ audioLost: true, videoLost: false }) });
    const c2 = await joined(offMic);
    await c2.onForeground('visibility');
    expect(c2.getSnapshot().toasts.length).toBe(0);
    // 카메라: reconcile이 못 봐도 켜져야 하는데 트랙이 없으면 손실
    const m3 = media();
    const c3 = await joined(m3);
    (m3 as unknown as { video: unknown }).video = null;
    await c3.onForeground('visibility');
    expect(c3.getSnapshot().camOn).toBe(false);
    expect(transport().video).toBeNull();
    expect(c3.getSnapshot().toasts.at(-1)?.text).toBe(S.background.mediaLost('camera'));
    // 둘 다
    const m4 = media({ reconcile: () => ({ audioLost: true, videoLost: true }) });
    const c4 = await joined(m4);
    await c4.onForeground('visibility');
    expect(c4.getSnapshot().toasts.at(-1)?.text).toBe(S.background.mediaLost('both'));
  });
});

describe('신호·계측 중계 (unit-06 보강, FR-07, NFR-15, SEC-06)', () => {
  it('TC-504 [FR-07,SEC-06] 내보내는 신호는 v:1과 수신자를 붙여 signal:send로 보내고, 받은 신호는 보낸 이(서버 부여 from)와 있는 필드만 전송 계층에 전달한다', async () => {
    await joined();
    transport().events.signal?.('host', { description: { type: 'offer', sdp: 'v=0' } });
    expect(sent('signal:send')[0]?.payload).toEqual({ v: 1, to: 'host', description: { type: 'offer', sdp: 'v=0' } });
    sock().fire('signal:recv', { v: 1, from: 'host', description: { type: 'answer', sdp: 'v=0' } });
    sock().fire('signal:recv', { v: 1, from: 'host', candidate: { candidate: 'c1' } });
    expect(transport().signals).toEqual([
      { from: 'host', msg: { description: { type: 'answer', sdp: 'v=0' } } },
      { from: 'host', msg: { candidate: { candidate: 'c1' } } },
    ]);
  });

  it('TC-504b [NFR-15,SEC-06] 연결 경로 계측은 피어 식별자 없이 경로 종류만 3초 제한으로 보낸다', async () => {
    await joined();
    transport().events.pathType?.('peer-secret-id', 'relay');
    const r = sent('metrics:path')[0];
    expect(r?.payload).toStrictEqual({ v: 1, path: 'relay' });
    expect(r?.timeoutMs).toBe(3000);
    expect(JSON.stringify(r)).not.toContain('peer-secret-id');
  });

  it('TC-504c [FR-19] 피어 연결 상태는 알려진 피어이고 값이 바뀔 때만 상태를 갱신한다(모르는 피어 무시, 같은 값 재렌더 없음)', async () => {
    const c = await joined();
    let renders = 0;
    c.subscribe(() => renders++);
    transport().events.peerState?.('ghost', 'failed');
    expect(c.getSnapshot().remote.ghost).toBeUndefined();
    transport().events.remoteStream?.('host', 'camera', { fake: true });
    const base = renders;
    transport().events.peerState?.('host', 'connecting'); // 스트림 수신 시 기본값 connecting과 같다
    expect(renders).toBe(base);
    transport().events.peerState?.('host', 'connected');
    expect(renders).toBe(base + 1);
    expect(c.getSnapshot().remote.host?.state).toBe('connected');
  });
});

describe('재연결 경계·종료 정리 (unit-06 보강, FR-20, FR-22, SEC-03)', () => {
  it('TC-505 [FR-20] 연결 중인 정상 상태에서 connect 이벤트가 와도 resume을 보내지 않고, resume 응답을 기다리는 사이 회의가 끝나면 늦은 성공이 상태를 되살리지 않는다', async () => {
    const c = await joined();
    sock().fire('connect');
    await flush();
    expect(sent('room:resume').length).toBe(0);
    const gate = deferred<unknown>();
    h.state.responses['room:resume'] = () => gate.promise;
    sock().fire('disconnect');
    sock().fire('connect');
    c.end('kicked');
    gate.resolve(resumeOk);
    await flush();
    expect(c.getSnapshot().status).toBe('ended');
    expect(c.getSnapshot().endReason).toBe('kicked');
    expect(transport().iceRestarts).toBe(0);
    expect(c.getSnapshot().toasts.some((t) => t.text === S.room.reconnected)).toBe(false);
  });

  it('TC-505b [FR-22] 나가기 응답을 기다리는 동안 소켓이 끊겨도 재연결을 시작하지 않는다', async () => {
    const c = await joined();
    const gate = deferred<unknown>();
    h.state.responses['room:leave'] = () => gate.promise;
    const p = c.leave();
    sock().fire('disconnect');
    expect(c.getSnapshot().status).toBe('live');
    await vi.advanceTimersByTimeAsync(5000);
    expect(sock().connectCalls).toBe(0);
    gate.resolve({ ok: true });
    await p;
    expect(c.getSnapshot().endReason).toBe('left');
  });

  it('TC-506 [FR-22,NFR-03] end 이후에는 품질 측정 타이머가 멈추고, dispose는 진행 중 회의를 left로 끝내며 구독을 모두 끊고 두 번 불러도 안전하다', async () => {
    const c = await joined();
    await vi.advanceTimersByTimeAsync(3000);
    const polls = transport().qualityPolls;
    expect(polls).toBeGreaterThan(0);
    const t = transport();
    let calls = 0;
    c.subscribe(() => calls++);
    c.dispose();
    expect(c.getSnapshot().status).toBe('ended');
    expect(c.getSnapshot().endReason).toBe('left');
    expect(t.closed).toBe(true);
    expect(vi.getTimerCount(), '품질 측정·재연결 타이머가 남지 않는다').toBe(0);
    const afterDispose = calls;
    await vi.advanceTimersByTimeAsync(20_000);
    expect(t.qualityPolls).toBe(polls);
    c.toast('늦은 알림'); // 구독이 정리됐으므로 리스너는 호출되지 않는다
    expect(calls).toBe(afterDispose);
    expect(() => c.dispose()).not.toThrow();
    const never = new MeetingController();
    never.dispose();
    expect(never.getSnapshot().endReason).toBe('left');
  });
});

describe('로컬 미디어 조작 보강 (unit-06 보강, FR-04, FR-08)', () => {
  it('TC-507 [FR-04] 카메라 켜기는 장치 열기가 성공해도 트랙이 없으면 켜짐으로 표시하지 않고, 성공하면 전송 계층에 새 트랙을 넘기고 서버에 알린다', async () => {
    const noTrack = media({ camOn: false, video: null, setCamera: vi.fn(() => Promise.resolve(true)) });
    const c = await joined(noTrack);
    expect(c.getSnapshot().camOn).toBe(false);
    await c.toggleCamera();
    expect(c.getSnapshot().camOn).toBe(false);
    const track = { id: 'newcam' };
    const m2 = media({ camOn: false, video: null });
    (m2 as unknown as { setCamera: (on: boolean) => Promise<boolean> }).setCamera = (on) => {
      (m2 as unknown as { video: unknown }).video = on ? track : null;
      return Promise.resolve(true);
    };
    const c2 = await joined(m2);
    h.state.requests.length = 0;
    await c2.toggleCamera();
    expect(c2.getSnapshot().camOn).toBe(true);
    expect(transport().video).toBe(track);
    expect(sent('media:state').at(-1)?.payload).toEqual({ v: 1, audio: true, video: true });
  });

  it('TC-507b [FR-04,UX-03] 장치 전환은 종류에 맞는 전송 트랙만 교체하고, 실패하면 안내만 하고 트랙을 바꾸지 않는다', async () => {
    const aTrack = { id: 'a2' };
    const vTrack = { id: 'v2' };
    const m = media({ switchDevice: vi.fn((kind: string) => Promise.resolve(kind !== 'bad')), audio: aTrack, video: vTrack });
    const c = await joined(m);
    const t = transport();
    t.audio = 'untouched';
    t.video = 'untouched';
    await c.switchDevice('audio', 'dev1');
    expect(t.audio).toBe(aTrack);
    expect(t.video).toBe('untouched');
    await c.switchDevice('video', 'dev2');
    expect(t.video).toBe(vTrack);
    const failing = media({ switchDevice: vi.fn(() => Promise.resolve(false)) });
    const c2 = await joined(failing);
    const t2 = transport();
    t2.audio = 'untouched';
    await c2.switchDevice('audio', 'dev3');
    expect(t2.audio).toBe('untouched');
    expect(c2.getSnapshot().toasts.at(-1)).toMatchObject({ text: S.room.deviceChangeFailed, kind: 'warn' });
  });
});

describe('결함 재현·수정 (unit-06 소급 6단계, DEF-06-01 수정됨)', () => {
  // 소켓은 이미 연결됐는데 room:resume 응답만 시간 초과(NETWORK)·속도 제한이면, 코드 주석은 "다음 connect에서 다시 시도"라 하지만
  // 소켓이 계속 연결돼 있으면 다음 connect 이벤트가 오지 않아 재시도가 없다 → 화면이 "재연결 중"에 머무르고 서버 유예 시간이 지나 자리를 잃는다.
  // 수정 완료: 일시 오류 뒤 2초 간격으로 소켓이 연결돼 있는 동안 resume을 다시 시도한다.
  it('TC-518 [FR-20,FR-21] resume 응답이 일시 오류(NETWORK)로 끝나도 소켓이 연결돼 있으면 일정 시간 안에 resume을 다시 시도해야 한다(DEF-06-01)', async () => {
    const c = await joined();
    sock().fire('disconnect');
    sock().connected = true;
    h.state.responses['room:resume'] = { ok: false, code: 'NETWORK', message: 'timeout' };
    sock().fire('connect');
    await flush();
    expect(c.getSnapshot().status).toBe('reconnecting');
    await vi.advanceTimersByTimeAsync(15_000); // 서버 유예 시간(기본 20초) 안에 재시도가 있어야 한다
    expect(sent('room:resume').length).toBeGreaterThan(1);
  });

  it('TC-518b [FR-20] (현재 동작 기록) 일시 오류 뒤 새 connect 이벤트가 오면 다시 resume한다', async () => {
    const c = await joined();
    sock().fire('disconnect');
    h.state.responses['room:resume'] = { ok: false, code: 'NETWORK', message: 'timeout' };
    sock().fire('connect');
    await flush();
    h.state.responses['room:resume'] = resumeOk;
    sock().fire('connect');
    await flush();
    expect(sent('room:resume').length).toBe(2);
    expect(c.getSnapshot().status).toBe('live');
  });
});


describe('화면공유·정리·채팅 읽음 경계 (unit-06 보강, 2차 변이 시험 생존분)', () => {
  const desktop = (track: object): void => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130', maxTouchPoints: 0, mediaDevices: { getDisplayMedia: vi.fn(() => Promise.resolve({ getVideoTracks: () => [track] })) } });
  };
  afterEach(() => vi.unstubAllGlobals());

  it('TC-520 [FR-12,POL-12] 공유 중인 사람이 나 자신뿐이면 "다른 사람이 공유 중" 안내 없이 화면 선택을 진행한다', async () => {
    desktop({ stop: vi.fn(), onended: null });
    const c = await joined();
    sock().fire('room:participantUpdated', { v: 1, id: 'me', screen: true });
    await c.startShare();
    expect(sent('screen:start').length).toBe(1);
    expect(c.getSnapshot().toasts.length).toBe(0);
  });

  it('TC-521 [FR-12,FR-22] 공유 중 회의가 끝나면 화면 공유 트랙을 멈춘다(브라우저의 "공유 중" 표시가 남지 않게)', async () => {
    const track = { stop: vi.fn(), onended: null };
    desktop(track);
    const c = await joined();
    await c.startShare();
    expect(track.stop).not.toHaveBeenCalled();
    c.end('left');
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(c.getSnapshot().sharing).toBe(false);
  });

  it('TC-522 [FR-11] 이미 다 읽은 상태에서 읽음 처리는 구독자에게 알리지 않고(불필요한 재렌더 방지), 안 읽은 글이 있을 때만 0으로 만들어 알린다', async () => {
    const c = await joined();
    const listener = vi.fn();
    c.subscribe(listener);
    c.markChatRead();
    expect(listener).not.toHaveBeenCalled();
    sock().fire('chat:message', { v: 1, id: 'm1', from: 'host', nickname: '사람1', text: 'hi', ts: 1 });
    expect(c.getSnapshot().unread).toBe(1);
    listener.mockClear();
    c.markChatRead();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(c.getSnapshot().unread).toBe(0);
  });
});
