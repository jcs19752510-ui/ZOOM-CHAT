import { createHash, timingSafeEqual } from 'node:crypto';
import http from 'node:http';
import { RoomIdSchema } from '@meetlite/shared';
import type { Logger } from 'pino';
import { shortId } from '../logger';
import { TokenBucket } from '../security/rateLimit';

/** 운영자 방 폐쇄 전용 리스너(POL-19, EVT-35). 루프백에만 바인딩하며 공개 리스너·프록시 경로와 분리된다. */
export const ADMIN_HOST = '127.0.0.1';
const MAX_BODY_BYTES = 1024;

export interface AdminDeps {
  token: string;
  /** 방을 닫고 닫힌 참가자 수를 돌려준다. 방이 없으면 null. */
  closeRoom: (roomId: string) => { participants: number } | null;
  logger: Logger;
  now?: () => number;
}

const digest = (s: string): Buffer => createHash('sha256').update(s).digest();

export function createAdminServer(deps: AdminDeps): http.Server {
  const { logger } = deps;
  const expected = digest(deps.token);
  // 호출자는 루프백의 운영자뿐이라 IP별 구분 없이 전체에 하나만 둔다. 인증에 '실패한' 요청에만 적용해 무차별 대입은
  // 429로 막고, 올바른 토큰을 가진 운영자는 잘못된 요청이 쏟아져도 잠기지 않는다(DEF-003).
  const failureLimiter = new TokenBucket(20, 1, deps.now ?? Date.now);

  const authorized = (header: string | undefined): boolean => {
    const m = /^Bearer (.+)$/.exec(header ?? '');
    // 헤더가 없어도 같은 비교 경로를 지난다. SHA-256으로 길이를 맞춰 길이 차이가 새지 않게 한다.
    return timingSafeEqual(digest(m?.[1] ?? ''), expected) && !!m;
  };

  const send = (res: http.ServerResponse, status: number, body: object, extra: http.OutgoingHttpHeaders = {}): void => {
    if (res.headersSent) return;
    const payload = JSON.stringify(body);
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload), 'cache-control': 'no-store', connection: 'close', ...extra });
    res.end(payload);
  };

  const handle = (req: http.IncomingMessage, res: http.ServerResponse): void => {
    if (!authorized(req.headers.authorization)) {
      if (!failureLimiter.take()) return send(res, 429, { code: 'RATE_LIMITED' });
      logger.warn({ action: 'auth-failed' }, 'operator action');
      return send(res, 401, { code: 'FORBIDDEN' });
    }
    const path = (req.url ?? '').split('?')[0] ?? '';
    const m = /^\/admin\/rooms\/([^/]*)\/close$/.exec(path);
    if (!m) return send(res, 404, { code: 'NOT_FOUND' });
    if (req.method !== 'POST') return send(res, 405, { code: 'METHOD_NOT_ALLOWED' }, { allow: 'POST' });
    const roomId = m[1] ?? '';
    if (!RoomIdSchema.safeParse(roomId).success) return send(res, 400, { code: 'INVALID_PAYLOAD' });

    let received = 0;
    let tooLarge = false;
    req.on('data', (chunk: Buffer) => {
      received += chunk.length;
      if (received > MAX_BODY_BYTES && !tooLarge) {
        tooLarge = true;
        send(res, 413, { code: 'PAYLOAD_TOO_LARGE' });
        req.destroy();
      }
    });
    req.on('end', () => {
      if (tooLarge) return;
      // 이 콜백은 위 try/catch 밖에서 실행되므로 예외가 프로세스를 죽이지 않게 직접 감싼다(DEF-001).
      try {
        const closed = deps.closeRoom(roomId);
        if (!closed) return send(res, 404, { code: 'ROOM_NOT_FOUND' });
        logger.info({ action: 'close', room: shortId(roomId), size: closed.participants }, 'operator action');
        send(res, 200, { closed: true, participants: closed.participants });
      } catch (e) {
        logger.error({ type: e instanceof Error ? e.name : 'unknown' }, 'admin handler error');
        send(res, 500, { code: 'INTERNAL' });
      }
    });
  };

  const server = http.createServer({ maxHeaderSize: 4096, requestTimeout: 5000, headersTimeout: 3000, keepAliveTimeout: 1000, connectionsCheckingInterval: 1000 }, (req, res) => {
    try {
      handle(req, res);
    } catch (e) {
      logger.error({ type: e instanceof Error ? e.name : 'unknown' }, 'admin handler error');
      send(res, 500, { code: 'INTERNAL' });
    }
  });
  server.maxConnections = 16;
  server.on('clientError', (_e, socket) => {
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
    else socket.destroy();
  });
  return server;
}
