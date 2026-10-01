import { afterEach, describe, expect, it } from 'vitest';
import type { MetaResponse } from '@meetlite/shared';
import { iceHost } from '../src/http/meta';
import type { RunningServer } from '../src/server';
import { boot, ORIGIN, SECRET } from './helpers';

let server: RunningServer | undefined;
afterEach(async () => {
  await server?.close();
  server = undefined;
});

const get = (port: number, headers: Record<string, string> = {}): Promise<Response> => fetch(`http://127.0.0.1:${port}/api/meta`, { headers });

describe('GET /api/meta (EVT-04, POL-17·19·20)', () => {
  it('TC-340 [POL-19,POL-20,POL-17] 운영자 값이 설정되면 연락처·책임자·시행일과 STUN/TURN 호스트명을 돌려준다', async () => {
    server = await boot({
      OPERATOR_CONTACT: 'ops@example.com',
      PRIVACY_OFFICER: '홍길동',
      LEGAL_EFFECTIVE_DATE: '2026-10-01',
      STUN_URLS: 'stun:stun.example.org:3478,stun:stun.l.google.com:19302',
      TURN_URLS: 'turn:turn.example.org:3478?transport=udp,turns:turn.example.org:5349?transport=tcp',
      TURN_SECRET: 'turn-secret-turn-secret-0123',
    });
    const res = await get(server.port);
    expect(res.status).toBe(200);
    expect((await res.json()) as MetaResponse).toEqual({
      v: 1,
      operator: { contact: 'ops@example.com', privacyOfficer: '홍길동' },
      legal: { effectiveDate: '2026-10-01' },
      network: { stunHosts: ['stun.example.org', 'stun.l.google.com'], turnHosts: ['turn.example.org'] },
    });
  });

  it('TC-340b [POL-19,POL-20] 값이 없으면 null(미정)이고 TURN이 없으면 turnHosts는 빈 배열이다(가짜 값 없음)', async () => {
    server = await boot();
    const body = (await (await get(server.port)).json()) as MetaResponse;
    expect(body.operator).toEqual({ contact: null, privacyOfficer: null });
    expect(body.legal).toEqual({ effectiveDate: null });
    expect(body.network.turnHosts).toEqual([]);
    expect(body.network.stunHosts).toEqual(['stun.l.google.com']);
  });

  it('TC-340c [POL-18,SEC-10,SEC-08] 응답은 정해진 필드만 담고(비밀값·포트·쿼리·IP 없음) 60초 캐시, 허용 안 된 Origin은 403, 한도 초과는 429(캐시 헤더 없음)', async () => {
    server = await boot({
      OPERATOR_CONTACT: 'https://example.com/report',
      TURN_URLS: 'turn:turn.example.org:3478?transport=udp',
      TURN_SECRET: 'turn-secret-turn-secret-0123',
      ADMIN_PORT: '3999',
      ADMIN_TOKEN: 'admin-token-admin-token-admin-token-1',
    });
    const res = await get(server.port, { origin: ORIGIN });
    expect(res.headers.get('cache-control')).toBe('public, max-age=60');
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    const text = await res.text();
    expect(Object.keys(JSON.parse(text) as object).sort()).toEqual(['legal', 'network', 'operator', 'v']);
    for (const secret of [SECRET, 'turn-secret', 'admin-token', '3999', '3478', 'transport', '127.0.0.1', '::1']) expect(text, secret).not.toContain(secret);

    const denied = await get(server.port, { origin: 'http://evil.example' });
    expect(denied.status).toBe(403);

    await server.close();
    server = await boot();
    const codes: number[] = [];
    let cc: string | null = 'unset';
    for (let i = 0; i < 70; i++) {
      const r = await get(server.port);
      codes.push(r.status);
      if (r.status === 429) {
        cc = r.headers.get('cache-control');
        expect(await r.json()).toEqual({ code: 'RATE_LIMITED' });
        break;
      }
    }
    expect(codes.at(-1)).toBe(429);
    expect(codes.filter((c) => c === 200).length).toBeGreaterThanOrEqual(60);
    expect(cc).toBeNull();
  });

  it('TC-340d [POL-17] ICE URI에서 호스트명만 뽑는다(스킴·포트·쿼리·IPv6 대괄호), 해석 불가는 버린다', () => {
    expect(iceHost('stun:stun.example.org:3478')).toBe('stun.example.org');
    expect(iceHost('stun:stun.example.org')).toBe('stun.example.org');
    expect(iceHost('stuns://stun.example.org:5349')).toBe('stun.example.org');
    expect(iceHost('turn:turn.example.org:3478?transport=udp')).toBe('turn.example.org');
    expect(iceHost('turns:turn.example.org?transport=tcp')).toBe('turn.example.org');
    expect(iceHost('turn:[2001:db8::1]:3478?transport=udp')).toBe('[2001:db8::1]');
    expect(iceHost('turn:203.0.113.5:3478')).toBe('203.0.113.5');
    for (const bad of ['', 'http://x.com', 'javascript:alert(1)', 'stun:', 'turn:?transport=udp', 'stun:user@host:3478', 'stun:a b']) expect(iceHost(bad), JSON.stringify(bad)).toBeNull();
  });
});
