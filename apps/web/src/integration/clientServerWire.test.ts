import { createHmac } from 'node:crypto';
import { ERROR_CODES, type IceServerConfig } from '@meetlite/shared';
import type * as SocketIo from 'socket.io-client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunningServer } from '../../../server/src/server';
import { createRoom, getMeta, getRoomStatus } from '../lib/api';
import { SignalingClient } from '../lib/signaling';
import type { LocalMedia } from '../lib/media';
import { MeetingController, type JoinOutcome } from '../state/MeetingController';
import { S } from '../strings';
import { boot, fakeMedia, fetchTo, freePort, makeConfig, SECRET, sleep, snap, until } from './wireHarness';

// 7단계 통합: 웹의 실제 SignalingClient·MeetingController·api.ts 가 실제 서버(RoomManager·socket·REST)와 맞물리는지 본다.
// 단위 시험은 한쪽을 가짜로 둔다(웹 시험은 가짜 소켓, 서버 시험은 가짜 클라이언트). 이 파일은 그 사이 계약만 본다.
// 미디어 계층만 대역(RTCPeerConnection이 node에 없음). 신호 중계·경로 보고는 대역이 내보낸 값이 서버를 거쳐 오는지로 확인한다.

const wire = vi.hoisted(() => ({ url: '', origin: 'http://localhost:5173' }));
interface FakeT {
  selfId: string;
  events: Record<string, (...a: unknown[]) => void>;
  started: IceServerConfig[] | null;
  added: { id: string; initiate: boolean }[];
  removed: string[];
  signals: { from: string; msg: Record<string, unknown> }[];
  iceRestarts: number;
  closed: boolean;
}
const fx = vi.hoisted(() => {
  const all: FakeT[] = [];
  class FakeTransport implements FakeT {
    started: IceServerConfig[] | null = null;
    added: { id: string; initiate: boolean }[] = [];
    removed: string[] = [];
    signals: { from: string; msg: Record<string, unknown> }[] = [];
    iceRestarts = 0;
    closed = false;
    constructor(
      public selfId: string,
      public events: Record<string, (...a: unknown[]) => void>,
    ) {
      all.push(this);
    }
    start(ice: IceServerConfig[]): void {
      this.started = ice;
    }
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
    setAudioTrack = (): Promise<void> => Promise.resolve();
    setVideoTrack = (): Promise<void> => Promise.resolve();
    setScreenTrack = (): Promise<void> => Promise.resolve();
    restartIce(): void {
      this.iceRestarts++;
    }
    applyQuality(): void {}
    getQuality = (): Promise<'good'> => Promise.resolve('good');
    close(): void {
      this.closed = true;
    }
  }
  return { all, FakeTransport };
});

vi.mock('socket.io-client', async (orig) => {
  const real = await orig<typeof SocketIo>();
  // SignalingClient는 상대 경로로 연결한다(브라우저 same-origin). node에서는 실제 서버 주소와 Origin 헤더를 붙여 준다.
  return { ...real, io: (opts: object) => real.io(wire.url, { ...opts, forceNew: true, extraHeaders: { origin: wire.origin } }) };
});
vi.mock('../media/MeshTransport', () => ({ MeshTransport: fx.FakeTransport }));

interface Call {
  event: string;
  payload: unknown;
  res: { ok: boolean; code?: string };
}
let calls: Call[] = [];
const live: MeetingController[] = [];
const transportOf = (c: MeetingController): FakeT => {
  const t = fx.all.find((x) => x.selfId === snap(c).selfId);
  if (!t) throw new Error('transport not found');
  return t;
};

interface Member {
  c: MeetingController;
  media: LocalMedia;
  out: JoinOutcome;
  id: string;
}
async function enter(roomId: string, nickname: string, extra: { password?: string; hostClaim?: string } = {}): Promise<Member> {
  const c = new MeetingController();
  live.push(c);
  const media = fakeMedia();
  const out = await c.join({ roomId, nickname, media, ...extra });
  return { c, media, out, id: snap(c).selfId };
}
async function newHost(password?: string): Promise<{ roomId: string; host: Member }> {
  const r = await createRoom(password);
  if (!r.ok) throw new Error(`createRoom failed: ${r.code}`);
  const host = await enter(r.data.roomId, 'Host', { hostClaim: r.data.hostClaim });
  if (!host.out.ok) throw new Error('host join failed');
  return { roomId: r.data.roomId, host };
}

