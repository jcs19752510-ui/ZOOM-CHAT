import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { newMessageId, newParticipantId, newRoomId } from '../src/security/ids';
import { ipKey } from '../src/security/ipKey';
import { hashPassword, verifyPassword } from '../src/security/password';
import { AttemptLimiter, KeyedRateLimiter, TokenBucket } from '../src/security/rateLimit';
import { signToken, verifyToken } from '../src/security/token';
import { buildIceServers } from '../src/security/turn';
import { SECRET, makeConfig } from './helpers';

// unit-03(서버 보안) 6단계 소급 보강 시험. 제품 코드는 건드리지 않는다.

const now = 1_000_000;
const b64 = (v: unknown): string => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
const mac = (body: string, secret = SECRET): string => createHmac('sha256', secret).update(body).digest('base64url');
/** 올바른 서명을 붙인 임의 본문 토큰(서명은 맞지만 내용이 비정상인 경우를 만든다) */
const signedRaw = (payload: unknown, secret = SECRET): string => {
  const body = b64(payload);
  return `${body}.${mac(body, secret)}`;
};

describe('토큰 경계·적대 입력 (SEC-03)', () => {
  const valid = { t: 's', rid: 'room', pid: 'pid', exp: now + 1000 };

  it('TC-430 [SEC-03] 만료 경계: exp-1 유효, exp 정각·exp+1 무효. 호스트 클레임(t=h)도 같은 검증을 받는다', () => {
    const t = signToken({ t: 's', rid: 'r', pid: 'p', exp: now }, SECRET);
    expect(verifyToken(t, SECRET, now - 1)).not.toBeNull();
    expect(verifyToken(t, SECRET, now)).toBeNull();
    expect(verifyToken(t, SECRET, now + 1)).toBeNull();
    const h = signToken({ t: 'h', rid: 'r', exp: now + 10 }, SECRET);
    expect(verifyToken(h, SECRET, now)).toEqual({ t: 'h', rid: 'r', exp: now + 10 });
    expect(verifyToken(h, SECRET, now + 10)).toBeNull();
    expect(verifyToken(h, 'other-secret-other-secret-other-12', now)).toBeNull();
  });

  it('TC-430b [SEC-03] 서명은 맞지만 내용이 비정상인 토큰은 모두 예외 없이 null: 본문이 JSON이 아님·배열·null·숫자, pid/rid/exp 누락·타입 오류, 알 수 없는 종류', () => {
    expect(verifyToken(signedRaw(valid), SECRET, now)).toMatchObject({ t: 's', pid: 'pid' }); // 대조군
    const body = (s: string): string => `${b64(s)}.${mac(b64(s))}`;
    for (const raw of [body('not-json'), body('{'), body('null'), body('123'), body('"str"'), body('[]'), body('{}')]) {
      expect(() => verifyToken(raw, SECRET, now), raw).not.toThrow();
      expect(verifyToken(raw, SECRET, now), raw).toBeNull();
    }
    const bad: unknown[] = [
      { ...valid, pid: undefined },
      { ...valid, pid: 123 },
      { ...valid, pid: null },
      { ...valid, rid: undefined },
      { ...valid, rid: 5 },
      { ...valid, exp: String(now + 1000) },
      { ...valid, exp: null },
      { ...valid, exp: undefined },
      { ...valid, exp: -1 },
      { ...valid, t: 'x' },
      { ...valid, t: undefined },
      { ...valid, t: 'S' },
      { t: 'h', exp: now + 1000 }, // rid 없는 클레임
    ];
    for (const p of bad) expect(verifyToken(signedRaw(p), SECRET, now), JSON.stringify(p)).toBeNull();
    // 모르는 추가 필드는 통과하되 서명 범위 안에 있으므로 신뢰 가능(권한 필드로 쓰이지 않는다)
    expect(verifyToken(signedRaw({ ...valid, admin: true }), SECRET, now)).toMatchObject({ t: 's' });
  });

  it('TC-430c [SEC-03] 형식 공격: 조각 수·서명 길이·한 글자 변조·거대 입력은 예외 없이 null', () => {
    const t = signToken({ t: 's', rid: 'r', pid: 'p', exp: now + 1000 }, SECRET);
    const [body, sig] = t.split('.') as [string, string];
    const inputs = [
      `${t}.extra`,
      `${t}.`,
      `${body}.${sig}.${sig}`,
      `${body}.${sig.slice(0, -1)}`, // 서명이 짧음(길이 불일치)
      `${body}.${sig}A`, // 서명이 김
      `${body}.`,
      `${body}.${'A'.repeat(sig.length)}`,
      `.${sig}`,
      '.',
      '..',
      '',
      ' ',
      `${body} .${sig}`,
      'a'.repeat(200_000),
      `${'a'.repeat(100_000)}.${'b'.repeat(100_000)}`,
      `${body}.${sig.slice(0, -1)}${sig.endsWith('A') ? 'B' : 'A'}`, // 마지막 한 글자 변조
      `${body.slice(0, -1)}${body.endsWith('A') ? 'B' : 'A'}.${sig}`, // 본문 한 글자 변조
    ];
    for (const x of inputs) {
      expect(() => verifyToken(x, SECRET, now), x.slice(0, 40)).not.toThrow();
      expect(verifyToken(x, SECRET, now), x.slice(0, 40)).toBeNull();
    }
    // 같은 길이의 다른 비밀로 서명한 토큰
    expect(verifyToken(signedRaw({ t: 's', rid: 'r', pid: 'p', exp: now + 1000 }, 'x'.repeat(SECRET.length)), SECRET, now)).toBeNull();
  });

  it('TC-430d [SEC-03] 서명 토큰 형식: base64url(본문).base64url(HMAC-SHA256), 참가자가 다르면 토큰도 다르고 본문에 비밀값이 없다', () => {
    const a = signToken({ t: 's', rid: 'r', pid: 'p1', exp: now + 1000 }, SECRET);
    const b = signToken({ t: 's', rid: 'r', pid: 'p2', exp: now + 1000 }, SECRET);
    expect(a).not.toBe(b);
    const [body, sig] = a.split('.') as [string, string];
    expect(sig).toBe(mac(body));
    expect(a).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(body, 'base64url').toString()).not.toContain(SECRET);
  });
});

