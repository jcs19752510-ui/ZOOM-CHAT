import { createHmac, timingSafeEqual } from 'node:crypto';

export interface SessionPayload {
  t: 's';
  rid: string;
  pid: string;
  exp: number; // epoch ms
}
export interface HostClaimPayload {
  t: 'h';
  rid: string;
  exp: number;
}
export type TokenPayload = SessionPayload | HostClaimPayload;

const sign = (body: string, secret: string): string => createHmac('sha256', secret).update(body).digest('base64url');

/** `base64url(payload).base64url(HMAC-SHA256)` 형식의 서명 토큰(SEC-03). */
export function signToken(payload: TokenPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

/** 서명, 형식, 만료를 검증한다. 실패하면 null. */
export function verifyToken(token: string, secret: string, now: number): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts as [string, string];
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Partial<TokenPayload>;
    if (typeof p.exp !== 'number' || p.exp <= now || typeof p.rid !== 'string') return null;
    if (p.t === 's' && typeof (p as SessionPayload).pid === 'string') return p as SessionPayload;
    if (p.t === 'h') return p as HostClaimPayload;
    return null;
  } catch {
    return null;
  }
}