let srv: RunningServer;
const realFetch = globalThis.fetch;
const useServer = (s: RunningServer): void => {
  wire.url = `http://127.0.0.1:${s.port}`;
  vi.stubGlobal('fetch', fetchTo(wire.url));
};

beforeAll(async () => {
  srv = await boot();
  useServer(srv);
  const orig = SignalingClient.prototype.request;
  vi.spyOn(SignalingClient.prototype, 'request').mockImplementation(async function (this: SignalingClient, ...args: Parameters<typeof orig>) {
    const res = (await (orig as (...a: unknown[]) => Promise<Call['res']>).apply(this, args)) as Call['res'];
    calls.push({ event: String(args[0]), payload: args[1], res });
    return res as never;
  });
});
afterAll(async () => {
  vi.restoreAllMocks();
  vi.stubGlobal('fetch', realFetch);
  await srv.close();
});
beforeEach(() => {
  calls = [];
  fx.all.length = 0;
  wire.url = `http://127.0.0.1:${srv.port}`;
  vi.stubGlobal('fetch', fetchTo(wire.url));
});
afterEach(() => {
  for (const c of live.splice(0)) c.dispose();
});

const silent = (): Call[] => calls.filter((c) => !c.res.ok);

describe('F1 방·입장·세션: REST ↔ 소켓 ↔ 컨트롤러', () => {
  it('IT-60 [FR-01,FR-03,FR-06,FR-23,NFR-12] 방 생성 → 상태 조회 → 호스트 입장 → 참가자 입장이 실제 서버와 맞물리고 컨트롤러가 보낸 모든 요청이 서버 스키마를 통과한다', async () => {
    const r = await createRoom();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.data).sort()).toEqual(['hostClaim', 'roomId', 'v']);
    const before = await getRoomStatus(r.data.roomId);
    expect(before.ok && before.data.exists && !before.data.hostPresent).toBe(true);
    if (before.ok) expect(Object.keys(before.data).sort()).toEqual(['exists', 'full', 'hostPresent', 'locked', 'needsPassword', 'v']);

    const host = await enter(r.data.roomId, 'Host', { hostClaim: r.data.hostClaim });
    expect(host.out).toEqual({ ok: true });
    const hs = snap(host.c);
    expect(hs.status).toBe('live');
    expect(hs.hostId).toBe(hs.selfId);
    expect(hs.participants).toHaveLength(1);
    expect(hs.graceSec).toBe(makeConfig().RECONNECT_GRACE_SEC); // 서버 설정이 JoinResult.config로 웹 상태까지 간다
    const mid = await getRoomStatus(r.data.roomId);
    expect(mid.ok && mid.data.hostPresent).toBe(true);

    const guest = await enter(r.data.roomId, 'Guest');
    expect(guest.out).toEqual({ ok: true });
    await until(() => snap(host.c).participants.length === 2 && snap(guest.c).participants.length === 2, '양쪽 참가자 목록 2명');
    expect(snap(host.c).participants.map((p) => p.isHost)).toEqual([true, false]);
    expect(snap(guest.c).hostId).toBe(host.id);
    expect(snap(host.c).toasts.some((t) => t.text === S.room.joined('Guest'))).toBe(true);

    // 입장 순번이 늦은 쪽만 offer를 만든다(서버 joinSeq ↔ 웹 addPeers의 계약)
    await until(() => transportOf(host.c).added.length === 1, '호스트 쪽 addPeer');
    expect(transportOf(guest.c).added).toEqual([{ id: host.id, initiate: true }]);
    expect(transportOf(host.c).added).toEqual([{ id: guest.id, initiate: false }]);

    // 컨트롤러가 보낸 요청이 하나도 거부되지 않았다(fire-and-forget 요청의 조용한 스키마 불일치 방지)
    expect(calls.map((c) => c.event)).toContain('media:state');
    expect(silent()).toEqual([]);

    // 음성 대조군: 같은 감시 장치가 실제 스키마 위반 요청은 잡아낸다(위 단언이 항상 통과하는 빈 검사가 아님을 증명)
    const probe = new SignalingClient();
    live.push({ dispose: () => probe.close() } as unknown as MeetingController);
    await probe.connect();
    await probe.request('media:state', { v: 1, audio: 'yes' } as never);
    expect(silent().map((c) => c.res.code)).toEqual(['INVALID_PAYLOAD']);
  });

  it('IT-61 [FR-07,SEC-04] 신호(offer·ICE)는 서버를 거쳐 상대 transport에 도착하고 from은 서버가 부여한 참가자 ID다', async () => {
    const { roomId, host } = await newHost();
    const guest = await enter(roomId, 'Guest');
    await until(() => snap(host.c).participants.length === 2, '2명');
    const desc = { type: 'offer', sdp: 'v=0\r\n' } as const;
    const cand = { candidate: 'candidate:1 1 udp 1 127.0.0.1 9 typ host', sdpMid: '0', sdpMLineIndex: 0 };
    transportOf(guest.c).events.signal?.(host.id, { description: desc });
    transportOf(guest.c).events.signal?.(host.id, { candidate: cand });
    await until(() => transportOf(host.c).signals.length === 2, '신호 2건 도착');
    expect(transportOf(host.c).signals).toEqual([
      { from: guest.id, msg: { description: desc } },
      { from: guest.id, msg: { candidate: cand } },
    ]);
    await until(() => calls.filter((c) => c.event === 'signal:send').length === 2, 'signal:send ack');
    expect(silent()).toEqual([]);
  });

  it('IT-62 [SEC-09,FR-07] 서버가 발급한 ICE 서버(STUN + TURN 임시 자격증명)가 그대로 transport.start에 전달되고 자격증명이 HMAC 규칙과 일치한다', async () => {
    const turnSecret = 'turn-secret-turn-secret-1234';
    const s = await boot({ TURN_URLS: 'turn:turn.example.test:3478', TURN_SECRET: turnSecret, TURN_TTL_SEC: '600' });
    try {
      useServer(s);
      const r = await createRoom();
      if (!r.ok) throw new Error('createRoom');
      const host = await enter(r.data.roomId, 'Host', { hostClaim: r.data.hostClaim });
      const ice = transportOf(host.c).started ?? [];
      const turn = ice.find((x) => x.urls.some((u) => u.startsWith('turn:')));
      const stun = ice.find((x) => x.urls.some((u) => u.startsWith('stun:')));
      expect(stun?.username).toBeUndefined();
      expect(stun?.credential).toBeUndefined();
      expect(turn?.username).toMatch(new RegExp(`^\\d+:${host.id}$`));
      const exp = Number((turn?.username ?? '').split(':')[0]);
      expect(exp * 1000 - Date.now()).toBeLessThanOrEqual(600_000);
      expect(exp * 1000 - Date.now()).toBeGreaterThan(500_000);
      expect(turn?.credential).toBe(createHmac('sha1', turnSecret).update(turn?.username ?? '').digest('base64'));
    } finally {
      await s.close();
    }
  });

  it('IT-63 [FR-02,FR-05,FR-06,FR-07,FR-14,FR-15,FR-23,POL-06,SEC-02] 입장 거부·실패 코드 8종(WRONG_PASSWORD 포함)이 실제 서버에서 만들어지고 컨트롤러는 idle로 돌아와 같은 코드를 호출자에게 돌려준다', async () => {
    const seen = new Map<string, JoinOutcome>();
    const settle = (name: string, m: Member): void => {
      seen.set(name, m.out);
      expect(snap(m.c).status).toBe('idle');
    };
    const none = 'A'.repeat(22);
    settle('ROOM_NOT_FOUND', await enter(none, 'Guest'));

    const nohost = await createRoom();
    if (!nohost.ok) throw new Error('createRoom');
    settle('HOST_NOT_PRESENT', await enter(nohost.data.roomId, 'Guest'));

    const { roomId, host } = await newHost('secret1');
    settle('INVALID_PAYLOAD(비밀번호 3자 이하)', await enter(roomId, 'Guest', { password: 'ab' }));
    settle('INVALID_PAYLOAD(닉네임)', await enter(roomId, 'a<b>', { password: 'secret1' }));
    for (let i = 0; i < 5; i++) expect((await enter(roomId, 'Guest', { password: 'wrong1' })).out).toEqual({ ok: false, code: 'WRONG_PASSWORD' });
    settle('TOO_MANY_ATTEMPTS', await enter(roomId, 'Guest', { password: 'secret1' }));

    const open = await newHost();
    await open.host.c.setLocked(true);
    await until(() => snap(open.host.c).locked, '잠금 반영');
    settle('ROOM_LOCKED', await enter(open.roomId, 'Guest'));

    const kickRoom = await newHost();
    const victim = await enter(kickRoom.roomId, 'Victim');
    await until(() => snap(kickRoom.host.c).participants.length === 2, '2명');
    await kickRoom.host.c.kick(victim.id);
    await until(() => snap(victim.c).status === 'ended', '강퇴 종료');
    settle('KICKED', await enter(kickRoom.roomId, 'Victim'));

    const dead = await freePort();
    wire.url = `http://127.0.0.1:${dead}`;
    settle('NETWORK', await enter(roomId, 'Guest', { password: 'secret1' }));
    wire.url = `http://127.0.0.1:${srv.port}`;
    expect(host.out.ok).toBe(true);

    const codes = Object.fromEntries([...seen].map(([k, v]) => [k, v.ok ? 'ok' : v.code]));
    expect(codes).toEqual({
      ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
      HOST_NOT_PRESENT: 'HOST_NOT_PRESENT',
      'INVALID_PAYLOAD(비밀번호 3자 이하)': 'INVALID_PAYLOAD',
      'INVALID_PAYLOAD(닉네임)': 'INVALID_PAYLOAD',
      TOO_MANY_ATTEMPTS: 'TOO_MANY_ATTEMPTS',
      ROOM_LOCKED: 'ROOM_LOCKED',
      KICKED: 'KICKED',
      NETWORK: 'NETWORK',
    });
    for (const code of Object.values(codes)) expect(code === 'NETWORK' || (ERROR_CODES as readonly string[]).includes(code)).toBe(true);
  });

  it('IT-64 [FR-07,POL-01] 정원이 찬 방의 입장은 ROOM_FULL이고 방 상태 조회의 full 플래그와 일치한다', async () => {
    const s = await boot({ MAX_PARTICIPANTS: '2' });
    try {
      useServer(s);
      const { roomId, host } = await newHost();
      const g = await enter(roomId, 'G1');
      expect(g.out.ok).toBe(true);
      const st = await getRoomStatus(roomId);
      expect(st.ok && st.data.full).toBe(true);
      const third = await enter(roomId, 'G2');
      expect(third.out).toEqual({ ok: false, code: 'ROOM_FULL' });
      expect(snap(host.c).participants).toHaveLength(2);
    } finally {
      await s.close();
    }
  });
});

