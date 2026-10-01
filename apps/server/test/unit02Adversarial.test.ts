import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import type { IncomingMessage } from 'node:http';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { clientIp } from '../src/http/clientIp';
import type { RunningServer } from '../src/server';
import { ORIGIN, SECRET, boot, connect, createRoom, join, makeConfig, once } from './helpers';

// unit-02(서버 기반) 6단계 소급 보강 시험. 제품 코드는 건드리지 않는다.

const servers: RunningServer[] = [];
const up = async (overrides: Record<string, string> = {}, now?: () => number): Promise<RunningServer> => {
  const s = await boot(overrides, now);
  servers.push(s);
  return s;
};
afterEach(async () => {
  while (servers.length) await servers.pop()?.close();
});

const fakeReq = (xff: string | string[] | undefined, addr: string | undefined = '10.0.0.9'): IncomingMessage =>
  ({ headers: xff === undefined ? {} : { 'x-forwarded-for': xff }, socket: { remoteAddress: addr } }) as unknown as IncomingMessage;

const postRoom = (port: number, headers: Record<string, string> = {}): Promise<Response> =>
  fetch(`http://127.0.0.1:${port}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: '{"v":1}' });

describe('unit-02 적대·경계 시험', () => {
  it('TC-422 [SEC-06,SEC-08] 클라이언트 IP 판정: TRUST_PROXY=0이면 X-Forwarded-For를 무시, N>0이면 오른쪽에서 N번째만 신뢰(왼쪽 위조 값 무시)', () => {
    expect(clientIp(fakeReq('1.1.1.1, 2.2.2.2'), 0)).toBe('10.0.0.9');
    expect(clientIp(fakeReq('spoofed, 2.2.2.2'), 1)).toBe('2.2.2.2');
    expect(clientIp(fakeReq('spoofed, 3.3.3.3, 2.2.2.2'), 2)).toBe('3.3.3.3');
    expect(clientIp(fakeReq(['spoofed', '2.2.2.2']), 1)).toBe('2.2.2.2');
    expect(clientIp(fakeReq(undefined), 1)).toBe('10.0.0.9'); // 헤더 없음
    expect(clientIp(fakeReq(''), 1)).toBe('10.0.0.9');
    expect(clientIp(fakeReq(' , '), 1)).toBe('10.0.0.9');
    expect(clientIp(fakeReq('only-one'), 2)).toBe('10.0.0.9'); // 홉 수보다 항목이 적으면 소켓 주소
    const noAddr = { headers: {}, socket: {} } as unknown as IncomingMessage;
    expect(clientIp(noAddr, 0)).toBe('unknown');
  });

  it('TC-422b [SEC-06] 속도 제한은 실제 판정 IP 기준이다: 왼쪽 XFF를 바꿔도 우회되지 않고, 오른쪽(프록시가 붙인) 값이 다르면 별도 버킷이다', async () => {
    const s = await up({ TRUST_PROXY: '1', RATE_LIMIT_SCALE: '1' });
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) codes.push((await postRoom(s.port, { 'x-forwarded-for': `spoof-${i}, 198.51.100.7` })).status);
    expect(codes.slice(0, 10).every((c) => c === 201)).toBe(true);
    expect(codes.slice(10)).toContain(429);
    // 다른 클라이언트(오른쪽 값이 다름)는 영향받지 않는다
    expect((await postRoom(s.port, { 'x-forwarded-for': 'spoof-0, 198.51.100.8' })).status).toBe(201);

    // TRUST_PROXY=0: 헤더를 무시하므로 XFF를 바꿔도 같은 소켓 IP로 묶여 제한된다
    const s0 = await up({ TRUST_PROXY: '0', RATE_LIMIT_SCALE: '1' });
    const codes0: number[] = [];
    for (let i = 0; i < 12; i++) codes0.push((await postRoom(s0.port, { 'x-forwarded-for': `203.0.113.${i}` })).status);
    expect(codes0.slice(10)).toContain(429);
  });

  it('TC-423 [SEC-08] 오류 응답 본문은 코드만 담고(정확히 일치), 내부 예외가 나도 메시지·스택을 싣지 않는다', async () => {
    const s = await up({ RATE_LIMIT_SCALE: '100' });
    const base = `http://127.0.0.1:${s.port}`;
    const post = (body: string): Promise<Response> => fetch(`${base}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body });
    for (const body of ['{not json', '{"v":2}', '{"v":1,"extra":1}', '[]', 'null']) {
      const r = await post(body);
      expect(r.status, body).toBe(400);
      expect(await r.json(), body).toEqual({ code: 'INVALID_PAYLOAD' });
    }
    const big = await post(JSON.stringify({ v: 1, password: 'x'.repeat(5000) }));
    expect(big.status).toBe(413);
    expect(await big.json()).toEqual({ code: 'INVALID_PAYLOAD' });
    const nf = await fetch(`${base}/nope`);
    expect(nf.status).toBe(404);
    expect(await nf.json()).toEqual({ code: 'NOT_FOUND' });

    // 서버 내부 예외(방 생성 중 오류)는 500 + 일반 코드만
    s.rooms.createRoom = () => {
      throw new Error('secret-internal-detail /srv/app/db.ts');
    };
    const r500 = await post('{"v":1}');
    expect(r500.status).toBe(500);
    const text = await r500.text();
    expect(JSON.parse(text)).toEqual({ code: 'INTERNAL' });
    expect(text).not.toMatch(/secret-internal-detail|\.ts|stack|node_modules/);
    // 이후에도 서버는 계속 응답한다
    expect((await fetch(`${base}/healthz`)).status).toBe(200);
  });

  it('TC-424 [NFR-08,NFR-04,SEC-10] 설정 경계값: 정원 2~12, 방 수 1~10000, 유예 1~300초, IP 연결 1~1000, 포트 0~65535, TRUST_PROXY 0~5, TURN TTL 60~86400, 배율 1~1000', () => {
    const ok = (o: Record<string, string>): boolean => {
      try {
        makeConfig(o);
        return true;
      } catch {
        return false;
      }
    };
    const table: Array<[string, Array<[string, boolean]>]> = [
      ['MAX_PARTICIPANTS', [['1', false], ['2', true], ['12', true], ['13', false], ['2.5', false], ['abc', false]]],
      ['MAX_ROOMS', [['0', false], ['1', true], ['10000', true], ['10001', false]]],
      ['RECONNECT_GRACE_SEC', [['0.5', false], ['1', true], ['300', true], ['301', false]]],
      ['ROOM_EMPTY_TTL_MIN', [['0', false], ['0.01', true], ['1440', true], ['1441', false]]],
      ['IP_MAX_CONNECTIONS', [['0', false], ['1', true], ['1000', true], ['1001', false]]],
      ['PORT', [['-1', false], ['0', true], ['65535', true], ['65536', false], ['80.5', false]]],
      ['TRUST_PROXY', [['-1', false], ['0', true], ['5', true], ['6', false]]],
      ['RATE_LIMIT_SCALE', [['0.5', false], ['1', true], ['1000', true], ['1001', false]]],
      ['LOG_LEVEL', [['info', true], ['silent', true], ['verbose', false], ['', false]]],
      ['NODE_ENV', [['production', true], ['test', true], ['prod', false]]],
    ];
    for (const [key, cases] of table) {
      for (const [value, expected] of cases) expect(ok({ [key]: value }), `${key}=${value}`).toBe(expected);
    }
    for (const [ttl, expected] of [['59', false], ['60', true], ['86400', true], ['86401', false]] as const) {
      expect(ok({ TURN_URLS: 'turn:t.example:3478', TURN_SECRET: 'turn-secret-turn-secret', TURN_TTL_SEC: ttl }), `TTL ${ttl}`).toBe(expected);
    }
    expect(ok({ TURN_URLS: 'turn:t.example:3478', TURN_SECRET: 'x'.repeat(15) })).toBe(false);
    expect(ok({ TURN_URLS: 'turn:t.example:3478', TURN_SECRET: 'x'.repeat(16) })).toBe(true);
    expect(ok({ SESSION_SECRET: 'x'.repeat(31) })).toBe(false);
    expect(ok({ SESSION_SECRET: 'x'.repeat(32) })).toBe(true);
    // 기본값(운영 한도): 연결 20, 정원 6, TRUST_PROXY 0(XFF 기본 불신), 배율 1
    const d = makeConfig();
    expect([d.IP_MAX_CONNECTIONS, d.MAX_PARTICIPANTS, d.TRUST_PROXY, d.RATE_LIMIT_SCALE, d.RECONNECT_GRACE_SEC, d.TURN_TTL_SEC]).toEqual([20, 6, 0, 1, 20, 3600]);
  });

  it('TC-424b [SEC-10,NFR-08] 설정 오류 메시지는 잘못된 비밀값 자체를 되풀이하지 않는다', () => {
    const leak = 'super-secret-short-value';
    const envs: Array<Record<string, string>> = [{ SESSION_SECRET: leak }, { TURN_URLS: 'turn:t.example:3478', TURN_SECRET: leak.slice(0, 15) }, { ADMIN_PORT: '4000', ADMIN_TOKEN: leak }];
    for (const env of envs) {
      try {
        makeConfig(env);
        throw new Error('should have thrown');
      } catch (e) {
        const msg = (e as Error).message;
        expect(msg).toContain('환경변수 오류');
        expect(msg).not.toContain(leak.slice(0, 15));
        expect(msg).not.toMatch(/\n\s+at /); // 스택 없음
      }
    }
  });

  it('TC-425 [SEC-06] 방 상태 조회도 IP당 속도 제한이 있다(429, 본문은 코드만)', async () => {
    const s = await up({ RATE_LIMIT_SCALE: '1' });
    const url = `http://127.0.0.1:${s.port}/api/rooms/${'A'.repeat(22)}`;
    const results: Response[] = [];
    for (let i = 0; i < 75; i++) results.push(await fetch(url));
    const limited = results.filter((r) => r.status === 429);
    expect(limited.length).toBeGreaterThan(0);
    expect(results.filter((r) => r.status === 200).length).toBeLessThanOrEqual(64); // 용량 60 + 측정 중 보충
    expect(await limited[0]?.json()).toEqual({ code: 'RATE_LIMITED' });
  });

  it('TC-426 [SEC-03,SEC-05] 호스트 클레임은 발급 후 1시간 안에만 유효하다(경계: 만료 시각 정각은 무효)', async () => {
    let clock = 1_800_000_000_000;
    const s = await up({ RATE_LIMIT_SCALE: '100' }, () => clock);
    const early = await createRoom(s.port);
    const atEdge = await createRoom(s.port);
    const late = await createRoom(s.port);
    const start = clock;
    clock = start + 3_600_000 - 1;
    const a = await join(s.port, early.roomId, '호스트', { hostClaim: early.hostClaim });
    expect(a.res).toMatchObject({ ok: true });
    expect(a.res.hostId).toBe(a.id);
    a.socket.close();
    clock = start + 3_600_000;
    const b = await join(s.port, atEdge.roomId, '호스트', { hostClaim: atEdge.hostClaim });
    expect(b.res).toMatchObject({ ok: false, code: 'HOST_NOT_PRESENT' });
    b.socket.close();
    clock = start + 3_600_001;
    const c = await join(s.port, late.roomId, '호스트', { hostClaim: late.hostClaim });
    expect(c.res).toMatchObject({ ok: false, code: 'HOST_NOT_PRESENT' });
    c.socket.close();
  });

  it('TC-427 [NFR-08] 서버 종료(close)는 열린 소켓을 끊고 포트를 반납하며 방 상태를 비운다', async () => {
    const s = await boot({ RATE_LIMIT_SCALE: '100' });
    const { roomId, hostClaim } = await createRoom(s.port);
    const h = await join(s.port, roomId, '호스트', { hostClaim });
    expect(h.res.ok).toBe(true);
    const disconnected = once<string>(h.socket, 'disconnect');
    expect(s.rooms.size).toBe(1);
    await s.close();
    expect(await disconnected).toBeTruthy();
    expect(s.rooms.size).toBe(0);
    await expect(fetch(`http://127.0.0.1:${s.port}/healthz`)).rejects.toBeTruthy();
    h.socket.close();
  });

  it('TC-427b [NFR-08] 필수 환경변수가 없으면 프로세스가 종료코드 1로 끝나고 원인만 출력한다, 정상 기동 후 SIGTERM이면 종료코드 0으로 정리한다', async () => {
    const serverDir = path.resolve(process.cwd());
    const run = (env: Record<string, string>): ReturnType<typeof spawn> =>
      spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], { cwd: serverDir, env: { PATH: process.env.PATH ?? '', ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    const collect = (child: ReturnType<typeof spawn>): { out: () => string; err: () => string } => {
      let o = '';
      let e = '';
      child.stdout?.on('data', (d: Buffer) => (o += d.toString()));
      child.stderr?.on('data', (d: Buffer) => (e += d.toString()));
      return { out: () => o, err: () => e };
    };
    // 1) 환경변수 누락
    const bad = run({ NODE_ENV: 'test' });
    const badIo = collect(bad);
    const badCode = await new Promise<number | null>((resolve) => bad.once('exit', (c) => resolve(c)));
    expect(badCode).toBe(1);
    expect(badIo.err()).toContain('환경변수 오류');
    expect(badIo.err()).toContain('SESSION_SECRET');
    expect(badIo.err()).not.toMatch(/\n\s+at /);

    // 2) 정상 기동 → SIGTERM
    const good = run({ NODE_ENV: 'test', PORT: '0', ALLOWED_ORIGINS: ORIGIN, SESSION_SECRET: SECRET, LOG_LEVEL: 'info' });
    const goodIo = collect(good);
    const started = await new Promise<boolean>((resolve) => {
      const t = setInterval(() => {
        if (goodIo.out().includes('server listening')) {
          clearInterval(t);
          resolve(true);
        }
      }, 50);
      setTimeout(() => {
        clearInterval(t);
        resolve(false);
      }, 15_000);
    });
    expect(started).toBe(true);
    const exited = new Promise<number | null>((resolve) => good.once('exit', (c) => resolve(c)));
    good.kill('SIGTERM');
    expect(await exited).toBe(0);
    expect(goodIo.out()).toContain('shutting down');
    expect(goodIo.out()).not.toContain(SECRET); // 비밀값은 로그에 없다
  }, 40_000);

  it('TC-428 [SEC-08] CORS: 대소문자·후행 슬래시·접미 도메인·null Origin을 모두 거부하고(OPTIONS 포함), Origin이 없으면 CORS 헤더를 붙이지 않는다', async () => {
    const s = await up({ RATE_LIMIT_SCALE: '100' });
    const base = `http://127.0.0.1:${s.port}`;
    const bad = [`${ORIGIN}/`, 'HTTP://LOCALHOST:5173', `${ORIGIN}.evil.com`, 'http://localhost:5174', 'https://localhost:5173', 'null', '*', ''];
    for (const origin of bad) {
      if (origin === '') continue; // 빈 헤더는 "없음"과 같다
      for (const method of ['GET', 'OPTIONS', 'POST']) {
        const res = await fetch(`${base}/api/rooms/${'A'.repeat(22)}`, { method, headers: { origin, 'content-type': 'application/json' }, ...(method === 'POST' ? { body: '{}' } : {}) });
        expect(res.status, `${method} ${origin}`).toBe(403);
        expect(res.headers.get('access-control-allow-origin'), `${method} ${origin}`).toBeNull();
        expect(await res.json()).toEqual({ code: 'FORBIDDEN' });
      }
    }
    const noOrigin = await fetch(`${base}/api/rooms/${'A'.repeat(22)}`);
    expect(noOrigin.status).toBe(200);
    expect(noOrigin.headers.get('access-control-allow-origin')).toBeNull();
    const good = await fetch(`${base}/api/rooms/${'A'.repeat(22)}`, { headers: { origin: ORIGIN } });
    expect(good.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(good.headers.get('vary')).toContain('Origin');
    expect(good.headers.get('access-control-allow-methods')).toBe('GET, POST, OPTIONS');
  });

  it('TC-429 [SEC-08,NFR-07] 정적 파일 제공 경계: 경로 순회·숨김 파일로 dist 밖/안의 비공개 파일을 읽을 수 없고, POST·소켓 경로는 index.html로 대체되지 않는다', async () => {
    // 점(.)으로 시작하는 경로 조각이 없는 시스템 임시 디렉터리를 쓴다(TC-429b 참고). 끝나면 지운다.
    const work = fs.mkdtempSync(path.join(os.tmpdir(), 'meetlite-06-unit02-'));
    try {
      const dist = path.join(work, 'dist');
      fs.mkdirSync(dist);
      fs.writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>INDEX-MARK</title>');
      fs.writeFileSync(path.join(dist, '.hidden'), 'DOT-SECRET');
      fs.writeFileSync(path.join(work, 'secret.txt'), 'OUTSIDE-SECRET');
      const s = await up({ WEB_DIST: dist, RATE_LIMIT_SCALE: '100' });
      const raw = (method: string, p: string): Promise<{ status: number; body: string }> =>
        new Promise((resolve, reject) => {
          const req = http.request({ host: '127.0.0.1', port: s.port, method, path: p, headers: { host: 'x' } }, (res) => {
            let b = '';
            res.on('data', (d: Buffer) => (b += d.toString()));
            res.on('end', () => resolve({ status: res.statusCode ?? 0, body: b }));
          });
          req.on('error', reject);
          req.end();
        });
      for (const p of ['/../secret.txt', '/..%2fsecret.txt', '/%2e%2e/secret.txt', '/assets/..%2f..%2fsecret.txt', '/%2e%2e%2fsecret.txt', '/..%5csecret.txt', '/.hidden', '/%2ehidden']) {
        const r = await raw('GET', p);
        expect(r.body, p).not.toContain('OUTSIDE-SECRET');
        expect(r.body, p).not.toContain('DOT-SECRET');
      }
      const post = await raw('POST', '/');
      expect(post.status).toBe(404);
      expect(post.body).not.toContain('INDEX-MARK');
      const sio = await raw('GET', '/socket.io/?EIO=4&transport=polling');
      expect(sio.body).not.toContain('INDEX-MARK');
      expect((await raw('GET', '/some/deep/link')).body).toContain('INDEX-MARK'); // SPA 폴백은 유지
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  });

  // DEF-U02-01(Low): WEB_DIST의 절대 경로에 '.'으로 시작하는 디렉터리가 있으면 SPA 폴백(res.sendFile, root 옵션 없음)이 404를 낸다.
  // 수정되면 이 시험이 실패하므로 it.fails를 일반 it으로 바꾸고 결함을 Fixed로 옮긴다.
  it.fails('TC-429b [NFR-07] (알려진 결함 DEF-U02-01) WEB_DIST 경로에 점 디렉터리가 있어도 SPA 폴백이 index.html을 돌려준다', async () => {
    const root = path.resolve(process.cwd(), '..', '..', '.harness-tmp');
    fs.mkdirSync(root, { recursive: true });
    const work = fs.mkdtempSync(path.join(root, 'static_06_unit02_'));
    try {
      fs.writeFileSync(path.join(work, 'index.html'), '<!doctype html><title>INDEX-MARK</title>');
      const s = await up({ WEB_DIST: work, RATE_LIMIT_SCALE: '100' });
      const res = await fetch(`http://127.0.0.1:${s.port}/r/${'A'.repeat(22)}`);
      expect(await res.text()).toContain('INDEX-MARK');
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
    }
  });

  it('TC-428b [SEC-06,SEC-08] 소켓 연결은 Origin 헤더가 허용 목록과 정확히 같을 때만 열린다(변형 Origin 거부)', async () => {
    const s = await up({ RATE_LIMIT_SCALE: '100' });
    for (const origin of [`${ORIGIN}/`, 'HTTP://LOCALHOST:5173', `${ORIGIN}.evil.com`, 'null']) {
      await expect(connect(s.port, origin), origin).rejects.toBeTruthy();
    }
    const okSocket = await connect(s.port, ORIGIN);
    okSocket.close();
  });
});
