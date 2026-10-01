import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import type { z } from 'zod';
import {
  ChatSendRequestSchema,
  EmptyRequestSchema,
  JoinRequestSchema,
  KickRequestSchema,
  LockRequestSchema,
  MAX_MESSAGE_BYTES,
  MediaStateRequestSchema,
  ResumeRequestSchema,
  SignalRequestSchema,
  normalizeNickname,
  sanitizeChatText,
  type Ack,
  type AckError,
  type JoinResult,
  type ServerToClientEvents,
} from '@meetlite/shared';
import type { Logger } from 'pino';
import type { Config } from '../config';
import { clientIp } from '../http/clientIp';
import { shortId } from '../logger';
import type { Room, RoomEvent, RoomManager } from '../rooms/RoomManager';
import { newMessageId } from '../security/ids';
import { ipKey } from '../security/ipKey';
import { verifyPassword } from '../security/password';
import { AttemptLimiter, KeyedRateLimiter, TokenBucket } from '../security/rateLimit';
import { signToken, verifyToken } from '../security/token';
import { buildIceServers } from '../security/turn';
import { err } from './messages';
import type { ErrorCode } from '@meetlite/shared';

const SESSION_TTL_MS = 4 * 60 * 60_000;

interface SocketData {
  roomId?: string;
  pid?: string;
  joining?: boolean;
  ip: string;
  strikes: number[];
}
type Listen = Record<string, (...args: unknown[]) => void>;
type S = Socket<Listen, ServerToClientEvents, Record<string, never>, SocketData>;
type AckResult = Ack<object>;
const toAck = (r: { ok: true } | { ok: false; code: ErrorCode }): AckResult => (r.ok ? { ok: true } : err(r.code));

/** 이벤트별 속도 제한: [용량, 초당 보충](api-spec.md §3) */
const RATE_SPECS: Record<string, [number, number]> = {
  'room:join': [5, 0.1],
  'room:resume': [10, 0.2],
  'room:leave': [3, 1],
  'signal:send': [120, 40],
  'chat:send': [5, 5 / 3],
  'media:state': [10, 5],
  'screen:start': [4, 1],
  'screen:stop': [4, 1],
  'host:lock': [5, 2],
  'host:kick': [5, 2],
  'host:muteAll': [5, 2],
};
const STRIKE_LIMIT = 15; // 10초 안에 이만큼 거부되면 연결을 끊는다(POL-10)
const STRIKE_WINDOW_MS = 10_000;

export interface SocketDeps {
  config: Config;
  rooms: RoomManager;
  logger: Logger;
  now?: () => number;
}

