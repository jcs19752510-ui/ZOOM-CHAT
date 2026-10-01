import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomManager, type RoomEvent } from '../src/rooms/RoomManager';

let events: RoomEvent[];
let mgr: RoomManager;
const GRACE = 20_000;

function make(over: Partial<ConstructorParameters<typeof RoomManager>[0]> = {}): RoomManager {
  return new RoomManager({
    maxParticipants: 3,
    maxRooms: 2,
    emptyTtlMs: 10 * 60_000,
    graceMs: GRACE,
    onEvent: (e) => events.push(e),
    ...over,
  });
}
const newRoom = (): string => {
  const r = mgr.createRoom();
  if (!r.ok) throw new Error('create failed');
  return r.room.id;
};
const host = (roomId: string, nickname = '호스트') => {
  const r = mgr.join({ roomId, nickname, ipKey: 'ip-host', hostClaim: true, passwordOk: true });
  if (!r.ok) throw new Error(`host join failed ${r.code}`);
  return r.participant;
};
const guest = (roomId: string, nickname = '손님', ip = 'ip-g') => mgr.join({ roomId, nickname, ipKey: ip, hostClaim: false, passwordOk: true });

beforeEach(() => {
  vi.useFakeTimers();
  events = [];
  mgr = make();
});
afterEach(() => {
  mgr.dispose();
  vi.useRealTimers();
});

describe('방 입장·정원 (POL-01)', () => {
  it('TC-01 [FR-07,POL-01] 정원을 넘는 입장은 ROOM_FULL로 거부된다', () => {
    const id = newRoom();
    host(id);
    expect(guest(id, 'a').ok).toBe(true);
    expect(guest(id, 'b').ok).toBe(true);
    const r = guest(id, 'c');
    expect(r).toEqual({ ok: false, code: 'ROOM_FULL' });
  });
  it('TC-02 [POL-01,FR-20] 재접속 유예 중인 참가자도 정원을 차지한다', () => {
    const id = newRoom();
    host(id);
    const a = guest(id, 'a');
    guest(id, 'b');
    if (a.ok) mgr.disconnect(id, a.participant.id);
    expect(guest(id, 'c')).toEqual({ ok: false, code: 'ROOM_FULL' });
  });
  it('TC-03 [FR-23,POL-13] 호스트가 입장하기 전에는 다른 사람이 입장할 수 없다', () => {
    const id = newRoom();
    expect(guest(id)).toEqual({ ok: false, code: 'HOST_NOT_PRESENT' });
    expect(mgr.status(id).hostPresent).toBe(false);
    host(id);
    expect(mgr.status(id).hostPresent).toBe(true);
    expect(guest(id).ok).toBe(true);
  });
  it('TC-04 [FR-23,SEC-05] 호스트 클레임은 한 번만 유효하다(재사용해도 호스트가 되지 않는다)', () => {
    const id = newRoom();
    host(id);
    const second = mgr.join({ roomId: id, nickname: '가짜', ipKey: 'x', hostClaim: true, passwordOk: true });
    expect(second.ok && mgr.get(id)?.hostId === second.participant.id).toBe(false);
  });
  it('TC-05 [FR-06,POL-02] 없는 방 입장은 ROOM_NOT_FOUND', () => {
    expect(guest('A'.repeat(22))).toEqual({ ok: false, code: 'ROOM_NOT_FOUND' });
  });
  it('TC-06 [FR-05,SEC-02] 비밀번호 방은 검증 통과 없이 입장할 수 없다', () => {
    const r = mgr.createRoom('hash');
    if (!r.ok) throw new Error();
    host(r.room.id);
    expect(mgr.join({ roomId: r.room.id, nickname: 'a', ipKey: 'i', hostClaim: false, passwordOk: false })).toEqual({ ok: false, code: 'WRONG_PASSWORD' });
    expect(mgr.join({ roomId: r.room.id, nickname: 'a', ipKey: 'i', hostClaim: false, passwordOk: true }).ok).toBe(true);
  });
  it('TC-07 [POL-15,SEC-06] 서버 방 수 상한을 넘으면 SERVER_BUSY', () => {
    newRoom();
    newRoom();
    expect(mgr.createRoom()).toEqual({ ok: false, code: 'SERVER_BUSY' });
  });
});

