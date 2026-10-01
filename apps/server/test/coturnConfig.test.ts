import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(__dirname, '../../..');
const conf = readFileSync(resolve(root, 'infra/coturn/turnserver.conf'), 'utf8');
const compose = readFileSync(resolve(root, 'infra/docker-compose.yml'), 'utf8');
const lines = conf.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const has = (key: string): boolean => lines.some((l) => l === key || l.startsWith(`${key}=`));
const denied = lines.filter((l) => l.startsWith('denied-peer-ip=')).map((l) => l.slice('denied-peer-ip='.length));

describe('coturn 설정 정적 점검 (L1, SEC-12·SEC-09)', () => {
  it('TC-330 [SEC-12,SEC-09] 필수 보안 옵션이 있고 고정 자격증명·무인증이 없다', () => {
    for (const k of ['use-auth-secret', 'no-multicast-peers', 'fingerprint', 'no-cli', 'user-quota', 'total-quota', 'max-bps', 'stale-nonce']) {
      expect(has(k), k).toBe(true);
    }
    for (const k of ['user', 'static-auth-secret', 'no-auth', 'lt-cred-mech', 'allow-loopback-peers', 'allowed-peer-ip']) {
      expect(has(k), `${k} 금지`).toBe(false);
    }
  });

  it('TC-330b [SEC-12,SEC-09] denied-peer-ip가 사설·루프백·링크로컬·CGNAT·멀티캐스트 IPv4/IPv6 대역을 모두 포함한다', () => {
    const required = [
      '10.0.0.0-10.255.255.255', '127.0.0.0-127.255.255.255', '169.254.0.0-169.254.255.255', '172.16.0.0-172.31.255.255',
      '192.168.0.0-192.168.255.255', '100.64.0.0-100.127.255.255', '198.18.0.0-198.19.255.255', '224.0.0.0-255.255.255.255',
      '::1-::1', '::ffff:0:0-::ffff:ffff:ffff', 'fc00::-fdff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
      'fe80::-febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff', 'ff00::-ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
    ];
    for (const r of required) expect(denied, r).toContain(r);
  });

  it('TC-330c [SEC-12] "::"로 시작하는 deny 범위가 없다 (D-1 회귀 방지: 공인 IPv4 peer까지 거부됨)', () => {
    // '::ffff:...'(IPv4-mapped)와 '::1'은 허용되는 줄이다. 시작 주소가 정확히 '::'인 경우만 금지한다.
    expect(denied.filter((d) => /^::(-|$)/.test(d))).toEqual([]);
  });

  it('TC-330d [SEC-12] compose의 coturn 이미지는 4.9 이상으로 고정되고 로그 로테이션이 있다 (POL-18)', () => {
    const m = /image:\s*coturn\/coturn:(\d+)\.(\d+)(?:\.\d+)?\s*$/m.exec(compose);
    expect(m, 'coturn/coturn:X.Y 형식이 아님(latest 등 금지)').not.toBeNull();
    const [major, minor] = [Number(m?.[1]), Number(m?.[2])];
    expect(major > 4 || (major === 4 && minor >= 9)).toBe(true);
    expect(compose).toMatch(/max-size:\s*"?\d+m"?/);
    expect(compose).toMatch(/max-file:\s*"?\d+"?/);
  });
});
