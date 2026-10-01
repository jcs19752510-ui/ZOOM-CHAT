import { spawn } from 'node:child_process';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MetaResponse } from '@meetlite/shared';
import { contactLink } from '../../web/src/lib/legalMeta';
import { loadConfig } from '../src/config';
import { createLogger } from '../src/logger';
import { iceHost } from '../src/http/meta';
import { AttemptLimiter, IDLE_KEY_MS, KeyedRateLimiter, SWEEP_INTERVAL_MS } from '../src/security/rateLimit';
import { startServer, type RunningServer } from '../src/server';
import { baseEnv, boot, makeConfig, ORIGIN, SECRET } from './helpers';

// unit-15 6단계(적대적·경계값) 추가 시험. 제품 코드는 건드리지 않는다.

let server: RunningServer | undefined;
afterEach(async () => {
  vi.useRealTimers();
  await server?.close();
  server = undefined;
});

const accepts = (v: string): boolean => {
  try {
    loadConfig({ ...baseEnv, OPERATOR_CONTACT: v });
    return true;
  } catch {
    return false;
  }
};

const CONTACT_REJECT: Record<string, string> = {
  'javascript 대문자': 'JAVASCRIPT:alert(1)',
  'javascript 단독': 'javascript:alert(1)',
  'javascript+@': 'javascript:alert(1)@x.com',
  'data base64': 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
  vbscript: 'vbscript:msgbox(1)',
  '뒤 공백': 'ops@example.com ',
  '앞 공백': ' ops@example.com',
  '개행 헤더 주입': 'ops@example.com\nBcc:victim@example.com',
  CRLF: 'ops@example.com\r\n',
  널: 'ops@example.com\u0000',
  '키릴 문자 혼동': 'орѕ@example.com',
  전각: 'ｏｐｓ@example.com',
  '비ASCII 도메인(IDN 원문)': 'ops@exämple.com',
  'mailto 중첩': 'mailto:mailto:a@b.com',
  mailto: 'mailto:a@b.com',
  '<script>': '<script>alert(1)</script>@x.com',
  '따옴표 속성 주입': '" onmouseover="alert(1)@x.com',
  '@ 여러 개': 'a@b@c.com',
  '@ 여러 개 2': 'a@b.com@c.com',
  'IP 리터럴 도메인': 'a@[127.0.0.1]',
  '201자': `${'a'.repeat(200)}@x.com`,
  'https 스킴만': 'https://',
  http: 'http://example.com',
  '프로토콜 상대': '//evil.example',
  'https 안 공백': 'https:// example.com',
  'https 안 NBSP': 'https://example.com/ x',
  'https 안 탭': 'https://exa\tmple.com',
  'HTTPS 대문자 스킴': 'HTTPS://example.com',
};
const CONTACT_ACCEPT = ['ops@example.com', 'first.last+tag@sub.example.co.kr', 'ops@xn--exmple-cua.com', `${'a'.repeat(190)}@x.com`, 'https://example.com', 'https://example.com/report?x=1&y=2#top'];

describe('TC-347 OPERATOR_CONTACT 적대 입력 (서버 config, R-1·SEC-07)', () => {
  it('TC-347 [SEC-07,POL-19] 위험 스킴·공백/개행/널·혼동 문자·@ 다중·속성 주입·200자 초과는 시작 실패, 정상 값은 통과한다', () => {
    for (const [name, v] of Object.entries(CONTACT_REJECT)) expect(accepts(v), `${name}: ${JSON.stringify(v)}`).toBe(false);
    for (const v of CONTACT_ACCEPT) expect(accepts(v), v).toBe(true);
    // 경계값: 정확히 200자는 통과, 201자는 거부(위 201자 케이스)
    expect(accepts(`${'a'.repeat(200 - '@x.com'.length)}@x.com`)).toBe(true);
    // 빈 값/공백만은 "없음"(미정)으로 취급되어 시작은 되지만 연락처는 undefined
    for (const v of ['', '   ', '\n']) expect(loadConfig({ ...baseEnv, OPERATOR_CONTACT: v }).OPERATOR_CONTACT, JSON.stringify(v)).toBeUndefined();
  });

  it('TC-347c [SEC-07] 교차 검증: 서버 config가 받아들이는 모든 값을 웹 contactLink에 넣어도 href는 mailto:/https:로만 시작한다(서버·웹 두 겹)', () => {
    const accepted = [...CONTACT_ACCEPT, ...Object.values(CONTACT_REJECT).filter(accepts)];
    for (const v of accepted) {
      const link = contactLink(v);
      if ('href' in link) expect(link.href, v).toMatch(/^(mailto:[A-Za-z0-9._%+@.-]+|https:\/\/\S+)$/);
      else expect(link.kind).toBe('text');
    }
    // 서버가 거부하는 모든 값도 웹은 mailto/https 이외의 href를 만들지 않는다
    for (const v of Object.values(CONTACT_REJECT)) {
      const link = contactLink(v);
      if ('href' in link) expect(link.href, v).toMatch(/^(mailto:|https:\/\/)/);
    }
  });
});

