import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { newParticipantId, newRoomId } from '../src/security/ids';
import { hashPassword, verifyPassword } from '../src/security/password';
import { AttemptLimiter, TokenBucket } from '../src/security/rateLimit';
import { signToken, verifyToken } from '../src/security/token';
import { buildIceServers } from '../src/security/turn';
import { ipKey } from '../src/security/ipKey';
import { SECRET, makeConfig } from './helpers';

describe('토큰 (SEC-03)', () => {
  const now = 1_000_000;
  it('TC-130 [SEC-03] 서명·만료·종류를 모두 검증한다', () => {
    const t = signToken({ t: 's', rid: 'r', pid: 'p', exp: now + 1000 }, SECRET);
    expect(verifyToken(t, SECRET, now)).toMatchObject({ t: 's', rid: 'r', pid: 'p' });
    expect(verifyToken(t, SECRET, now + 1001)).toBeNull(); // 만료
    expect(verifyToken(t, `${SECRET}x`, now)).toBeNull(); // 다른 비밀
    const [body] = t.split('.');
    const evil = Buffer.from(JSON.stringify({ t: 's', rid: 'r', pid: 'admin', exp: now + 1000 })).toString('base64url');
    expect(verifyToken(`${evil}.${t.split('.')[1]}`, SECRET, now)).toBeNull(); // 본문 변조
    expect(verifyToken(`${body}`, SECRET, now)).toBeNull();
    expect(verifyToken('', SECRET, now)).toBeNull();
  });
});

describe('TURN 임시 자격증명 (SEC-09)', () => {
  it('TC-131 [SEC-09] username=만료:참가자, credential=HMAC-SHA1(base64), 만료=now+TTL', () => {
    const cfg = makeConfig({ TURN_URLS: 'turn:t.example:3478,turns:t.example:5349', TURN_SECRET: 'turn-secret-turn-secret', TURN_TTL_SEC: '3600' });
    const now = 1_700_000_000_000;
    const [stun, turn] = buildIceServers(cfg, 'pid123456', now);
    expect(stun?.username).toBeUndefined();
    expect(turn?.urls).toEqual(['turn:t.example:3478', 'turns:t.example:5349']);
    expect(turn?.username).toBe(`${1_700_003_600}:pid123456`);
    expect(turn?.credential).toBe(createHmac('sha1', 'turn-secret-turn-secret').update(turn?.username ?? '').digest('base64'));
  });
  it('TC-132 [SEC-09] TURN을 설정하지 않으면 자격증명이 만들어지지 않는다(고정 비밀번호 없음)', () => {
    const servers = buildIceServers(makeConfig(), 'pid', Date.now());
    expect(servers).toHaveLength(1);
    expect(JSON.stringify(servers)).not.toMatch(/credential|username/);
  });
});

describe('비밀번호 해시 (SEC-02)', () => {
  it('TC-133 [SEC-02] 같은 비밀번호도 매번 다른 bcrypt 해시이고 검증은 정확하다', async () => {
    const a = await hashPassword('비밀번호-1234');
    const b = await hashPassword('비밀번호-1234');
    expect(a).not.toBe(b);
    expect(await verifyPassword('비밀번호-1234', a)).toBe(true);
    expect(await verifyPassword('비밀번호-1235', a)).toBe(false);
  });
  it('TC-134 [SEC-02] 72바이트를 넘는 긴 한글 비밀번호도 끝부분까지 검증한다(잘림 방지)', async () => {
    const base = '가'.repeat(30);
    const h = await hashPassword(`${base}A`);
    expect(await verifyPassword(`${base}A`, h)).toBe(true);
    expect(await verifyPassword(`${base}B`, h)).toBe(false);
  });
});

describe('속도 제한 (SEC-06)', () => {
  it('TC-135 [SEC-06] 토큰 버킷은 용량까지 허용하고 시간이 지나면 보충된다', () => {
    let t = 0;
    const b = new TokenBucket(3, 1, () => t);
    expect([b.take(), b.take(), b.take(), b.take()]).toEqual([true, true, true, false]);
    t += 1000;
    expect(b.take()).toBe(true);
    expect(b.take()).toBe(false);
  });
  it('TC-136 [SEC-02,POL-11] 오답 5회/10분이면 10분간 차단, 성공하면 초기화', () => {
    let t = 0;
    const l = new AttemptLimiter(5, 600_000, 600_000, () => t);
    for (let i = 0; i < 4; i++) l.recordFailure('k');
    expect(l.isBlocked('k')).toBe(false);
    l.recordFailure('k');
    expect(l.isBlocked('k')).toBe(true);
    t += 599_000;
    expect(l.isBlocked('k')).toBe(true);
    t += 2000;
    expect(l.isBlocked('k')).toBe(false);
    l.recordFailure('x');
    l.recordSuccess('x');
    for (let i = 0; i < 4; i++) l.recordFailure('x');
    expect(l.isBlocked('x')).toBe(false);
  });
});

describe('식별자 (SEC-01, SEC-04)', () => {
  it('TC-137 [SEC-01] 방 ID는 base64url 22자(128비트)이며 중복되지 않는다', () => {
    const ids = new Set(Array.from({ length: 2000 }, newRoomId));
    expect(ids.size).toBe(2000);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });
  it('TC-138 [SEC-04] 참가자 ID는 서버가 만든 12자 난수이다', () => {
    expect(newParticipantId()).toMatch(/^[A-Za-z0-9_-]{12}$/);
  });
  it('TC-139 [POL-06] 차단 키는 IP 원문을 담지 않고 비밀값에 의존한다', () => {
    const k = ipKey('203.0.113.7', SECRET);
    expect(k).not.toContain('203');
    expect(k).toHaveLength(22);
    expect(ipKey('203.0.113.7', 'other-secret-other-secret-other-1')).not.toBe(k);
  });
});
