import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRoom, getMeta, getRoomStatus } from './api';
import { clearHostClaim, loadHostClaim, loadNickname, saveHostClaim, saveNickname } from './storage';
import { parseRoomPath } from './useRoute';

afterEach(() => vi.unstubAllGlobals());

const memStore = (): Storage => {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k), clear: () => m.clear(), key: (i) => [...m.keys()][i] ?? null, get length() { return m.size; } };
};
const brokenStore = (): Storage => {
  const boom = (): never => {
    throw new DOMException('denied', 'SecurityError');
  };
  return { getItem: boom, setItem: boom, removeItem: boom, clear: boom, key: boom, get length(): number { return boom(); } };
};

describe('저장소 (unit-06, FR-01, SEC-03)', () => {
  it('TC-454 [FR-01,FR-03] 닉네임은 localStorage, 호스트 클레임은 방별로 sessionStorage에만 저장되고 지울 수 있다', () => {
    const local = memStore();
    const session = memStore();
    vi.stubGlobal('localStorage', local);
    vi.stubGlobal('sessionStorage', session);
    saveNickname('민지');
    saveHostClaim('roomA', 'claim-A');
    saveHostClaim('roomB', 'claim-B');
    expect(loadNickname()).toBe('민지');
    expect(loadHostClaim('roomA')).toBe('claim-A');
    expect(loadHostClaim('roomB')).toBe('claim-B');
    expect(local.length).toBe(1); // 호스트 클레임은 탭을 닫아도 남는 localStorage에 두지 않는다
    expect(session.length).toBe(2);
    clearHostClaim('roomA');
    expect(loadHostClaim('roomA')).toBeUndefined();
    expect(loadHostClaim('roomB')).toBe('claim-B');
    expect(loadHostClaim('없는방')).toBeUndefined();
  });

  it('TC-454b [FR-01] 저장소 접근이 막혀 있어도(사생활 보호 모드) 예외 없이 기본값을 돌려준다', () => {
    vi.stubGlobal('localStorage', brokenStore());
    vi.stubGlobal('sessionStorage', brokenStore());
    expect(() => saveNickname('a')).not.toThrow();
    expect(() => saveHostClaim('r', 'c')).not.toThrow();
    expect(() => clearHostClaim('r')).not.toThrow();
    expect(loadNickname()).toBe('');
    expect(loadHostClaim('r')).toBeUndefined();
  });

  it('TC-469 [SEC-03] 세션 토큰은 어떤 저장소에도 쓰지 않는다 — 저장소 사용은 lib/storage.ts 한 곳이고 키는 닉네임·호스트 클레임뿐이다(정적 점검)', () => {
    const SRC = path.resolve(__dirname, '..');
    const files: string[] = [];
    const walk = (d: string): void => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) walk(f);
        else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name)) files.push(f);
      }
    };
    walk(SRC);
    const users = files.filter((f) => /\b(localStorage|sessionStorage|indexedDB|document\.cookie|caches\.)/.test(fs.readFileSync(f, 'utf8'))).map((f) => path.relative(SRC, f));
    expect(users).toEqual(['lib/storage.ts']);
    const storage = fs.readFileSync(path.join(SRC, 'lib', 'storage.ts'), 'utf8');
    expect([...storage.matchAll(/['`](meetlite:[^'`]+)['`]/g)].map((m) => m[1])).toEqual(['meetlite:nickname', 'meetlite:host:${roomId}']);
    expect(storage).not.toMatch(/token/i);
    const controller = fs.readFileSync(path.join(SRC, 'state', 'MeetingController.ts'), 'utf8');
    expect(controller).not.toMatch(/from '\.\.\/lib\/storage'/);
    expect(controller).toMatch(/private token = ''/); // 토큰은 메모리 필드
  });

  it('TC-467d [FR-03] 방 경로 파서: 22자 URL-safe ID만 방으로 인식하고 짧은·긴·특수문자·하위 경로는 거부한다', () => {
    const id = 'A'.repeat(22);
    expect(parseRoomPath(`/r/${id}`)).toBe(id);
    expect(parseRoomPath(`/r/${id}/`)).toBe(id);
    expect(parseRoomPath(`/r/${'a-_Z0'.repeat(4)}ab`)).toBe(`${'a-_Z0'.repeat(4)}ab`);
    for (const bad of ['/', '/r/', `/r/${'A'.repeat(21)}`, `/r/${'A'.repeat(23)}`, `/r/${'A'.repeat(21)}!`, `/r/${id}/x`, `/x/${id}`, `/R/${id}`, `/r/${id}%00`, '/privacy']) expect(parseRoomPath(bad), bad).toBeNull();
  });
});

const respond = (status: number, body: unknown, rawBody?: string): Response => new Response(rawBody ?? JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('REST 클라이언트 (unit-06, FR-01, FR-06)', () => {
  it('TC-467 [FR-01,SEC-02] 방 만들기는 POST /api/rooms에 v:1을 보내고 비밀번호는 있을 때만 포함하며 URL에는 넣지 않는다', async () => {
    const fetchMock = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(respond(200, { v: 1, roomId: 'r'.repeat(22), hostClaim: 'hc' })));
    vi.stubGlobal('fetch', fetchMock);
    const res = await createRoom();
    expect(res).toEqual({ ok: true, data: { v: 1, roomId: 'r'.repeat(22), hostClaim: 'hc' } });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/rooms');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(String(init?.body))).toEqual({ v: 1 });
    await createRoom('pass-1234');
    const [url2, init2] = fetchMock.mock.calls[1] ?? [];
    expect(url2).toBe('/api/rooms');
    expect(JSON.parse(String(init2?.body))).toEqual({ v: 1, password: 'pass-1234' });
    await createRoom('');
    expect(JSON.parse(String(fetchMock.mock.calls[2]?.[1]?.body))).toEqual({ v: 1 });
  });

  it('TC-467b [FR-06,UX-03] 오류 응답은 서버 code를 그대로, 모양이 이상하면 INTERNAL, 네트워크 실패는 NETWORK로 돌려주고 예외를 던지지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(respond(429, { code: 'RATE_LIMITED' }))));
    expect(await createRoom()).toEqual({ ok: false, code: 'RATE_LIMITED' });
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(respond(500, null, '<html>boom</html>'))));
    expect(await getRoomStatus('x')).toEqual({ ok: false, code: 'INTERNAL' });
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(respond(400, { code: 123 }))));
    expect(await createRoom()).toEqual({ ok: false, code: 'INTERNAL' });
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('failed to fetch'))));
    expect(await createRoom()).toEqual({ ok: false, code: 'NETWORK' });
    expect(await getRoomStatus('x')).toEqual({ ok: false, code: 'NETWORK' });
  });

  it('TC-467c [FR-06,SEC-07] 방 상태 조회는 방 ID를 URL 인코딩하고, 메타 응답이 이상하면 INTERNAL이다', async () => {
    const fetchMock = vi.fn((_url: string) => Promise.resolve(respond(200, { v: 1, exists: true, hostPresent: true, locked: false, full: false, needsPassword: false })));
    vi.stubGlobal('fetch', fetchMock);
    await getRoomStatus('a/b?c=d#e');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/rooms/a%2Fb%3Fc%3Dd%23e');
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(respond(200, { nonsense: true }))));
    expect(await getMeta()).toEqual({ ok: false, code: 'INTERNAL' });
  });
});
