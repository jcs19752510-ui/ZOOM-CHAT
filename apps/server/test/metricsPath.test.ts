import { afterEach, describe, expect, it } from 'vitest';
import type { Socket } from 'socket.io-client';
import { createLogger } from '../src/logger';
import { startServer, type RunningServer } from '../src/server';
import { connect, createRoom, emit, join, makeConfig, sleep } from './helpers';

const sockets: Socket[] = [];
let server: RunningServer | undefined;
afterEach(async () => {
  while (sockets.length) sockets.pop()?.close();
  await server?.close();
  server = undefined;
});

const NICK = '경로계측닉네임';

async function setup(): Promise<{ lines: string[]; port: number; roomId: string; host: Awaited<ReturnType<typeof join>> }> {
  const lines: string[] = [];
  server = await startServer(makeConfig({ RATE_LIMIT_SCALE: '100' }), createLogger('info', { write: (s: string) => void lines.push(s) }));
  const { roomId, hostClaim } = await createRoom(server.port);
  const host = await join(server.port, roomId, NICK, { hostClaim });
  sockets.push(host.socket);
  return { lines, port: server.port, roomId, host };
}
const pathLines = (lines: string[]): Record<string, unknown>[] => lines.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.msg === 'peer path');

describe('metrics:path 서버 처리 (NFR-15, EVT-33)', () => {
  it('TC-403 [NFR-15,SEC-06] 정상 보고는 ack ok이고 로그는 kpi·path만 담으며 방 ID·IP·닉네임·참가자 ID·토큰이 없다', async () => {
    const { lines, roomId, host } = await setup();
    expect(await emit(host.socket, 'metrics:path', { v: 1, path: 'relay' })).toEqual({ ok: true });
    expect(await emit(host.socket, 'metrics:path', { v: 1, path: 'direct' })).toEqual({ ok: true });
    await sleep(50);
    const found = pathLines(lines);
    expect(found).toHaveLength(2);
    for (const l of found) expect(Object.keys(l).filter((k) => !['level', 'time', 'pid', 'hostname', 'msg', 'kpi', 'path'].includes(k))).toEqual([]);
    expect(found.map((l) => [l.kpi, l.path])).toEqual([['path', 'relay'], ['path', 'direct']]);
    const raw = lines.filter((l) => l.includes('peer path')).join('');
    for (const needle of [roomId, roomId.slice(0, 6), host.id, host.token, NICK, '127.0.0.1', '::1']) expect(raw.includes(needle), `로그에 ${needle} 포함`).toBe(false);
  });

  it('TC-404 [NFR-15,SEC-06] 잘못된 값·추가 식별자 키·버전 불일치·타입 오류는 INVALID_PAYLOAD로 거부되고 로그가 남지 않으며 서버는 계속 동작한다', async () => {
    const { lines, host } = await setup();
    const bad: unknown[] = [
      { v: 1, path: 'RELAY' },
      { v: 1, path: '' },
      { v: 1, path: 'turn' },
      { v: 1 },
      { v: 2, path: 'relay' },
      { v: 1, path: 'relay', peerId: host.id },
      { v: 1, path: 'relay', ip: '203.0.113.9' },
      { v: 1, path: ['relay'] },
      null,
    ];
    for (const b of bad) expect(await emit(host.socket, 'metrics:path', b), JSON.stringify(b)).toMatchObject({ ok: false, code: 'INVALID_PAYLOAD' });
    await sleep(50);
    expect(pathLines(lines)).toHaveLength(0);
    expect(await emit(host.socket, 'metrics:path', { v: 1, path: 'direct' })).toEqual({ ok: true });
  });

  it('TC-405 [NFR-15,SEC-03] 입장하지 않은 소켓은 NOT_JOINED로 거부되고 로그가 남지 않는다', async () => {
    const { lines, port } = await setup();
    const anon = await connect(port);
    sockets.push(anon);
    expect(await emit(anon, 'metrics:path', { v: 1, path: 'relay' })).toMatchObject({ ok: false, code: 'NOT_JOINED' });
    await sleep(50);
    expect(pathLines(lines)).toHaveLength(0);
  });

  it('TC-406 [NFR-15,SEC-06] 같은 소켓의 짧은 시간 반복은 속도 제한(RATE_LIMITED)되어 로그가 버킷 용량(10)을 넘지 않는다', async () => {
    const { lines, host } = await setup();
    const results = await Promise.all(Array.from({ length: 18 }, () => emit(host.socket, 'metrics:path', { v: 1, path: 'direct' })));
    const ok = results.filter((r) => r.ok).length;
    expect(ok).toBeGreaterThanOrEqual(10);
    expect(ok).toBeLessThanOrEqual(11);
    expect(results.filter((r) => !r.ok).every((r) => r.code === 'RATE_LIMITED')).toBe(true);
    await sleep(50);
    expect(pathLines(lines)).toHaveLength(ok);
  });
});
