import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Socket } from 'socket.io-client';
import type { RunningServer } from '../src/server';
import { signToken } from '../src/security/token';
import { boot, connect, createRoom, emit, hostRoom, join, once, sleep } from './helpers';

const sockets: Socket[] = [];
const track = <T extends { socket: Socket }>(j: T): T => {
  sockets.push(j.socket);
  return j;
};
afterEach(() => {
  while (sockets.length) sockets.pop()?.close();
});

let srv: RunningServer;
beforeAll(async () => {
  srv = await boot({ MAX_PARTICIPANTS: '3', RECONNECT_GRACE_SEC: '1', RATE_LIMIT_SCALE: '100' });
});
afterAll(async () => srv.close());

describe('입장과 검증 (SEC-03, SEC-06)', () => {
  it('TC-30 [FR-03,SEC-03] 호스트 클레임으로 입장하면 ack에 세션 토큰·참가자 ID·ICE 서버가 온다', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    expect(host.res.ok).toBe(true);
    expect(typeof host.res.token).toBe('string');
    expect(host.res.hostId).toBe(host.id);
    expect(Array.isArray(host.res.iceServers)).toBe(true);
    expect(roomId).toHaveLength(22);
  });

  it('TC-31 [SEC-06] 잘못된 페이로드는 모두 INVALID_PAYLOAD로 거부된다', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const bad: unknown[] = [
      null,
      'string',
      42,
      {},
      { v: 2, roomId, nickname: 'a' },
      { v: 1, roomId: 'short', nickname: 'a' },
      { v: 1, roomId, nickname: '' },
      { v: 1, roomId, nickname: '<script>' },
      { v: 1, roomId, nickname: 'a'.repeat(200) },
      { v: 1, roomId, nickname: 'a', extra: 1 },
      { v: 1, roomId, nickname: 'a', password: 1 },
    ];
    for (const payload of bad) {
      const s = await connect(srv.port); // 소켓별 속도 제한(입장 5회)에 걸리지 않도록 요청마다 새 소켓
      const r = await emit(s, 'room:join', payload);
      s.close();
      expect(r, JSON.stringify(payload)).toMatchObject({ ok: false, code: 'INVALID_PAYLOAD' });
    }
  });

  it('TC-32 [SEC-03] 입장하지 않은 소켓의 모든 이벤트는 NOT_JOINED로 거부된다', async () => {
    const s = track({ socket: await connect(srv.port) }).socket;
    const cases: Array<[string, unknown]> = [
      ['chat:send', { v: 1, text: 'hi' }],
      ['signal:send', { v: 1, to: 'abcdefgh', candidate: { candidate: 'c' } }],
      ['media:state', { v: 1, audio: false, video: false }],
      ['host:lock', { v: 1, locked: true }],
      ['host:kick', { v: 1, targetId: 'abcdefgh' }],
      ['host:muteAll', { v: 1 }],
      ['screen:start', { v: 1 }],
    ];
    for (const [event, payload] of cases) {
      expect(await emit(s, event, payload), event).toMatchObject({ ok: false, code: 'NOT_JOINED' });
    }
  });

  it('TC-33 [FR-07,POL-01] 정원을 넘은 입장은 ROOM_FULL로 거부된다', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    track(await join(srv.port, roomId, 'a'));
    track(await join(srv.port, roomId, 'b'));
    const c = track(await join(srv.port, roomId, 'c'));
    expect(c.res).toMatchObject({ ok: false, code: 'ROOM_FULL' });
  });

  it('TC-34 [FR-23,POL-13] 호스트 입장 전 일반 참가자는 HOST_NOT_PRESENT', async () => {
    const { roomId } = await createRoom(srv.port);
    const g = track(await join(srv.port, roomId, 'guest'));
    expect(g.res).toMatchObject({ ok: false, code: 'HOST_NOT_PRESENT' });
  });

  it('TC-35 [SEC-05] 위조된 호스트 클레임으로는 호스트가 될 수 없다', async () => {
    const { roomId } = await createRoom(srv.port);
    const forged = signToken({ t: 'h', rid: roomId, exp: Date.now() + 60_000 }, 'wrong-secret-wrong-secret-wrong-secret!!');
    const g = track(await join(srv.port, roomId, 'evil', { hostClaim: forged }));
    expect(g.res).toMatchObject({ ok: false, code: 'HOST_NOT_PRESENT' });
  });

  it('TC-36 [SEC-05] 다른 방의 호스트 클레임은 쓸 수 없다', async () => {
    const a = await createRoom(srv.port);
    const b = await createRoom(srv.port);
    const g = track(await join(srv.port, b.roomId, 'evil', { hostClaim: a.hostClaim }));
    expect(g.res).toMatchObject({ ok: false, code: 'HOST_NOT_PRESENT' });
  });

  it('TC-37 [FR-03,POL-04] 같은 닉네임은 번호가 붙는다', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const a = track(await join(srv.port, roomId, '호스트'));
    expect(a.res.ok).toBe(true);
    const list = a.res.participants as Array<{ nickname: string }>;
    expect(list.map((p) => p.nickname)).toContain('호스트 (2)');
  });
});

