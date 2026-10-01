import { createHmac } from 'node:crypto';

/** 강퇴 차단용 네트워크 식별자: IP의 단방향 해시. 원문 IP는 저장하지 않는다(POL-06, A-05). */
export const ipKey = (ip: string, secret: string): string =>
  createHmac('sha256', secret).update(`ip:${ip}`).digest('base64url').slice(0, 22);
