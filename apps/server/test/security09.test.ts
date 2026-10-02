import { createHmac, randomBytes } from 'node:crypto';
import http from 'node:http';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import WebSocket from 'ws'; // socket.io가 이미 끌어오는 의존성이다. 서버 코드가 아니라 공격 시험에서만 쓴다.
import { afterEach, describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';
import type { RunningServer } from '../src/server';
import { ORIGIN, SECRET, baseEnv, boot, connect, emit, sleep } from './helpers';

// 9단계(보안 검증) 공격 시험. 제품 코드는 건드리지 않는다. 결함 재현은 it.fails로 남겨 수정되면 "예상 밖 통과"로 알려 준다.
// 클라이언트 IP는 TRUST_PROXY=1과 X-Forwarded-For로 흉내 낸다(IPv6 주소를 loopback에서 만들 수 없기 때문).

const servers: RunningServer[] = [];
const sockets: Socket[] = [];
const raws: Array<{ destroy: () => void }> = [];
const up = async (overrides: Record<string, string> = {}): Promise<RunningServer> => {
  const s = await boot({ RATE_LIMIT_SCALE: '1', TRUST_PROXY: '1', ...overrides });
  servers.push(s);
  return s;
};
afterEach(async () => {
  while (sockets.length) sockets.pop()?.close();
  while (raws.length) raws.pop()?.destroy();
  while (servers.length) await servers.pop()?.close();
});

async function connectAs(port: number, ip: string): Promise<Socket> {
  const socket = io(`http://127.0.0.1:${port}`, { transports: ['websocket'], reconnection: false, forceNew: true, extraHeaders: { origin: ORIGIN, 'x-forwarded-for': ip } });
  sockets.push(socket);
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', (e) => reject(e));
  });
  return socket;
}
const post = (port: number, ip: string, body: unknown): Promise<Response> =>
  fetch(`http://127.0.0.1:${port}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip }, body: JSON.stringify(body) });
async function roomAs(port: number, ip: string, password?: string): Promise<{ roomId: string; hostSock: Socket; hostId: string }> {
  const created = (await (await post(port, ip, { v: 1, ...(password ? { password } : {}) })).json()) as { roomId: string; hostClaim: string };
  const hostSock = await connectAs(port, ip);
  const hj = await emit(hostSock, 'room:join', { v: 1, roomId: created.roomId, nickname: 'host', hostClaim: created.hostClaim });
  return { roomId: created.roomId, hostSock, hostId: String(hj.selfId) };
}
const v6 = (net: number, host: number): string => `2001:db8:abcd:${net}::${host.toString(16)}`; // 같은 /64 안의 서로 다른 주소

/** 소켓 CONNECT 패킷 없이 엔진 수준 WebSocket만 여는 연결(IP 연결 상한이 적용되는지 보려는 것). */
function rawUpgrade(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.request({ host: '127.0.0.1', port, path: '/socket.io/?EIO=4&transport=websocket', headers: { Connection: 'Upgrade', Upgrade: 'websocket', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': randomBytes(16).toString('base64'), Origin: ORIGIN } });
    req.on('upgrade', (_res, socket) => {
      raws.push(socket);
      resolve(true);
    });
    req.on('response', () => resolve(false));
    req.on('error', () => resolve(false));
    req.end();
  });
}

describe('9단계 보안 공격 시험', () => {
  // DEF-09-01 (High): 속도 제한·비밀번호 시도 제한·강퇴 차단이 IPv6 전체 주소 단위라 같은 /64의 다른 주소로 우회된다.
  it('TC-530 [SEC-02,SEC-06,POL-11] 비밀번호 오답 5회로 차단된 뒤에도 같은 IPv6 /64의 이웃 주소로는 오답 시도가 계속된다(기대: /64 단위로 차단) — DEF-09-01', async () => {
    const s = await up();
    const { roomId } = await roomAs(s.port, '203.0.113.9', 'correct-pw-1');
    const tally: Record<string, number> = {};
    for (let i = 0; i < 12; i++) {
      const sock = await connectAs(s.port, v6(1, i + 1));
      const r = await emit(sock, 'room:join', { v: 1, roomId, nickname: `g${i}`, password: `wrong-pw-${i}` });
      tally[String(r.code)] = (tally[String(r.code)] ?? 0) + 1;
      sock.close();
    }
    // 기대(수정 후): 5회째 이후는 TOO_MANY_ATTEMPTS. 현재는 12번 모두 WRONG_PASSWORD라 이 단언이 실패한다.
    expect(tally['WRONG_PASSWORD'] ?? 0).toBeLessThanOrEqual(5);
  });

  it('TC-531 [SEC-05,POL-06] 강퇴된 사용자가 같은 IPv6 /64의 이웃 주소로 다시 입장한다(기대: 거부 KICKED) — DEF-09-01', async () => {
    const s = await up();
    const { roomId, hostSock } = await roomAs(s.port, '203.0.113.10');
    const bad = await connectAs(s.port, v6(2, 1));
    const bj = await emit(bad, 'room:join', { v: 1, roomId, nickname: 'bad' });
    expect((await emit(hostSock, 'host:kick', { v: 1, targetId: String(bj.selfId) })).ok).toBe(true);
    const same = await emit(await connectAs(s.port, v6(2, 1)), 'room:join', { v: 1, roomId, nickname: 'bad' });
    expect(same.code, '같은 주소는 차단된다(대조군)').toBe('KICKED');
    const neighbour = await emit(await connectAs(s.port, v6(2, 2)), 'room:join', { v: 1, roomId, nickname: 'bad' });
    expect(neighbour.code).toBe('KICKED');
  });

  it('TC-532 [SEC-06] 방 생성 속도 제한(IP당 10회/분)이 같은 IPv6 /64의 서로 다른 주소 25개로 우회된다(기대: 429) — DEF-09-01', async () => {
    const s = await up();
    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) statuses.push((await post(s.port, v6(3, i + 1), { v: 1 })).status);
    const ctl: number[] = [];
    for (let i = 0; i < 25; i++) ctl.push((await post(s.port, '198.51.100.8', { v: 1 })).status);
    expect(ctl.filter((c) => c === 429).length, '대조군: 한 IPv4는 제한된다').toBeGreaterThan(0);
    expect(statuses.filter((c) => c === 429).length).toBeGreaterThan(0);
  });

  // DEF-09-02 (Medium): IP당 동시 연결 상한이 Socket.IO 네임스페이스 연결 이후에만 적용된다.
  it.fails('TC-533 [SEC-06] IP_MAX_CONNECTIONS=3일 때 네임스페이스 CONNECT 없이 엔진 WebSocket만 여는 연결 40개가 모두 열린다(기대: 상한 근처에서 거부) — DEF-09-02', async () => {
    const s = await up({ IP_MAX_CONNECTIONS: '3' });
    let opened = 0;
    for (let i = 0; i < 40; i++) if (await rawUpgrade(s.port)) opened++;
    expect(opened).toBeLessThanOrEqual(10);
  });

  // DEF-09-03 (Low): 시도 제한은 "검증이 끝난 실패"만 센다. 한 IP가 연 소켓 수만큼 동시에 보낸 오답은 모두 검증된다.
  it('TC-534 [SEC-02,POL-11] 한 IP의 소켓 12개가 동시에 보낸 오답이 5회 제한을 넘어 모두 검증된다(기대: 5회까지만 검증) — DEF-09-03', async () => {
    const s = await up({ IP_MAX_CONNECTIONS: '20' });
    const { roomId } = await roomAs(s.port, '203.0.113.11', 'correct-pw-2');
    const socks = await Promise.all(Array.from({ length: 12 }, () => connectAs(s.port, '198.51.100.20')));
    const res = await Promise.all(socks.map((sock, i) => emit(sock, 'room:join', { v: 1, roomId, nickname: `p${i}`, password: `wrong-pw-${i}` })));
    expect(res.filter((r) => r.code === 'WRONG_PASSWORD').length).toBeLessThanOrEqual(5);
  });

  // DEF-09-04 (Low): 예시 비밀값 거부가 NODE_ENV=production일 때만 동작하고, NODE_ENV 기본값은 development다.
  it.fails('TC-535 [SEC-10,NFR-08] NODE_ENV를 지정하지 않아도 .env.example의 예시 비밀값(change-me...)은 거부된다 — DEF-09-04', () => {
    const { NODE_ENV: _drop, ...rest } = baseEnv;
    void _drop;
    expect(() => loadConfig({ ...rest, SESSION_SECRET: 'change-me-change-me-change-me-change-me' })).toThrow();
  });

  // DEF-09-05 (Medium): 아무도 입장하지 않은 방이 ROOM_EMPTY_TTL_MIN(기본 10분) 동안 방 수 상한(MAX_ROOMS)을 차지한다.
  // 한 IP가 방 생성 한도(분당 10회)만 지켜도 약 9분 만에 기본 상한 100개를 채워 다른 모든 사용자의 방 생성이 503이 된다.
  it.fails('TC-538 [SEC-06,POL-15,NFR-04] 한 IP가 입장하지 않을 방을 상한(MAX_ROOMS=10)까지 만들면 다른 IP의 정상 방 생성이 503이 된다(기대: 영향 없음) — DEF-09-05', async () => {
    const s = await up({ MAX_ROOMS: '10' });
    const attacker: number[] = [];
    for (let i = 0; i < 10; i++) attacker.push((await post(s.port, '198.51.100.30', { v: 1 })).status);
    expect(attacker.every((c) => c === 201), '공격자는 자기 한도(10회/분) 안에서 상한을 모두 채운다').toBe(true);
    expect((await post(s.port, '203.0.113.77', { v: 1 })).status).toBe(201);
  });

  it('TC-536 [SEC-03,SEC-04] 위조 세션 토큰(예시 비밀값 서명·빈 서명·본문 변조·호스트 클레임 종류 바꿔치기·3조각)은 resume에서 모두 거부되고, 세션 토큰은 hostClaim으로 쓸 수 없다', async () => {
    const s = await up();
    const { roomId, hostSock, hostId } = await roomAs(s.port, '203.0.113.12');
    const guest = await connectAs(s.port, '203.0.113.13');
    const gj = await emit(guest, 'room:join', { v: 1, roomId, nickname: 'guest' });
    const b64 = (o: object): string => Buffer.from(JSON.stringify(o)).toString('base64url');
    const sig = (b: string, secret: string): string => createHmac('sha256', secret).update(b).digest('base64url');
    const exp = Date.now() + 3_600_000;
    const body = b64({ t: 's', rid: roomId, pid: hostId, exp });
    const [gb, gs] = String(gj.token).split('.') as [string, string];
    const tampered = { ...(JSON.parse(Buffer.from(gb, 'base64url').toString('utf8')) as object), pid: hostId };
    const forged = [
      `${body}.${sig(body, 'change-me-change-me-change-me-change-me')}`,
      `${body}.`,
      `${b64(tampered)}.${gs}`,
      `${b64({ t: 'h', rid: roomId, exp })}.${sig(b64({ t: 'h', rid: roomId, exp }), SECRET.slice(1) + 'x')}`,
      `${String(gj.token)}.AAAA`,
      `${b64({ __proto__: { t: 's' }, rid: roomId, exp })}.AAAA`,
    ];
    for (const t of forged) {
      const c = await connectAs(s.port, '203.0.113.14');
      const r = await emit(c, 'room:resume', { v: 1, token: t.padEnd(20, 'A') });
      expect(r.ok, t.slice(0, 30)).toBe(false);
      expect(r.code).toBe('TOKEN_INVALID');
      c.close();
    }
    // 세션 토큰을 다른 방(호스트 미입장)의 hostClaim으로 제시
    const other = (await (await post(s.port, '203.0.113.15', { v: 1 })).json()) as { roomId: string };
    const evil = await connectAs(s.port, '203.0.113.16');
    const er = await emit(evil, 'room:join', { v: 1, roomId: other.roomId, nickname: 'evil', hostClaim: String(gj.token) });
    expect(er.ok).toBe(false);
    expect((await emit(hostSock, 'host:lock', { v: 1, locked: true })).ok, '호스트의 권한은 그대로').toBe(true);
  });

  it('TC-537 [SEC-06,SEC-08] 1MB 소켓 프레임은 연결이 1009로 끊기고, 바이너리 첨부 10개 초과 선언은 거부되며, 이후에도 서버는 정상 응답한다', async () => {
    const s = await up();
    const open = (): Promise<WebSocket> =>
      new Promise((resolve, reject) => {
        const ws = new WebSocket(`ws://127.0.0.1:${s.port}/socket.io/?EIO=4&transport=websocket`, { headers: { origin: ORIGIN } });
        ws.once('open', () => resolve(ws));
        ws.once('error', reject);
      });
    const closeCode = (ws: WebSocket, send: () => void): Promise<number> =>
      new Promise((resolve) => {
        ws.once('close', (c) => resolve(c));
        send();
        setTimeout(() => resolve(-1), 3000);
      });
    const big = await open();
    big.send('40');
    await sleep(100);
    expect(await closeCode(big, () => big.send(`42["chat:send",{"v":1,"text":"${'a'.repeat(1_000_000)}"}]`))).toBe(1009);
    const att = await open();
    att.send('40');
    await sleep(100);
    expect(await closeCode(att, () => att.send('4599999-["chat:send",{"_placeholder":true,"num":0}]')), '첨부 수가 과다한 패킷은 연결을 끊는다').not.toBe(-1);
    expect((await fetch(`http://127.0.0.1:${s.port}/healthz`)).status).toBe(200);
    const ok = await connect(s.port);
    sockets.push(ok);
    expect(ok.connected).toBe(true);
  });
});
