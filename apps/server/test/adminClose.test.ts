import net from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import type { Socket } from 'socket.io-client';
import { createLogger } from '../src/logger';
import { startServer, type RunningServer } from '../src/server';
import { RoomManager, type RoomEvent } from '../src/rooms/RoomManager';
import { connect, createRoom, emit, hostRoom, join, makeConfig, once, sleep } from './helpers';

const TOKEN = 'admin-token-admin-token-admin-token-ZZ';
const sockets: Socket[] = [];
let server: RunningServer | undefined;
afterEach(async () => {
  while (sockets.length) sockets.pop()?.close();
  await server?.close();
  server = undefined;
});

const track = <T extends { socket: Socket }>(j: T): T => (sockets.push(j.socket), j);

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const p = (s.address() as net.AddressInfo).port;
      s.close(() => resolve(p));
    });
  });
}

async function bootAdmin(extra: Record<string, string> = {}, logger = createLogger('silent')): Promise<{ srv: RunningServer; admin: number }> {
  const adminPort = await freePort();
  server = await startServer(makeConfig({ RATE_LIMIT_SCALE: '100', ADMIN_PORT: String(adminPort), ADMIN_TOKEN: TOKEN, ...extra }), logger);
  return { srv: server, admin: adminPort };
}

const closeUrl = (admin: number, roomId: string): string => `http://127.0.0.1:${admin}/admin/rooms/${roomId}/close`;
const post = (admin: number, roomId: string, token: string | null = TOKEN, init: RequestInit = {}): Promise<Response> =>
  fetch(closeUrl(admin, roomId), { method: 'POST', ...init, headers: { ...(token === null ? {} : { authorization: `Bearer ${token}` }), ...(init.headers as Record<string, string> | undefined) } });

function canConnect(host: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.connect({ host, port });
    s.once('connect', () => (s.destroy(), resolve(true)));
    s.once('error', () => resolve(false));
  });
}