describe('F3 채팅: 컨트롤러 ↔ 서버 정규화·제한', () => {
  it('IT-65 [FR-11,SEC-07,POL-07] 채팅은 서버가 채운 발신자 정보와 함께 모두에게 가고(HTML은 문자열 그대로) 길이·보이지 않는 글자·속도 제한 오류 코드가 컨트롤러에 그대로 전달된다', async () => {
    const { roomId, host } = await newHost();
    const guest = await enter(roomId, 'Guest');
    await until(() => snap(host.c).participants.length === 2, '2명');
    const html = '<img src=x onerror=alert(1)> hi';
    expect(await guest.c.sendChat(html)).toBeNull();
    await until(() => snap(host.c).chat.length === 1 && snap(guest.c).chat.length === 1, '채팅 수신');
    const got = snap(host.c).chat[0];
    expect(got).toMatchObject({ text: html, from: guest.id, nickname: 'Guest', mine: false });
    expect(snap(guest.c).chat[0]?.mine).toBe(true);
    expect(snap(host.c).unread).toBe(1);
    expect(snap(guest.c).unread).toBe(0);
    host.c.markChatRead();
    expect(snap(host.c).unread).toBe(0);

    expect(await guest.c.sendChat('​​')).toBe('INVALID_PAYLOAD');
    expect(await guest.c.sendChat('a'.repeat(501))).toBe('INVALID_PAYLOAD');
    expect(await guest.c.sendChat('a'.repeat(500))).toBeNull();
    // 위 3건 + 첫 건으로 버킷(5)이 거의 찼다. 계속 보내면 RATE_LIMITED
    const results: (string | null)[] = [];
    for (let i = 0; i < 4; i++) results.push(await guest.c.sendChat('x'));
    expect(results).toContain('RATE_LIMITED');
  });
});

