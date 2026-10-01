import { createHmac } from 'node:crypto';
import { Writable } from 'node:stream';
import { io, type Socket } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import { createLogger } from '../src/logger';
import { startServer, type RunningServer } from '../src/server';
import { ORIGIN, boot, connect, createRoom, emit, hostRoom, join, makeConfig, once, sleep, type AnyAck, type Joined } from './helpers';

// unit-05(서버 시그널링) 6단계 소급 보강 시험. 제품 코드는 건드리지 않는다.

const servers: RunningServer[] = [];
const sockets: Socket[] = [];
const up = async (overrides: Record<string, string> = {}, now?: () => number): Promise<RunningServer> => {
  const s = await boot({ RATE_LIMIT_SCALE: '100', ...overrides }, now);
  servers.push(s);
  return s;
};
const track = <T extends { socket: Socket }>(j: T): T => {
  sockets.push(j.socket);
  return j;
};
afterEach(async () => {
  while (sockets.length) sockets.pop()?.close();
  while (servers.length) await servers.pop()?.close();
});

/** X-Forwarded-For(TRUST_PROXY=1)로 클라이언트 IP를 흉내 내는 연결 */
async function connectAs(port: number, ip: string): Promise<Socket> {
  const socket = io(`http://127.0.0.1:${port}`, { transports: ['websocket'], reconnection: false, forceNew: true, extraHeaders: { origin: ORIGIN, 'x-forwarded-for': ip } });
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', (e) => reject(e));
  });
  return socket;
}

const decode = (token: string): { t: string; rid: string; pid: string; exp: number } => JSON.parse(Buffer.from(token.split('.')[0] ?? '', 'base64url').toString('utf8')) as { t: string; rid: string; pid: string; exp: number };