describe('닉네임 (POL-04)', () => {
  it('TC-08 [FR-03,POL-04] 중복 닉네임에는 번호를 붙인다(대소문자 무시)', () => {
    const id = newRoom();
    host(id, 'Min');
    const a = guest(id, 'min');
    const b = guest(id, 'MIN');
    expect(a.ok && a.participant.nickname).toBe('min (2)');
    expect(b.ok && b.participant.nickname).toBe('MIN (3)');
  });
});

describe('호스트 승계 (FR-17, POL-05)', () => {
  it('TC-09 [FR-17] 호스트가 나가면 입장 순번이 가장 앞선 접속자가 승계한다', () => {
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a');
    guest(id, 'b');
    mgr.leave(id, h.id);
    expect(mgr.get(id)?.hostId).toBe(a.ok ? a.participant.id : '');
    expect(events.some((e) => e.type === 'hostChanged')).toBe(true);
  });
  it('TC-10 [FR-17,POL-05] 호스트가 끊기면 유예 동안 승계를 보류하고, 유예 후 승계한다', () => {
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a');
    mgr.disconnect(id, h.id);
    expect(mgr.get(id)?.hostId).toBe(h.id);
    vi.advanceTimersByTime(GRACE + 1);
    expect(mgr.get(id)?.hostId).toBe(a.ok ? a.participant.id : '');
  });
  it('TC-11 [FR-17,POL-05] 유예 안에 호스트가 복귀하면 호스트를 유지한다', () => {
    const id = newRoom();
    const h = host(id);
    guest(id, 'a');
    mgr.disconnect(id, h.id);
    vi.advanceTimersByTime(GRACE - 1000);
    expect(mgr.resume(id, h.id).ok).toBe(true);
    vi.advanceTimersByTime(GRACE * 2);
    expect(mgr.get(id)?.hostId).toBe(h.id);
  });
  it('TC-12 [FR-17,POL-05] 승계된 뒤 복귀한 원 호스트는 일반 참가자다', () => {
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a');
    mgr.leave(id, h.id);
    expect(mgr.resume(id, h.id)).toEqual({ ok: false, code: 'PARTICIPANT_GONE' });
    expect(mgr.get(id)?.hostId).toBe(a.ok ? a.participant.id : '');
  });
  it('TC-13 [FR-17,POL-05] 승계 뒤에도 잠금과 강퇴 목록이 유지된다', () => {
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a');
    const b = guest(id, 'b', 'ip-b');
    if (!a.ok || !b.ok) throw new Error();
    mgr.setLocked(id, h.id, true);
    mgr.kick(id, h.id, b.participant.id);
    mgr.leave(id, h.id);
    expect(mgr.get(id)?.locked).toBe(true);
    expect(guest(id, 'b2', 'ip-b')).toEqual({ ok: false, code: 'KICKED' });
  });
});

describe('방 수명 (FR-18, POL-02)', () => {
  it('TC-14 [FR-18] 마지막 참가자가 나가면 방이 즉시 삭제된다', () => {
    const id = newRoom();
    const h = host(id);
    mgr.leave(id, h.id);
    expect(mgr.get(id)).toBeUndefined();
  });
  it('TC-15 [FR-18] 생성 후 아무도 입장하지 않으면 TTL 뒤 삭제된다', () => {
    const id = newRoom();
    vi.advanceTimersByTime(10 * 60_000 - 1);
    expect(mgr.get(id)).toBeDefined();
    vi.advanceTimersByTime(2);
    expect(mgr.get(id)).toBeUndefined();
  });
  it('TC-16 [FR-18,POL-02] 유예 중인 참가자만 남으면 유예가 끝날 때 방이 삭제된다', () => {
    const id = newRoom();
    const h = host(id);
    mgr.disconnect(id, h.id);
    expect(mgr.get(id)).toBeDefined();
    vi.advanceTimersByTime(GRACE + 1);
    expect(mgr.get(id)).toBeUndefined();
  });
  it('TC-17 [FR-18] 호스트 입장 후에는 빈 방 TTL 타이머가 취소된다', () => {
    const id = newRoom();
    host(id);
    vi.advanceTimersByTime(11 * 60_000);
    expect(mgr.get(id)).toBeDefined();
  });
});

