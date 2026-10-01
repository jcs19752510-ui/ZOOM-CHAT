import { afterEach, describe, expect, it } from 'vitest';
import type { Socket } from 'socket.io-client';
import { createLogger } from '../src/logger';
import { startServer, type RunningServer } from '../src/server';
import { connect, createRoom, emit, join, makeConfig, sleep, type AnyAck, type Joined } from './helpers';

// unit-19 6단계 적대 시험: metrics:path 이벤트(NFR-15, EVT-33)와 로그 비식별(DEC-012)

const sockets: Socket[] = [];
let server: RunningServer | undefined;
afterEach(async () => {
  while (sockets.length) sockets.pop()?.close();
  await server?.close();
  server = undefined;
});

const NICK = '적대경로닉네임';
const NICK2 = '적대경로두번째';

interface Ctx {
  lines: string[];
  port: number;
  advance: (ms: number) => void;
}
/** 시계를 주입해 속도 제한 보충·로그 상한을 실제 대기 없이 시험한다. */
async function setup(level = 'info'): Promise<Ctx> {
  const lines: string[] = [];
  let offset = 0;
  server = await startServer(
    makeConfig({ RATE_LIMIT_SCALE: '100', LOG_LEVEL: level }),
    createLogger(level, { write: (s: string) => void lines.push(s) }),
    () => Date.now() + offset,
  );
  return { lines, port: server.port, advance: (ms) => void (offset += ms) };
}
const track = (j: Joined): Joined => (sockets.push(j.socket), j);
const parsed = (lines: string[]): Record<string, unknown>[] => lines.map((l) => JSON.parse(l) as Record<string, unknown>);
const pathLines = (lines: string[]): Record<string, unknown>[] => parsed(lines).filter((l) => l.msg === 'peer path');
/** 연결이 끊겨 ack가 오지 않는 경우를 null로 돌려준다. */
const tryEmit = (s: Socket, ev: string, p: unknown): Promise<AnyAck | null> => emit(s, ev, p).catch(() => null);