const get = (port: number, p: string, init: RequestInit = {}): Promise<Response> => fetch(`http://127.0.0.1:${port}${p}`, init);

describe('GET /api/meta 적대·경계 (TC-348)', () => {
  it('TC-348 [POL-17,SEC-10] STUN/TURN URL에 자격 정보·쿼리·IPv6·대소문자·중복이 섞여도 호스트명만 나가고 비밀값은 응답에 없다', async () => {
    server = await boot({
      STUN_URLS: 'stun:user:pw-STUN@stun.a.example:3478,stun:stun.b.example:3478?transport=udp,STUN:stun.c.example,stun:stun.b.example:19302',
      TURN_URLS: 'turn:turn.a.example:3478?transport=udp,turns:turn.a.example:5349?transport=tcp,turn:[2001:db8::7]:3478',
      TURN_SECRET: 'TURN-SECRET-TURN-SECRET-0123',
    });
    const res = await get(server.port, '/api/meta');
    const text = await res.text();
    const body = JSON.parse(text) as MetaResponse;
    // user:pw@ 형태는 해석하지 않고 버린다(자격 정보가 호스트로 새지 않는다). 대문자 스킴(STUN:)은 소문자와 같게 해석한다(DEF-004 수정)
    expect(body.network.stunHosts).toEqual(['stun.b.example', 'stun.c.example']);
    expect(body.network.turnHosts).toEqual(['turn.a.example', '[2001:db8::7]']);
    for (const s of ['pw-STUN', 'user', 'TURN-SECRET', '3478', '5349', '19302', 'transport', 'udp', 'tcp', SECRET]) expect(text, s).not.toContain(s);
    expect(iceHost('STUN:stun.c.example')).toBe('stun.c.example');
  });

  it('TC-348f [SEC-08] 응답 헤더: JSON content-type, nosniff, CSP script-src self, 쿠키 없음, HEAD/OPTIONS/POST 처리', async () => {
    server = await boot({ OPERATOR_CONTACT: 'ops@example.com' });
    const res = await get(server.port, '/api/meta', { headers: { origin: ORIGIN } });
    expect(res.headers.get('content-type')).toMatch(/^application\/json/);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toContain("script-src 'self'");
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(res.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(res.headers.get('access-control-allow-origin')).not.toBe('*');
    await res.text();
    // 쓰기 메서드는 이 경로에 없다(404 계열), 내부 정보 없음
    const post = await get(server.port, '/api/meta', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"v":1}' });
    expect([404, 405]).toContain(post.status);
    const t = await post.text();
    expect(t).not.toMatch(/at \S+ \(|node_modules|stack/i);
    // Origin이 널 문자열·유사 도메인이면 403
    for (const o of ['null', `${ORIGIN}.evil.example`, ORIGIN.replace('http', 'https'), 'http://localhost:5173/']) {
      const r = await get(server.port, '/api/meta', { headers: { origin: o } });
      expect(r.status, o).toBe(403);
      await r.text();
    }
  });

  it('TC-348b [POL-17,SEC-02] 속도 제한 경계: 고정 시계에서 60번째까지 200, 61번째 429(RATE_LIMITED, 캐시 헤더 없음), 1초 뒤 1회 회복, X-Forwarded-For 위조로 우회 불가(TRUST_PROXY=0)', async () => {
    let t = 1_000_000;
    server = await boot({}, () => t);
    const codes: number[] = [];
    for (let i = 0; i < 61; i++) {
      const r = await get(server.port, '/api/meta', { headers: { 'x-forwarded-for': `203.0.113.${i + 1}` } });
      codes.push(r.status);
      if (i === 60) {
        expect(r.headers.get('cache-control')).toBeNull();
        expect(await r.json()).toEqual({ code: 'RATE_LIMITED' });
      } else await r.text();
    }
    expect(codes.slice(0, 60).every((c) => c === 200)).toBe(true);
    expect(codes[60]).toBe(429);
    t += 999; // 1초 미만: 아직 1토큰 미만
    const early = await get(server.port, '/api/meta');
    expect(early.status).toBe(429);
    await early.text();
    t += 1; // 정확히 1초(+999ms+1ms) 경과: 1토큰 회복
    const later = await get(server.port, '/api/meta');
    expect(later.status).toBe(200);
    await later.text();
    const again = await get(server.port, '/api/meta');
    expect(again.status).toBe(429);
    await again.text();
  });

  it('TC-348c [POL-17] 429 상태에서도 다른 경로(/healthz)는 영향받지 않고, meta 429는 방 상태 조회 한도(같은 제한기)와 공유된다는 점을 문서화한다', async () => {
    const t = 5_000_000;
    server = await boot({}, () => t);
    for (let i = 0; i < 60; i++) await (await get(server.port, '/api/meta')).text();
    expect((await get(server.port, '/api/meta')).status).toBe(429);
    const hz = await get(server.port, '/healthz');
    expect(hz.status).toBe(200);
    await hz.text();
    // 설계(statusLimiter 재사용)상 방 조회 API와 한도를 공유한다: 같은 IP가 meta로 한도를 쓰면 방 조회도 429
    const room = await get(server.port, '/api/rooms/aaaaaaaaaaaaaaaaaaaaaa');
    expect(room.status).toBe(429);
    await room.text();
  });

  it('TC-348d [POL-20] LEGAL_EFFECTIVE_DATE·PRIVACY_OFFICER 경계: 존재하지 않는 날짜·형식 오류는 시작 실패, 100자 책임자는 통과·101자는 실패, HTML 값은 JSON 문자열로만 나간다', async () => {
    for (const bad of ['2026-02-30', '2026-13-01', '2026-1-1', '2026/10/01', '20261001', '2026-10-01T00:00:00Z', '0000-00-00']) {
      expect(() => loadConfig({ ...baseEnv, LEGAL_EFFECTIVE_DATE: bad }), bad).toThrow(/LEGAL_EFFECTIVE_DATE/);
    }
    expect(loadConfig({ ...baseEnv, LEGAL_EFFECTIVE_DATE: '2024-02-29' }).LEGAL_EFFECTIVE_DATE).toBe('2024-02-29');
    expect(() => loadConfig({ ...baseEnv, PRIVACY_OFFICER: 'a'.repeat(101) })).toThrow(/PRIVACY_OFFICER/);
    server = await boot({ PRIVACY_OFFICER: `<img src=x onerror=alert(1)>${'가'.repeat(60)}`, LEGAL_EFFECTIVE_DATE: '2024-02-29' });
    const r = await get(server.port, '/api/meta');
    expect(r.headers.get('content-type')).toMatch(/json/);
    const body = (await r.json()) as MetaResponse;
    expect(body.operator.privacyOfficer).toContain('<img');
    expect(body.legal.effectiveDate).toBe('2024-02-29');
  });
});

describe('운영 기동 경고 · 로그 비식별 추가 흐름 (TC-348e·349c)', () => {
  const capture = (): { lines: string[]; stream: { write: (s: string) => void } } => {
    const lines: string[] = [];
    return { lines, stream: { write: (s: string) => void lines.push(s) } };
  };

  it('TC-348e [POL-19] production에서 OPERATOR_CONTACT가 없으면 warn이 정확히 1번, 있으면 0번이며 기동은 막지 않는다', async () => {
    const run = async (extra: Record<string, string>): Promise<string[]> => {
      const cap = capture();
      const s = await startServer(makeConfig({ NODE_ENV: 'production', LOG_LEVEL: 'info', ...extra }), createLogger('info', cap.stream));
      await s.close();
      return cap.lines.filter((l) => l.includes('OPERATOR_CONTACT'));
    };
    const missing = await run({});
    expect(missing).toHaveLength(1);
    expect(JSON.parse(missing[0] as string)).toMatchObject({ level: 40 });
    expect(await run({ OPERATOR_CONTACT: 'ops@example.com' })).toHaveLength(0);
    // 개발/테스트 환경에서는 경고 없음
    const cap = capture();
    const s = await startServer(makeConfig({ NODE_ENV: 'development', LOG_LEVEL: 'info' }), createLogger('info', cap.stream));
    await s.close();
    expect(cap.lines.filter((l) => l.includes('OPERATOR_CONTACT'))).toHaveLength(0);
  });

  it('TC-349c [POL-18,SEC-10] /api/meta 조회·429·CORS 403·허용 안 된 소켓 Origin·404 흐름의 로그에도 IP·위조 Origin 값·XFF가 남지 않는다(양성 대조군 포함)', async () => {
    const cap = capture();
    server = await startServer(makeConfig({ LOG_LEVEL: 'debug' }), createLogger('debug', cap.stream), () => 7_000_000);
    const port = server.port;
    const EVIL = 'http://evil-origin-marker.example';
    for (let i = 0; i < 61; i++) await (await get(port, '/api/meta', { headers: { 'x-forwarded-for': '198.51.100.77', 'user-agent': 'UA-MARKER-9' } })).text();
    await (await get(port, '/api/meta', { headers: { origin: EVIL } })).text();
    await (await get(port, '/no-such-route-marker')).text();
    // 허용되지 않은 Origin의 소켓 연결은 거부된다
    const { io } = await import('socket.io-client');
    const bad = io(`http://127.0.0.1:${port}`, { transports: ['websocket'], reconnection: false, forceNew: true, extraHeaders: { origin: EVIL } });
    await new Promise<void>((resolve) => {
      bad.once('connect_error', () => resolve());
      bad.once('connect', () => resolve());
    });
    const connected = bad.connected;
    bad.close();
    expect(connected).toBe(false);
    await new Promise((r) => setTimeout(r, 100));
    const out = cap.lines.join('');
    expect(out).toContain('server listening'); // 양성 대조군: 캡처가 실제로 동작한다
    for (const needle of ['127.0.0.1', '::1', '::ffff:', '198.51.100.77', 'UA-MARKER-9']) expect(out.includes(needle), `로그에 ${needle}`).toBe(false);
  });
});

describe('제한기 정리 경계 (D-6, TC-349)', () => {
  it('TC-349 [POL-18] KeyedRateLimiter: 정확히 10분 미사용은 유지, 10분+1ms부터 삭제 대상, 5천 키가 정리되어 size가 실제로 줄고, 같은 키는 새 버킷', () => {
    let t = 0;
    const l = new KeyedRateLimiter({ capacity: 1, refillPerSec: 0 }, () => t, 0); // 타이머 없이 sweep만 직접 호출
    l.allow('edge');
    t = IDLE_KEY_MS;
    l.sweep();
    expect(l.size, '정확히 10분: 유지').toBe(1);
    t = IDLE_KEY_MS + 1;
    l.sweep();
    expect(l.size, '10분+1ms: 삭제').toBe(0);

    t = 0;
    for (let i = 0; i < 5000; i++) l.allow(`10.0.${i >> 8}.${i & 255}`);
    expect(l.size).toBe(5000);
    t = IDLE_KEY_MS / 2;
    l.allow('10.0.0.0'); // 5분 시점에 다시 사용 → seen 갱신
    t = IDLE_KEY_MS + 1;
    l.sweep();
    expect(l.size, '다시 쓴 키 1개만 남는다').toBe(1);
    // 삭제된 키는 새 버킷이라 다시 1회 허용, 남은 키(방금 5분 시점에 소진)는 refill 0이라 거부
    expect(l.allow('10.0.0.1')).toBe(true);
    expect(l.allow('10.0.0.0')).toBe(false);
  });

  it('TC-349d [POL-18,SEC-02] 사용 중인 키는 정리 주기가 몇 번 지나도 사라지지 않는다(계속 쓰면 seen이 갱신) — 제한 우회 방지', () => {
    vi.useFakeTimers();
    const l = new KeyedRateLimiter({ capacity: 2, refillPerSec: 0 }, Date.now);
    expect([l.allow('busy'), l.allow('busy'), l.allow('busy')]).toEqual([true, true, false]);
    for (let i = 0; i < 6; i++) {
      vi.advanceTimersByTime(SWEEP_INTERVAL_MS - 1); // 5분마다 한 번씩만 사용
      expect(l.allow('busy'), `${i}번째`).toBe(false);
    }
    expect(l.size).toBe(1);
    l.dispose();
  });

  it('TC-349e [POL-18,SEC-02] AttemptLimiter 경계: 차단 종료 시각 정각에는 삭제, 직전에는 유지; 창 정각(windowMs)에 실패 기록은 창 밖으로 취급', () => {
    let t = 0;
    const a = new AttemptLimiter(2, 1000, 5000, () => t, 0);
    a.recordFailure('x');
    a.recordFailure('x'); // t=0 차단 시작 → blockedUntil=5000
    t = 4999;
    a.sweep();
    expect(a.size, '차단 중').toBe(1);
    expect(a.isBlocked('x')).toBe(true);
    t = 5000;
    expect(a.isBlocked('x'), '정각에 차단 해제').toBe(false);
    a.sweep();
    expect(a.size, '차단 끝+실패 기록 없음 → 삭제').toBe(0);

    t = 10_000;
    a.recordFailure('y'); // 실패 1회(차단 아님)
    t = 10_999;
    a.sweep();
    expect(a.size, '창 안').toBe(1);
    t = 11_000;
    a.sweep();
    expect(a.size, '창 정각 경과: 삭제').toBe(0);
    // 삭제된 뒤에도 다시 2회 실패하면 차단된다(정리가 제한을 약화시키지 않는다)
    a.recordFailure('y');
    a.recordFailure('y');
    expect(a.isBlocked('y')).toBe(true);
    a.dispose();
  });

  it('TC-349f [POL-18] 실제 setInterval 타이머는 unref이고 dispose는 여러 번 불러도 안전하며 dispose 후 sweep 주기가 멈춘다', () => {
    const spy = vi.spyOn(globalThis, 'setInterval');
    const l = new KeyedRateLimiter({ capacity: 1, refillPerSec: 1 });
    const a = new AttemptLimiter(1, 1, 1);
    const timers = spy.mock.results.map((r) => r.value as NodeJS.Timeout);
    spy.mockRestore();
    expect(timers).toHaveLength(2);
    for (const tm of timers) expect(tm.hasRef(), 'unref여야 함').toBe(false);
    l.dispose();
    l.dispose();
    a.dispose();
    a.dispose();
  });

  it('TC-349b [POL-18] 별도 프로세스: 제한기를 만들어 쓴 뒤 스스로 종료하고, 서버를 띄웠다 close한 뒤에도 프로세스가 매달리지 않는다(변이 대조: ref 타이머는 매달린다)', async () => {
    const rl = path.resolve(__dirname, '../src/security/rateLimit.ts');
    const srv = path.resolve(__dirname, '../src/server.ts');
    const cfg = path.resolve(__dirname, '../src/config.ts');
    const log = path.resolve(__dirname, '../src/logger.ts');
    const run = (code: string, killAfterMs: number): Promise<{ exited: boolean; code: number | null; ms: number; out: string }> =>
      new Promise((resolve) => {
        const t0 = Date.now();
        const child = spawn(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', code], { cwd: path.resolve(__dirname, '..'), stdio: ['ignore', 'pipe', 'ignore'] });
        let out = '';
        child.stdout.on('data', (d: Buffer) => (out += d.toString()));
        let killed = false;
        const k = setTimeout(() => {
          killed = true;
          child.kill('SIGKILL');
        }, killAfterMs);
        child.on('exit', (c) => {
          clearTimeout(k);
          resolve({ exited: !killed, code: c, ms: Date.now() - t0, out });
        });
      });
    const limiterOnly = `import {KeyedRateLimiter,AttemptLimiter} from ${JSON.stringify(rl)}; const l=new KeyedRateLimiter({capacity:1,refillPerSec:1}); l.allow('a'); const a=new AttemptLimiter(1,1,1); a.recordFailure('a'); console.log('ok');`;
    const fullServer = `import {startServer} from ${JSON.stringify(srv)}; import {loadConfig} from ${JSON.stringify(cfg)}; import {createLogger} from ${JSON.stringify(log)};
      const c=loadConfig({NODE_ENV:'test',PORT:'0',ALLOWED_ORIGINS:'http://localhost:5173',SESSION_SECRET:${JSON.stringify(SECRET)},LOG_LEVEL:'silent'});
      const s=await startServer(c, createLogger('silent')); await fetch('http://127.0.0.1:'+s.port+'/api/meta').then(r=>r.text()); await s.close(); console.log('closed');`;
    const control = `setInterval(()=>{}, 300000); console.log('ok');`; // unref하지 않은 타이머: 매달려야 한다
    const [a, b, c] = await Promise.all([run(limiterOnly, 15_000), run(fullServer, 15_000), run(control, 4_000)]);
    expect(a).toMatchObject({ exited: true, code: 0 });
    expect(a.out).toContain('ok');
    expect(b).toMatchObject({ exited: true, code: 0 });
    expect(b.out).toContain('closed');
    expect(c.exited, '대조군은 종료되지 않아야 이 시험이 매달림을 잡는다').toBe(false);
  }, 30_000);
});
