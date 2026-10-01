import type { IncomingMessage } from 'node:http';

/** 클라이언트 IP. 프록시 뒤에서는 오른쪽에서 trustProxy번째 X-Forwarded-For 값을 쓴다(위조 방지). */
export function clientIp(req: IncomingMessage, trustProxy: number): string {
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
