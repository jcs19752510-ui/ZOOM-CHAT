import { describe, expect, it } from 'vitest';
import { normalizeIp } from '../src/http/clientIp';

describe('IP 정규화 (9단계 DEF-09-01)', () => {
  it('TC-539 [SEC-02,SEC-05,SEC-06] IPv6는 /64 단위로 묶고, IPv4와 IPv4-mapped는 IPv4로 돌려준다', () => {
    expect(normalizeIp('203.0.113.9')).toBe('203.0.113.9');
    expect(normalizeIp('::ffff:203.0.113.9')).toBe('203.0.113.9');
    const a = normalizeIp('2001:db8:1:2:aaaa:bbbb:cccc:dddd');
    expect(a).toBe('2001:0db8:0001:0002::/64');
    expect(normalizeIp('2001:DB8:1:2::1')).toBe(a);
    expect(normalizeIp('2001:db8:1:2:ffff::')).toBe(a);
    expect(normalizeIp('2001:db8:1:3::1')).not.toBe(a);
    expect(normalizeIp('::1')).toBe('0000:0000:0000:0000::/64');
    expect(normalizeIp('fe80::1%eth0')).toBe('fe80:0000:0000:0000::/64');
  });

  it('TC-539b [SEC-06] 해석할 수 없는 값은 그대로 두어 한 키로 묶이지 않게 한다', () => {
    expect(normalizeIp('unknown')).toBe('unknown');
    expect(normalizeIp('1:2:3')).toBe('1:2:3');
    expect(normalizeIp('zzzz::1')).toBe('zzzz::1');
  });
});
