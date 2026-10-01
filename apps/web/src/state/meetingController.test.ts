import type { PublicParticipant } from '@meetlite/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalMedia } from '../lib/media';
import { S } from '../strings';

type Handler = (...args: unknown[]) => void;
interface Req {
  event: string;
  payload: Record<string, unknown>;
}

const h = vi.hoisted(() => {
  const state = {
    connectError: null as Error | null,
    responses: {} as Record<string, unknown>,
    requests: [] as { event: string; payload: Record<string, unknown> }[],
    closed: 0,
    transports: [] as FakeTransport[],
    socket: null as FakeSocket | null,
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
    }
  }
  class FakeTransport {
    added: { id: string; initiate: boolean }[] = [];
    removed: string[] = [];
    quality: number[] = [];
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
    handleSignal(): Promise<void> {
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
      return h.state.connectError ? Promise.reject(h.state.connectError) : Promise.resolve();
    }
    request(event: string, payload: Record<string, unknown>): Promise<unknown> {
      h.state.requests.push({ event, payload });
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

const person = (id: string, joinSeq: number, over: Partial<PublicParticipant> = {}): PublicParticipant => ({ id, nickname: `사람${joinSeq}`, isHost: joinSeq === 1, audio: true, video: true, screen: false, connection: 'connected', joinSeq, ...over });
const joinOk = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  ok: true, v: 1, token: 'TOKEN-SECRET-123', selfId: 'me', hostId: 'host', locked: false, participants: [person('host', 1), person('me', 2)], iceServers: [], config: { maxParticipants: 6, reconnectGraceSec: 20 }, ...over,
});
const media = (over: Record<string, unknown> = {}): LocalMedia => {
  const m = { audio: { id: 'a' }, video: { id: 'v' }, micOn: true, camOn: true, setMic: vi.fn(function (this: { micOn: boolean }, on: boolean) { this.micOn = on; }), stopAll: vi.fn(), reconcile: () => ({ audioLost: false, videoLost: false }), ...over };
  return m as unknown as LocalMedia;
};
const sent = (event: string): Req[] => h.state.requests.filter((r) => r.event === event);
const sock = (): InstanceType<typeof h.FakeSocket> => {
  if (!h.state.socket) throw new Error('no socket');
  return h.state.socket;
};
const transport = (): InstanceType<typeof h.FakeTransport> => {
  const t = h.state.transports[h.state.transports.length - 1];
  if (!t) throw new Error('no transport');
  return t;
};
const flush = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0);
};

async function joined(over: Record<string, unknown> = {}, m: LocalMedia = media()): Promise<MeetingController> {
  h.state.responses['room:join'] = joinOk(over);
  const c = new MeetingController();
  const res = await c.join({ roomId: 'R'.repeat(22), nickname: '민지', media: m });
  expect(res).toEqual({ ok: true });
  return c;
}