export function attachSocket(httpServer: HttpServer, deps: SocketDeps): { io: Server<Listen, ServerToClientEvents>; onRoomEvent: (e: RoomEvent) => void } {
  const { config, rooms, logger } = deps;
  const now = deps.now ?? Date.now;

  const io = new Server<Listen, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    maxHttpBufferSize: MAX_MESSAGE_BYTES,
    serveClient: false,
    transports: ['websocket'],
    pingInterval: 5000,
    pingTimeout: 5000,
    // Origin 허용 목록(SEC-08). 브라우저의 WebSocket은 항상 Origin을 보내므로 없으면 거부한다.
    allowRequest: (req, cb) => {
      const origin = req.headers.origin;
      cb(null, typeof origin === 'string' && config.ALLOWED_ORIGINS.includes(origin));
    },
  });

  const sockets = new Map<string, S>(); // `${roomId}:${pid}` → 소켓
  const key = (roomId: string, pid: string): string => `${roomId}:${pid}`;
  const ipConnections = new Map<string, number>();
  const joinByIp = new KeyedRateLimiter({ capacity: 30 * config.RATE_LIMIT_SCALE, refillPerSec: 0.5 * config.RATE_LIMIT_SCALE }, now);
  const passwordAttempts = new AttemptLimiter(5, 10 * 60_000, 10 * 60_000, now);

  // IP당 동시 연결 수 상한(SEC-06)
  io.use((socket, next) => {
    const ip = clientIp(socket.request, config.TRUST_PROXY);
    const count = ipConnections.get(ip) ?? 0;
    if (count >= config.IP_MAX_CONNECTIONS) return next(new Error('too many connections'));
    ipConnections.set(ip, count + 1);
    socket.data.ip = ip;
    socket.data.strikes = [];
    socket.once('disconnect', () => {
      const c = (ipConnections.get(ip) ?? 1) - 1;
      if (c <= 0) ipConnections.delete(ip);
      else ipConnections.set(ip, c);
    });
    next();
  });

  function joinResult(room: Room, pid: string): JoinResult {
    return {
      selfId: pid,
      token: signToken({ t: 's', rid: room.id, pid, exp: now() + SESSION_TTL_MS }, config.SESSION_SECRET),
      hostId: room.hostId,
      locked: room.locked,
      participants: rooms.participantsOf(room.id),
      iceServers: buildIceServers(config, pid, now()),
      config: { maxParticipants: config.MAX_PARTICIPANTS, reconnectGraceSec: config.RECONNECT_GRACE_SEC },
    };
  }

  function bind(socket: S, roomId: string, pid: string): void {
    const k = key(roomId, pid);
    const old = sockets.get(k);
    if (old && old !== socket) {
      delete old.data.pid;
      delete old.data.roomId;
      old.disconnect(true);
    }
    sockets.set(k, socket);
    socket.data.roomId = roomId;
    socket.data.pid = pid;
    void socket.join(roomId);
  }

  function unbind(socket: S): void {
    const { roomId, pid } = socket.data;
    if (roomId && pid) {
      if (sockets.get(key(roomId, pid)) === socket) sockets.delete(key(roomId, pid));
      void socket.leave(roomId);
    }
    delete socket.data.roomId;
    delete socket.data.pid;
  }

  io.on('connection', (socket: S) => {
    const buckets = new Map<string, TokenBucket>();
    const strike = (): void => {
      const t = now();
      socket.data.strikes = socket.data.strikes.filter((s) => t - s < STRIKE_WINDOW_MS);
      socket.data.strikes.push(t);
      if (socket.data.strikes.length >= STRIKE_LIMIT) socket.disconnect(true);
    };

    /** 모든 이벤트의 공통 처리: ack 보장, 속도 제한, zod 검증, 입장 여부 확인, 예외 격리(SEC-03, SEC-06). */
    function on<T>(event: string, schema: z.ZodType<T>, needsJoin: boolean, fn: (data: T) => Promise<AckResult> | AckResult): void {
      const [capacity, refill] = RATE_SPECS[event] ?? [10, 5];
      buckets.set(event, new TokenBucket(capacity, refill, now));
      socket.on(event, (...args: unknown[]) => {
        const maybeAck = args[1];
        const reply = (r: AckResult): void => {
          if (typeof maybeAck === 'function') (maybeAck as (r: AckResult) => void)(r);
        };
        const deny = (e: AckError): void => {
          strike();
          reply(e);
        };
        if (!buckets.get(event)?.take()) return deny(err('RATE_LIMITED'));
        const parsed = schema.safeParse(args[0]);
        if (!parsed.success) return deny(err('INVALID_PAYLOAD'));
        if (needsJoin && !(socket.data.roomId && socket.data.pid)) return deny(err('NOT_JOINED'));
        Promise.resolve()
          .then(() => fn(parsed.data))
          .then(reply)
          .catch((e: unknown) => {
            logger.error({ event, type: e instanceof Error ? e.name : 'unknown' }, 'handler error');
            reply(err('INTERNAL'));
          });
      });
    }
    const me = (): { roomId: string; pid: string } => ({ roomId: socket.data.roomId as string, pid: socket.data.pid as string });

    on('room:join', JoinRequestSchema, false, async (p) => {
      if (socket.data.pid || socket.data.joining) return err('ALREADY_JOINED');
      if (!joinByIp.allow(socket.data.ip)) return err('RATE_LIMITED');
      socket.data.joining = true;
      try {
        const room = rooms.get(p.roomId);
        if (!room) return err('ROOM_NOT_FOUND');
        const nickname = normalizeNickname(p.nickname);
        if (!nickname) return err('INVALID_PAYLOAD');

        const claim = p.hostClaim ? verifyToken(p.hostClaim, config.SESSION_SECRET, now()) : null;
        const hostClaim = !!claim && claim.t === 'h' && claim.rid === p.roomId && !room.hostClaimUsed;

        let passwordOk = !room.passwordHash || hostClaim;
        if (!passwordOk && room.passwordHash) {
          const attemptKey = `${socket.data.ip}|${p.roomId}`;
          if (passwordAttempts.isBlocked(attemptKey)) return err('TOO_MANY_ATTEMPTS');
          passwordOk = !!p.password && (await verifyPassword(p.password, room.passwordHash));
          if (passwordOk) passwordAttempts.recordSuccess(attemptKey);
          else {
            passwordAttempts.recordFailure(attemptKey);
            return err('WRONG_PASSWORD');
          }
        }

        // await 이후이므로 모든 조건을 동기 구간(rooms.join)에서 다시 확인한다.
        const result = rooms.join({ roomId: p.roomId, nickname, ipKey: ipKey(socket.data.ip, config.SESSION_SECRET), hostClaim, passwordOk });
        if (!result.ok) return err(result.code);
        bind(socket, p.roomId, result.participant.id);
        logger.info({ room: shortId(p.roomId), size: result.room.participants.size }, 'participant joined');
        return { ok: true, ...joinResult(result.room, result.participant.id) };
      } finally {
        delete socket.data.joining;
      }
    });

    on('room:resume', ResumeRequestSchema, false, (p) => {
      if (socket.data.pid) return err('ALREADY_JOINED');
      const payload = verifyToken(p.token, config.SESSION_SECRET, now());
      if (!payload || payload.t !== 's') return err('TOKEN_INVALID');
      const result = rooms.resume(payload.rid, payload.pid);
      if (!result.ok) return err(result.code);
      bind(socket, payload.rid, payload.pid);
      return { ok: true, ...joinResult(result.room, payload.pid) };
    });

    on('room:leave', EmptyRequestSchema, true, () => {
      const { roomId, pid } = me();
      unbind(socket);
      rooms.leave(roomId, pid);
      return { ok: true };
    });

    on('signal:send', SignalRequestSchema, true, (p) => {
      const { roomId, pid } = me();
      if (!rooms.isMember(roomId, p.to) || p.to === pid) return err('TARGET_NOT_FOUND');
      // 발신자(from)는 서버가 소켓에 묶인 참가자 ID로 채운다(SEC-04). 같은 방 참가자에게만 릴레이한다.
      sockets.get(key(roomId, p.to))?.emit('signal:recv', {
        v: 1,
        from: pid,
        ...(p.description ? { description: p.description } : {}),
        ...(p.candidate ? { candidate: p.candidate } : {}),
      });
      return { ok: true };
    });

    on('chat:send', ChatSendRequestSchema, true, (p) => {
      const { roomId, pid } = me();
      const text = sanitizeChatText(p.text);
      if (!text) return err('INVALID_PAYLOAD');
      const room = rooms.get(roomId);
      const sender = room?.participants.get(pid);
      if (!room || !sender) return err('PARTICIPANT_GONE');
      io.to(roomId).emit('chat:message', { v: 1, id: newMessageId(), from: pid, nickname: sender.nickname, text, ts: now() });
      return { ok: true };
    });

    on('media:state', MediaStateRequestSchema, true, (p) => {
      const { roomId, pid } = me();
      return toAck(rooms.setMedia(roomId, pid, { audio: p.audio, video: p.video }));
    });
    on('screen:start', EmptyRequestSchema, true, () => {
      const { roomId, pid } = me();
      return toAck(rooms.startScreen(roomId, pid));
    });
    on('screen:stop', EmptyRequestSchema, true, () => {
      const { roomId, pid } = me();
      return toAck(rooms.stopScreen(roomId, pid));
    });
    on('host:lock', LockRequestSchema, true, (p) => {
      const { roomId, pid } = me();
      return toAck(rooms.setLocked(roomId, pid, p.locked));
    });
    on('host:kick', KickRequestSchema, true, (p) => {
      const { roomId, pid } = me();
      return toAck(rooms.kick(roomId, pid, p.targetId));
    });
    on('host:muteAll', EmptyRequestSchema, true, () => {
      const { roomId, pid } = me();
      return toAck(rooms.muteAll(roomId, pid));
    });

    socket.on('disconnect', () => {
      const { roomId, pid } = socket.data;
      if (roomId && pid && sockets.get(key(roomId, pid)) === socket) {
        sockets.delete(key(roomId, pid));
        rooms.disconnect(roomId, pid);
      }
    });
  });

  /** 방 도메인 이벤트 → 소켓 전달. 같은 방 채널에만 보낸다(SEC-04). */
  function onRoomEvent(e: RoomEvent): void {
    switch (e.type) {
      case 'participantJoined':
        io.to(e.roomId).emit('room:participantJoined', { v: 1, participant: e.participant });
        break;
      case 'participantLeft':
        io.to(e.roomId).emit('room:participantLeft', { v: 1, id: e.id, reason: e.reason });
        break;
      case 'participantUpdated':
        io.to(e.roomId).emit('room:participantUpdated', { v: 1, id: e.id, ...e.patch });
        break;
      case 'hostChanged':
        io.to(e.roomId).emit('room:hostChanged', { v: 1, hostId: e.hostId });
        break;
      case 'locked':
        io.to(e.roomId).emit('room:locked', { v: 1, locked: e.locked });
        break;
      case 'muteAll': {
        const host = sockets.get(key(e.roomId, e.by));
        (host ? host.to(e.roomId) : io.to(e.roomId)).emit('host:muteAll', { v: 1, by: e.by });
        break;
      }
      case 'closedByOperator': {
        // 채널에 먼저 알린 뒤 끊는다. 방 상태는 이미 지워졌으므로 소켓 쪽 바인딩만 정리한다.
        io.to(e.roomId).emit('room:closed', { v: 1 });
        for (const id of e.participantIds) {
          const target = sockets.get(key(e.roomId, id));
          if (target) {
            unbind(target);
            target.disconnect(true);
          }
        }
        io.in(e.roomId).disconnectSockets(true);
        break;
      }
      case 'kick': {
        const target = sockets.get(key(e.roomId, e.id));
        if (target) {
          target.emit('room:kicked', { v: 1, reason: 'host' });
          unbind(target);
          target.disconnect(true);
        }
        break;
      }
    }
  }

  return { io, onRoomEvent };
}