describe('F4 호스트 도구·권한: 컨트롤러 ↔ 서버 권한 판정', () => {
  it('IT-66 [FR-14,FR-15,FR-16,FR-17,SEC-05] 잠금·전체 음소거·강퇴·호스트 승계가 서버 판정을 거쳐 양쪽 컨트롤러 상태·알림에 반영되고 비호스트의 요청은 호스트 전용 안내로 끝난다', async () => {
    const { roomId, host } = await newHost();
    const guest = await enter(roomId, 'Guest');
    await until(() => snap(host.c).participants.length === 2, '2명');

    // 비호스트 요청 → 서버 FORBIDDEN → 웹 errorText
    await guest.c.setLocked(true);
    await guest.c.muteAll();
    await guest.c.kick(host.id);
    expect(snap(guest.c).toasts.filter((t) => t.text === S.room.forbidden)).toHaveLength(3);
    expect(snap(host.c).locked).toBe(false);

    await host.c.setLocked(true);
    await until(() => snap(guest.c).locked, '게스트에 잠금 반영');
    expect(snap(guest.c).toasts.some((t) => t.text === S.room.lockedToast)).toBe(true);
    await host.c.setLocked(false);
    await until(() => !snap(guest.c).locked, '잠금 해제 반영');

    // 전체 음소거: 호스트 제외, 게스트 마이크 꺼짐 → media:state → 호스트 목록의 audio=false
    await host.c.muteAll();
    await until(() => !snap(guest.c).micOn, '게스트 마이크 꺼짐');
    expect(guest.media.micOn).toBe(false);
    expect(snap(guest.c).toasts.some((t) => t.text === S.room.micMutedByHost)).toBe(true);
    await until(() => snap(host.c).participants.find((p) => p.id === guest.id)?.audio === false, '호스트 목록에 게스트 audio=false');
    expect(host.media.micOn).toBe(true); // 전체 음소거는 요청한 호스트 자신을 끄지 않는다
    expect(snap(host.c).toasts.some((t) => t.text === S.room.micMutedByHost)).toBe(false);

    // 호스트 승계: 호스트가 나가면 게스트가 호스트가 된다
    await host.c.leave();
    expect(snap(host.c)).toMatchObject({ status: 'ended', endReason: 'left' });
    await until(() => snap(guest.c).hostId === guest.id, '호스트 승계');
    expect(snap(guest.c).toasts.some((t) => t.text === S.room.youAreHost)).toBe(true);
    expect(snap(guest.c).participants).toHaveLength(1);
    expect(silent().filter((c) => c.event !== 'host:lock' && c.event !== 'host:muteAll' && c.event !== 'host:kick')).toEqual([]);
  });

  it('IT-67 [FR-15,POL-06,SEC-05] 강퇴: 대상 컨트롤러는 kicked로 끝나고 재연결을 시도하지 않으며 남은 참가자 목록·transport에서 정리되고 같은 사람은 KICKED로 재입장이 막힌다', async () => {
    const { roomId, host } = await newHost();
    const guest = await enter(roomId, 'Guest');
    await until(() => snap(host.c).participants.length === 2, '2명');
    await host.c.kick(host.id); // 자기 자신: 서버가 거부 → 일반 실패 안내
    expect(snap(host.c).toasts.some((t) => t.text === S.room.actionFailed)).toBe(true);
    await host.c.kick(guest.id);
    await until(() => snap(guest.c).status === 'ended', '강퇴 종료');
    expect(snap(guest.c).endReason).toBe('kicked');
    await until(() => snap(host.c).participants.length === 1, '호스트 목록 정리');
    expect(transportOf(host.c).removed).toContain(guest.id);
    await sleep(2500); // 재연결 타이머(1.5초)가 한 번 돌 시간
    expect(snap(guest.c).status).toBe('ended');
    expect(srv.rooms.get(roomId)?.participants.has(guest.id)).toBe(false);
    expect((await enter(roomId, 'Guest')).out).toEqual({ ok: false, code: 'KICKED' });
  }, 15_000);
});

