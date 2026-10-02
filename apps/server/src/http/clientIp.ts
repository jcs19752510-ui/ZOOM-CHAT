import type { IncomingMessage } from 'node:http';

/** 클라이언트 IP. 프록시 뒤에서는 오른쪽에서 trustProxy번째 X-Forwarded-For 값을 쓴다(위조 방지). */
export function clientIp(req: IncomingMessage, trustProxy: number): string {
  return normalizeIp(rawClientIp(req, trustProxy));
}

/**
 * IPv6는 /64(상위 4그룹) 단위로 묶는다. 한 사용자가 /64 안의 주소를 마음대로 바꿀 수 있어
 * 전체 주소로 제한하면 속도·시도 제한과 강퇴 차단이 우회된다(9단계 DEF-09-01).
 * IPv4와 IPv4-mapped IPv6(::ffff:a.b.c.d)는 IPv4 주소로 돌려준다.
 */
export function normalizeIp(ip: string): string {
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (mapped?.[1]) return mapped[1];
  if (!ip.includes(':')) return ip;
  const zoneless = ip.split('%')[0] ?? ip;
  const [head = '', tail = ''] = zoneless.split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = tail ? tail.split(':') : [];
  const missing = zoneless.includes('::') ? 8 - headGroups.length - tailGroups.length : 0;
  const groups = [...headGroups, ...Array<string>(Math.max(missing, 0)).fill('0'), ...tailGroups];
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/i.test(g))) return ip;
  return `${groups.slice(0, 4).map((g) => g.toLowerCase().padStart(4, '0')).join(':')}::/64`;
}

function rawClientIp(req: IncomingMessage, trustProxy: number): string {
  if (trustProxy > 0) {
    const xff = req.headers['x-forwarded-for'];
    const raw = Array.isArray(xff) ? xff.join(',') : xff;
    if (raw) {
      const parts = raw.split(',').map((s) => s.trim()).filter(Boolean);
      const hit = parts[parts.length - trustProxy];
      if (hit) return hit;
    }
  }
  return req.socket.remoteAddress ?? 'unknown';
}
