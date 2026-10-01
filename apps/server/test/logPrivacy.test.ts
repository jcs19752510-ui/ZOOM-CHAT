import { afterEach, describe, expect, it } from 'vitest';
import type { Socket } from 'socket.io-client';
import { createLogger } from '../src/logger';
import { ipKey } from '../src/security/ipKey';
import { startServer, type RunningServer } from '../src/server';
import { connect, createRoom, emit, join, makeConfig, once, SECRET, sleep, type Joined } from './helpers';

const sockets: Socket[] = [];
let server: RunningServer | undefined;
afterEach(async () => {
  while (sockets.length) sockets.pop()?.close();
  await server?.close();
  server = undefined;
});

/** pino가 쓰는 출력을 줄 단위로 모은다. */
function capture(): { lines: string[]; stream: { write: (s: string) => void } } {
  const lines: string[] = [];
  return { lines, stream: { write: (s: string) => void lines.push(s) } };
}

const NICK_HOST = '로그검사호스트닉';
const NICK_A = '로그검사참가자닉';
const CHAT = 'LOGPRIVACY-CHAT-본문-9f3a';
const PASSWORD = 'LOGPRIVACY-pw-4821';
const SDP = 'v=0\r\no=- 4611731400430051336 2 IN IP4 198.51.100.23\r\ns=LOGPRIVACY-SDP';
const CANDIDATE = 'candidate:1 1 udp 2122260223 203.0.113.99 54321 typ host';

describe('로그 비식별 (POL-18, SEC-10)', () => {
  it('TC-342 [POL-18,SEC-10] 방 생성·입장·채팅·신호·강퇴·재접속·오류 흐름의 실제 로그에 IP·닉네임·채팅·토큰·비밀번호·SDP가 없고 기대 이벤트 줄은 있다', async () => {
    const cap = capture();
    server = await startServer(makeConfig({ RATE_LIMIT_SCALE: '100', LOG_LEVEL: 'debug' }), createLogger('debug', cap.stream));
    const port = server.port;
    const track = (j: Joined): Joined => (sockets.push(j.socket), j);

    const { roomId, hostClaim } = await createRoom(port, PASSWORD);
    const host = track(await join(port, roomId, NICK_HOST, { hostClaim }));
    expect(host.res.ok).toBe(true);
    // 오답·정답 입장
    const wrong = track(await join(port, roomId, NICK_A, { password: `${PASSWORD}-x` }));
    expect(wrong.res).toMatchObject({ ok: false, code: 'WRONG_PASSWORD' });
    const a = track(await join(port, roomId, NICK_A, { password: PASSWORD }));
    expect(a.res.ok).toBe(true);
    // 채팅·신호(SDP/ICE)
    const got = once(host.socket, 'chat:message');
    expect(await emit(a.socket, 'chat:send', { v: 1, text: CHAT })).toMatchObject({ ok: true });
    await got;
    expect(await emit(a.socket, 'signal:send', { v: 1, to: host.id, description: { type: 'offer', sdp: SDP } })).toMatchObject({ ok: true });
    expect(await emit(a.socket, 'signal:send', { v: 1, to: host.id, candidate: { candidate: CANDIDATE } })).toMatchObject({ ok: true });
    // 잘못된 페이로드·위조 토큰·HTTP 오류
    expect(await emit(a.socket, 'chat:send', { v: 1, text: 'x'.repeat(501) })).toMatchObject({ ok: false });
    const bad = sockets[sockets.push(await connect(port)) - 1] as Socket;
    expect(await emit(bad, 'room:resume', { v: 1, token: `${a.token}x` })).toMatchObject({ ok: false });
    const malformed = await fetch(`http://127.0.0.1:${port}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: `{"v":1,"password":"${PASSWORD}` });
    expect(malformed.status).toBe(400);
    // 재접속 흐름
    const resumer = sockets[sockets.push(await connect(port)) - 1] as Socket;
    a.socket.disconnect();
    await sleep(50);
    expect(await emit(resumer, 'room:resume', { v: 1, token: a.token })).toMatchObject({ ok: true });
    // 강퇴 후 재입장 거부
    const kicked = once(resumer, 'room:kicked');
    expect(await emit(host.socket, 'host:kick', { v: 1, targetId: a.id })).toMatchObject({ ok: true });
    await kicked;
    const again = track(await join(port, roomId, NICK_A, { password: PASSWORD }));
    expect(again.res).toMatchObject({ ok: false, code: 'KICKED' });
    await sleep(100);

    const out = cap.lines.join('');
    // 양성 대조군: 캡처가 실제로 동작하고 기대 이벤트가 남는다
    expect(out).toContain('room created');
    expect(out).toContain('participant joined');
    expect(out).toContain('server listening');
    expect(out).toContain('http error');

    const forbidden: Record<string, string> = {
      'IPv4 루프백': '127.0.0.1',
      'IPv6 루프백': '::1',
      'IPv4-mapped': '::ffff:',
      '호스트 닉네임': NICK_HOST,
      '참가자 닉네임': NICK_A,
      '채팅 본문': CHAT,
      '비밀번호': PASSWORD,
      'SDP 본문': 'v=0',
      'SDP 내용': 'LOGPRIVACY-SDP',
      'SDP 안의 IP': '198.51.100.23',
      'ICE 후보': '203.0.113.99',
      '호스트 클레임': hostClaim,
      '호스트 세션 토큰': host.token,
      '참가자 세션 토큰': a.token,
      '세션 비밀값': SECRET,
      '전체 방 ID': roomId,
      ...Object.fromEntries(['127.0.0.1', '::ffff:127.0.0.1', '::1'].map((ip) => [`ipKey(${ip})`, ipKey(ip, SECRET)])),
    };
    for (const [name, needle] of Object.entries(forbidden)) expect(out.includes(needle), `로그에 ${name} 포함`).toBe(false);
    // 방 ID는 앞 6자만 남는다
    expect(out).toContain(roomId.slice(0, 6));
  });

  it('TC-342b [POL-18,SEC-10] 로거는 민감 키(token·password·sdp·text·nickname)를 [redacted]로 가린다(호출부 실수의 2차 방어선)', () => {
    const cap = capture();
    const logger = createLogger('info', cap.stream);
    logger.info({ token: 'T-1', password: 'P-1', sdp: 'S-1', text: 'X-1', nickname: 'N-1', nested: { token: 'T-2', nickname: 'N-2', candidate: 'C-2' } }, 'probe');
    const out = cap.lines.join('');
    for (const v of ['T-1', 'P-1', 'S-1', 'X-1', 'N-1', 'T-2', 'N-2', 'C-2']) expect(out).not.toContain(v);
    expect(out).toContain('[redacted]');
  });
});