describe('호스트 기능 권한 (FR-14~16, SEC-05)', () => {
  it('TC-18 [FR-14,SEC-05] 비호스트의 방 잠금은 FORBIDDEN', () => {
    const id = newRoom();
    host(id);
    const a = guest(id, 'a');
    if (!a.ok) throw new Error();
    expect(mgr.setLocked(id, a.participant.id, true)).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(mgr.get(id)?.locked).toBe(false);
  });
  it('TC-19 [FR-14,POL-03] 잠긴 방은 신규 입장을 거부하고 유예 중 재접속은 허용한다', () => {
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a');
    if (!a.ok) throw new Error();
    mgr.disconnect(id, a.participant.id);
    mgr.setLocked(id, h.id, true);
    expect(guest(id, 'b')).toEqual({ ok: false, code: 'ROOM_LOCKED' });
    expect(mgr.resume(id, a.participant.id).ok).toBe(true);
    mgr.setLocked(id, h.id, false);
    expect(guest(id, 'c').ok).toBe(true);
  });
  it('TC-20 [FR-15,SEC-05] 비호스트의 강퇴는 FORBIDDEN, 호스트 자신 강퇴는 불가', () => {
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a');
    if (!a.ok) throw new Error();
    expect(mgr.kick(id, a.participant.id, h.id)).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(mgr.kick(id, h.id, h.id)).toEqual({ ok: false, code: 'CANNOT_KICK_SELF' });
    expect(mgr.kick(id, h.id, 'nonexistent')).toEqual({ ok: false, code: 'TARGET_NOT_FOUND' });
  });
  it('TC-21 [FR-15,POL-06] 강퇴된 사람은 같은 네트워크로 재입장할 수 없다', () => {
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a', 'ip-a');
    if (!a.ok) throw new Error();
    expect(mgr.kick(id, h.id, a.participant.id)).toEqual({ ok: true });
    expect(mgr.isMember(id, a.participant.id)).toBe(false);
    expect(guest(id, 'a', 'ip-a')).toEqual({ ok: false, code: 'KICKED' });
    expect(mgr.resume(id, a.participant.id)).toEqual({ ok: false, code: 'PARTICIPANT_GONE' });
  });
  it('TC-22 [FR-16,POL-05] 전체 음소거는 호스트를 제외한 참가자의 마이크만 끈다', () => {
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a');
    expect(mgr.muteAll(id, h.id)).toEqual({ ok: true });
    expect(mgr.get(id)?.participants.get(h.id)?.audio).toBe(true);
    expect(a.ok && mgr.get(id)?.participants.get(a.participant.id)?.audio).toBe(false);
    if (a.ok) expect(mgr.muteAll(id, a.participant.id)).toEqual({ ok: false, code: 'FORBIDDEN' });
  });
});

describe('화면공유 (FR-12, POL-12)', () => {
  it('TC-23 [FR-12,POL-12] 방당 동시 1명만 화면공유할 수 있다', () => {
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a');
    if (!a.ok) throw new Error();
    expect(mgr.startScreen(id, h.id)).toEqual({ ok: true });
    expect(mgr.startScreen(id, a.participant.id)).toEqual({ ok: false, code: 'SCREEN_BUSY' });
    mgr.stopScreen(id, h.id);
    expect(mgr.startScreen(id, a.participant.id)).toEqual({ ok: true });
  });
  it('TC-24 [FR-12,POL-12] 공유자가 나가면 공유가 즉시 해제된다', () => {
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a');
    if (!a.ok) throw new Error();
    mgr.startScreen(id, a.participant.id);
    mgr.leave(id, a.participant.id);
    expect(mgr.get(id)?.screenSharerId).toBeNull();
    expect(mgr.startScreen(id, h.id)).toEqual({ ok: true });
  });
});