describe('제한기 경계 (SEC-02, SEC-06)', () => {
  it('TC-431 [SEC-06] 토큰 버킷: 유휴 시간이 길어도 용량을 넘겨 쌓이지 않고, 소수 보충·무보충·용량 1 경계를 지킨다', () => {
    let t = 0;
    const b = new TokenBucket(3, 1, () => t);
    t += 1_000_000; // 한참 유휴
    expect([b.take(), b.take(), b.take(), b.take(), b.take()]).toEqual([true, true, true, false, false]);

    t = 0;
    const half = new TokenBucket(1, 0.5, () => t);
    expect(half.take()).toBe(true);
    t += 1000; // 0.5 토큰
    expect(half.take()).toBe(false);
    t += 1000; // 1.0 토큰
    expect(half.take()).toBe(true);
    expect(half.take()).toBe(false);

    t = 0;
    const none = new TokenBucket(2, 0, () => t);
    t += 10_000_000;
    expect([none.take(), none.take(), none.take()]).toEqual([true, true, false]);
  });

  it('TC-431b [SEC-06] 키별 제한기: 키마다 독립 버킷(한 IP가 소진해도 다른 IP는 영향 없음)', () => {
    let t = 0;
    const l = new KeyedRateLimiter({ capacity: 2, refillPerSec: 0 }, () => t, 0);
    expect([l.allow('a'), l.allow('a'), l.allow('a')]).toEqual([true, true, false]);
    expect([l.allow('b'), l.allow('b'), l.allow('b')]).toEqual([true, true, false]);
    expect(l.size).toBe(2);
    t += 1;
    l.dispose();
  });

  it('TC-431c [SEC-02,POL-11] 시도 제한: 실패 집계 창이 지나면 오래된 실패는 세지 않고, 차단은 정확히 blockMs 뒤 풀리며, 키마다 독립이다', () => {
    let t = 0;
    const l = new AttemptLimiter(3, 1000, 5000, () => t, 0);
    l.recordFailure('k'); // t=0
    l.recordFailure('k');
    t = 1500; // 앞의 두 실패는 창(1000ms) 밖
    l.recordFailure('k');
    expect(l.isBlocked('k')).toBe(false);
    t = 1600;
    l.recordFailure('k');
    expect(l.isBlocked('k')).toBe(false); // 창 안 실패 2회
    t = 1700;
    l.recordFailure('k'); // 창 안 3회째 -> 차단
    expect(l.isBlocked('k')).toBe(true);
    expect(l.isBlocked('other')).toBe(false);
    t = 1700 + 5000 - 1;
    expect(l.isBlocked('k')).toBe(true);
    t = 1700 + 5000;
    expect(l.isBlocked('k')).toBe(false);
    // 차단이 풀린 뒤 집계는 0부터 다시 시작한다
    l.recordFailure('k');
    l.recordFailure('k');
    expect(l.isBlocked('k')).toBe(false);
    l.recordFailure('k');
    expect(l.isBlocked('k')).toBe(true);

    // 창 경계: 정확히 windowMs 전의 실패는 만료로 본다
    const e = new AttemptLimiter(2, 1000, 5000, () => t, 0);
    t = 0;
    e.recordFailure('x');
    t = 1000;
    e.recordFailure('x');
    expect(e.isBlocked('x')).toBe(false);
    t = 1999;
    e.recordFailure('x');
    expect(e.isBlocked('x')).toBe(true);
    l.dispose();
    e.dispose();
  });
});