describe('사칭 방지와 릴레이 (SEC-04)', () => {
  it('TC-40 [SEC-04] signal에 발신자(from)를 넣어 보내면 거부된다', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const a = track(await join(srv.port, roomId, 'a'));
    const r = await emit(a.socket, 'signal:send', { v: 1, to: host.id, from: host.id, candidate: { candidate: 'x' } });
    expect(r).toMatchObject({ ok: false, code: 'INVALID_PAYLOAD' });
  });

  it('TC-41 [SEC-04,FR-07] 정상 신호의 from은 서버가 부여한 발신자 ID다', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const a = track(await join(srv.port, roomId, 'a'));
    const got = once<{ from: string; description: { type: string } }>(host.socket, 'signal:recv');
    const r = await emit(a.socket, 'signal:send', { v: 1, to: host.id, description: { type: 'offer', sdp: 'v=0' } });
    expect(r.ok).toBe(true);
    const msg = await got;
    expect(msg.from).toBe(a.id);
    expect(msg.from).not.toBe(host.id);
  });

  it('TC-42 [SEC-04] 다른 방 참가자에게는 릴레이되지 않는다', async () => {
    const r1 = await hostRoom(srv.port);
    const r2 = await hostRoom(srv.port);
    track(r1.host);
    track(r2.host);
    let leaked = false;
    r2.host.socket.on('signal:recv', () => (leaked = true));
    const res = await emit(r1.host.socket, 'signal:send', { v: 1, to: r2.host.id, candidate: { candidate: 'x' } });
    expect(res).toMatchObject({ ok: false, code: 'TARGET_NOT_FOUND' });
    await sleep(100);
    expect(leaked).toBe(false);
  });

  it('TC-43 [SEC-06] SDP 16KB 초과와 소켓 메시지 32KB 초과는 거부된다', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const a = track(await join(srv.port, roomId, 'a'));
    const r = await emit(a.socket, 'signal:send', { v: 1, to: host.id, description: { type: 'offer', sdp: 'x'.repeat(16_385) } });
    expect(r).toMatchObject({ ok: false, code: 'INVALID_PAYLOAD' });
    const closed = new Promise<string>((resolve) => a.socket.once('disconnect', (reason) => resolve(reason)));
    a.socket.emit('chat:send', { v: 1, text: 'x'.repeat(40_000) }, () => undefined);
    expect(await closed).toBeTruthy();
  });

  it('TC-44 [SEC-04] 자기 자신에게 보내는 신호는 거부된다', async () => {
    const { host } = await hostRoom(srv.port);
    track(host);
    const r = await emit(host.socket, 'signal:send', { v: 1, to: host.id, candidate: { candidate: 'x' } });
    expect(r).toMatchObject({ ok: false, code: 'TARGET_NOT_FOUND' });
  });
});