describe('metrics:path 적대 시험 (unit-19 6단계)', () => {
  it('TC-410 [NFR-15,SEC-06] 적대 페이로드(추가 키·__proto__·타입 혼동·유사 문자·인자 없음·ack 없음)는 거부되고 로그에 흔적이 없으며 서버는 계속 동작한다', async () => {
    const c = await setup();
    const { roomId, hostClaim } = await createRoom(c.port);
    const host = track(await join(c.port, roomId, NICK, { hostClaim }));
    const proto = JSON.parse('{"v":1,"path":"relay","__proto__":{"admin":true}}') as unknown;
    const bad: unknown[] = [
      proto,
      { v: 1, path: 'relay', candidate: 'candidate:1 1 udp 1 203.0.113.9 1 typ host' },
      { v: 1, path: 'relay', sdp: 'v=0' },
      { v: 1, path: 'relay', peerId: host.id, ip: '10.0.0.1' },
      { v: 1, path: 123 },
      { v: 1, path: true },
      { v: 1, path: {} },
      { v: 1, path: null },
      { v: 1, path: undefined },
      { v: 1, path: 'relay ' },
      { v: 1, path: ' relay' },
      { v: 1, path: 'Direct' },
      { v: 1, path: 'rеlay' }, // 키릴 문자 е 섞임
      { v: 1, path: 'relay\u0000' },
      { v: '1', path: 'relay' },
      { v: 1.5, path: 'relay' },
      { v: 0, path: 'relay' },
      { path: 'relay' },
      {},
      [],
      [{ v: 1, path: 'relay' }],
      'relay',
      123,
      true,
      undefined,
      { v: 1, path: 'relay', constructor: 'x' },
    ];
    // 거부도 버킷 토큰을 쓰므로(용량 10) 8건마다 가상 시계를 20초 보낸다(strike 창 10초도 함께 비워진다)
    let n = 0;
    for (const b of bad) {
      if (n++ % 8 === 0) c.advance(20_000);
      expect(await tryEmit(host.socket, 'metrics:path', b), JSON.stringify(b)).toMatchObject({ ok: false, code: 'INVALID_PAYLOAD' });
    }
    const probe = host;
    expect(probe.socket.connected).toBe(true);
    c.advance(20_000);
    expect(pathLines(c.lines)).toHaveLength(0);
    // ack 없이/인자 없이 보내도 서버가 죽지 않는다
    probe.socket.emit('metrics:path');
    probe.socket.emit('metrics:path', { v: 1, path: 'relay' });
    probe.socket.emit('metrics:path', 'x', 'not-a-function');
    await sleep(100);
    expect(pathLines(c.lines).length).toBeLessThanOrEqual(1);
    const fresh = track(await join(c.port, roomId, NICK2 + 'b'));
    expect(await emit(fresh.socket, 'metrics:path', { v: 1, path: 'direct' })).toEqual({ ok: true });
    const res = await fetch(`http://127.0.0.1:${c.port}/healthz`);
    expect(res.status).toBe(200);
  });

  it('TC-411 [NFR-15,SEC-06] 거대 페이로드: 한도 이내 100KB 문자열은 INVALID_PAYLOAD·로그 없음, 한도(32KiB) 초과 메시지는 연결이 끊기고 다른 소켓과 서버는 영향이 없다', async () => {
    const c = await setup();
    const { roomId, hostClaim } = await createRoom(c.port);
    const host = track(await join(c.port, roomId, NICK, { hostClaim }));
    const other = track(await join(c.port, roomId, NICK2));
    const marker = 'BIGMARK';
    // 한도 안(약 20KB): 스키마 위반으로 거부
    expect(await emit(host.socket, 'metrics:path', { v: 1, path: marker + 'x'.repeat(20_000) })).toMatchObject({ ok: false, code: 'INVALID_PAYLOAD' });
    // 한도 밖(약 100KB, 1MB): Socket.IO가 연결을 끊는다
    const closed = new Promise<void>((r) => host.socket.once('disconnect', () => r()));
    host.socket.emit('metrics:path', { v: 1, path: marker + 'y'.repeat(100_000) });
    await Promise.race([closed, sleep(3000)]);
    expect(host.socket.connected).toBe(false);
    const closed2 = new Promise<void>((r) => other.socket.once('disconnect', () => r()));
    other.socket.emit('metrics:path', { v: 1, path: 'z'.repeat(1_000_000) });
    await Promise.race([closed2, sleep(3000)]);
    expect(other.socket.connected).toBe(false);
    await sleep(100);
    expect(pathLines(c.lines)).toHaveLength(0);
    expect(c.lines.join('').includes(marker)).toBe(false);
    const fresh = track(await join(c.port, roomId, NICK2 + 'c'));
    expect(await emit(fresh.socket, 'metrics:path', { v: 1, path: 'relay' })).toEqual({ ok: true });
    expect(pathLines(c.lines)).toHaveLength(1);
  });

  it('TC-412 [NFR-15,SEC-03] 입장 상태 경계: 입장 전·퇴장 후·강퇴 후는 기록되지 않고, 다른 방 참가자·재접속(resume) 소켓은 각자 정상이며 로그에 방 ID가 없다', async () => {
    const c = await setup();
    const a = await createRoom(c.port);
    const b = await createRoom(c.port);
    const host = track(await join(c.port, a.roomId, NICK, { hostClaim: a.hostClaim }));
    const guest = track(await join(c.port, a.roomId, NICK2));
    const otherRoom = track(await join(c.port, b.roomId, NICK2 + 'r', { hostClaim: b.hostClaim }));
    const anon = track({ socket: await connect(c.port), res: { ok: false }, id: '', token: '' });

    // 입장 전 → NOT_JOINED, 로그 없음
    expect(await emit(anon.socket, 'metrics:path', { v: 1, path: 'relay' })).toMatchObject({ ok: false, code: 'NOT_JOINED' });
    // 입장 전이어도 잘못된 페이로드는 INVALID_PAYLOAD가 먼저(검증 순서) — 어느 쪽이든 로그는 없어야 한다
    expect(await emit(anon.socket, 'metrics:path', { v: 2, path: 'relay' })).toMatchObject({ ok: false });
    expect(pathLines(c.lines)).toHaveLength(0);
    // 같은 소켓이 입장 후에는 기록된다(상태 전이)
    expect(await emit(anon.socket, 'room:join', { v: 1, roomId: a.roomId, nickname: NICK2 + 'late' })).toMatchObject({ ok: true });
    expect(await emit(anon.socket, 'metrics:path', { v: 1, path: 'relay' })).toEqual({ ok: true });
    expect(pathLines(c.lines)).toHaveLength(1);

    // 다른 방 참가자도 정상 기록
    expect(await emit(otherRoom.socket, 'metrics:path', { v: 1, path: 'direct' })).toEqual({ ok: true });
    expect(pathLines(c.lines)).toHaveLength(2);

    // 퇴장 후 → NOT_JOINED
    expect(await emit(guest.socket, 'room:leave', { v: 1 })).toMatchObject({ ok: true });
    expect(await emit(guest.socket, 'metrics:path', { v: 1, path: 'relay' })).toMatchObject({ ok: false, code: 'NOT_JOINED' });

    // 강퇴 후 → 소켓이 끊기거나 NOT_JOINED, 어느 쪽이든 기록 없음
    const victim = track(await join(c.port, a.roomId, NICK2 + 'v'));
    expect(await emit(victim.socket, 'metrics:path', { v: 1, path: 'relay' })).toEqual({ ok: true });
    expect(await emit(host.socket, 'host:kick', { v: 1, targetId: victim.id })).toMatchObject({ ok: true });
    await sleep(150);
    const before = pathLines(c.lines).length;
    const r = await tryEmit(victim.socket, 'metrics:path', { v: 1, path: 'relay' });
    expect(r === null || r.ok === false).toBe(true);
    expect(pathLines(c.lines)).toHaveLength(before);

    // 재접속(resume) 소켓: 새 소켓이 토큰으로 자리를 되찾으면 기록 가능
    host.socket.close();
    await sleep(100);
    const sock2 = track({ socket: await connect(c.port), res: { ok: false }, id: '', token: '' });
    expect(await emit(sock2.socket, 'room:resume', { v: 1, token: host.token })).toMatchObject({ ok: true });
    expect(await emit(sock2.socket, 'metrics:path', { v: 1, path: 'direct' })).toEqual({ ok: true });

    const raw = c.lines.filter((l) => l.includes('peer path')).join('');
    for (const needle of [a.roomId, b.roomId, a.roomId.slice(0, 6), b.roomId.slice(0, 6), host.id, host.token, NICK, NICK2, '127.0.0.1']) expect(raw.includes(needle), `로그에 ${needle}`).toBe(false);
  });

  it('TC-413 [NFR-15,SEC-06] 소켓당 로그 상한: 정확히 20줄까지만 기록되고 21번째부터는 ack ok이지만 기록이 없으며, 다른 소켓의 상한과 독립이다', async () => {
    const c = await setup();
    const { roomId, hostClaim } = await createRoom(c.port);
    const host = track(await join(c.port, roomId, NICK, { hostClaim }));
    const guest = track(await join(c.port, roomId, NICK2));
    // 속도 제한(용량 10, 초당 0.5) 때문에 10건씩 20초(가상) 간격으로 보낸다.
    const burst = async (s: Socket, n: number, path: 'direct' | 'relay'): Promise<AnyAck[]> => {
      const out: AnyAck[] = [];
      for (let i = 0; i < n; i++) out.push(await emit(s, 'metrics:path', { v: 1, path }));
      return out;
    };
    expect((await burst(host.socket, 10, 'direct')).every((r) => r.ok)).toBe(true);
    expect(pathLines(c.lines)).toHaveLength(10);
    c.advance(20_000);
    expect((await burst(host.socket, 9, 'direct')).every((r) => r.ok)).toBe(true);
    expect(pathLines(c.lines)).toHaveLength(19);
    expect((await burst(host.socket, 1, 'relay')).every((r) => r.ok)).toBe(true);
    expect(pathLines(c.lines)).toHaveLength(20); // 20번째까지 기록
    expect(pathLines(c.lines).at(-1)?.path).toBe('relay');
    c.advance(2_100);
    expect(await emit(host.socket, 'metrics:path', { v: 1, path: 'relay' })).toEqual({ ok: true }); // 21번째: ok이지만 미기록
    c.advance(20_000);
    expect((await burst(host.socket, 9, 'relay')).every((r) => r.ok)).toBe(true);
    expect(pathLines(c.lines)).toHaveLength(20);
    // 다른 소켓은 자기 상한을 따로 쓴다
    expect(await emit(guest.socket, 'metrics:path', { v: 1, path: 'direct' })).toEqual({ ok: true });
    expect(pathLines(c.lines)).toHaveLength(21);
  });

  it('TC-414 [NFR-15,SEC-06] 속도 제한 경계: 정확히 10건 성공·11번째 RATE_LIMITED, 시간 경과 후 보충되고, 거부 15회 누적 시 연결 종료(POL-10)·다른 소켓은 영향 없음', async () => {
    const c = await setup();
    const { roomId, hostClaim } = await createRoom(c.port);
    const host = track(await join(c.port, roomId, NICK, { hostClaim }));
    const other = track(await join(c.port, roomId, NICK2));
    const oks: boolean[] = [];
    for (let i = 0; i < 10; i++) oks.push((await emit(host.socket, 'metrics:path', { v: 1, path: 'direct' })).ok);
    expect(oks.every(Boolean)).toBe(true);
    expect(await emit(host.socket, 'metrics:path', { v: 1, path: 'direct' })).toMatchObject({ ok: false, code: 'RATE_LIMITED' });
    // 다른 이벤트 버킷과 독립: 채팅은 영향 없음
    expect(await emit(host.socket, 'media:state', { v: 1, audio: true, video: true })).toMatchObject({ ok: true });
    c.advance(2_100); // 0.5/s × 2.1s ≈ 1.05개
    expect(await emit(host.socket, 'metrics:path', { v: 1, path: 'relay' })).toEqual({ ok: true });
    expect(await emit(host.socket, 'metrics:path', { v: 1, path: 'relay' })).toMatchObject({ ok: false, code: 'RATE_LIMITED' });
    expect(pathLines(c.lines)).toHaveLength(11);
    // 거부 누적(앞서 2회 + 13회 더 = 15회) → 연결 종료
    const closed = new Promise<void>((r) => host.socket.once('disconnect', () => r()));
    for (let i = 0; i < 14; i++) host.socket.emit('metrics:path', { v: 1, path: 'direct' });
    await Promise.race([closed, sleep(3000)]);
    expect(host.socket.connected).toBe(false);
    expect(pathLines(c.lines)).toHaveLength(11);
    // 다른 소켓은 자기 버킷으로 정상
    expect(await emit(other.socket, 'metrics:path', { v: 1, path: 'direct' })).toEqual({ ok: true });
  });

  it('TC-415 [NFR-15,SEC-10,DEC-012] 로그 전수 검사: 정상·비정상·강퇴·속도 제한 경로에서 디버그 수준 로그 전체에 방 ID·IP·닉네임·참가자 ID·소켓 ID·토큰·SDP·후보 주소·주입 문자열이 없다', async () => {
    const c = await setup('debug');
    const { roomId, hostClaim } = await createRoom(c.port, 'pw-LEAKCHECK-1');
    const host = track(await join(c.port, roomId, NICK, { hostClaim }));
    const guest = track(await join(c.port, roomId, NICK2, { password: 'pw-LEAKCHECK-1' }));
    const start = c.lines.length; // 입장 이후 줄만 대상으로 한다(입장 줄은 짧은 방 ID를 허용)
    const INJ = 'INJECT-LEAK-7731';
    const SDP_ADDR = '203.0.113.77';
    const payloads: unknown[] = [
      { v: 1, path: 'relay' },
      { v: 1, path: 'direct' },
      { v: 1, path: INJ },
      { v: 1, path: 'relay', peerId: host.id, ip: '198.51.100.9', candidate: `candidate:1 1 udp 1 ${SDP_ADDR} 9 typ relay`, sdp: `v=0 ${INJ}` },
      { v: 2, path: 'relay', note: INJ },
      null,
      INJ,
    ];
    for (const s of [host.socket, guest.socket]) for (const p of payloads) await tryEmit(s, 'metrics:path', p);
    const anon = await connect(c.port);
    sockets.push(anon);
    await tryEmit(anon, 'metrics:path', { v: 1, path: INJ });
    // 속도 제한과 강퇴까지 유발
    for (let i = 0; i < 12; i++) guest.socket.emit('metrics:path', { v: 1, path: 'direct' });
    await sleep(100);
    await emit(host.socket, 'host:kick', { v: 1, targetId: guest.id });
    await sleep(150);
    const after = c.lines.slice(start);
    expect(after.length).toBeGreaterThan(0);
    const secrets = [roomId, host.id, guest.id, host.token, guest.token, NICK, NICK2, '127.0.0.1', '::1', 'localhost', SDP_ADDR, '198.51.100.9', INJ, 'pw-LEAKCHECK-1', String(host.socket.id), String(guest.socket.id), String(anon.id), 'candidate:', 'v=0'];
    for (const line of after) for (const s of secrets) expect(line.includes(s), `로그에 "${s}" 포함: ${line.slice(0, 160)}`).toBe(false);
    // 방 ID는 전체는 물론 앞 6자 이후 부분도 없다(peer path 줄은 접두 6자도 없어야 한다)
    for (const l of pathLines(after)) {
      expect(Object.keys(l).sort()).toEqual(['hostname', 'kpi', 'level', 'msg', 'path', 'pid', 'time'].sort());
      expect(['direct', 'relay']).toContain(l.path);
      expect(l.kpi).toBe('path');
    }
    expect(pathLines(after).length).toBeGreaterThan(0);
  });
});
