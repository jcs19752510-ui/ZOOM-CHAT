import { io, type Socket } from 'socket.io-client';
import { loadConfig, type Config } from '../src/config';
import { createLogger } from '../src/logger';
import { startServer, type RunningServer } from '../src/server';

export const ORIGIN = 'http://localhost:5173';
export const SECRET = 'test-secret-test-secret-test-secret-123';

export const baseEnv: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  PORT: '0',
  ALLOWED_ORIGINS: ORIGIN,
  SESSION_SECRET: SECRET,
  LOG_LEVEL: 'silent',
};

export function makeConfig(overrides: Record<string, string> = {}): Config {
  return loadConfig({ ...baseEnv, ...overrides });
}

export async function boot(overrides: Record<string, string> = {}, now?: () => number): Promise<RunningServer> {
  return startServer(makeConfig(overrides), createLogger('silent'), now);
}

export interface Created {
  roomId: string;
  hostClaim: string;
}
export async function createRoom(port: number, password?: string): Promise<Created> {
  const res = await fetch(`http://127.0.0.1:${port}/api/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ v: 1, ...(password ? { password } : {}) }),
  });
  if (res.status !== 201) throw new Error(`createRoom failed: ${res.status}`);
  return (await res.json()) as Created;
}

export async function connect(port: number, origin: string | null = ORIGIN): Promise<Socket> {
  const socket = io(`http://127.0.0.1:${port}`, {
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
    ...(origin ? { extraHeaders: { origin } } : {}),
  });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', (e) => reject(e));
  });
  return socket;
}

export type AnyAck = { ok: boolean; code?: string; [k: string]: unknown };
export function emit(socket: Socket, event: string, payload: unknown): Promise<AnyAck> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`ack timeout: ${event}`)), 3000);
    socket.emit(event, payload, (res: AnyAck) => {
      clearTimeout(timer);
      resolve(res);
    });
  });
}

export function once<T = Record<string, unknown>>(socket: Socket, event: string, ms = 3000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`event timeout: ${event}`)), ms);
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export interface Joined {
  socket: Socket;
  res: AnyAck;
  id: string;
  token: string;
}
export async function join(port: number, roomId: string, nickname: string, extra: Record<string, unknown> = {}): Promise<Joined> {
  const socket = await connect(port);
  const res = await emit(socket, 'room:join', { v: 1, roomId, nickname, ...extra });
  return { socket, res, id: String(res.selfId ?? ''), token: String(res.token ?? '') };
}

/** 방을 만들고 호스트로 입장한다. */
export async function hostRoom(port: number, password?: string): Promise<{ roomId: string; host: Joined }> {
  const { roomId, hostClaim } = await createRoom(port, password);
  const host = await join(port, roomId, '호스트', { hostClaim });
  if (!host.res.ok) throw new Error(`host join failed: ${host.res.code}`);
  return { roomId, host };
}