describe('비밀번호·식별자·TURN (SEC-01, SEC-02, SEC-04, SEC-09)', () => {
  it('TC-432 [SEC-02] bcrypt 비용 10 이상의 해시, 빈 문자열·이모지·1000자도 해시/검증이 일치하고, 잘못된 해시 형식은 false(예외 없음)', async () => {
    const h = await hashPassword('비밀번호-1234');
    expect(h).toMatch(/^\$2[aby]\$(1[0-9]|[2-3][0-9])\$/);
    expect(h).not.toContain('비밀번호');
    for (const pw of ['', '😀😀😀😀', 'p'.repeat(1000), '  공백  ', 'null', '\0\0']) {
      const x = await hashPassword(pw);
      expect(await verifyPassword(pw, x), JSON.stringify(pw).slice(0, 20)).toBe(true);
      expect(await verifyPassword(`${pw}x`, x), JSON.stringify(pw).slice(0, 20)).toBe(false);
    }
    await expect(verifyPassword('x', 'not-a-bcrypt-hash')).resolves.toBe(false);
    await expect(verifyPassword('x', '')).resolves.toBe(false);
  });

  it('TC-432b [SEC-01,SEC-04] 식별자: 형식·유일성·엔트로피(참가자 12자, 메시지 8자, 방 22자), 한 자리 위치가 고정되지 않는다', () => {
    const rooms = Array.from({ length: 3000 }, newRoomId);
    const pids = Array.from({ length: 5000 }, newParticipantId);
    const msgs = Array.from({ length: 3000 }, newMessageId);
    expect(new Set(rooms).size).toBe(rooms.length);
    expect(new Set(pids).size).toBe(pids.length);
    for (const id of msgs) expect(id).toMatch(/^[A-Za-z0-9_-]{8}$/);
    for (const id of pids) expect(id).toMatch(/^[A-Za-z0-9_-]{12}$/);
    for (const i of [0, 5, 10, 20]) expect(new Set(rooms.map((r) => r[i])).size, `room pos ${i}`).toBeGreaterThan(30);
    for (const i of [0, 6, 11]) expect(new Set(pids.map((r) => r[i])).size, `pid pos ${i}`).toBeGreaterThan(30);
    // 방 ID는 참가자 ID와 겹치지 않는 길이/형식(스키마 혼동 방지)
    expect(rooms[0]).toHaveLength(22);
  });

  it('TC-432c [POL-06,SEC-04] 강퇴용 IP 키: 결정적이고 IP마다 다르며 IPv6도 22자, 원문 IP가 나타나지 않는다', () => {
    const a = ipKey('203.0.113.7', SECRET);
    expect(ipKey('203.0.113.7', SECRET)).toBe(a);
    expect(ipKey('203.0.113.8', SECRET)).not.toBe(a);
    const v6 = ipKey('2001:db8::1', SECRET);
    expect(v6).toHaveLength(22);
    expect(v6).not.toContain('2001');
    expect(ipKey('::1', SECRET)).not.toBe(ipKey('127.0.0.1', SECRET));
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it('TC-433 [SEC-09] TURN 자격증명: 만료는 floor(초)+TTL, 참가자마다 다른 자격증명, username 형식 `<만료>:<참가자>`, 공유 비밀·TURN 비밀번호 상수가 응답에 없다', () => {
    const cfg = makeConfig({ TURN_URLS: 'turn:t.example:3478', TURN_SECRET: 'turn-secret-turn-secret', TURN_TTL_SEC: '120' });
    const at = 1_700_000_000_999; // 소수 초는 버린다
    const mine = buildIceServers(cfg, 'participant-A', at);
    const other = buildIceServers(cfg, 'participant-B', at);
    const later = buildIceServers(cfg, 'participant-A', at + 1000);
    const turn = mine.find((s) => s.username);
    expect(turn?.username).toBe('1700000120:participant-A');
    expect(turn?.credential).toBe(createHmac('sha1', 'turn-secret-turn-secret').update('1700000120:participant-A').digest('base64'));
    expect(other.find((s) => s.username)?.credential).not.toBe(turn?.credential);
    expect(later.find((s) => s.username)?.username).toBe('1700000121:participant-A');
    expect(later.find((s) => s.username)?.credential).not.toBe(turn?.credential);
    expect(JSON.stringify(mine)).not.toContain('turn-secret-turn-secret');
    // STUN 항목에는 자격증명이 없다
    expect(mine.filter((s) => !s.username).every((s) => s.credential === undefined)).toBe(true);
    // 설정이 없으면 TURN 항목이 아예 없다(고정 비밀번호 없음)
    expect(buildIceServers(makeConfig(), 'participant-A', at).some((s) => s.username || s.credential)).toBe(false);
    // STUN을 비워도 TURN만은 나온다
    const turnOnly = buildIceServers(makeConfig({ STUN_URLS: '', TURN_URLS: 'turn:t.example:3478', TURN_SECRET: 'turn-secret-turn-secret' }), 'p', at);
    expect(turnOnly).toHaveLength(1);
    expect(turnOnly[0]?.urls).toEqual(['turn:t.example:3478']);
  });
});