describe('세션 토큰 (SEC-03, FR-20)', () => {
  it('TC-50 [SEC-03] 위조·변조·형식 오류 토큰은 TOKEN_INVALID', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const forged = signToken({ t: 's', rid: roomId, pid: host.id, exp: Date.now() + 60_000 }, 'wrong-secret-wrong-secret-wrong-secret!!');
    const tampered = `${host.token.split('.')[0]}.${'A'.repeat(43)}`;
    for (const token of [forged, tampered, 'garbage-garbage-garbage-garbage', `${host.token}x`]) {
      const s = track({ socket: await connect(srv.port) }).socket;
      expect(await emit(s, 'room:resume', { v: 1, token }), token).toMatchObject({ ok: false, code: 'TOKEN_INVALID' });
    }
  });

  it('TC-51 [SEC-03] 호스트 클레임 토큰은 세션 토큰으로 쓸 수 없다', async () => {
    const { roomId, hostClaim } = await createRoom(srv.port);
    void roomId;
    const s = track({ socket: await connect(srv.port) }).socket;
    expect(await emit(s, 'room:resume', { v: 1, token: hostClaim })).toMatchObject({ ok: false, code: 'TOKEN_INVALID' });
  });

  it('TC-52 [FR-20,SEC-03] 유예 안에 세션 토큰으로 재접속하면 같은 자리(ID·호스트)를 복구한다', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const a = track(await join(srv.port, roomId, 'a'));
    const updated = once<{ id: string; connection: string }>(host.socket, 'room:participantUpdated');
    a.socket.disconnect();
    expect(await updated).toMatchObject({ id: a.id, connection: 'reconnecting' });
    const s = track({ socket: await connect(srv.port) }).socket;
    const r = await emit(s, 'room:resume', { v: 1, token: a.token });
    expect(r).toMatchObject({ ok: true, selfId: a.id });
    const me = (r.participants as Array<{ id: string; connection: string }>).find((p) => p.id === a.id);
    expect(me?.connection).toBe('connected');
  });

  it('TC-53 [FR-20,POL-08] 유예가 지나면 퇴장 처리되어 재접속할 수 없다', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const a = track(await join(srv.port, roomId, 'a'));
    const left = once<{ id: string; reason: string }>(host.socket, 'room:participantLeft', 5000);
    a.socket.disconnect();
    expect(await left).toMatchObject({ id: a.id, reason: 'timeout' });
    const s = track({ socket: await connect(srv.port) }).socket;
    expect(await emit(s, 'room:resume', { v: 1, token: a.token })).toMatchObject({ ok: false, code: 'PARTICIPANT_GONE' });
  });

  it('TC-54 [SEC-03] 서버가 재시작되어 방이 없으면 ROOM_NOT_FOUND(재접속 안내용)', async () => {
    const { host } = await hostRoom(srv.port);
    const token = host.token;
    host.socket.close();
    const other = await boot({ MAX_PARTICIPANTS: '3', RATE_LIMIT_SCALE: '100' }); // 같은 SECRET, 방 상태는 비어 있음
    try {
      const s = track({ socket: await connect(other.port) }).socket;
      expect(await emit(s, 'room:resume', { v: 1, token })).toMatchObject({ ok: false, code: 'ROOM_NOT_FOUND' });
    } finally {
      await other.close();
    }
  });
});

