import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { RunningServer } from '../src/server';
import { ORIGIN, boot, createRoom } from './helpers';

let srv: RunningServer;
let base: string;
beforeAll(async () => {
  srv = await boot({ RATE_LIMIT_SCALE: '100' });
  base = `http://127.0.0.1:${srv.port}`;
});
afterAll(async () => srv.close());

const post = (body: unknown, headers: Record<string, string> = {}): Promise<Response> =>
  fetch(`${base}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });

describe('REST (EVT-01~03)', () => {
  it('TC-100 [NFR-08] /healthz는 내부 정보 없이 상태만 돌려준다', async () => {
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body.status).toBe('ok');
    expect(Object.keys(body).sort()).toEqual(['status', 'uptimeSec']);
  });

  it('TC-101 [FR-01,SEC-01] 방 ID는 128비트 난수(base64url 22자)이고 서로 다르다', async () => {
    const ids = new Set<string>();
    for (let i = 0; i < 8; i++) {
      const { roomId, hostClaim } = await createRoom(srv.port);
      expect(roomId).toMatch(/^[A-Za-z0-9_-]{22}$/);
      expect(hostClaim.length).toBeGreaterThan(20);
      ids.add(roomId);
    }
    expect(ids.size).toBe(8);
  });

  it('TC-102 [FR-06,FR-23] 방 상태 조회: 없는 방·형식 오류는 exists=false, 있는 방은 플래그만 노출', async () => {
    const { roomId } = await createRoom(srv.port, 'pw-1234');
    const ok = (await (await fetch(`${base}/api/rooms/${roomId}`)).json()) as Record<string, unknown>;
    expect(ok).toEqual({ v: 1, exists: true, locked: false, needsPassword: true, full: false, hostPresent: false });
    for (const id of ['A'.repeat(22), 'short', '..%2f..%2fetc%2fpasswd']) {
      const r = (await (await fetch(`${base}/api/rooms/${id}`)).json()) as Record<string, unknown>;
      expect(r.exists, id).toBe(false);
    }
  });

  it('TC-103 [SEC-08] 보안 헤더(CSP, Permissions-Policy, Referrer-Policy 등)가 붙고 서버 정보는 숨긴다', async () => {
    const res = await fetch(`${base}/healthz`);
    const csp = res.headers.get('content-security-policy') ?? '';
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(res.headers.get('permissions-policy')).toContain('camera=(self)');
    expect(res.headers.get('permissions-policy')).toContain('microphone=(self)');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-powered-by')).toBeNull();
  });

  it('TC-104 [SEC-08] CORS: 허용 Origin만 통과하고 와일드카드를 쓰지 않는다', async () => {
    const bad = await post({ v: 1 }, { origin: 'http://evil.example' });
    expect(bad.status).toBe(403);
    expect(bad.headers.get('access-control-allow-origin')).toBeNull();
    const good = await fetch(`${base}/api/rooms/${'A'.repeat(22)}`, { headers: { origin: ORIGIN } });
    expect(good.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    const pre = await fetch(`${base}/api/rooms`, { method: 'OPTIONS', headers: { origin: ORIGIN } });
    expect(pre.status).toBe(204);
  });

  it('TC-105 [SEC-06,SEC-08] 잘못된 본문은 400, 너무 큰 본문은 413으로 거부하고 내부 정보를 싣지 않는다', async () => {
    for (const body of [{ v: 2 }, { v: 1, password: 'ab' }, { v: 1, password: 'x'.repeat(33) }, { v: 1, extra: true }, '{not json']) {
      const res = await post(body);
      expect(res.status, JSON.stringify(body).slice(0, 30)).toBe(400);
      expect(await res.text()).not.toMatch(/stack|node_modules|at .*\.ts/i);
    }
    const big = await post({ v: 1, password: 'x'.repeat(3000) });
    expect(big.status).toBe(413);
    expect(await big.text()).not.toMatch(/stack|node_modules|at .*\.ts/i);
  });

  it('TC-106 [SEC-06] 방 생성은 IP당 속도 제한이 있다(429)', async () => {
    const limited = await boot({ RATE_LIMIT_SCALE: '1' });
    try {
      const codes: number[] = [];
      for (let i = 0; i < 13; i++) codes.push((await fetch(`http://127.0.0.1:${limited.port}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"v":1}' })).status);
      expect(codes.slice(0, 10).every((c) => c === 201)).toBe(true);
      expect(codes.slice(10)).toContain(429);
    } finally {
      await limited.close();
    }
  });

  it('TC-107 [SEC-02] 방 비밀번호는 평문이 아닌 해시로만 보관한다', async () => {
    const { roomId } = await createRoom(srv.port, 'my-secret-pw');
    const hash = srv.rooms.get(roomId)?.passwordHash ?? '';
    expect(hash).toMatch(/^\$2[aby]\$/);
    expect(hash).not.toContain('my-secret-pw');
  });

  it('TC-108 [SEC-06,POL-15] 서버 전체 방 수 상한을 넘으면 503', async () => {
    const small = await boot({ MAX_ROOMS: '2', RATE_LIMIT_SCALE: '100' });
    try {
      await createRoom(small.port);
      await createRoom(small.port);
      const res = await fetch(`http://127.0.0.1:${small.port}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"v":1}' });
      expect(res.status).toBe(503);
    } finally {
      await small.close();
    }
  });

  it('TC-109 [SEC-08] 알 수 없는 경로는 JSON 404', async () => {
    const res = await fetch(`${base}/nope`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ code: 'NOT_FOUND' });
  });
});

describe('웹 정적 파일 제공 (NFR-07)', () => {
  it('TC-111 [NFR-07,NFR-08] 웹 빌드를 함께 제공하고 SPA 경로·HEAD 요청도 index.html로 응답한다(API·소켓 경로는 제외)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meetlite-web-'));
    fs.writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>x</title>');
    fs.mkdirSync(path.join(dir, 'assets'));
    fs.writeFileSync(path.join(dir, 'assets', 'a.js'), 'console.log(1)');
    const web = await boot({ WEB_DIST: dir, RATE_LIMIT_SCALE: '100' });
    const base = `http://127.0.0.1:${web.port}`;
    try {
      for (const method of ['GET', 'HEAD']) {
        for (const p of ['/', `/r/${'A'.repeat(22)}`]) {
          const res = await fetch(`${base}${p}`, { method });
          expect(res.status, `${method} ${p}`).toBe(200);
          expect(res.headers.get('content-type')).toContain('text/html');
        }
      }
      expect((await fetch(`${base}/assets/a.js`)).status).toBe(200);
      expect((await fetch(`${base}/api/unknown`)).status).toBe(404);
      expect((await fetch(`${base}/api/unknown`)).headers.get('content-type')).toContain('application/json');
    } finally {
      await web.close();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