describe('운영자 admin 리스너: 인증·바인딩·기본 비활성 (POL-19)', () => {
  it('TC-370 [POL-19] 토큰 없음·틀림·길이 다름·형식 틀림은 모두 같은 401 FORBIDDEN이고 방은 닫히지 않으며, 올바른 토큰만 통과한다', async () => {
    const { srv, admin } = await bootAdmin();
    const { roomId } = await hostRoom(srv.port).then((r) => (track(r.host), r));
    const bad: Array<string | null> = [null, '', 'x', TOKEN.slice(0, -1), `${TOKEN}x`, TOKEN.replace('Z', 'Y'), TOKEN.toUpperCase(), 'a'.repeat(3000)];
    const seen = new Set<string>();
    for (const t of bad) {
      const r = await post(admin, roomId, t);
      expect(r.status, String(t).slice(0, 20)).toBe(401);
      seen.add(await r.text());
    }
    expect([...seen]).toEqual(['{"code":"FORBIDDEN"}']);
    const basic = await post(admin, roomId, null, { headers: { authorization: `Basic ${TOKEN}` } });
    expect(basic.status).toBe(401);
    const noScheme = await post(admin, roomId, null, { headers: { authorization: TOKEN } });
    expect(noScheme.status).toBe(401);
    expect(srv.rooms.get(roomId)).toBeDefined();
    const ok = await post(admin, roomId);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ closed: true, participants: 1 });
  });

  it('TC-371 [POL-19] admin 포트는 127.0.0.1에만 바인딩된다(같은 루프백 대역의 127.0.0.2로는 닿지 않고, 공개 포트는 닿는다)', async () => {
    if (process.platform !== 'linux') return; // 127.0.0.2가 루프백인 것은 리눅스뿐이다
    const { srv, admin } = await bootAdmin();
    expect(await canConnect('127.0.0.1', admin)).toBe(true);
    expect(await canConnect('127.0.0.2', srv.port)).toBe(true); // 양성 대조군: 공개 리스너는 모든 인터페이스
    expect(await canConnect('127.0.0.2', admin)).toBe(false);
  });

  it('TC-372 [POL-19] ADMIN_PORT·ADMIN_TOKEN이 없으면 admin 리스너가 없고, 한쪽만 있으면 서버가 시작되지 않는다', async () => {
    server = await startServer(makeConfig(), createLogger('silent'));
    expect(server.adminPort).toBeUndefined();
    await server.close();
    server = undefined;
    expect(() => makeConfig({ ADMIN_PORT: '3999' })).toThrow(/ADMIN_TOKEN/);
    expect(() => makeConfig({ ADMIN_TOKEN: TOKEN })).toThrow(/ADMIN_TOKEN/);
    // 공개 포트로는 admin 경로가 존재하지 않는다(SPA 폴백이거나 404이고, 방은 닫히지 않는다).
    const { srv } = await bootAdmin();
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const r = await fetch(`http://127.0.0.1:${srv.port}/admin/rooms/${roomId}/close`, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } });
    expect(r.status).not.toBe(200);
    expect(srv.rooms.get(roomId)).toBeDefined();
  });

  it('TC-373 [POL-19] 형식 오류·없는 경로·잘못된 메서드·없는 방·거대 본문·거대 헤더·깨진 요청을 거절하고 서버는 계속 동작한다', async () => {
    const { srv, admin } = await bootAdmin();
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    expect((await post(admin, 'short')).status).toBe(400);
    expect((await post(admin, `${roomId}x`)).status).toBe(400);
    expect((await post(admin, '%3Cscript%3E')).status).toBe(400);
    expect((await fetch(`http://127.0.0.1:${admin}/admin/other`, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } })).status).toBe(404);
    const get = await fetch(closeUrl(admin, roomId), { headers: { authorization: `Bearer ${TOKEN}` } });
    expect(get.status).toBe(405);
    expect(srv.rooms.get(roomId)).toBeDefined();
    const missing = await post(admin, 'A'.repeat(22));
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ code: 'ROOM_NOT_FOUND' });

    // 본문 크기 제한: 1MB 본문은 방을 닫지 못하고 413(또는 연결 종료)로 끝난다.
    const huge = await post(admin, roomId, TOKEN, { body: 'x'.repeat(1_000_000) }).then(
      (r) => r.status,
      () => 'closed',
    );
    expect([413, 'closed']).toContain(huge);
    expect(srv.rooms.get(roomId)).toBeDefined();

    // 거대 헤더(4KB 초과)
    const bigHeader = await post(admin, roomId, TOKEN, { headers: { 'x-pad': 'p'.repeat(20_000) } }).then(
      (r) => r.status,
      () => 'closed',
    );
    expect([431, 400, 'closed']).toContain(bigHeader);
    expect(srv.rooms.get(roomId)).toBeDefined();

    // 깨진 HTTP
    await new Promise<void>((resolve) => {
      const s = net.connect({ host: '127.0.0.1', port: admin }, () => s.write('\x00\x01garbage\r\n\r\n'));
      s.on('data', () => undefined);
      s.on('close', () => resolve());
      s.on('error', () => resolve());
    });

    // 여전히 정상 동작
    const ok = await post(admin, roomId);
    expect(ok.status).toBe(200);
  });

  it('TC-374 [POL-19] 인증 실패가 몰리면 429로 막히고, 오류 응답에는 내부 정보(스택·경로·토큰)가 없다', async () => {
    const { srv, admin } = await bootAdmin();
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const statuses: number[] = [];
    let body = '';
    for (let i = 0; i < 40; i++) {
      const r = await post(admin, roomId, `wrong-${i}`);
      statuses.push(r.status);
      body += await r.text();
    }
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
    expect(statuses).toContain(429);
    expect(statuses.every((s) => s === 401 || s === 429)).toBe(true);
    expect(body).not.toMatch(/at |\.ts|node_modules|stack|wrong-|admin-token/i);
    expect(srv.rooms.get(roomId)).toBeDefined();
  });

  it('TC-375 [POL-19,SEC-10] 폐쇄 로그에는 방 ID 앞 6자와 인원수만 남고 토큰·전체 방 ID·IP는 없다', async () => {
    const lines: string[] = [];
    const logger = createLogger('debug', { write: (s: string) => void lines.push(s) });
    const { srv, admin } = await bootAdmin({ LOG_LEVEL: 'debug' }, logger);
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    await post(admin, roomId, 'wrong-token-value');
    await post(admin, roomId);
    const all = lines.join('');
    expect(all).toContain('operator action');
    expect(all).toContain(roomId.slice(0, 6));
    expect(all).not.toContain(roomId);
    expect(all).not.toContain(TOKEN);
    expect(all).not.toContain('wrong-token-value');
    expect(all).not.toMatch(/127\.0\.0\.1"|::ffff|"ip"/);
  });
});