describe('F2 미디어·연결 복구: 끊김·재시작·만료', () => {
  it('IT-68 [FR-19,FR-20,NFR-03,SEC-03] 서버가 소켓을 끊으면 컨트롤러가 재연결 상태를 거쳐 토큰으로 같은 자리(selfId·호스트)를 복구하고 ICE를 재시작한다', async () => {
    const { roomId, host } = await newHost();
    const guest = await enter(roomId, 'Guest');
    await until(() => snap(host.c).participants.length === 2, '2명');
    const before = { host: host.id, guest: guest.id };
    srv.disconnectAll();
    await until(() => snap(guest.c).status === 'reconnecting', '재연결 상태');
    expect(snap(guest.c).reconnectingSince).not.toBeNull();
    await until(() => snap(guest.c).status === 'live' && snap(host.c).status === 'live', '복구', 10_000);
    expect(snap(guest.c).selfId).toBe(before.guest);
    expect(snap(host.c).selfId).toBe(before.host);
    expect(snap(host.c).hostId).toBe(before.host);
    expect(snap(guest.c).participants.map((p) => p.connection)).toEqual(['connected', 'connected']);
    expect(transportOf(guest.c).iceRestarts).toBeGreaterThanOrEqual(1);
    expect(snap(guest.c).toasts.some((t) => t.text === S.room.reconnected)).toBe(true);
    expect(calls.some((c) => c.event === 'room:resume' && c.res.ok)).toBe(true);
  }, 20_000);

  it('IT-69 [FR-20,FR-21,NFR-06,SEC-03] 재연결 실패 사유별 종료: 서버 재시작(방 없음)은 restarted, 서명 비밀이 바뀌면 expired, 서버가 이미 자리를 정리했으면 expired', async () => {
    // (a) 같은 포트·같은 비밀로 재시작 → 방이 없다 → restarted
    const port = await freePort();
    const s1 = await boot({ PORT: String(port) });
    useServer(s1);
    const a = await newHost();
    await s1.close();
    const s2 = await boot({ PORT: String(port) });
    try {
      await until(() => snap(a.host.c).status === 'ended', '재시작 종료(a)', 15_000);
      expect(snap(a.host.c).endReason).toBe('restarted');
    } finally {
      await s2.close();
    }

    // (b) 다른 서명 비밀로 재시작 → 토큰 거부 → expired
    const s3 = await boot({ PORT: String(port) });
    useServer(s3);
    const b = await newHost();
    await s3.close();
    const s4 = await boot({ PORT: String(port), SESSION_SECRET: `${SECRET}-rotated` });
    try {
      await until(() => snap(b.host.c).status === 'ended', '재시작 종료(b)', 15_000);
      expect(snap(b.host.c).endReason).toBe('expired');
    } finally {
      await s4.close();
    }

    // (c) 서버가 참가자를 이미 정리했다 → PARTICIPANT_GONE → expired
    useServer(srv);
    const { roomId, host } = await newHost();
    const guest = await enter(roomId, 'Guest');
    await until(() => snap(host.c).participants.length === 2, '2명');
    srv.rooms.leave(roomId, guest.id);
    srv.disconnectAll();
    await until(() => snap(guest.c).status === 'ended', '만료 종료(c)', 15_000);
    expect(snap(guest.c).endReason).toBe('expired');
    await until(() => snap(host.c).status === 'live', '호스트는 복구', 10_000);
    expect(snap(host.c).participants.map((p) => p.id)).toEqual([host.id]);
  }, 60_000);

  it('IT-70 [NFR-15,KPI-05,POL-09] 경로 보고(direct·relay)는 서버 스키마를 통과해 식별자 없는 로그 한 줄로만 남는다', async () => {
    const lines: string[] = [];
    const s = await boot({}, lines);
    try {
      useServer(s);
      const { roomId, host } = await newHost();
      const guest = await enter(roomId, 'Guest');
      await until(() => snap(host.c).participants.length === 2, '2명');
      transportOf(host.c).events.pathType?.(guest.id, 'relay');
      transportOf(guest.c).events.pathType?.(host.id, 'direct');
      await until(() => lines.filter((l) => l.includes('"kpi":"path"')).length === 2, '경로 로그 2줄');
      const kpi = lines.filter((l) => l.includes('"kpi":"path"')).map((l) => JSON.parse(l) as Record<string, unknown>);
      expect(kpi.map((k) => k.path).sort()).toEqual(['direct', 'relay']);
      for (const k of kpi) {
        expect(Object.keys(k).filter((x) => !['level', 'time', 'pid', 'hostname', 'msg', 'kpi', 'path'].includes(x))).toEqual([]);
      }
      const all = lines.join('\n');
      for (const secret of [roomId, host.id, guest.id, snap(host.c).selfId, '127.0.0.1']) expect(all.includes(secret)).toBe(false);
      expect(calls.filter((c) => c.event === 'metrics:path').every((c) => c.res.ok)).toBe(true);
    } finally {
      await s.close();
    }
  });
});