describe('호스트 기능 서버 권한 (SEC-05)', () => {
  it('TC-60 [FR-14,FR-15,FR-16,SEC-05] 비호스트의 lock/kick/muteAll 위조 요청은 FORBIDDEN', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const a = track(await join(srv.port, roomId, 'a'));
    expect(await emit(a.socket, 'host:lock', { v: 1, locked: true })).toMatchObject({ ok: false, code: 'FORBIDDEN' });
    expect(await emit(a.socket, 'host:kick', { v: 1, targetId: host.id })).toMatchObject({ ok: false, code: 'FORBIDDEN' });
    expect(await emit(a.socket, 'host:muteAll', { v: 1 })).toMatchObject({ ok: false, code: 'FORBIDDEN' });
  });

  it('TC-61 [FR-14,POL-03] 호스트가 잠그면 신규 입장은 ROOM_LOCKED, 해제하면 입장 가능', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    expect(await emit(host.socket, 'host:lock', { v: 1, locked: true })).toMatchObject({ ok: true });
    const b = track(await join(srv.port, roomId, 'b'));
    expect(b.res).toMatchObject({ ok: false, code: 'ROOM_LOCKED' });
    await emit(host.socket, 'host:lock', { v: 1, locked: false });
    const c = track(await join(srv.port, roomId, 'c'));
    expect(c.res.ok).toBe(true);
  });

  it('TC-62 [FR-15,POL-06,SEC-05] 강퇴된 사람은 소켓이 끊기고 토큰·재입장 모두 거부된다', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const a = track(await join(srv.port, roomId, 'a'));
    const kicked = once<{ reason: string }>(a.socket, 'room:kicked');
    const disconnected = new Promise<void>((resolve) => a.socket.once('disconnect', () => resolve()));
    expect(await emit(host.socket, 'host:kick', { v: 1, targetId: a.id })).toMatchObject({ ok: true });
    expect(await kicked).toMatchObject({ v: 1 });
    await disconnected;
    const s = track({ socket: await connect(srv.port) }).socket;
    expect(await emit(s, 'room:resume', { v: 1, token: a.token })).toMatchObject({ ok: false, code: 'PARTICIPANT_GONE' });
    const again = track(await join(srv.port, roomId, 'a'));
    expect(again.res).toMatchObject({ ok: false, code: 'KICKED' });
  });

  it('TC-63 [FR-15] 호스트는 자기 자신을 강퇴할 수 없다', async () => {
    const { host } = await hostRoom(srv.port);
    track(host);
    expect(await emit(host.socket, 'host:kick', { v: 1, targetId: host.id })).toMatchObject({ ok: false, code: 'CANNOT_KICK_SELF' });
  });

  it('TC-64 [FR-16] 전체 음소거 알림은 호스트를 제외한 참가자에게만 가고 목록 상태가 갱신된다', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const a = track(await join(srv.port, roomId, 'a'));
    let hostGot = false;
    host.socket.on('host:muteAll', () => (hostGot = true));
    const got = once<{ by: string }>(a.socket, 'host:muteAll');
    const upd = once<{ id: string; audio: boolean }>(host.socket, 'room:participantUpdated');
    expect(await emit(host.socket, 'host:muteAll', { v: 1 })).toMatchObject({ ok: true });
    expect((await got).by).toBe(host.id);
    expect(await upd).toMatchObject({ id: a.id, audio: false });
    await sleep(50);
    expect(hostGot).toBe(false);
  });

  it('TC-65 [FR-17] 호스트가 나가면 다음 참가자가 호스트가 되고 알림이 간다', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const a = track(await join(srv.port, roomId, 'a'));
    const changed = once<{ hostId: string }>(a.socket, 'room:hostChanged');
    expect(await emit(host.socket, 'room:leave', { v: 1 })).toMatchObject({ ok: true });
    expect((await changed).hostId).toBe(a.id);
    expect(await emit(a.socket, 'host:lock', { v: 1, locked: true })).toMatchObject({ ok: true });
  });
});

describe('채팅·화면공유 (FR-11, FR-12, SEC-07)', () => {
  it('TC-70 [FR-11,SEC-07] 채팅은 같은 방에만 가고 발신자 정보는 서버가 채운다', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const a = track(await join(srv.port, roomId, 'a'));
    const other = await hostRoom(srv.port);
    track(other.host);
    let leaked = false;
    other.host.socket.on('chat:message', () => (leaked = true));
    const got = once<{ from: string; nickname: string; text: string }>(host.socket, 'chat:message');
    expect(await emit(a.socket, 'chat:send', { v: 1, text: '안녕하세요' })).toMatchObject({ ok: true });
    expect(await got).toMatchObject({ from: a.id, nickname: 'a', text: '안녕하세요' });
    await sleep(50);
    expect(leaked).toBe(false);
  });

  it('TC-71 [FR-11,SEC-07] 500자 초과·빈 메시지는 거부, 제어·방향 문자는 제거, HTML은 그대로(텍스트로만 표시)', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const a = track(await join(srv.port, roomId, 'a'));
    expect(await emit(a.socket, 'chat:send', { v: 1, text: 'x'.repeat(501) })).toMatchObject({ ok: false, code: 'INVALID_PAYLOAD' });
    expect(await emit(a.socket, 'chat:send', { v: 1, text: '   ' })).toMatchObject({ ok: false, code: 'INVALID_PAYLOAD' });
    const got = once<{ text: string }>(host.socket, 'chat:message');
    await emit(a.socket, 'chat:send', { v: 1, text: '<img src=x onerror=alert(1)>‮' });
    expect((await got).text).toBe('<img src=x onerror=alert(1)>');
  });

  it('TC-72 [FR-12,POL-12] 이미 공유 중이면 SCREEN_BUSY, 공유자가 나가면 해제', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const a = track(await join(srv.port, roomId, 'a'));
    expect(await emit(a.socket, 'screen:start', { v: 1 })).toMatchObject({ ok: true });
    expect(await emit(host.socket, 'screen:start', { v: 1 })).toMatchObject({ ok: false, code: 'SCREEN_BUSY' });
    await emit(a.socket, 'room:leave', { v: 1 });
    await sleep(50);
    expect(await emit(host.socket, 'screen:start', { v: 1 })).toMatchObject({ ok: true });
  });

  it('TC-73 [FR-08] 마이크·카메라 상태 변경이 다른 참가자에게 전달된다', async () => {
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const a = track(await join(srv.port, roomId, 'a'));
    const upd = once<{ id: string; audio: boolean; video: boolean }>(host.socket, 'room:participantUpdated');
    await emit(a.socket, 'media:state', { v: 1, audio: false, video: true });
    expect(await upd).toMatchObject({ id: a.id, audio: false, video: true });
  });
});

