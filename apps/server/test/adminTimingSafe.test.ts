import type * as NodeCrypto from 'node:crypto';
import type net from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../src/logger';

// unit-16 6단계(변이 시험 보강): 토큰 비교가 항상 같은 길이(32B 해시)의 timingSafeEqual 한 번으로 이뤄지는지 호출을 관찰한다.
// 응답 시간 측정은 불안정하므로(unit-16 노트), `===` 비교나 길이 선검사 같은 변이를 호출 형태로 잡는다.
const calls = vi.hoisted(() => [] as Array<[number, number]>);
vi.mock('node:crypto', async (orig) => {
  const m = await orig<typeof NodeCrypto>();
  const spy = (a: NodeJS.ArrayBufferView, b: NodeJS.ArrayBufferView): boolean => {
    calls.push([a.byteLength, b.byteLength]);
    return m.timingSafeEqual(a, b);
  };
  return { ...m, default: { ...m, timingSafeEqual: spy }, timingSafeEqual: spy };
});

const TOKEN = 'admin-token-admin-token-admin-token-ZZ';
let closeFn: (() => Promise<void>) | undefined;
afterEach(async () => {
  await closeFn?.();
  closeFn = undefined;
});

describe('admin 토큰 비교 형태 (POL-19)', () => {
  it('TC-390 [POL-19] 토큰이 없든·짧든·길든·같은 길이든 모든 요청이 32B 해시끼리 timingSafeEqual을 정확히 한 번 호출한다', async () => {
    const { createAdminServer } = await import('../src/http/admin');
    const srv = createAdminServer({ token: TOKEN, closeRoom: () => null, logger: createLogger('silent'), now: (() => { let t = 0; return () => (t += 2000); })() });
    await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r));
    closeFn = () => new Promise<void>((r) => (srv.closeAllConnections(), srv.close(() => r())));
    const port = (srv.address() as net.AddressInfo).port;
    const headers: Array<Record<string, string>> = [{}, { authorization: '' }, { authorization: 'Bearer ' }, { authorization: 'Bearer x' }, { authorization: `Bearer ${TOKEN.slice(0, -1)}` }, { authorization: `Bearer ${TOKEN}x` }, { authorization: `Bearer ${'a'.repeat(3000)}` }, { authorization: `Bearer ${TOKEN.replace('Z', 'Y')}` }, { authorization: 'Basic abc' }, { authorization: TOKEN }];
    for (const h of headers) {
      calls.length = 0;
      const r = await fetch(`http://127.0.0.1:${port}/admin/rooms/AAAAAAAAAAAAAAAAAAAAAA/close`, { method: 'POST', headers: h });
      expect(r.status, JSON.stringify(h).slice(0, 40)).toBe(401);
      expect(calls, JSON.stringify(h).slice(0, 40)).toEqual([[32, 32]]);
    }
    calls.length = 0;
    const ok = await fetch(`http://127.0.0.1:${port}/admin/rooms/AAAAAAAAAAAAAAAAAAAAAA/close`, { method: 'POST', headers: { authorization: `Bearer ${TOKEN}` } });
    expect(ok.status).toBe(404); // 인증 통과(방 없음)
    expect(calls).toEqual([[32, 32]]);
  });
});