describe('F2 미디어 상태 동기화: 속도 제한과 컨트롤러', () => {
  it('IT-88 [FR-08,FR-13,SEC-06] 마이크를 짧은 시간에 연타해 서버 media:state 속도 제한(10회, 초당 5)에 걸려도 결국 컨트롤러 표시와 서버·다른 참가자가 보는 상태가 같아져야 한다 (DEF-I-02 재현)', async () => {
    const r = await createRoom();
    if (!r.ok) throw new Error('createRoom');
    const media = fakeMedia();
    (media as unknown as { audio: object }).audio = {}; // 마이크 트랙이 있는 장치
    const c = new MeetingController();
    live.push(c);
    expect(await c.join({ roomId: r.data.roomId, nickname: 'Host', media, hostClaim: r.data.hostClaim })).toEqual({ ok: true });
    for (let i = 0; i < 12; i++) c.toggleMic(); // 입장 시 1회 + 12회 = 13회 > 용량 10
    await sleep(2500); // 버킷이 다시 차고도 남는 시간
    const server = [...(srv.rooms.get(r.data.roomId)?.participants.values() ?? [])][0];
    expect(calls.some((x) => x.event === 'media:state' && x.res.code === 'RATE_LIMITED')).toBe(true); // 거부가 실제로 있었다(전제)
    expect(server?.audio).toBe(snap(c).micOn);
  });
});