describe('운영자 방 폐쇄 동작 (POL-19, EVT-34)', () => {
  it('TC-376 [POL-19,EVT-34] 폐쇄하면 참가자 전원이 room:closed를 받고 소켓이 끊기며, 같은 토큰의 재접속·재입장은 거부되고, 다른 방은 영향이 없다', async () => {
    const { srv, admin } = await bootAdmin();
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const a = track(await join(srv.port, roomId, 'a'));
    const b = track(await join(srv.port, roomId, 'b'));
    const other = await hostRoom(srv.port);
    track(other.host);
    const otherGuest = track(await join(srv.port, other.roomId, 'o'));
    expect([host.res.ok, a.res.ok, b.res.ok, otherGuest.res.ok]).toEqual([true, true, true, true]);

    const closedEvents = [host, a, b].map((j) => once<{ v: number }>(j.socket, 'room:closed'));
    const gotOther: unknown[] = [];
    otherGuest.socket.on('room:closed', (m) => gotOther.push(m));
    const disconnected = [host, a, b].map((j) => (j.socket.connected ? once(j.socket, 'disconnect') : Promise.resolve()));

    const res = await post(admin, roomId);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ closed: true, participants: 3 });
    expect(await Promise.all(closedEvents)).toEqual([{ v: 1 }, { v: 1 }, { v: 1 }]);
    await Promise.all(disconnected);
    expect([host, a, b].map((j) => j.socket.connected)).toEqual([false, false, false]);

    expect(srv.rooms.get(roomId)).toBeUndefined();
    const status = await (await fetch(`http://127.0.0.1:${srv.port}/api/rooms/${roomId}`)).json();
    expect(status).toMatchObject({ exists: false });

    const retry = track({ socket: await connect(srv.port) });
    expect(await emit(retry.socket, 'room:resume', { v: 1, token: a.token })).toMatchObject({ ok: false, code: 'ROOM_NOT_FOUND' });
    const rejoin = track(await join(srv.port, roomId, 'late'));
    expect(rejoin.res).toMatchObject({ ok: false, code: 'ROOM_NOT_FOUND' });
    expect((await post(admin, roomId)).status).toBe(404);

    // 다른 방: 소켓·상태 그대로, 채팅도 동작
    expect(gotOther).toEqual([]);
    expect(otherGuest.socket.connected).toBe(true);
    const chat = once(other.host.socket, 'chat:message');
    expect(await emit(otherGuest.socket, 'chat:send', { v: 1, text: 'hi' })).toMatchObject({ ok: true });
    await chat;
    expect(srv.rooms.get(other.roomId)?.participants.size).toBe(2);
  });

  it('TC-377 [POL-19] 호스트 없는 대기 방(입장 전)과 끊김 유예 중인 참가자가 있는 방도 닫히고 타이머가 남지 않는다', async () => {
    const { srv, admin } = await bootAdmin({ RECONNECT_GRACE_SEC: '1' });
    const empty = await createRoom(srv.port);
    const r1 = await post(admin, empty.roomId);
    expect(await r1.json()).toEqual({ closed: true, participants: 0 });

    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const g = track(await join(srv.port, roomId, 'g'));
    g.socket.disconnect(); // 유예 중
    await sleep(100);
    const r2 = await post(admin, roomId);
    expect(await r2.json()).toEqual({ closed: true, participants: 2 });
    await sleep(1300); // 유예가 지나도 지워진 방에 대한 이벤트·오류가 없다
    expect(srv.rooms.size).toBe(0);
    const again = await post(admin, roomId);
    expect(again.status).toBe(404);
  });

  it('TC-378 [POL-19] RoomManager.closeByOperator: 방을 지우고 closedByOperator 이벤트(참가자 ID 목록)를 한 번 내며, 없는 방은 ROOM_NOT_FOUND', () => {
    const events: RoomEvent[] = [];
    const mgr = new RoomManager({ maxParticipants: 3, maxRooms: 2, emptyTtlMs: 60_000, graceMs: 1000, onEvent: (e) => events.push(e) });
    const created = mgr.createRoom();
    if (!created.ok) throw new Error('create');
    const id = created.room.id;
    const h = mgr.join({ roomId: id, nickname: 'h', ipKey: 'k1', hostClaim: true, passwordOk: true });
    const g = mgr.join({ roomId: id, nickname: 'g', ipKey: 'k2', hostClaim: false, passwordOk: true });
    if (!h.ok || !g.ok) throw new Error('join');
    events.length = 0;
    expect(mgr.closeByOperator('A'.repeat(22))).toEqual({ ok: false, code: 'ROOM_NOT_FOUND' });
    expect(events).toEqual([]);
    expect(mgr.closeByOperator(id)).toEqual({ ok: true, participants: 2 });
    expect(events).toEqual([{ type: 'closedByOperator', roomId: id, participantIds: [h.participant.id, g.participant.id] }]);
    expect(mgr.get(id)).toBeUndefined();
    expect(mgr.resume(id, h.participant.id)).toEqual({ ok: false, code: 'ROOM_NOT_FOUND' });
    expect(mgr.closeByOperator(id)).toEqual({ ok: false, code: 'ROOM_NOT_FOUND' });
    mgr.dispose();
  });
});

