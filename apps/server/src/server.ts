import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Logger } from 'pino';
import { createApp } from './http/app';
import { createLogger } from './logger';
import { RoomManager, type RoomEvent } from './rooms/RoomManager';
import { attachSocket } from './socket/server';
import type { Config } from './config';

export interface RunningServer {
  port: number;
  rooms: RoomManager;
  close: () => Promise<void>;
}

/** 서버를 조립해 시작한다. 테스트에서는 PORT=0으로 빈 포트를 받는다. */
export async function startServer(config: Config, logger: Logger = createLogger(config.LOG_LEVEL), now: () => number = Date.now): Promise<RunningServer> {
  let sink: (e: RoomEvent) => void = () => undefined;
  const rooms = new RoomManager({
    maxParticipants: config.MAX_PARTICIPANTS,
    maxRooms: config.MAX_ROOMS,
    emptyTtlMs: config.ROOM_EMPTY_TTL_MIN * 60_000,
    graceMs: config.RECONNECT_GRACE_SEC * 1000,
    onEvent: (e) => sink(e),
  });
  const app = createApp({ config, rooms, logger, now });
  const httpServer = http.createServer(app);
  const { io, onRoomEvent } = attachSocket(httpServer, { config, rooms, logger, now });
  sink = onRoomEvent;

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(config.PORT, resolve);
  });
  const port = (httpServer.address() as AddressInfo).port;
  logger.info({ port, env: config.NODE_ENV }, 'server listening');

  return {
    port,
    rooms,
    close: async () => {
      rooms.dispose();
      await io.close();
      if (httpServer.listening) await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    },
  };
}