describe('F5 법적·메타·운영자 종료: 서버 응답 ↔ 웹 파서·종료 경로', () => {
  it('IT-71 [POL-19,POL-17,POL-20,SEC-07] /api/meta 실제 응답이 웹 parseMeta·getMeta를 통과하고(설정 있음/없음 모두) 호스트명만 담긴다', async () => {
    const empty = await getMeta();
    expect(empty).toEqual({ ok: true, data: { v: 1, operator: { contact: null, privacyOfficer: null }, legal: { effectiveDate: null }, network: { stunHosts: ['stun.l.google.com'], turnHosts: [] } } });
    const s = await boot({ OPERATOR_CONTACT: 'ops@example.com', PRIVACY_OFFICER: 'Kim', LEGAL_EFFECTIVE_DATE: '2026-10-01', TURN_URLS: 'turn:turn.example.test:3478?transport=udp,turns:[::1]:5349', TURN_SECRET: 'turn-secret-turn-secret-1234' });
    try {
      useServer(s);
      const full = await getMeta();
      expect(full).toEqual({ ok: true, data: { v: 1, operator: { contact: 'ops@example.com', privacyOfficer: 'Kim' }, legal: { effectiveDate: '2026-10-01' }, network: { stunHosts: ['stun.l.google.com'], turnHosts: ['turn.example.test', '[::1]'] } } });
      expect(JSON.stringify(full)).not.toMatch(/turn-secret|3478|transport=/);
    } finally {
      await s.close();
    }
  });

  it('IT-72 [POL-19,EVT-34,FR-21] 운영자 방 폐쇄: 모든 컨트롤러가 operator로 끝나고 재연결·재시도를 하지 않으며 방 상태 조회는 exists=false', async () => {
    const adminPort = await freePort();
    const token = 'admin-token-admin-token-admin-token-1';
    const s = await boot({ ADMIN_PORT: String(adminPort), ADMIN_TOKEN: token });
    try {
      useServer(s);
      const { roomId, host } = await newHost();
      const guest = await enter(roomId, 'Guest');
      await until(() => snap(host.c).participants.length === 2, '2명');
      const url = `http://127.0.0.1:${s.adminPort}/admin/rooms/${roomId}/close`;
      const denied = await realFetch(url, { method: 'POST', headers: { authorization: 'Bearer wrong' } });
      expect(denied.status).toBe(401);
      expect(snap(host.c).status).toBe('live');
      const ok = await realFetch(url, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
      expect(ok.status).toBe(200);
      expect(await ok.json()).toEqual({ closed: true, participants: 2 });
      await until(() => snap(host.c).status === 'ended' && snap(guest.c).status === 'ended', '운영자 종료', 5000);
      expect(snap(host.c).endReason).toBe('operator');
      expect(snap(guest.c).endReason).toBe('operator');
      await sleep(2500);
      expect(snap(host.c).status).toBe('ended');
      expect(snap(guest.c).status).toBe('ended');
      expect(calls.filter((c) => c.event === 'room:resume')).toEqual([]);
      const st = await getRoomStatus(roomId);
      expect(st.ok && st.data.exists).toBe(false);
    } finally {
      await s.close();
    }
  }, 20_000);
});
