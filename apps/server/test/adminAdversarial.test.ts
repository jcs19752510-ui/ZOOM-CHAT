import { spawnSync } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import type { Socket } from 'socket.io-client';
import { createLogger } from '../src/logger';
import { RoomManager, type RoomEvent } from '../src/rooms/RoomManager';
import { startServer, type RunningServer } from '../src/server';
import { connect, emit, hostRoom, join, makeConfig, sleep } from './helpers';

// unit-16 6단계 적대 시험(POL-19). 날것의 TCP로 HTTP를 직접 써서 클라이언트 라이브러리가 걸러 주는 변형을 그대로 보낸다.
const TOKEN = 'admin-token-admin-token-admin-token-ZZ';
const sockets: Socket[] = [];
const raws: net.Socket[] = [];
let server: RunningServer | undefined;
afterEach(async () => {
  while (sockets.length) sockets.pop()?.close();
  while (raws.length) raws.pop()?.destroy();
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

/** 가짜 시계: 요청마다 1.5초씩 흘려 속도 제한(20회 버스트)에 걸리지 않게 한다. 속도 제한 자체를 보는 시험은 실제 시계를 쓴다. */
async function boot(opts: { fakeClock?: boolean; logger?: ReturnType<typeof createLogger>; env?: Record<string, string> } = {}): Promise<{ srv: RunningServer; admin: number; tick: () => void }> {
  const admin = await freePort();
  let t = Date.now();
  const now = opts.fakeClock === false ? Date.now : () => t;
  server = await startServer(makeConfig({ RATE_LIMIT_SCALE: '100', ADMIN_PORT: String(admin), ADMIN_TOKEN: TOKEN, ...opts.env }), opts.logger ?? createLogger('silent'), now);
  return { srv: server, admin, tick: () => void (t += 1500) };
}

interface RawResult {
  text: string;
  status: number | null;
  statuses: number[];
  closed: boolean;
}
/** 바이트를 그대로 쓰고 응답을 모은다. 서버가 닫거나 waitMs가 지나면 끝낸다. */
function raw(port: number, chunks: Array<string | Buffer>, waitMs = 1200, gapMs = 0): Promise<RawResult> {
  return new Promise((resolve) => {
    let text = '';
    let closed = false;
    const s = net.connect({ host: '127.0.0.1', port });
    raws.push(s);
    const done = (): void => {
      const statuses = [...text.matchAll(/HTTP\/1\.1 (\d{3})/g)].map((m) => Number(m[1]));
      resolve({ text, status: statuses[0] ?? null, statuses, closed });
      s.destroy();
    };
    const timer = setTimeout(done, waitMs);
    s.on('data', (d: Buffer) => (text += d.toString('latin1')));
    s.on('close', () => ((closed = true), clearTimeout(timer), done()));
    s.on('error', () => undefined);
    s.on('connect', async () => {
      for (const c of chunks) {
        s.write(c);
        if (gapMs) await sleep(gapMs);
      }
    });
  });
}
const body = (r: RawResult): string => r.text.split('\r\n\r\n')[1] ?? '';
const req = (method: string, path: string, headers: string[], payload = ''): string =>
  `${method} ${path} HTTP/1.1\r\nHost: 127.0.0.1\r\n${headers.join('\r\n')}${headers.length ? '\r\n' : ''}Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n${payload}`;
const AUTH = `Authorization: Bearer ${TOKEN}`;

async function withRoom(): Promise<{ srv: RunningServer; admin: number; tick: () => void; roomId: string }> {
  const b = await boot();
  const { roomId, host } = await hostRoom(b.srv.port);
  track(host);
  return { ...b, roomId };
}

describe('운영자 admin 적대 시험 (POL-19)', () => {
  it('TC-379 [POL-19] 인증 헤더 변형(스킴 대소문자·공백·중복·쿼리·쿠키·유사 헤더·유니코드·빈 값·같은 길이 다른 값)은 모두 401이고 방은 닫히지 않는다', async () => {
    const { srv, admin, tick, roomId } = await withRoom();
    const path = `/admin/rooms/${roomId}/close`;
    const flip = (i: number): string => (TOKEN[i] === 'a' ? 'b' : 'a');
    const variants: Array<[string, string[], string?]> = [
      ['스킴 소문자 bearer', [`Authorization: bearer ${TOKEN}`]],
      ['스킴 대문자 BEARER', [`Authorization: BEARER ${TOKEN}`]],
      ['공백 2칸', [`Authorization: Bearer  ${TOKEN}`]],
      ['탭 구분', [`Authorization: Bearer\t${TOKEN}`]],
      ['값만(스킴 없음)', [`Authorization: ${TOKEN}`]],
      ['Bearer 만', ['Authorization: Bearer']],
      ['Bearer + 공백만', ['Authorization: Bearer ']],
      ['빈 Authorization', ['Authorization:']],
      ['Token 스킴', [`Authorization: Token ${TOKEN}`]],
      ['스킴 앞에 접두 문자(xBearer)', [`Authorization: xBearer ${TOKEN}`]],
      ['다른 스킴 뒤에 Bearer가 끼어 있음', [`Authorization: Token Bearer ${TOKEN}`]],
      ['쉼표로 여러 스킴', [`Authorization: Basic abc, Bearer ${TOKEN}`]],
      ['Basic 스킴', [`Authorization: Basic ${Buffer.from(`x:${TOKEN}`).toString('base64')}`]],
      ['잘못된 값이 앞선 중복 헤더', ['Authorization: Bearer wrong', AUTH]],
      ['쿼리스트링 토큰', [], `${path}?token=${TOKEN}`],
      ['쿼리스트링 access_token', [], `${path}?access_token=${TOKEN}`],
      ['쿠키 토큰', [`Cookie: ADMIN_TOKEN=${TOKEN}; token=${TOKEN}`]],
      ['X-Authorization', [`X-Authorization: Bearer ${TOKEN}`]],
      ['Proxy-Authorization', [`Proxy-Authorization: Bearer ${TOKEN}`]],
      ['X-Admin-Token', [`X-Admin-Token: ${TOKEN}`]],
      ['메서드 오버라이드 헤더만', [`X-HTTP-Method-Override: POST`, `X-Forwarded-For: 1.2.3.4`, `Forwarded: for=127.0.0.1`]],
      ['유니코드 토큰', ['Authorization: Bearer ' + Buffer.from('토큰토큰토큰토큰토큰토큰토큰토큰토큰토큰토큰', 'utf8').toString('latin1')]],
      ['같은 길이·마지막 1자 다름', [`Authorization: Bearer ${TOKEN.slice(0, -1)}${flip(TOKEN.length - 1) === TOKEN.at(-1) ? 'c' : flip(TOKEN.length - 1)}`]],
      ['같은 길이·첫 1자 다름', [`Authorization: Bearer ${flip(0)}${TOKEN.slice(1)}`]],
      ['2배 길이(토큰 반복)', [`Authorization: Bearer ${TOKEN}${TOKEN}`]],
    ];
    for (const [name, headers, urlOverride] of variants) {
      tick();
      const r = await raw(admin, [req('POST', urlOverride ?? path, [...headers, 'Connection: close'])]);
      expect(r.status, name).toBe(401);
      expect(body(r), name).toBe('{"code":"FORBIDDEN"}');
      expect(srv.rooms.get(roomId), `${name}: 방이 닫히면 안 된다`).toBeDefined();
    }
    // 메서드 오버라이드 헤더 + GET: 인증이 맞아도 GET은 405이고 방은 유지
    tick();
    const getOverride = await raw(admin, [req('GET', path, [AUTH, 'X-HTTP-Method-Override: POST', 'Connection: close'])]);
    expect(getOverride.status).toBe(405);
    expect(srv.rooms.get(roomId)).toBeDefined();
    // 헤더 이름 대소문자는 HTTP 규격상 무관하므로 정상 통과(양성 대조군)
    tick();
    // 값 뒤 공백(OWS)은 HTTP 파서가 제거하므로 정상 통과 — 토큰 값 자체는 정확히 같아야 한다
    const ok = await raw(admin, [req('POST', path, [`aUtHoRiZaTiOn: Bearer ${TOKEN}   `, 'Connection: close'])]);
    expect(ok.status).toBe(200);
    expect(srv.rooms.get(roomId)).toBeUndefined();
  });

  it('TC-380 [POL-19] 경로 변형(점 경로·%2e·이중 슬래시·대문자·끝 슬래시·잘못된 퍼센트·널 바이트·긴 ID·특수문자·공백·개행)은 200이 되지 않고 방은 유지되며 서버는 계속 동작한다', async () => {
    const { srv, admin, tick, roomId } = await withRoom();
    const lower = roomId.toLowerCase() === roomId ? roomId.toUpperCase() : roomId.toLowerCase();
    const cases: Array<[string, string, number[]]> = [
      ['점 경로 ../', `/admin/rooms/../${roomId}/close`, [404]],
      ['점 경로 ./', `/admin/rooms/./${roomId}/close`, [404]],
      ['%2e%2e 방 ID', `/admin/rooms/%2e%2e/close`, [400]],
      ['%2e%2e%2f 슬래시 인코딩', `/admin/rooms/%2e%2e%2f${roomId}/close`, [400]],
      ['%2f 로 방 ID 분리', `/admin/rooms/x%2f${roomId}/close`, [400]],
      ['이중 슬래시(앞)', `//admin/rooms/${roomId}/close`, [404]],
      ['이중 슬래시(중간)', `/admin/rooms//${roomId}/close`, [404]],
      ['빈 방 ID', `/admin/rooms//close`, [400]],
      ['대문자 경로', `/ADMIN/rooms/${roomId}/close`, [404]],
      ['대문자 close', `/admin/rooms/${roomId}/CLOSE`, [404]],
      ['끝 슬래시', `/admin/rooms/${roomId}/close/`, [404]],
      ['잘못된 퍼센트 %zz', `/admin/rooms/%zz/close`, [400]],
      ['퍼센트 하나만 %', `/admin/rooms/%/close`, [400]],
      ['인코딩된 방 ID(%41 형태)', `/admin/rooms/%41${roomId.slice(1)}/close`, [400]],
      ['널 바이트 인코딩 %00', `/admin/rooms/${roomId}%00/close`, [400]],
      ['개행 인코딩 %0d%0a', `/admin/rooms/${roomId}%0d%0a/close`, [400]],
      ['공백 인코딩 %20', `/admin/rooms/${roomId}%20/close`, [400]],
      ['특수문자 <script>', `/admin/rooms/%3Cscript%3Ealert(1)%3C%2Fscript%3E/close`, [400]],
      ['매우 긴 방 ID(3000자)', `/admin/rooms/${'A'.repeat(3000)}/close`, [400]],
      ['방 ID 뒤 추가 세그먼트', `/admin/rooms/${roomId}/close/extra`, [404]],
      ['방 ID 대소문자만 바꿈(없는 방)', `/admin/rooms/${lower}/close`, [404]],
      ['절대 URI 요청줄(absolute-form)', `http://127.0.0.1/admin/rooms/${roomId}/close`, [404]],
      ['호스트 포함 절대 URI+쿼리', `http://evil.example/admin/rooms/${roomId}/close?x=1`, [404]],
      ['세미콜론 파라미터', `/admin/rooms/${roomId}/close;x=1`, [404]],
      ['해시 조각(서버에는 안 옴, 그대로 전송)', `/admin/rooms/${roomId}/close#frag`, [404, 200]],
    ];
    for (const [name, p, expected] of cases) {
      if (name.startsWith('해시')) continue; // 조각은 별도(아래)에서 다룬다
      tick();
      const r = await raw(admin, [req('POST', p, [AUTH, 'Connection: close'])]);
      expect(expected, `${name} → ${r.status}`).toContain(r.status);
      expect(srv.rooms.get(roomId), `${name}: 방이 닫히면 안 된다`).toBeDefined();
    }
    // 원시 널 바이트·공백·개행이 URL에 들어간 요청은 HTTP 파서가 400으로 거절한다
    for (const [name, p] of [['원시 널', `/admin/rooms/${roomId}\x00/close`], ['원시 공백', `/admin/rooms/${roomId} /close`], ['원시 개행', `/admin/rooms/${roomId}\n/close`]] as const) {
      tick();
      const r = await raw(admin, [req('POST', p, [AUTH, 'Connection: close'])]);
      expect([400, null], `${name} → ${r.status}`).toContain(r.status);
      expect(srv.rooms.get(roomId), name).toBeDefined();
    }
    // 인증 전에는 경로가 존재하는지 알려 주지 않는다: 없는 경로도 401(경로 탐색 불가)
    tick();
    const unauthUnknown = await raw(admin, [req('POST', '/admin/secret', ['Connection: close'])]);
    expect(unauthUnknown.status).toBe(401);
    tick();
    const unauthRoot = await raw(admin, [req('GET', '/', ['Connection: close'])]);
    expect(unauthRoot.status).toBe(401);
    // 시험 후에도 정상 요청은 성공한다
    tick();
    const ok = await raw(admin, [req('POST', `/admin/rooms/${roomId}/close`, [AUTH, 'Connection: close'])]);
    expect(ok.status).toBe(200);
  });

  it('TC-381 [POL-19] 메서드(OPTIONS/HEAD/GET/PUT/DELETE/PATCH)는 405(토큰 없으면 401)이고 CORS 헤더가 없으며, Expect: 100-continue·청크 본문·작은 본문은 정상 처리되고 큰 청크 본문은 413이다', async () => {
    const { srv, admin, tick, roomId } = await withRoom();
    const path = `/admin/rooms/${roomId}/close`;
    for (const m of ['OPTIONS', 'HEAD', 'GET', 'PUT', 'DELETE', 'PATCH', 'TRACE', 'CONNECT']) {
      tick();
      const noAuth = await raw(admin, [req(m, path, ['Origin: https://evil.example', 'Connection: close'])]);
      // CONNECT는 Node가 'connect' 이벤트로 넘기고 리스너가 없어 연결을 끊는다(응답 없음) — 방을 닫지 못하면 충분하다
      expect(m === 'CONNECT' ? [401, null] : [401], `${m} 무토큰`).toContain(noAuth.status);
      expect(noAuth.text.toLowerCase(), m).not.toContain('access-control');
      tick();
      const withAuth = await raw(admin, [req(m, path, [AUTH, 'Origin: https://evil.example', 'Connection: close'])]);
      expect([405, 400, null], `${m} 토큰 → ${withAuth.status}`).toContain(withAuth.status);
      expect(withAuth.text.toLowerCase(), m).not.toContain('access-control');
      expect(srv.rooms.get(roomId), m).toBeDefined();
    }
    // 응답 헤더: no-store, 서버 정보·CORS 없음
    tick();
    const unauth = await raw(admin, [req('POST', path, ['Connection: close'])]);
    expect(unauth.text.toLowerCase()).toContain('cache-control: no-store');
    expect(unauth.text.toLowerCase()).not.toMatch(/x-powered-by|server:|access-control/);

    // 큰 청크 본문(2KiB)은 413 또는 연결 종료이고 방은 유지된다
    tick();
    const bigChunk = 'x'.repeat(2048);
    const chunked = await raw(admin, [`POST ${path} HTTP/1.1\r\nHost: x\r\n${AUTH}\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n${bigChunk.length.toString(16)}\r\n${bigChunk}\r\n0\r\n\r\n`]);
    expect([413, null]).toContain(chunked.status);
    expect(srv.rooms.get(roomId)).toBeDefined();

    // Content-Length만 거대(1GB)하고 본문이 안 오는 요청은 방을 닫지 못한다(연결 정리 시간은 TC-383에서 본다)
    tick();
    const slowBody = await raw(admin, [`POST ${path} HTTP/1.1\r\nHost: x\r\n${AUTH}\r\nContent-Length: 1000000000\r\n\r\nabc`], 1000);
    expect(slowBody.status).toBeNull();
    expect(srv.rooms.get(roomId)).toBeDefined();

    // 100-continue: 서버가 100을 보내고 이어서 처리한다(작은 본문). 방은 닫힌다.
    tick();
    const cont = await raw(admin, [`POST ${path} HTTP/1.1\r\nHost: x\r\n${AUTH}\r\nExpect: 100-continue\r\nContent-Length: 2\r\n\r\n`, '{}'], 1500, 150);
    expect(cont.statuses).toEqual([100, 200]);
    expect(srv.rooms.get(roomId)).toBeUndefined();

    // 청크 본문(작은) 도 정상 처리: 새 방
    const second = track(await hostRoom(srv.port).then((r) => ({ socket: r.host.socket, roomId: r.roomId })));
    tick();
    const ok = await raw(admin, [`POST /admin/rooms/${second.roomId}/close HTTP/1.1\r\nHost: x\r\n${AUTH}\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n2\r\n{}\r\n0\r\n\r\n`]);
    expect(ok.status).toBe(200);
  }, 30_000);

  it('TC-382 [POL-19] 요청 밀수(CL/TE 혼합)·파이프라이닝·거대 헤더/요청줄은 두 번째 요청을 실행하지 않고 방을 닫지 못하며 서버는 계속 동작한다', async () => {
    const { srv, admin, tick, roomId } = await withRoom();
    const other = await hostRoom(srv.port);
    track(other.host);
    const path = `/admin/rooms/${roomId}/close`;
    const smuggled = `POST /admin/rooms/${other.roomId}/close HTTP/1.1\r\nHost: x\r\n${AUTH}\r\nContent-Length: 0\r\n\r\n`;

    // CL + TE 혼합(무토큰 바깥 요청 + 토큰 있는 밀수 요청): 바깥이 거절되고 밀수 요청은 실행되지 않는다
    tick();
    const clte = await raw(admin, [`POST ${path} HTTP/1.1\r\nHost: x\r\nContent-Length: ${smuggled.length + 5}\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\n${smuggled}`]);
    expect(clte.statuses.every((s) => s === 400 || s === 401)).toBe(true);
    expect(srv.rooms.get(other.roomId)).toBeDefined();
    // TE.CL 변형(Transfer-Encoding 값 변조)
    tick();
    const te = await raw(admin, [`POST ${path} HTTP/1.1\r\nHost: x\r\nTransfer-Encoding: xchunked\r\nContent-Length: 4\r\n\r\n0\r\n\r\n${smuggled}`]);
    expect(te.statuses.every((s) => s >= 400)).toBe(true);
    expect(srv.rooms.get(other.roomId)).toBeDefined();
    // Content-Length 중복(값 다름)
    tick();
    const dupCl = await raw(admin, [`POST ${path} HTTP/1.1\r\nHost: x\r\nContent-Length: 0\r\nContent-Length: 5\r\n\r\n${smuggled}`]);
    expect(dupCl.status).toBe(400);
    expect(srv.rooms.get(other.roomId)).toBeDefined();

    // 파이프라이닝: 토큰이 있는 요청 뒤에 토큰 없는 요청을 붙여도 인증은 요청마다 따로다 — 두 번째(무토큰)는 앞 요청의 인증을 물려받아 실행되면 안 된다.
    const unauthSecond = `POST /admin/rooms/${other.roomId}/close HTTP/1.1\r\nHost: x\r\nContent-Length: 0\r\n\r\n`;
    tick();
    tick();
    const both = await raw(admin, [req('POST', path, [AUTH]) + unauthSecond]);
    expect(both.statuses[0]).toBe(200);
    expect(srv.rooms.get(roomId)).toBeUndefined();
    expect(srv.rooms.get(other.roomId), '파이프라이닝된 무토큰 요청이 앞 요청의 인증을 물려받아 실행됨').toBeDefined();

    // 거대 요청줄(8KB)·거대 헤더 한 줄(8KB)·헤더 수 폭주(200개)는 400/431이고 서버는 산다
    tick();
    const longLine = await raw(admin, [req('POST', `/admin/rooms/${'A'.repeat(8000)}/close`, [AUTH])]);
    expect([400, 414, 431]).toContain(longLine.status);
    tick();
    const bigHdr = await raw(admin, [req('POST', `/admin/rooms/${other.roomId}/close`, [AUTH, `X-Pad: ${'p'.repeat(8000)}`])]);
    expect([400, 431]).toContain(bigHdr.status);
    tick();
    const manyHdr = await raw(admin, [req('POST', `/admin/rooms/${other.roomId}/close`, [AUTH, ...Array.from({ length: 800 }, (_, i) => `X-H${i}: v`)])]);
    expect([400, 431]).toContain(manyHdr.status);
    expect(srv.rooms.get(other.roomId)).toBeDefined();
    // 시험 뒤 정상 요청은 여전히 성공
    tick();
    const ok = await raw(admin, [req('POST', `/admin/rooms/${other.roomId}/close`, [AUTH, 'Connection: close'])]);
    expect(ok.status).toBe(200);
  });

  it('TC-383 [POL-19] 느린 연결(slowloris) 16개가 admin 연결 한도를 채워도 공개 포트와 방 상태는 영향이 없고, 느린 연결은 15초 안에 정리되어(DEF-002 수정) 정상 요청이 다시 처리된다', async () => {
    const { srv, admin, tick, roomId } = await withRoom();
    const idle: net.Socket[] = [];
    for (let i = 0; i < 16; i++) {
      const s = net.connect({ host: '127.0.0.1', port: admin });
      raws.push(s);
      s.on('error', () => undefined);
      s.resume(); // 서버의 400+FIN을 소비해야 클라이언트 쪽 close가 발생한다
      s.on('connect', () => s.write('POST /admin/rooms/x/close HTTP/1.1\r\nHost: x\r\n')); // 헤더를 끝내지 않는다
      idle.push(s);
    }
    await sleep(300);
    // 공개 포트: 영향 없음
    const health = await fetch(`http://127.0.0.1:${srv.port}/healthz`);
    expect(health.status).toBe(200);
    const status = await (await fetch(`http://127.0.0.1:${srv.port}/api/rooms/${roomId}`)).json();
    expect(status).toMatchObject({ exists: true });
    expect(srv.rooms.get(roomId)).toBeDefined();
    // 한도(16)를 넘은 연결은 받아 주지 않는다 = 정상 요청도 지금은 못 한다(운영자 측 일시 거부, 알려진 한계)
    tick();
    const during = await raw(admin, [req('POST', `/admin/rooms/${roomId}/close`, [AUTH, 'Connection: close'])], 800);
    expect(during.status, '느린 연결이 한도를 채운 동안에는 처리되지 않는다').toBeNull();
    // 정리 시간: 서버가 느린 연결을 스스로 끊는다
    const t0 = Date.now();
    await new Promise<void>((resolve) => {
      let n = 0;
      for (const s of idle) s.on('close', () => ++n === idle.length && resolve());
      setTimeout(resolve, 50_000);
    });
    const reapMs = Date.now() - t0;
    console.log(`[TC-383] slowloris 16 connections reaped after ${reapMs}ms`);
    // headersTimeout 3s/requestTimeout 5s가 의도대로 작동하도록 connectionsCheckingInterval=1s로 줄였다(DEF-002 수정; 기본 30s 검사 주기에서는 ~30s 걸렸다).
    expect(reapMs, `느린 연결 정리까지 ${reapMs}ms`).toBeLessThan(15_000);
    tick();
    const after = await raw(admin, [req('POST', `/admin/rooms/${roomId}/close`, [AUTH, 'Connection: close'])]);
    expect(after.status).toBe(200);
  }, 90_000);

  it('TC-384 [POL-19] 속도 제한은 인증에 실패한 요청에만 적용된다: 틀린 토큰을 쏟아부으면 429가 되지만 올바른 토큰의 운영자는 잠기지 않는다 (DEF-003 수정)', async () => {
    const { srv, admin } = await boot({ fakeClock: false });
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await hostRoom(srv.port);
      track(r.host);
      ids.push(r.roomId);
    }
    const post = (id: string, token: string): Promise<number> =>
      fetch(`http://127.0.0.1:${admin}/admin/rooms/${id}/close`, { method: 'POST', headers: { authorization: `Bearer ${token}` } }).then(async (r) => (await r.text(), r.status));
    // 1) 틀린 토큰 30번: 한도(20) 이후 429가 섞인다(무차별 대입 억제)
    const bad: number[] = [];
    for (let i = 0; i < 30; i++) bad.push(await post('A'.repeat(22), 'wrong-token'));
    expect(bad.slice(0, 15).every((s) => s === 401)).toBe(true);
    expect(bad).toContain(429);
    // 2) 한도가 소진된 '직후'에도 올바른 토큰은 즉시 방을 닫을 수 있다(운영자 잠김 방지)
    expect(await post(ids[0] as string, TOKEN)).toBe(200);
    expect(srv.rooms.get(ids[0] as string)).toBeUndefined();
    // 3) 올바른 토큰으로 한도보다 많이(30번) 호출해도 429가 되지 않는다(없는 방은 404)
    const good: number[] = [];
    for (let i = 0; i < 30; i++) good.push(await post('A'.repeat(22), TOKEN));
    expect(good.every((s) => s === 404)).toBe(true);
    // 4) 429 응답에는 내부 정보가 없다
    for (let i = 0; i < 25; i++) await post('A'.repeat(22), 'wrong-token');
    const r429 = await fetch(`http://127.0.0.1:${admin}/admin/rooms/${ids[1]}/close`, { method: 'POST', headers: { authorization: 'Bearer wrong-token' } });
    expect(r429.status).toBe(429);
    expect(await r429.text()).toBe('{"code":"RATE_LIMITED"}');
    expect(srv.rooms.get(ids[1] as string)).toBeDefined();
    // 5) 공개 포트는 admin 한도와 무관
    expect((await fetch(`http://127.0.0.1:${srv.port}/healthz`)).status).toBe(200);
  }, 30_000);

  it('TC-385 [POL-19] 시작 실패·노출: ADMIN_PORT가 이미 사용 중이면 서버가 시작되지 않고 공개 포트도 남지 않으며, 공개 포트로는 /admin 경로가 어떤 메서드·토큰으로도 방을 닫지 못한다', async () => {
    // 이미 쓰이는 포트(127.0.0.1) → startServer 거부 + 공개 포트 해제
    const blocker = net.createServer();
    await new Promise<void>((r) => blocker.listen(0, '127.0.0.1', r));
    const busy = (blocker.address() as net.AddressInfo).port;
    const pub = await freePort();
    await expect(startServer(makeConfig({ PORT: String(pub), ADMIN_PORT: String(busy), ADMIN_TOKEN: TOKEN }), createLogger('silent'))).rejects.toThrow(/EADDRINUSE/);
    // 공개 포트가 풀렸는지: 같은 포트로 바로 다시 바인딩할 수 있다
    await new Promise<void>((resolve, reject) => {
      const probe = net.createServer();
      probe.once('error', reject);
      probe.listen(pub, () => probe.close(() => resolve()));
    });
    // admin을 공개 포트와 같은 포트로 설정하면 설정 오류
    expect(() => makeConfig({ PORT: '3555', ADMIN_PORT: '3555', ADMIN_TOKEN: TOKEN })).toThrow(/ADMIN_PORT/);
    // 짧은 토큰·빈 토큰은 설정 오류(빈 값은 '없음'이므로 PORT만 있어 오류)
    expect(() => makeConfig({ ADMIN_PORT: '3556', ADMIN_TOKEN: 'short' })).toThrow(/32자/);
    expect(() => makeConfig({ ADMIN_PORT: '3556', ADMIN_TOKEN: '' })).toThrow(/함께/);
    expect(() => makeConfig({ ADMIN_PORT: '3556', ADMIN_TOKEN: ' '.repeat(40) })).toThrow(/함께/);
    expect(() => makeConfig({ NODE_ENV: 'production', ADMIN_PORT: '3556', ADMIN_TOKEN: 'change-me-admin-token-change-me-admin', SESSION_SECRET: 'x'.repeat(40) })).toThrow(/change-me/);
    blocker.close();

    // 공개 포트에서 /admin 경로: 모든 메서드·토큰 유무에서 방이 닫히지 않는다
    const { srv } = await boot();
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    for (const m of ['POST', 'GET', 'PUT', 'DELETE']) {
      for (const hdr of [[], [AUTH]]) {
        const r = await raw(srv.port, [req(m, `/admin/rooms/${roomId}/close`, [...hdr, 'Connection: close'])]);
        expect(r.status, `${m} ${hdr.length ? '토큰' : '무토큰'}`).not.toBe(200);
        expect(r.text).not.toContain('"closed":true');
      }
    }
    expect(srv.rooms.get(roomId)).toBeDefined();
  });

  it('TC-386 [POL-19,EVT-34] 경합: 같은 방에 폐쇄 2건 동시 → 정확히 1건만 200, 폐쇄와 동시에 입장·퇴장·재접속하는 참가자도 방이 되살아나지 않고 모든 소켓이 정리된다', async () => {
    const { srv, admin, tick, roomId } = await withRoom();
    const host = [...sockets][0] as Socket;
    const guests = [track(await join(srv.port, roomId, 'g1')), track(await join(srv.port, roomId, 'g2'))];
    const closedFlags = [host, ...guests.map((g) => g.socket)].map((s) => new Promise<boolean>((resolve) => (s.once('room:closed', () => resolve(true)), setTimeout(() => resolve(false), 3000))));
    // 동시 2건 폐쇄(+ 동시 입장 5건 + 한 명 퇴장)
    const postOnce = (): Promise<number> => (tick(), fetch(`http://127.0.0.1:${admin}/admin/rooms/${roomId}/close`, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } }).then((r) => r.status));
    const late = Array.from({ length: 5 }, (_, i) => join(srv.port, roomId, `late${i}`));
    guests[0]?.socket.emit('room:leave', { v: 1 });
    const [a, b] = await Promise.all([postOnce(), postOnce()]);
    expect([a, b].sort()).toEqual([200, 404]);
    const lateJoined = await Promise.all(late);
    for (const l of lateJoined) track(l);
    await sleep(500);
    // 입장 결과는 (폐쇄 전 성공) 또는 ROOM_NOT_FOUND 둘 중 하나이며, 폐쇄 후에는 방이 존재하지 않는다
    for (const l of lateJoined) expect(l.res.ok === true || l.res.code === 'ROOM_NOT_FOUND', JSON.stringify(l.res)).toBe(true);
    expect(srv.rooms.get(roomId)).toBeUndefined();
    expect(srv.rooms.size).toBe(0);
    // 폐쇄 전에 성공했던 모든 소켓은 끊겼다(방 채널에 남은 소켓 없음)
    for (const l of lateJoined) if (l.res.ok) expect(l.socket.connected, '폐쇄 전에 입장에 성공한 소켓').toBe(false);
    expect([host, guests[1]?.socket].every((s) => !s?.connected)).toBe(true); // 먼저 room:leave 한 g1은 소켓을 닫을 의무가 없다
    expect((await Promise.all(closedFlags)).filter(Boolean).length).toBeGreaterThanOrEqual(2);
    // 재접속(resume)과 입장은 이후에도 계속 거부
    const again = track({ socket: await connect(srv.port) });
    expect(await emit(again.socket, 'room:resume', { v: 1, token: guests[1]?.token })).toMatchObject({ ok: false, code: 'ROOM_NOT_FOUND' });
    expect(srv.rooms.size).toBe(0);
  });

  it('TC-387 [POL-19,SEC-04] 참가자가 room:closed(또는 유사 이벤트)를 서버로 보내 같은 방 참가자에게 릴레이시키려 해도 서버는 전달하지 않고 방은 유지된다', async () => {
    const { srv, roomId, host } = await (async () => {
      const w = await withRoom();
      return { ...w, host: [...sockets][0] as Socket };
    })();
    const g1 = track(await join(srv.port, roomId, 'g1'));
    const g2 = track(await join(srv.port, roomId, 'g2'));
    const got: string[] = [];
    for (const s of [host, g2.socket]) {
      s.on('room:closed', () => got.push('room:closed'));
      s.on('room:kicked', () => got.push('room:kicked'));
      s.on('error', () => got.push('error'));
    }
    for (const ev of ['room:closed', 'room:kicked', 'closedByOperator', 'operator:close', 'admin:close']) {
      g1.socket.emit(ev, { v: 1, reason: 'operator' });
      g1.socket.emit(ev, { v: 1 }, () => undefined);
    }
    await sleep(600);
    expect(got).toEqual([]);
    expect(srv.rooms.get(roomId)?.participants.size).toBe(3);
    expect(host.connected && g2.socket.connected).toBe(true);
    // 서버가 정상 동작 중임을 대조(채팅은 여전히 릴레이)
    const chat = new Promise<boolean>((resolve) => (g2.socket.once('chat:message', () => resolve(true)), setTimeout(() => resolve(false), 2000)));
    expect(await emit(g1.socket, 'chat:send', { v: 1, text: 'ok' })).toMatchObject({ ok: true });
    expect(await chat).toBe(true);
  });

  it('TC-388 [POL-19,SEC-10] 폐쇄 한 번이 남기는 로그 전체를 캡처해 방 ID 앞 6자·인원수 외에 닉네임·토큰·IP·전체 방 ID가 없는지 확인한다(debug 수준)', async () => {
    const lines: string[] = [];
    const logger = createLogger('trace', { write: (s: string) => void lines.push(s) });
    const { srv, admin, tick } = await boot({ logger, env: { LOG_LEVEL: 'debug' } });
    const { roomId, host } = await hostRoom(srv.port);
    track(host);
    const g = track(await join(srv.port, roomId, 'SecretNick'));
    lines.length = 0;
    tick();
    await fetch(`http://127.0.0.1:${admin}/admin/rooms/${roomId}/close`, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } });
    await sleep(400);
    const all = lines.join('');
    console.log('[TC-388] captured log lines:\n' + lines.join(''));
    expect(all).toContain('operator action');
    expect(all).not.toContain(roomId);
    expect(all).not.toContain(TOKEN);
    expect(all).not.toContain('SecretNick');
    expect(all).not.toContain(g.token);
    expect(all).not.toMatch(/127\.0\.0\.1|::ffff|"ip"|authorization/i);
    // 폐쇄 한 번의 로그는 operator action 한 줄이고, 필드는 action·room(앞 6자)·size 뿐이다
    expect(lines).toHaveLength(1);
    const o = JSON.parse(lines[0] as string) as Record<string, unknown>;
    expect(Object.keys(o).sort()).toEqual(['action', 'hostname', 'level', 'msg', 'pid', 'room', 'size', 'time']);
    expect(o).toMatchObject({ action: 'close', room: roomId.slice(0, 6), size: 2, msg: 'operator action' });
  });
  it('TC-389 [POL-19] 인증은 본문보다 먼저: 토큰 없는 큰 본문은 413이 아니라 401이고, 본문 1024B는 처리·1025B는 413, 헤더 한도 경계(약 4KB)가 지켜진다', async () => {
    const { srv, admin, tick, roomId } = await withRoom();
    const path = `/admin/rooms/${roomId}/close`;
    // 무토큰 + 2KiB·1MB 본문: 인증 실패가 먼저이므로 401(413이면 본문 처리가 인증보다 앞선 것)
    tick();
    const unauthBig = await raw(admin, [req('POST', path, ['Connection: close'], 'x'.repeat(2048))]);
    expect(unauthBig.status).toBe(401);
    tick();
    const unauthHuge = await raw(admin, [req('POST', path, ['Connection: close'], 'x'.repeat(1_000_000))], 1500);
    expect(unauthHuge.status === 401 || unauthHuge.status === null).toBe(true);
    expect(srv.rooms.get(roomId)).toBeDefined();
    // 본문을 선언만 하고 보내지 않아도(본문 대기 중) 인증 실패는 즉시 401이다 — 본문을 다 받은 뒤 인증하면 requestTimeout까지 걸린다
    tick();
    const t0 = Date.now();
    const declared = await raw(admin, [`POST ${path} HTTP/1.1\r\nHost: x\r\nContent-Length: 1000\r\n\r\n`], 2500);
    expect(declared.status).toBe(401);
    expect(Date.now() - t0, '본문을 기다리지 않고 즉시 401').toBeLessThan(1500);
    // 틀린 토큰 + 큰 본문도 401
    tick();
    const wrongBig = await raw(admin, [req('POST', path, ['Authorization: Bearer nope', 'Connection: close'], 'x'.repeat(2048))]);
    expect(wrongBig.status).toBe(401);
    // 본문 경계: 1025B → 413, 방 유지 / 1024B → 200
    tick();
    const over = await raw(admin, [req('POST', path, [AUTH, 'Connection: close'], 'x'.repeat(1025))]);
    expect([413, null]).toContain(over.status);
    expect(srv.rooms.get(roomId)).toBeDefined();
    // 헤더 경계: 총 헤더가 4096B 미만이면 통과(404 아닌 처리), 4096B를 넘으면 431/400
    const base = req('POST', path, [AUTH, 'Connection: close']).split('\r\n\r\n')[0] as string;
    const pad = (total: number): string => `X-P: ${'p'.repeat(Math.max(1, total - base.length - 2 - 2 - 5 - 2))}`;
    tick();
    const under = await raw(admin, [req('POST', path, [AUTH, 'Connection: close', pad(3900)])]);
    expect(under.status).toBe(200);
    expect(srv.rooms.get(roomId)).toBeUndefined();
    const second = await hostRoom(srv.port);
    track(second.host);
    tick();
    const overHdr = await raw(admin, [req('POST', `/admin/rooms/${second.roomId}/close`, [AUTH, 'Connection: close', pad(4400)])]);
    expect([400, 431]).toContain(overHdr.status);
    expect(srv.rooms.get(second.roomId)).toBeDefined();
    // 본문 정확히 1024B는 처리된다
    tick();
    const exact = await raw(admin, [req('POST', `/admin/rooms/${second.roomId}/close`, [AUTH, 'Connection: close'], 'x'.repeat(1024))]);
    expect(exact.status).toBe(200);
  });
  it('TC-391 [POL-19] 폐쇄 후 끊김 유예·빈 방 타이머가 남지 않는다: 유예 중이던 참가자의 만료로 닫힌 방에 대한 이벤트가 더 나오지 않는다', async () => {
    const events: RoomEvent[] = [];
    const mgr = new RoomManager({ maxParticipants: 3, maxRooms: 2, emptyTtlMs: 150, graceMs: 100, onEvent: (e) => events.push(e) });
    const created = mgr.createRoom();
    if (!created.ok) throw new Error('create');
    const id = created.room.id;
    const h = mgr.join({ roomId: id, nickname: 'h', ipKey: 'k1', hostClaim: true, passwordOk: true });
    const g = mgr.join({ roomId: id, nickname: 'g', ipKey: 'k2', hostClaim: false, passwordOk: true });
    if (!h.ok || !g.ok) throw new Error('join');
    mgr.disconnect(id, g.participant.id); // g는 유예 중
    mgr.leave(id, h.participant.id); // 호스트 이탈(이양·빈 방 타이머 경로를 지난다)
    events.length = 0;
    expect(mgr.closeByOperator(id)).toMatchObject({ ok: true });
    const empty = mgr.createRoom();
    if (!empty.ok) throw new Error('create2');
    expect(mgr.closeByOperator(empty.room.id)).toEqual({ ok: true, participants: 0 });
    events.length = 0;
    await sleep(400); // 유예(100ms)와 빈 방 TTL(150ms)이 모두 지난 뒤
    expect(events, '폐쇄된 방에 대해 타이머가 이벤트를 내면 안 된다').toEqual([]);
    expect(mgr.get(id)).toBeUndefined();
    mgr.dispose();
  });

  it('TC-392 [POL-19] 서버 종료(graceful shutdown)는 admin 리스너도 닫아 포트가 풀리고, 기동 후 admin 포트가 공개 포트와 다른 리스너임을 확인한다', async () => {
    const { srv, admin } = await boot();
    expect(srv.adminPort).toBe(admin);
    expect(srv.port).not.toBe(admin);
    const canConnect = (port: number): Promise<boolean> =>
      new Promise((resolve) => {
        const s = net.connect({ host: '127.0.0.1', port });
        s.once('connect', () => (s.destroy(), resolve(true)));
        s.once('error', () => resolve(false));
      });
    expect(await canConnect(admin)).toBe(true);
    const pub = srv.port;
    await srv.close();
    server = undefined;
    expect(await canConnect(admin), 'admin 포트가 종료 후에도 열려 있음').toBe(false);
    expect(await canConnect(pub)).toBe(false);
  });
  // DEF-001(방 폐쇄 중 예외가 'end' 콜백에서 프로세스를 죽임)의 회귀 시험. 별도 프로세스에서 closeRoom이 예외를 던지게 해 500 응답과 생존을 확인한다.
  it('TC-393 [POL-19] closeRoom이 예외를 던져도 admin은 500 INTERNAL로 응답하고 프로세스(공개 포트 포함)는 죽지 않는다 (DEF-001 수정)', () => {
    const adminUrl = pathToFileURL(path.resolve(__dirname, '../src/http/admin.ts')).href;
    const loggerUrl = pathToFileURL(path.resolve(__dirname, '../src/logger.ts')).href;
    const code = `
      import { createAdminServer } from '${adminUrl}';
      import { createLogger } from '${loggerUrl}';
      const T = 'x'.repeat(40);
      const srv = createAdminServer({ token: T, closeRoom: () => { throw new Error('boom'); }, logger: createLogger('silent') });
      srv.listen(0, '127.0.0.1', async () => {
        const port = srv.address().port;
        const r = await fetch('http://127.0.0.1:' + port + '/admin/rooms/AAAAAAAAAAAAAAAAAAAAAA/close', { method: 'POST', headers: { authorization: 'Bearer ' + T } }).then((x) => x.status, () => 'no-response');
        console.log('RESULT ' + r);
        process.exit(0);
      });`;
    const r = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 30_000 });
    expect(r.stdout).toContain('RESULT 500');
    expect(r.status).toBe(0);
  });
});
