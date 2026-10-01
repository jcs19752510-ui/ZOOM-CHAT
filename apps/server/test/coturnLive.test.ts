import { type ChildProcess, execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TurnProbe, turnCredential, type TurnResult } from './turnProbe';

/**
 * L2 실시간 검증(SEC-12): 저장소의 실제 turnserver.conf로 coturn을 띄우고 Allocate→CreatePermission을 시도한다.
 * COTURN_LIVE=1 일 때만 실행. REQUIRE_COTURN=1이면 실행 도구가 없을 때 skip하지 않고 실패한다.
 * COTURN_RUNNER=local|docker 로 고를 수 있다(기본: PATH의 turnserver, 없으면 docker). COTURN_IMAGE로 이미지 덮어쓰기.
 */
const live = process.env.COTURN_LIVE === '1';
const require_ = process.env.REQUIRE_COTURN === '1';
const root = resolve(__dirname, '../../..');
const confPath = resolve(root, 'infra/coturn/turnserver.conf');
const composeImage = /image:\s*(\S+)/.exec(readFileSync(resolve(root, 'infra/docker-compose.yml'), 'utf8'))?.[1] ?? 'coturn/coturn:4.9';

const SECRET = 'live-test-secret-live-test-secret';
const REALM = 'meetlite.livetest';
const PORT = 34790;
const sh = (cmd: string, args: string[]): boolean => {
  try { execFileSync(cmd, args, { stdio: 'ignore', timeout: 10_000 }); return true; } catch { return false; }
};
const runner = ((): 'local' | 'docker' | null => {
  const want = process.env.COTURN_RUNNER;
  if (want !== 'docker' && sh('turnserver', ['--version'])) return 'local';
  if (want !== 'local' && sh('docker', ['info'])) return 'docker';
  return null;
})();

const overrides = [
  `--listening-port=${PORT}`, '--listening-ip=127.0.0.1', '--relay-ip=127.0.0.1', '--min-port=49500', '--max-port=49560',
  `--static-auth-secret=${SECRET}`, `--realm=${REALM}`, '--no-tls', '--no-dtls',
];

let proc: ChildProcess | undefined;
let version = '';
let output = '';

beforeAll(async () => {
  if (!live) return;
  if (!runner) {
    if (require_) throw new Error('REQUIRE_COTURN=1 이지만 turnserver도 docker도 사용할 수 없습니다');
    return;
  }
  if (runner === 'docker') {
    const image = process.env.COTURN_IMAGE ?? composeImage;
    version = `docker ${image}`;
    proc = spawn('docker', ['run', '--rm', '--network', 'host', '--name', 'meetlite-coturn-livetest', '-v', `${confPath}:/etc/coturn/turnserver.conf:ro`, image, '-c', '/etc/coturn/turnserver.conf', ...overrides]);
  } else {
    version = `local ${execFileSync('turnserver', ['--version'], { encoding: 'utf8' }).trim().split('\n')[0]}`;
    proc = spawn('turnserver', ['-c', confPath, '--pidfile=/dev/null', '--log-file=stdout', ...overrides]);
  }
  proc.stdout?.on('data', (d: Buffer) => { output += d.toString(); });
  proc.stderr?.on('data', (d: Buffer) => { output += d.toString(); });
  const deadline = Date.now() + 25_000;
  for (;;) {
    const p = new TurnProbe('127.0.0.1', PORT, turnCredential(SECRET));
    try { await p.hello(); return; } catch { /* 아직 기동 중 */ } finally { p.close(); }
    if (proc.exitCode !== null) throw new Error(`coturn이 종료됐습니다:\n${output.slice(-1500)}`);
    if (Date.now() > deadline) throw new Error(`coturn 기동 시간 초과:\n${output.slice(-1500)}`);
    await new Promise((r) => setTimeout(r, 300));
  }
}, 40_000);

afterAll(() => {
  if (runner === 'docker') sh('docker', ['rm', '-f', 'meetlite-coturn-livetest']);
  proc?.kill('SIGKILL');
});

async function permission(peers: string[], id: string): Promise<Record<string, TurnResult>> {
  const p = new TurnProbe('127.0.0.1', PORT, turnCredential(SECRET, id));
  try {
    await p.hello();
    const a = await p.allocate();
    expect(a, 'Allocate가 성공해야 한다').toEqual({ ok: true });
    const out: Record<string, TurnResult> = {};
    for (const ip of peers) out[ip] = await p.createPermission(ip);
    return out;
  } finally {
    p.close();
  }
}

const log = (title: string, r: Record<string, TurnResult>): void => {
  // 6단계가 실측 근거로 인용할 수 있도록 결과를 출력한다
  console.log(`[coturn L2 ${version}] ${title}: ${Object.entries(r).map(([k, v]) => `${k}=${v.ok ? '허용' : v.code}`).join(' ')}`);
};

describe.skipIf(!live || (!runner && !require_))('coturn 실시간 검증 (L2, SEC-12·SEC-09)', () => {
  it('TC-331 [SEC-12,SEC-09] 양성 대조군: 공인 IPv4 peer는 허용된다 (모두 거부하는 깨진 설정 탐지, D-1)', async () => {
    const r = await permission(['203.0.113.5', '8.8.8.8'], 'pos');
    log('공인', r);
    expect(r['203.0.113.5']).toEqual({ ok: true });
    expect(r['8.8.8.8']).toEqual({ ok: true });
  });

  it('TC-332 [SEC-12,SEC-09] 사설·루프백·링크로컬·CGNAT·멀티캐스트 IPv4 peer는 403으로 거부된다', async () => {
    const peers = ['10.1.2.3', '172.16.5.5', '192.168.1.1', '127.0.0.1', '169.254.169.254', '100.64.0.1', '198.18.0.1', '224.0.0.1', '0.0.0.1'];
    const r = await permission(peers, 'neg');
    log('사설 등', r);
    for (const ip of peers) expect(r[ip], ip).toEqual({ ok: false, code: 403 });
  });

  it('TC-333 [SEC-12,SEC-09] IPv4-mapped IPv6(::ffff:*) peer는 어떤 경우에도 성공하지 않는다', async () => {
    const peers = ['::ffff:10.1.2.3', '::ffff:127.0.0.1', '::ffff:203.0.113.5', '::1'];
    const r = await permission(peers, 'map');
    log('IPv4-mapped', r);
    for (const ip of peers) {
      expect(r[ip]?.ok, ip).toBe(false);
      expect([403, 443], ip).toContain(r[ip]?.code);
    }
  });

  it('TC-334 [SEC-12,SEC-09] 같은 사용자의 동시 할당이 user-quota(12)를 넘으면 거부된다', async () => {
    const cred = turnCredential(SECRET, 'quota');
    const probes: TurnProbe[] = [];
    try {
      const codes: Array<TurnResult> = [];
      for (let i = 0; i < 13; i++) {
        const p = new TurnProbe('127.0.0.1', PORT, cred);
        probes.push(p);
        await p.hello();
        codes.push(await p.allocate());
      }
      console.log(`[coturn L2 ${version}] quota: 성공 ${codes.filter((c) => c.ok).length}건, 마지막=${JSON.stringify(codes[12])}`);
      expect(codes.slice(0, 12).every((c) => c.ok)).toBe(true);
      expect(codes[12]).toEqual({ ok: false, code: 486 });
    } finally {
      probes.forEach((p) => p.close());
    }
  }, 30_000);
});
