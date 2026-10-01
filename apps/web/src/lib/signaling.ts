import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@meetlite/shared';

type AckOf<K extends keyof ClientToServerEvents> = Parameters<Parameters<ClientToServerEvents[K]>[1]>[0];
type PayloadOf<K extends keyof ClientToServerEvents> = Parameters<ClientToServerEvents[K]>[0];

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const REQUEST_TIMEOUT_MS = 8000;

/** Socket.IO 연결 래퍼. WebSocket 전용, 끊기면 지수 백오프로 계속 재연결한다(FR-20). */
export class SignalingClient {
  readonly socket: AppSocket;

  constructor() {
    this.socket = io({
      path: '/socket.io',
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 400,
      reconnectionDelayMax: 3000,
      randomizationFactor: 0.3,
      timeout: 8000,
    });
  }

  /** 첫 연결을 기다린다. 실패하면 예외를 던진다. */
  connect(): Promise<void> {
    if (this.socket.connected) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('timeout'));
      }, 10_000);
      const onConnect = (): void => {
        cleanup();
        resolve();
      };
      const onError = (e: Error): void => {
        cleanup();
        reject(e);
      };
      const cleanup = (): void => {
        clearTimeout(timer);
        this.socket.off('connect', onConnect);
        this.socket.off('connect_error', onError);
      };
      this.socket.once('connect', onConnect);
      this.socket.once('connect_error', onError);
    });
  }

  /** 이벤트를 보내고 ack를 기다린다. 응답이 없으면 NETWORK 오류로 돌려준다. */
  request<K extends keyof ClientToServerEvents>(event: K, payload: PayloadOf<K>, timeoutMs: number = REQUEST_TIMEOUT_MS): Promise<AckOf<K> | { ok: false; code: 'NETWORK'; message: string }> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve({ ok: false, code: 'NETWORK', message: 'timeout' }), timeoutMs);
      const emit = this.socket.emit.bind(this.socket) as (e: string, p: unknown, cb: (r: unknown) => void) => void;
      emit(event, payload, (res) => {
        clearTimeout(timer);
        resolve(res as AckOf<K>);
      });
    });
  }

  close(): void {
    this.socket.removeAllListeners();
    this.socket.disconnect();
  }
}