beforeEach(() => {
  vi.useFakeTimers();
  h.state.connectError = null;
  h.state.responses = { 'room:resume': { ok: true, v: 1, hostId: 'host', locked: false, participants: [person('host', 1), person('me', 2)] } };
  h.state.requests = [];
  h.state.closed = 0;
  h.state.transports = [];
  h.state.socket = null;
  h.state.quality = 'good';
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('입장·세션 (unit-06, FR-01, FR-03, FR-06, SEC-03)', () => {
  it('TC-468 [FR-01,FR-03,SEC-03] 입장 요청은 v:1·방 ID·닉네임(+비밀번호·호스트 클레임은 있을 때만)을 보내고, 성공하면 서버가 준 selfId·호스트·참가자로 live가 된다', async () => {
    h.state.responses['room:join'] = joinOk({ config: { maxParticipants: 6, reconnectGraceSec: 33 } });
    const c = new MeetingController();
    await c.join({ roomId: 'R'.repeat(22), nickname: '민지', media: media() });
    expect(sent('room:join')[0]?.payload).toEqual({ v: 1, roomId: 'R'.repeat(22), nickname: '민지' });
    const s = c.getSnapshot();
    expect(s.status).toBe('live');
    expect(s.selfId).toBe('me');
    expect(s.hostId).toBe('host');
    expect(s.participants.map((p) => p.id)).toEqual(['host', 'me']);
    expect(s.graceSec).toBe(33);
    expect(s.micOn && s.camOn).toBe(true);
    const c2 = new MeetingController();
    await c2.join({ roomId: 'R'.repeat(22), nickname: 'x', password: 'pw-1234', hostClaim: 'HC', media: media() });
    expect(sent('room:join')[1]?.payload).toMatchObject({ password: 'pw-1234', hostClaim: 'HC' });
  });

  it('TC-468b [FR-03,FR-04] 장치가 없으면(트랙 없음) 마이크·카메라는 꺼진 상태로 입장하고 상태가 서버에 전달된다', async () => {
    const c = await joined({}, media({ audio: null, video: null }));
    expect(c.getSnapshot().micOn).toBe(false);
    expect(c.getSnapshot().camOn).toBe(false);
    expect(sent('media:state')[0]?.payload).toEqual({ v: 1, audio: false, video: false });
    const c2 = await joined({}, media({ micOn: false }));
    expect(c2.getSnapshot().micOn).toBe(false);
    expect(c2.getSnapshot().camOn).toBe(true);
  });

  it('TC-468c [FR-06] 입장 거부(정원·잠금·강퇴·비밀번호·방 없음)는 코드를 그대로 돌려주고 소켓을 닫고 idle로 돌아가며, 연결 실패는 NETWORK다', async () => {
    for (const code of ['ROOM_FULL', 'ROOM_LOCKED', 'KICKED', 'WRONG_PASSWORD', 'TOO_MANY_ATTEMPTS', 'ROOM_NOT_FOUND', 'HOST_NOT_PRESENT', 'RATE_LIMITED', 'INVALID_PAYLOAD']) {
      h.state.responses['room:join'] = { ok: false, code, message: 'x' };
      h.state.closed = 0;
      const c = new MeetingController();
      expect(await c.join({ roomId: 'R'.repeat(22), nickname: 'a', media: media() }), code).toEqual({ ok: false, code });
      expect(c.getSnapshot().status, code).toBe('idle');
      expect(h.state.closed, code).toBe(1);
      expect(h.state.transports.length).toBe(0);
    }
    h.state.connectError = new Error('timeout');
    const c = new MeetingController();
    expect(await c.join({ roomId: 'R'.repeat(22), nickname: 'a', media: media() })).toEqual({ ok: false, code: 'NETWORK' });
    expect(c.getSnapshot().status).toBe('idle');
  });

  it('TC-468d [SEC-03] 세션 토큰은 상태(렌더에 노출되는 값)·토스트에 들어가지 않고 resume 요청에만 쓰인다', async () => {
    const c = await joined();
    expect(JSON.stringify(c.getSnapshot())).not.toContain('TOKEN-SECRET-123');
    sock().fire('disconnect');
    sock().fire('connect');
    await flush();
    expect(sent('room:resume')[0]?.payload).toEqual({ v: 1, token: 'TOKEN-SECRET-123' });
    expect(JSON.stringify(c.getSnapshot())).not.toContain('TOKEN-SECRET-123');
  });

  it('TC-468e [FR-07] offer는 입장 순번이 더 늦은 쪽만 만든다(내가 늦으면 모두에게 initiate, 먼저면 대기)', async () => {
    await joined({ participants: [person('host', 1), person('me', 3), person('x', 2)] });
    expect(transport().added).toEqual([{ id: 'host', initiate: true }, { id: 'x', initiate: true }]);
    h.state.transports = [];
    await joined({ participants: [person('me', 1), person('a', 2), person('b', 3)], hostId: 'me' });
    expect(transport().added).toEqual([{ id: 'a', initiate: false }, { id: 'b', initiate: false }]);
    expect(transport().selfId).toBe('me');
  });
});

describe('방 이벤트 반영 (unit-06, FR-13~17, FR-11)', () => {
  it('TC-468f [FR-13] 참가자 입장·퇴장: 목록·알림이 갱신되고 중복 입장 이벤트는 무시하며 퇴장 시 영상·피어를 정리한다(timeout은 별도 문구)', async () => {
    const c = await joined();
    sock().fire('room:participantJoined', { v: 1, participant: person('n1', 3) });
    sock().fire('room:participantJoined', { v: 1, participant: person('n1', 3) });
    expect(c.getSnapshot().participants.map((p) => p.id)).toEqual(['host', 'me', 'n1']);
    expect(c.getSnapshot().toasts.map((t) => t.text)).toEqual([S.room.joined('사람3')]);
    expect(transport().added.filter((a) => a.id === 'n1').length).toBe(1);
    expect(transport().quality.at(-1)).toBe(3);
    transport().events.remoteStream?.('n1', 'camera', { fake: true });
    expect(c.getSnapshot().remote.n1).toBeDefined();
    sock().fire('room:participantLeft', { v: 1, id: 'n1', reason: 'timeout' });
    expect(c.getSnapshot().participants.map((p) => p.id)).toEqual(['host', 'me']);
    expect(c.getSnapshot().remote.n1).toBeUndefined();
    expect(transport().removed).toContain('n1');
    expect(c.getSnapshot().toasts.at(-1)?.text).toBe(S.room.timedOut('사람3'));
    sock().fire('room:participantJoined', { v: 1, participant: person('n2', 4) });
    sock().fire('room:participantLeft', { v: 1, id: 'n2', reason: 'left' });
    expect(c.getSnapshot().toasts.at(-1)?.text).toBe(S.room.left('사람4'));
    sock().fire('room:participantLeft', { v: 1, id: 'ghost', reason: 'left' }); // 없는 참가자는 알림 없이 무시
    expect(c.getSnapshot().toasts.length).toBeLessThanOrEqual(4);
  });

  it('TC-468g [FR-08,FR-17,FR-14] 상태 갱신·호스트 변경·잠금이 반영되고, 갱신 패치의 undefined는 기존 값을 지우지 않는다', async () => {
    const c = await joined();
    sock().fire('room:participantUpdated', { v: 1, id: 'host', audio: false, video: undefined });
    const host = c.getSnapshot().participants.find((p) => p.id === 'host');
    expect(host?.audio).toBe(false);
    expect(host?.video).toBe(true);
    sock().fire('room:hostChanged', { v: 1, hostId: 'me' });
    expect(c.getSnapshot().hostId).toBe('me');
    expect(c.getSnapshot().participants.find((p) => p.id === 'me')?.isHost).toBe(true);
    expect(c.getSnapshot().participants.find((p) => p.id === 'host')?.isHost).toBe(false);
    expect(c.getSnapshot().toasts.at(-1)?.text).toBe(S.room.youAreHost);
    sock().fire('room:hostChanged', { v: 1, hostId: 'host' });
    expect(c.getSnapshot().toasts.at(-1)?.text).toBe(S.room.hostChanged('사람1'));
    sock().fire('room:locked', { v: 1, locked: true });
    expect(c.getSnapshot().locked).toBe(true);
    expect(c.getSnapshot().toasts.at(-1)?.text).toBe(S.room.lockedToast);
    sock().fire('room:locked', { v: 1, locked: false });
    expect(c.getSnapshot().toasts.at(-1)?.text).toBe(S.room.unlockedToast);
  });

  it('TC-468h [FR-11] 채팅 수신: 내 글은 mine이고 안 읽음에 포함하지 않으며, 읽음 처리·최근 200개만 유지된다', async () => {
    const c = await joined();
    sock().fire('chat:message', { v: 1, id: 'm1', from: 'host', nickname: '사람1', text: '안녕', ts: 1 });
    sock().fire('chat:message', { v: 1, id: 'm2', from: 'me', nickname: '사람2', text: '내 글', ts: 2 });
    expect(c.getSnapshot().chat.map((m) => m.mine)).toEqual([false, true]);
    expect(c.getSnapshot().unread).toBe(1);
    c.markChatRead();
    expect(c.getSnapshot().unread).toBe(0);
    for (let i = 0; i < 250; i++) sock().fire('chat:message', { v: 1, id: `x${i}`, from: 'host', nickname: '사람1', text: `t${i}`, ts: i });
    expect(c.getSnapshot().chat.length).toBe(200);
    expect(c.getSnapshot().chat.at(-1)?.text).toBe('t249');
  });

  it('TC-468i [FR-15,SEC-05] 호스트의 전체 음소거 이벤트는 내 마이크를 끄고 서버에 알리고 경고 토스트를 띄운다', async () => {
    const m = media();
    const c = await joined({}, m);
    sock().fire('host:muteAll', { v: 1 });
    expect(m.setMic).toHaveBeenCalledWith(false);
    expect(c.getSnapshot().micOn).toBe(false);
    expect(sent('media:state').at(-1)?.payload).toMatchObject({ audio: false });
    expect(c.getSnapshot().toasts.at(-1)).toMatchObject({ text: S.room.micMutedByHost, kind: 'warn' });
  });

  it('TC-468j [FR-16,POL-19] 강퇴·운영자 폐쇄 이벤트는 회의를 끝내고(이유 구분) 장치·연결을 정리하며 이후 끊김이 재연결을 시작하지 않는다', async () => {
    for (const [event, reason] of [['room:kicked', 'kicked'], ['room:closed', 'operator']] as const) {
      const m = media();
      const c = await joined({}, m);
      const t = transport();
      sock().fire(event, { v: 1 });
      expect(c.getSnapshot().status).toBe('ended');
      expect(c.getSnapshot().endReason).toBe(reason);
      expect(t.closed).toBe(true);
      expect(m.stopAll).toHaveBeenCalled();
      expect(h.state.closed).toBeGreaterThan(0);
      sock().fire('disconnect');
      await vi.advanceTimersByTimeAsync(5000);
      expect(c.getSnapshot().status).toBe('ended');
      expect(sock().connectCalls).toBe(0);
      h.state.closed = 0;
    }
  });
});

describe('재연결·복구 (unit-06, FR-19~22, NFR-03)', () => {
  it('TC-468k [FR-20,FR-19] 끊기면 reconnecting(원인 network)이 되고, 다시 연결되면 토큰으로 resume해 같은 참가자 목록으로 live로 돌아오고 ICE를 다시 시작한다', async () => {
    const c = await joined();
    transport().events.remoteStream?.('gone', 'camera', { fake: true });
    transport().events.remoteStream?.('host', 'camera', { fake: true });
    sock().fire('disconnect');
    expect(c.getSnapshot().status).toBe('reconnecting');
    expect(c.getSnapshot().reconnectCause).toBe('network');
    expect(c.getSnapshot().reconnectingSince).not.toBeNull();
    h.state.responses['room:resume'] = { ok: true, v: 1, hostId: 'host', locked: true, participants: [person('host', 1), person('me', 2), person('z', 3)] };
    sock().fire('connect');
    await flush();
    const s = c.getSnapshot();
    expect(s.status).toBe('live');
    expect(s.locked).toBe(true);
    expect(s.participants.length).toBe(3);
    expect(s.reconnectingSince).toBeNull();
    expect(transport().iceRestarts).toBe(1);
    expect(transport().added.some((a) => a.id === 'z')).toBe(true);
    expect(s.remote.gone, '끊긴 사이 나간 참가자의 영상은 정리된다').toBeUndefined();
    expect(transport().removed).toContain('gone');
    expect(s.remote.host).toBeDefined();
    expect(s.toasts.at(-1)?.text).toBe(S.room.reconnected);
  });

  it('TC-468l [FR-21,FR-20] resume 실패 코드별 종료 사유: ROOM_NOT_FOUND는 restarted, TOKEN_INVALID·PARTICIPANT_GONE은 expired, 일시 오류(NETWORK)는 끊김 상태 유지', async () => {
    for (const [code, reason] of [['ROOM_NOT_FOUND', 'restarted'], ['TOKEN_INVALID', 'expired'], ['PARTICIPANT_GONE', 'expired']] as const) {
      const c = await joined();
      sock().fire('disconnect');
      h.state.responses['room:resume'] = { ok: false, code, message: 'x' };
      sock().fire('connect');
      await flush();
      expect(c.getSnapshot().status, code).toBe('ended');
      expect(c.getSnapshot().endReason, code).toBe(reason);
    }
    const c = await joined();
    sock().fire('disconnect');
    h.state.responses['room:resume'] = { ok: false, code: 'NETWORK', message: 'timeout' };
    sock().fire('connect');
    await flush();
    expect(c.getSnapshot().status).toBe('reconnecting');
  });

  it('TC-468m [FR-20] 서버가 먼저 끊어 자동 재연결이 없는 경우(active=false) 1.5초마다 직접 다시 연결을 시도하고, 연결되면 멈춘다', async () => {
    await joined();
    sock().active = false;
    sock().connected = false;
    sock().fire('disconnect');
    await vi.advanceTimersByTimeAsync(1600);
    expect(sock().connectCalls).toBe(1);
    await vi.advanceTimersByTimeAsync(1500);
    expect(sock().connectCalls).toBe(2);
    sock().connected = true;
    sock().fire('connect');
    await vi.advanceTimersByTimeAsync(5000);
    expect(sock().connectCalls).toBe(2);
  });

  it('TC-468n [FR-22,FR-03] 나가기: room:leave를 보내고 left로 끝나며 자원이 정리되고, 나가는 중의 끊김은 재연결을 시작하지 않는다', async () => {
    const m = media();
    const c = await joined({}, m);
    const t = transport();
    await c.leave();
    expect(sent('room:leave').length).toBe(1);
    expect(c.getSnapshot().endReason).toBe('left');
    expect(t.closed).toBe(true);
    expect(m.stopAll).toHaveBeenCalled();
    sock().fire('disconnect');
    await vi.advanceTimersByTimeAsync(5000);
    expect(sock().connectCalls).toBe(0);
    c.end('kicked'); // 이미 끝난 뒤의 end는 사유를 덮어쓰지 않는다
    expect(c.getSnapshot().endReason).toBe('left');
  });
});

describe('호스트 도구·채팅·공유 요청 (unit-06, FR-11, FR-12, FR-14~16)', () => {
  it('TC-468o [FR-14,FR-15,FR-16,SEC-05] 호스트 동작은 서버 요청으로만 처리되고 거부(FORBIDDEN)되면 안내 토스트를 띄우며 로컬 상태를 바꾸지 않는다', async () => {
    const c = await joined();
    h.state.responses['host:lock'] = { ok: false, code: 'FORBIDDEN', message: 'x' };
    h.state.responses['host:kick'] = { ok: false, code: 'FORBIDDEN', message: 'x' };
    h.state.responses['host:muteAll'] = { ok: false, code: 'RATE_LIMITED', message: 'x' };
    await c.setLocked(true);
    expect(sent('host:lock')[0]?.payload).toEqual({ v: 1, locked: true });
    expect(c.getSnapshot().locked).toBe(false); // 서버가 알려 줄 때만 바뀐다
    expect(c.getSnapshot().toasts.at(-1)?.text).toBe(S.room.forbidden);
    await c.kick('host');
    expect(sent('host:kick')[0]?.payload).toEqual({ v: 1, targetId: 'host' });
    expect(c.getSnapshot().participants.some((p) => p.id === 'host')).toBe(true);
    await c.muteAll();
    expect(c.getSnapshot().toasts.at(-1)?.text).toBe(S.lobby.rateLimited);
    expect(c.getSnapshot().micOn).toBe(true);
  });

  it('TC-468p [FR-11] 채팅 전송은 성공 시 null, 실패 시 서버 코드, 응답 없음은 NETWORK를 돌려준다', async () => {
    const c = await joined();
    expect(await c.sendChat('안녕')).toBeNull();
    expect(sent('chat:send')[0]?.payload).toEqual({ v: 1, text: '안녕' });
    h.state.responses['chat:send'] = { ok: false, code: 'RATE_LIMITED', message: 'x' };
    expect(await c.sendChat('또')).toBe('RATE_LIMITED');
    h.state.responses['chat:send'] = { ok: false, code: 'INVALID_PAYLOAD', message: 'x' };
    expect(await c.sendChat('​')).toBe('INVALID_PAYLOAD');
    const idle = new MeetingController();
    expect(await idle.sendChat('x')).toBe('NETWORK');
  });

  it('TC-468q [FR-12,POL-12] 화면공유: 미지원이면 안내만, 다른 사람이 공유 중이면 getDisplayMedia를 부르지 않고 안내, 서버가 거부하면 트랙을 멈춘다', async () => {
    const getDisplayMedia = vi.fn();
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130', maxTouchPoints: 0, mediaDevices: { getDisplayMedia } });
    const c = await joined({ participants: [person('host', 1, { screen: true }), person('me', 2)] });
    await c.startShare();
    expect(getDisplayMedia).not.toHaveBeenCalled();
    expect(c.getSnapshot().toasts.at(-1)?.text).toBe(S.room.shareBusy('사람1'));
    expect(c.getSnapshot().sharing).toBe(false);
    const stop = vi.fn();
    getDisplayMedia.mockResolvedValue({ getVideoTracks: () => [{ stop, onended: null }] });
    const c2 = await joined();
    h.state.responses['screen:start'] = { ok: false, code: 'SCREEN_BUSY', message: 'x' };
    await c2.startShare();
    expect(stop).toHaveBeenCalled();
    expect(c2.getSnapshot().sharing).toBe(false);
    getDisplayMedia.mockRejectedValue(new DOMException('no', 'NotAllowedError'));
    const before = c2.getSnapshot().toasts.length;
    await c2.startShare();
    expect(c2.getSnapshot().toasts.length).toBe(before); // 사용자가 취소한 것은 오류 토스트를 띄우지 않는다
    getDisplayMedia.mockRejectedValue(new DOMException('boom', 'NotReadableError'));
    await c2.startShare();
    expect(c2.getSnapshot().toasts.at(-1)?.text).toBe(S.room.shareDenied);
    vi.stubGlobal('navigator', { userAgent: 'iPhone Mobile', maxTouchPoints: 5, mediaDevices: { getDisplayMedia } });
    await c2.startShare();
    expect(c2.getSnapshot().toasts.at(-1)?.text).toBe(S.room.shareUnsupportedMobile);
  });

  it('TC-468r [UX-12] 토스트는 최대 4개만 남고 4.5초 뒤 사라진다', async () => {
    const c = await joined();
    for (let i = 0; i < 7; i++) c.toast(`알림${i}`);
    expect(c.getSnapshot().toasts.length).toBe(4);
    expect(c.getSnapshot().toasts.at(-1)?.text).toBe('알림6');
    await vi.advanceTimersByTimeAsync(4600);
    expect(c.getSnapshot().toasts.length).toBe(0);
  });
});

describe('품질·미디어 조작 (unit-06, FR-08, FR-19)', () => {
  it('TC-468w [FR-19] 네트워크 품질: 연속 2회 poor일 때만 poor로 표시하고 한 번이라도 good이면 즉시 되돌린다(3초 주기)', async () => {
    const c = await joined();
    h.state.quality = 'poor';
    await vi.advanceTimersByTimeAsync(3000);
    expect(c.getSnapshot().quality).toBe('good'); // 1회는 일시적일 수 있다
    await vi.advanceTimersByTimeAsync(3000);
    expect(c.getSnapshot().quality).toBe('poor');
    h.state.quality = 'good';
    await vi.advanceTimersByTimeAsync(3000);
    expect(c.getSnapshot().quality).toBe('good');
  });

  it('TC-468x [FR-12] 화면공유 성공 시 서버에 알리고 sharing이 되며, 브라우저의 공유 중지(onended)가 오면 공유를 끝내고 서버에 알린다', async () => {
    const track = { stop: vi.fn(), onended: null as null | (() => void) };
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130', maxTouchPoints: 0, mediaDevices: { getDisplayMedia: () => Promise.resolve({ getVideoTracks: () => [track] }) } });
    const c = await joined();
    await c.startShare();
    expect(sent('screen:start').length).toBe(1);
    expect(c.getSnapshot().sharing).toBe(true);
    track.onended?.();
    await flush();
    expect(c.getSnapshot().sharing).toBe(false);
    expect(track.stop).toHaveBeenCalled();
    expect(sent('screen:stop').length).toBe(1);
  });

  it('TC-468y [FR-08,UX-03] 마이크 토글: 켜진 상태를 서버에 알리고, 마이크 트랙이 없으면 새로 열어 보며 실패하면 안내 토스트를 띄운다. 카메라를 못 켜면 상태를 바꾸지 않고 안내한다', async () => {
    const m = media();
    const c = await joined({}, m);
    c.toggleMic();
    expect(c.getSnapshot().micOn).toBe(false);
    expect(sent('media:state').at(-1)?.payload).toEqual({ v: 1, audio: false, video: true });
    c.toggleMic();
    expect(c.getSnapshot().micOn).toBe(true);
    const noMic = media({ audio: null, start: vi.fn(() => Promise.resolve()) });
    const c2 = await joined({}, noMic);
    c2.toggleMic();
    await flush();
    expect((noMic as unknown as { start: ReturnType<typeof vi.fn> }).start).toHaveBeenCalledWith({ audio: true, video: false });
    expect(c2.getSnapshot().micOn).toBe(false);
    expect(c2.getSnapshot().toasts.at(-1)).toMatchObject({ text: S.room.micFailed, kind: 'warn' });
    const badCam = media({ setCamera: vi.fn(() => Promise.resolve(false)) });
    const c3 = await joined({}, badCam);
    await c3.toggleCamera();
    expect(c3.getSnapshot().camOn).toBe(true);
    expect(c3.getSnapshot().toasts.at(-1)).toMatchObject({ text: S.room.cameraFailed, kind: 'warn' });
  });
});