describe('속도 제한 (SEC-06, POL-10)', () => {
  it('TC-80 [SEC-06] 채팅을 짧은 시간에 반복하면 RATE_LIMITED', async () => {
    const { host } = await hostRoom(srv.port);
    track(host);
    const results = [];
    for (let i = 0; i < 12; i++) results.push(await emit(host.socket, 'chat:send', { v: 1, text: `m${i}` }));
    expect(results.some((r) => r.code === 'RATE_LIMITED')).toBe(true);
    expect(results.filter((r) => r.ok).length).toBeLessThanOrEqual(7);
  });

  it('TC-81 [SEC-06,POL-10] 거부가 반복되면 서버가 연결을 끊는다', async () => {
    const s = track({ socket: await connect(srv.port) }).socket;
    const closed = new Promise<string>((resolve) => s.once('disconnect', (reason) => resolve(reason)));
    for (let i = 0; i < 40; i++) s.emit('room:join', { garbage: i }, () => undefined);
    expect(await closed).toBe('io server disconnect');
  });
});

describe('비밀번호 방 (FR-05, SEC-02)', () => {
  it('TC-90 [FR-05,SEC-02] 올바른 비밀번호만 입장하고 틀린 시도는 제한된다', async () => {
    const { roomId, host } = await hostRoom(srv.port, 'secret-pw-1');
    track(host);
    const wrong = track(await join(srv.port, roomId, 'a', { password: 'nope-nope' }));
    expect(wrong.res).toMatchObject({ ok: false, code: 'WRONG_PASSWORD' });
    const missing = track(await join(srv.port, roomId, 'a'));
    expect(missing.res).toMatchObject({ ok: false, code: 'WRONG_PASSWORD' });
    const ok = track(await join(srv.port, roomId, 'a', { password: 'secret-pw-1' }));
    expect(ok.res.ok).toBe(true);
  });

  it('TC-91 [FR-05,SEC-02,POL-11] 오답이 5회를 넘으면 올바른 비밀번호도 TOO_MANY_ATTEMPTS', async () => {
    const { roomId, host } = await hostRoom(srv.port, 'secret-pw-2');
    track(host);
    for (let i = 0; i < 5; i++) {
      const r = track(await join(srv.port, roomId, 'a', { password: `bad-pass-${i}` }));
      expect(r.res.code).toBe('WRONG_PASSWORD');
    }
    const blocked = track(await join(srv.port, roomId, 'a', { password: 'secret-pw-2' }));
    expect(blocked.res).toMatchObject({ ok: false, code: 'TOO_MANY_ATTEMPTS' });
  });

  it('TC-92 [FR-05,E-12] 호스트는 비밀번호 없이 입장하고, 유효 토큰 재접속은 비밀번호를 다시 묻지 않는다', async () => {
    const { roomId, host } = await hostRoom(srv.port, 'secret-pw-3');
    track(host);
    const a = track(await join(srv.port, roomId, 'a', { password: 'secret-pw-3' }));
    a.socket.disconnect();
    const s = track({ socket: await connect(srv.port) }).socket;
    expect(await emit(s, 'room:resume', { v: 1, token: a.token })).toMatchObject({ ok: true });
  });
});

describe('연결 제한 (SEC-06, SEC-08)', () => {
  it('TC-95 [SEC-08] 허용 목록에 없거나 없는 Origin의 소켓 연결은 거부된다', async () => {
    await expect(connect(srv.port, 'http://evil.example')).rejects.toBeTruthy();
    await expect(connect(srv.port, null)).rejects.toBeTruthy();
  });

  it('TC-96 [SEC-06] IP당 동시 연결 수를 넘으면 연결이 거부된다', async () => {
    const limited = await boot({ IP_MAX_CONNECTIONS: '2', RATE_LIMIT_SCALE: '100' });
    try {
      track({ socket: await connect(limited.port) });
      track({ socket: await connect(limited.port) });
      await expect(connect(limited.port)).rejects.toBeTruthy();
    } finally {
      await limited.close();
    }
  });
});
