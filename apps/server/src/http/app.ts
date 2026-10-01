import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import type { Logger } from 'pino';
import { CreateRoomRequestSchema, RoomIdSchema, type CreateRoomResponse } from '@meetlite/shared';
import type { Config } from '../config';
import { shortId } from '../logger';
import type { RoomManager } from '../rooms/RoomManager';
import { hashPassword } from '../security/password';
import { KeyedRateLimiter } from '../security/rateLimit';
import { signToken } from '../security/token';
import { clientIp } from './clientIp';

const HOST_CLAIM_TTL_MS = 60 * 60_000;

export interface AppDeps {
  config: Config;
  rooms: RoomManager;
  logger: Logger;
  now?: () => number;
}

export function createApp({ config, rooms, logger, now = Date.now }: AppDeps): express.Express {
  const app = express();
  app.disable('x-powered-by');
  if (config.TRUST_PROXY > 0) app.set('trust proxy', config.TRUST_PROXY);

  const createLimiter = new KeyedRateLimiter({ capacity: 10 * config.RATE_LIMIT_SCALE, refillPerSec: (10 * config.RATE_LIMIT_SCALE) / 60 }, now);
  const statusLimiter = new KeyedRateLimiter({ capacity: 60 * config.RATE_LIMIT_SCALE, refillPerSec: config.RATE_LIMIT_SCALE }, now);

  // 보안 헤더(SEC-08). 미디어는 getUserMedia/WebRTC를 쓰므로 blob:을 허용한다.
  const connectSrc = ["'self'", ...config.ALLOWED_ORIGINS, ...config.ALLOWED_ORIGINS.map((o) => o.replace(/^http/, 'ws'))];
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          styleSrcAttr: ["'unsafe-inline'"],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          mediaSrc: ["'self'", 'blob:'],
          connectSrc,
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use((_req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), display-capture=(self), geolocation=()');
    next();
  });

  // CORS: 허용 목록에 있는 Origin만. 와일드카드 금지.
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      if (!config.ALLOWED_ORIGINS.includes(origin)) {
        res.status(403).json({ code: 'FORBIDDEN' });
        return;
      }
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: '2kb' }));

  const started = Date.now();
  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok', uptimeSec: Math.floor((Date.now() - started) / 1000) });
  });

  app.post('/api/rooms', async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!createLimiter.allow(clientIp(req, config.TRUST_PROXY))) {
        res.status(429).json({ code: 'RATE_LIMITED' });
        return;
      }
      const parsed = CreateRoomRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ code: 'INVALID_PAYLOAD' });
        return;
      }
      const passwordHash = parsed.data.password ? await hashPassword(parsed.data.password) : undefined;
      const created = rooms.createRoom(passwordHash);
      if (!created.ok) {
        res.status(503).json({ code: created.code });
        return;
      }
      const hostClaim = signToken({ t: 'h', rid: created.room.id, exp: now() + HOST_CLAIM_TTL_MS }, config.SESSION_SECRET);
      logger.info({ room: shortId(created.room.id), rooms: rooms.size }, 'room created');
      const body: CreateRoomResponse = { v: 1, roomId: created.room.id, hostClaim };
      res.status(201).json(body);
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/rooms/:roomId', (req, res) => {
    if (!statusLimiter.allow(clientIp(req, config.TRUST_PROXY))) {
      res.status(429).json({ code: 'RATE_LIMITED' });
      return;
    }
    const id = RoomIdSchema.safeParse(req.params.roomId);
    res.json(rooms.status(id.success ? id.data : ''));
  });

  // 웹 정적 파일(선택): 서버 1대로 앱을 함께 제공한다(NFR-07).
  if (config.WEB_DIST && fs.existsSync(path.join(config.WEB_DIST, 'index.html'))) {
    const dist = path.resolve(config.WEB_DIST);
    app.use(express.static(dist, { index: false, maxAge: '1h' }));
    app.use((req, res, next) => {
      if ((req.method !== 'GET' && req.method !== 'HEAD') || req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  app.use((_req, res) => {
    res.status(404).json({ code: 'NOT_FOUND' });
  });
  // 내부 정보(스택 등)는 응답에 싣지 않는다(SEC-08).
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = typeof err === 'object' && err && 'status' in err && typeof err.status === 'number' ? err.status : 500;
    const clientError = status >= 400 && status < 500;
    logger.error({ status, type: err instanceof Error ? err.name : 'unknown' }, 'http error');
    if (res.headersSent) return;
    res.status(clientError ? status : 500).json({ code: clientError ? 'INVALID_PAYLOAD' : 'INTERNAL' });
  });

  return app;
}