describe('unit-05 적대·경계 시험', () => {
  it('TC-441 [SEC-03,FR-03] 이미 입장한 소켓의 join·resume은 ALREADY_JOINED, 비밀번호 방에 동시에 두 번 보낸 join은 정확히 한 번만 성공한다', async () => {
    const s = await up();
    const { roomId, host } = await hostRoom(s.port);
    track(host);
    const other = await hostRoom(s.port);
    track(other.host);
    expect(await emit(host.socket, 'room:join', { v: 1, roomId: other.roomId, nickname: 'x' })).toMatchObject({ ok: false, code: 'ALREADY_JOINED' });
    expect(await emit(host.socket, 'room:resume', { v: 1, token: other.host.token })).toMatchObject({ ok: false, code: 'ALREADY_JOINED' });
    expect(s.rooms.get(other.roomId)?.participants.size).toBe(1);
    expect(s.rooms.get(roomId)?.participants.size).toBe(1);

    // 비밀번호 확인(await) 동안 같은 소켓이 두 번째 join을 보내는 경쟁
    const pw = await hostRoom(s.port, 'secret-pw-race');
    track(pw.host);
    const g = track({ socket: await connect(s.port) });
    const [r1, r2] = await Promise.all([
      emit(g.socket, 'room:join', { v: 1, roomId: pw.roomId, nickname: 'g', password: 'secret-pw-race' }),
      emit(g.socket, 'room:join', { v: 1, roomId: pw.roomId, nickname: 'g', password: 'secret-pw-race' }),
    ]);
    expect([r1.ok, r2.ok].filter(Boolean)).toHaveLength(1);
    expect([r1, r2].find((r) => !r.ok)).toMatchObject({ code: 'ALREADY_JOINED' });
    expect(s.rooms.get(pw.roomId)?.participants.size).toBe(2); // 호스트 + 1명(같은 소켓이 두 자리를 차지하지 않음)
  });

  it('TC-442 [SEC-03] 세션 토큰은 4시간 단기 토큰: 본문(t,rid,pid,exp)이 서버 값에 묶이고, 만료 1ms 전 재접속 성공·만료 시각 정각 거부', async () => {
    let clock = 1_800_000_000_000;
    const s = await up({ RECONNECT_GRACE_SEC: '300' }, () => clock);
    const { roomId, host } = await hostRoom(s.port);
    track(host);
    const a = track(await join(s.port, roomId, 'a'));
    const payload = decode(a.token);
    expect(payload).toEqual({ t: 's', rid: roomId, pid: a.id, exp: clock + 4 * 60 * 60_000 });
    expect(a.token.length).toBeLessThanOrEqual(512);

    a.socket.disconnect();
    clock += 4 * 60 * 60_000 - 1;
    const ok = track({ socket: await connect(s.port) });
    expect(await emit(ok.socket, 'room:resume', { v: 1, token: a.token })).toMatchObject({ ok: true, selfId: a.id });
    ok.socket.disconnect();
    await sleep(200);
    clock += 1; // 정확히 만료 시각
    const late = track({ socket: await connect(s.port) });
    expect(await emit(late.socket, 'room:resume', { v: 1, token: a.token })).toMatchObject({ ok: false, code: 'TOKEN_INVALID' });
    // 만료 토큰으로는 자리가 남아 있어도 복구할 수 없다(참가자는 유예 안이라 방에 있음)
    expect(s.rooms.isMember(roomId, a.id)).toBe(true);
  });

  it('TC-443 [SEC-06,POL-10] 이벤트별 속도 제한(api-spec §3): 모든 이벤트가 용량을 넘기면 RATE_LIMITED, 용량 안은 처리된다', async () => {
    const s = await up();
    const table: Array<[string, number, (j: Joined, roomId: string, peerId: string) => unknown]> = [
      ['room:join', 5, (_j, rid) => ({ v: 1, roomId: rid, nickname: 'z' })],
      ['room:resume', 10, () => ({ v: 1, token: 'x'.repeat(30) })],
      ['signal:send', 120, (_j, _r, peer) => ({ v: 1, to: peer, candidate: { candidate: 'c' } })],
      ['chat:send', 5, () => ({ v: 1, text: 'hi' })],
      ['media:state', 10, () => ({ v: 1, audio: true, video: true })],
      ['screen:start', 4, () => ({ v: 1 })],
      ['screen:stop', 4, () => ({ v: 1 })],
      ['host:lock', 5, () => ({ v: 1, locked: false })],
      ['host:kick', 5, () => ({ v: 1, targetId: 'nonexistent1' })],
      ['host:muteAll', 5, () => ({ v: 1 })],
      ['metrics:path', 10, () => ({ v: 1, path: 'direct' })],
    ];
    for (const [event, capacity, payload] of table) {
      const { roomId, host } = await hostRoom(s.port);
      track(host);
      const peer = track(await join(s.port, roomId, 'peer'));
      const total = capacity + 9; // 거부 수가 연결 종료 기준(15회)보다 적게 유지
      const acks = await Promise.all(Array.from({ length: total }, () => emit(host.socket, event, payload(host, roomId, peer.id))));
      const limited = acks.filter((a) => a.code === 'RATE_LIMITED').length;
      const handled = acks.length - limited;
      expect(limited, `${event} 초과 요청이 제한되어야 함`).toBeGreaterThanOrEqual(5);
      expect(handled, `${event} 용량 근처까지만 처리`).toBeLessThanOrEqual(capacity + 4);
      expect(handled, `${event} 용량 안의 요청은 처리`).toBeGreaterThanOrEqual(capacity - 1);
      host.socket.close();
      peer.socket.close();
    }
  });

  it('TC-443b [SEC-06,POL-10] room:leave 속도 제한(3/1)과 반복 거부(미입장·제한) 누적 시 연결 종료', async () => {
    const s = await up();
    const { roomId, host } = await hostRoom(s.port);
    track(host);
    const acks = await Promise.all(Array.from({ length: 12 }, () => emit(host.socket, 'room:leave', { v: 1 })));
    expect(acks.filter((a) => a.code === 'RATE_LIMITED').length).toBeGreaterThanOrEqual(5);
    // 같은 틱에 도착한 중복 leave는 모두 ok일 수 있으나(멱등) 용량(3)을 넘겨 처리되지는 않는다
    expect(acks.filter((a) => a.ok).length).toBeLessThanOrEqual(4);
    await sleep(50);
    expect(s.rooms.isMember(roomId, host.id)).toBe(false);
  });

  it('TC-444 [SEC-03,FR-20] 같은 세션 토큰으로 두 번째 소켓이 resume하면 이전 소켓은 끊기고 참가자는 재접속 중으로 표시되지 않는다', async () => {
    const s = await up({ RECONNECT_GRACE_SEC: '30' });
    const { roomId, host } = await hostRoom(s.port);
    track(host);
    const a = track(await join(s.port, roomId, 'a'));
    const seen: Array<{ id: string; connection?: string }> = [];
    host.socket.on('room:participantUpdated', (u: { id: string; connection?: string }) => seen.push(u));
    const oldClosed = once<string>(a.socket, 'disconnect');
    const fresh = track({ socket: await connect(s.port) });
    expect(await emit(fresh.socket, 'room:resume', { v: 1, token: a.token })).toMatchObject({ ok: true, selfId: a.id });
    expect(await oldClosed).toBeTruthy();
    await sleep(300);
    expect(seen.filter((u) => u.id === a.id && u.connection === 'reconnecting')).toHaveLength(0);
    expect(s.rooms.participantsOf(roomId).find((p) => p.id === a.id)?.connection).toBe('connected');
    // 새 소켓이 유효한 세션이다
    expect(await emit(fresh.socket, 'chat:send', { v: 1, text: 'back' })).toMatchObject({ ok: true });
    expect(s.rooms.get(roomId)?.participants.size).toBe(2);
  });

  it('TC-444b [SEC-03] room:leave 후 같은 소켓의 이벤트는 NOT_JOINED이고(바인딩 해제), 같은 소켓으로 다시 입장하면 새 참가자 ID를 받는다', async () => {
    const s = await up();
    const { roomId, host } = await hostRoom(s.port);
    track(host);
    const a = track(await join(s.port, roomId, 'a'));
    expect(await emit(a.socket, 'room:leave', { v: 1 })).toMatchObject({ ok: true });
    await sleep(50);
    expect(s.rooms.isMember(roomId, a.id)).toBe(false);
    for (const [event, payload] of [
      ['chat:send', { v: 1, text: 'ghost' }],
      ['signal:send', { v: 1, to: host.id, candidate: { candidate: 'c' } }],
      ['media:state', { v: 1, audio: false, video: false }],
      ['host:muteAll', { v: 1 }],
    ] as const) {
      expect(await emit(a.socket, event, payload), event).toMatchObject({ ok: false, code: 'NOT_JOINED' });
    }
    const again = await emit(a.socket, 'room:join', { v: 1, roomId, nickname: 'a' });
    expect(again.ok).toBe(true);
    expect(again.selfId).not.toBe(a.id);
    // 이전 토큰으로는 이전 자리를 되찾을 수 없다
    const s2 = track({ socket: await connect(s.port) });
    expect(await emit(s2.socket, 'room:resume', { v: 1, token: a.token })).toMatchObject({ ok: false, code: 'PARTICIPANT_GONE' });
  });

  it('TC-444c [SEC-06] IP당 동시 연결 수는 연결이 끊기면 줄어들어 새 연결이 가능하고, 상한을 계속 지킨다', async () => {
    const s = await up({ IP_MAX_CONNECTIONS: '2' });
    const c1 = track({ socket: await connect(s.port) });
    const c2 = track({ socket: await connect(s.port) });
    await expect(connect(s.port)).rejects.toBeTruthy();
    c1.socket.close();
    let c3: Socket | undefined;
    for (let i = 0; i < 40 && !c3; i++) {
      try {
        c3 = await connect(s.port);
      } catch {
        await sleep(50);
      }
    }
    expect(c3, '끊긴 연결 몫이 반환되어야 함').toBeDefined();
    if (c3) sockets.push(c3);
    await expect(connect(s.port)).rejects.toBeTruthy(); // 다시 2개(c2,c3)로 가득 참
    c2.socket.close();
  });

  it('TC-445 [SEC-08,SEC-10] 핸들러 내부 예외는 ack에 일반 코드(INTERNAL)만 싣고 로그에는 예외 종류만 남기며(메시지·경로 없음), 이후에도 연결·서버가 정상이다', async () => {
    const lines: string[] = [];
    const sink = new Writable({
      write(chunk: Buffer, _enc, cb) {
        lines.push(chunk.toString());
        cb();
      },
    });
    const s = await startServer(makeConfig({ RATE_LIMIT_SCALE: '100' }), createLogger('info', sink));
    servers.push(s);
    const { host } = await hostRoom(s.port);
    track(host);
    const original = s.rooms.setMedia.bind(s.rooms);
    s.rooms.setMedia = () => {
      throw new Error('boom-secret /srv/app/rooms.ts');
    };
    const res = await emit(host.socket, 'media:state', { v: 1, audio: false, video: false });
    expect(res).toEqual({ ok: false, code: 'INTERNAL', message: 'internal error' });
    expect(JSON.stringify(res)).not.toMatch(/boom-secret|\.ts|stack/);
    s.rooms.setMedia = original;
    expect(await emit(host.socket, 'media:state', { v: 1, audio: false, video: true })).toMatchObject({ ok: true });
    expect(await emit(host.socket, 'chat:send', { v: 1, text: 'still alive' })).toMatchObject({ ok: true });
    const log = lines.join('');
    expect(log).toContain('handler error');
    expect(log).not.toContain('boom-secret');
    expect(log).not.toContain('still alive'); // 채팅 본문은 어떤 로그에도 없다
  });

  it('TC-445b [SEC-06] ack 콜백이 없거나 함수가 아닌 emit(잘못된 페이로드 포함)을 보내도 서버가 죽지 않고 계속 응답한다', async () => {
    const s = await up();
    const raw = track({ socket: await connect(s.port) });
    const { roomId } = await createRoom(s.port);
    raw.socket.emit('room:join');
    raw.socket.emit('room:join', null);
    raw.socket.emit('room:join', { garbage: true });
    raw.socket.emit('room:join', { v: 1, roomId, nickname: 'x' }); // ack 없음(호스트 없음 -> 거부)
    raw.socket.emit('chat:send', 'string-payload', 'not-a-function');
    raw.socket.emit('signal:send', { v: 1 }, 42);
    raw.socket.emit('host:kick', undefined, undefined);
    raw.socket.emit('unknown:event', { v: 1 }, () => undefined);
    await sleep(200);
    const health = await fetch(`http://127.0.0.1:${s.port}/healthz`);
    expect(health.status).toBe(200);
    const fresh = await hostRoom(s.port);
    track(fresh.host);
    expect(fresh.host.res.ok).toBe(true);
  });

  it('TC-446 [FR-03,POL-04] 닉네임은 서버가 정규화한 값으로 저장·표시된다(공백 정리, NFC), 채팅 발신자 이름도 그 값이다', async () => {
    const s = await up();
    const { roomId, host } = await hostRoom(s.port);
    track(host);
    const a = track(await join(s.port, roomId, '  민지   2  '));
    expect((a.res.participants as Array<{ id: string; nickname: string }>).find((p) => p.id === a.id)?.nickname).toBe('민지 2');
    const dec = track(await join(s.port, roomId, '한글'.normalize('NFD')));
    expect((dec.res.participants as Array<{ id: string; nickname: string }>).find((p) => p.id === dec.id)?.nickname).toBe('한글');
    const got = once<{ nickname: string }>(host.socket, 'chat:message');
    await emit(a.socket, 'chat:send', { v: 1, text: 'hi' });
    expect((await got).nickname).toBe('민지 2');
  });

  it('TC-446b [SEC-04] 신호 릴레이: candidate·description 내용은 그대로 전달되고(from만 서버 값) 다른 종류의 키는 붙지 않으며, 수신자 외에는 받지 못한다', async () => {
    const s = await up();
    const { roomId, host } = await hostRoom(s.port);
    track(host);
    const a = track(await join(s.port, roomId, 'a'));
    const b = track(await join(s.port, roomId, 'b'));
    let bGot = false;
    b.socket.on('signal:recv', () => (bGot = true));
    const cand = { candidate: 'candidate:1 1 UDP 2122 192.0.2.1 5000 typ host', sdpMid: 'audio', sdpMLineIndex: 0, usernameFragment: 'uf1' };
    const p1 = once<Record<string, unknown>>(a.socket, 'signal:recv');
    expect(await emit(host.socket, 'signal:send', { v: 1, to: a.id, candidate: cand })).toMatchObject({ ok: true });
    expect(await p1).toEqual({ v: 1, from: host.id, candidate: cand });
    const p2 = once<Record<string, unknown>>(a.socket, 'signal:recv');
    await emit(host.socket, 'signal:send', { v: 1, to: a.id, description: { type: 'answer', sdp: 'v=0\r\n' } });
    expect(await p2).toEqual({ v: 1, from: host.id, description: { type: 'answer', sdp: 'v=0\r\n' } });
    await sleep(100);
    expect(bGot).toBe(false);
  });

  it('TC-446c [SEC-03,SEC-09,SEC-10] 입장 ack·참가자 알림에 내부 필드가 없다: 토큰은 서버 값에 묶이고, 참가자 객체 키는 공개 항목뿐(IP 키 없음), TURN 자격증명은 임시값이며 비밀값·해시가 응답에 없다', async () => {
    const turnSecret = 'turn-secret-turn-secret-xyz';
    const s = await up({ TURN_URLS: 'turn:t.example:3478', TURN_SECRET: turnSecret, MAX_PARTICIPANTS: '4' });
    const { roomId, host } = await hostRoom(s.port, 'room-pw-1234');
    track(host);
    const before = Date.now();
    const joinedEvent = once<{ participant: Record<string, unknown> }>(host.socket, 'room:participantJoined');
    const a = track(await join(s.port, roomId, 'a', { password: 'room-pw-1234' }));
    const after = Date.now();
    expect(a.res.ok).toBe(true);
    const p = decode(a.token);
    expect(p).toMatchObject({ t: 's', rid: roomId, pid: a.id });
    expect(p.exp).toBeGreaterThanOrEqual(before + 4 * 3_600_000);
    expect(p.exp).toBeLessThanOrEqual(after + 4 * 3_600_000);
    const keys = ['audio', 'connection', 'id', 'isHost', 'joinSeq', 'nickname', 'screen', 'video'];
    for (const x of a.res.participants as Array<Record<string, unknown>>) expect(Object.keys(x).sort()).toEqual(keys);
    expect(Object.keys((await joinedEvent).participant).sort()).toEqual(keys);
    const ice = a.res.iceServers as Array<{ urls: string[]; username?: string; credential?: string }>;
    const turn = ice.find((x) => x.username);
    expect(turn?.username).toMatch(new RegExp(`^\\d+:${a.id}$`));
    expect(turn?.credential).toBe(createHmac('sha1', turnSecret).update(turn?.username ?? '').digest('base64'));
    expect(Number(turn?.username?.split(':')[0]) * 1000).toBeGreaterThan(before);
    const dump = JSON.stringify(a.res);
    for (const forbidden of [turnSecret, 'room-pw-1234', 'test-secret-test-secret', '$2a$', '$2b$', 'ipKey', 'passwordHash', 'hostClaim']) expect(dump, forbidden).not.toContain(forbidden);
    expect(a.res.config).toEqual({ maxParticipants: 4, reconnectGraceSec: 20 });
  });

  it('TC-446d [SEC-08] 오류 ack는 {ok,code,message}뿐이고 message는 짧은 일반 문구이다(경로·스택·내부 값 없음)', async () => {
    const s = await up({ MAX_PARTICIPANTS: '2' });
    const { roomId, host } = await hostRoom(s.port, 'pw-secret-1');
    track(host);
    const sock = track({ socket: await connect(s.port) }).socket;
    const acks: AnyAck[] = [
      await emit(sock, 'room:join', { garbage: 1 }), // INVALID_PAYLOAD
      await emit(sock, 'chat:send', { v: 1, text: 'x' }), // NOT_JOINED
      await emit(sock, 'room:join', { v: 1, roomId: 'Z'.repeat(22), nickname: 'q' }), // ROOM_NOT_FOUND
      await emit(sock, 'room:join', { v: 1, roomId, nickname: 'q', password: 'wrong-pw' }), // WRONG_PASSWORD
      await emit(sock, 'room:resume', { v: 1, token: 'garbage-garbage-garbage-garbage' }), // TOKEN_INVALID
    ];
    const g = track(await join(s.port, roomId, 'g', { password: 'pw-secret-1' }));
    acks.push(await emit(g.socket, 'host:lock', { v: 1, locked: true })); // FORBIDDEN
    acks.push((await join(s.port, roomId, 'h', { password: 'pw-secret-1' })).res); // ROOM_FULL
    expect(acks.map((a) => a.code)).toEqual(['INVALID_PAYLOAD', 'NOT_JOINED', 'ROOM_NOT_FOUND', 'WRONG_PASSWORD', 'TOKEN_INVALID', 'FORBIDDEN', 'ROOM_FULL']);
    for (const a of acks) {
      expect(Object.keys(a).sort(), String(a.code)).toEqual(['code', 'message', 'ok']);
      expect(a.ok).toBe(false);
      expect(String(a.message), String(a.code)).toMatch(/^[a-z ]{5,40}$/);
    }
  });

  it('TC-447 [SEC-02,POL-11] 비밀번호 오답 제한은 IP+방 단위다: 한 방에서 차단돼도 다른 방·다른 IP에는 영향이 없다', async () => {
    const s = await up({ TRUST_PROXY: '1' });
    const A = await hostRoom(s.port, 'secret-pw-A1');
    const B = await hostRoom(s.port, 'secret-pw-B1');
    track(A.host);
    track(B.host);
    const ip1 = '198.51.100.1';
    const ip2 = '198.51.100.2';
    const tryJoin = async (ip: string, roomId: string, password: string): Promise<AnyAck> => {
      const sock = await connectAs(s.port, ip);
      return emit(sock, 'room:join', { v: 1, roomId, nickname: 'g', password });
    };
    for (let i = 0; i < 5; i++) expect((await tryJoin(ip1, A.roomId, `bad-pass-${i}`)).code).toBe('WRONG_PASSWORD');
    expect(await tryJoin(ip1, A.roomId, 'secret-pw-A1')).toMatchObject({ ok: false, code: 'TOO_MANY_ATTEMPTS' }); // 같은 IP+방: 차단
    expect((await tryJoin(ip1, B.roomId, 'secret-pw-B1')).ok).toBe(true); // 같은 IP, 다른 방
    expect((await tryJoin(ip2, A.roomId, 'secret-pw-A1')).ok).toBe(true); // 다른 IP, 같은 방
  });

  it('TC-447b [SEC-06] IP별 입장 시도 제한(30회 버스트): 한 IP가 소진해도 다른 IP는 입장 시도를 할 수 있고, 제한은 새 소켓으로 우회되지 않는다', async () => {
    const s = await up({ TRUST_PROXY: '1', RATE_LIMIT_SCALE: '1' });
    const ghost = 'Z'.repeat(22);
    const codes: string[] = [];
    for (let i = 0; i < 40; i++) {
      const sock = await connectAs(s.port, '203.0.113.50');
      codes.push(String((await emit(sock, 'room:join', { v: 1, roomId: ghost, nickname: 'g' })).code));
      sock.close();
    }
    const notFound = codes.filter((c) => c === 'ROOM_NOT_FOUND').length;
    expect(codes).toContain('RATE_LIMITED');
    expect(notFound).toBeGreaterThanOrEqual(30);
    expect(notFound).toBeLessThanOrEqual(36); // 용량 30 + 시험 중 보충(0.5/초)
    const other = await connectAs(s.port, '203.0.113.51');
    expect(await emit(other, 'room:join', { v: 1, roomId: ghost, nickname: 'g' })).toMatchObject({ ok: false, code: 'ROOM_NOT_FOUND' });
  });

  it('TC-448 [SEC-04,SEC-05] 방 격리: 다른 방 참가자를 강퇴·음소거·잠금할 수 없고 다른 방 참가자의 상태는 그대로다', async () => {
    const s = await up();
    const r1 = await hostRoom(s.port);
    const r2 = await hostRoom(s.port);
    track(r1.host);
    track(r2.host);
    const victim = track(await join(s.port, r2.roomId, 'victim'));
    expect(await emit(r1.host.socket, 'host:kick', { v: 1, targetId: victim.id })).toMatchObject({ ok: false, code: 'TARGET_NOT_FOUND' });
    expect(await emit(r1.host.socket, 'host:kick', { v: 1, targetId: r2.host.id })).toMatchObject({ ok: false, code: 'TARGET_NOT_FOUND' });
    await emit(r1.host.socket, 'host:muteAll', { v: 1 });
    await emit(r1.host.socket, 'host:lock', { v: 1, locked: true });
    expect(s.rooms.get(r2.roomId)?.participants.get(victim.id)).toMatchObject({ audio: true });
    expect(s.rooms.get(r2.roomId)?.locked).toBe(false);
    expect(s.rooms.get(r1.roomId)?.locked).toBe(true);
    expect(s.rooms.isMember(r2.roomId, victim.id)).toBe(true);
    // 다른 방의 참가자 ID로 신호·미디어 상태를 위조할 수 없다(자기 상태만 바뀐다)
    await emit(r1.host.socket, 'media:state', { v: 1, audio: false, video: false });
    expect(s.rooms.get(r2.roomId)?.participants.get(victim.id)).toMatchObject({ audio: true, video: true });
  });
  it('TC-448b [SEC-08,SEC-06] 소켓 전송은 websocket만 허용한다: HTTP long-polling 핸드셰이크는 허용 Origin에서도 세션(sid)을 열어 주지 않는다', async () => {
    const s = await up();
    for (const origin of [ORIGIN, 'http://evil.example']) {
      const res = await fetch(`http://127.0.0.1:${s.port}/socket.io/?EIO=4&transport=polling`, { headers: { origin } });
      const body = await res.text();
      expect(res.status, origin).toBe(400);
      expect(body, origin).not.toContain('sid');
    }
  });
});
