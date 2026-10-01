import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomManager, type RoomEvent } from '../src/rooms/RoomManager';

// unit-04(방 도메인) 6단계 소급 보강 시험. 제품 코드는 건드리지 않는다.

const GRACE = 20_000;
let events: RoomEvent[];
let mgr: RoomManager;

function make(over: Partial<ConstructorParameters<typeof RoomManager>[0]> = {}): RoomManager {
  return new RoomManager({ maxParticipants: 4, maxRooms: 3, emptyTtlMs: 10 * 60_000, graceMs: GRACE, onEvent: (e) => events.push(e), ...over });
}
const newRoom = (password?: string): string => {
  const r = mgr.createRoom(password);
  if (!r.ok) throw new Error('create failed');
  return r.room.id;
};
const host = (roomId: string, nickname = '호스트') => {
  const r = mgr.join({ roomId, nickname, ipKey: 'ip-host', hostClaim: true, passwordOk: true });
  if (!r.ok) throw new Error(`host join failed ${r.code}`);
  return r.participant;
};
const guest = (roomId: string, nickname: string, ip = `ip-${nickname}`) => {
  const r = mgr.join({ roomId, nickname, ipKey: ip, hostClaim: false, passwordOk: true });
  if (!r.ok) throw new Error(`guest join failed ${r.code}`);
  return r.participant;
};
const of = (type: RoomEvent['type']): RoomEvent[] => events.filter((e) => e.type === type);

beforeEach(() => {
  vi.useFakeTimers();
  events = [];
  mgr = make();
});
afterEach(() => {
  mgr.dispose();
  vi.useRealTimers();
});

describe('unit-04 적대·경계 시험', () => {
  it('TC-434 [FR-06,POL-01,NFR-04] 정원 경계: full 플래그는 정확히 정원일 때만 true, 정원 2(설정 최소)에서도 3번째는 ROOM_FULL, 자리가 나면 다시 입장 가능, joinSeq는 성공한 입장에서만 증가한다', () => {
    mgr.dispose();
    mgr = make({ maxParticipants: 2 });
    const id = newRoom();
    expect(mgr.status(id)).toMatchObject({ full: false, hostPresent: false, exists: true });
    const h = host(id);
    expect(mgr.status(id).full).toBe(false);
    const a = guest(id, 'a');
    expect(mgr.status(id).full).toBe(true);
    for (let i = 0; i < 5; i++) expect(mgr.join({ roomId: id, nickname: `x${i}`, ipKey: `ip-x${i}`, hostClaim: false, passwordOk: true })).toEqual({ ok: false, code: 'ROOM_FULL' });
    mgr.leave(id, a.id);
    expect(mgr.status(id).full).toBe(false);
    const b = guest(id, 'b');
    // 거부된 입장 시도(5번)는 joinSeq를 소모하지 않는다: 호스트 1, a 2, b 3
    expect([h.joinSeq, a.joinSeq, b.joinSeq]).toEqual([1, 2, 3]);
    expect(mgr.status('Z'.repeat(22))).toEqual({ v: 1, exists: false, locked: false, needsPassword: false, full: false, hostPresent: false });
  });

  it('TC-434b [POL-01,FR-07] 정원 6(운영 기본)에서 6명까지만 입장하고 병렬로 쏟아지는 입장 시도에서도 초과하지 않는다', () => {
    mgr.dispose();
    mgr = make({ maxParticipants: 6 });
    const id = newRoom();
    host(id);
    let ok = 0;
    let full = 0;
    for (let i = 0; i < 30; i++) {
      const r = mgr.join({ roomId: id, nickname: `g${i}`, ipKey: `ip${i}`, hostClaim: false, passwordOk: true });
      if (r.ok) ok++;
      else if (r.code === 'ROOM_FULL') full++;
    }
    expect([ok, full]).toEqual([5, 25]);
    expect(mgr.get(id)?.participants.size).toBe(6);
    expect(mgr.participantsOf(id)).toHaveLength(6);
  });

  it('TC-435 [FR-17,POL-05] 호스트 승계: 유예 중(끊긴) 참가자는 건너뛰고 접속 중인 가장 앞선 참가자가 승계한다, 승계 알림은 1회', () => {
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a');
    const b = guest(id, 'b');
    mgr.disconnect(id, a.id); // a는 유예 중
    mgr.leave(id, h.id);
    expect(mgr.get(id)?.hostId).toBe(b.id);
    expect(of('hostChanged')).toEqual([{ type: 'hostChanged', roomId: id, hostId: b.id }]);
    // 이후 a가 돌아와도 호스트는 b
    mgr.resume(id, a.id);
    expect(mgr.get(id)?.hostId).toBe(b.id);
    expect(of('hostChanged')).toHaveLength(1);
  });

  it('TC-435b [FR-17,FR-20] 남은 사람이 모두 끊긴 상태에서 호스트가 나가면 호스트 공석, 첫 복귀자가 호스트가 된다(승계 알림 포함)', () => {
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a');
    const b = guest(id, 'b');
    mgr.disconnect(id, a.id);
    mgr.disconnect(id, b.id);
    mgr.leave(id, h.id);
    expect(mgr.get(id)?.hostId).toBeNull();
    expect(of('hostChanged')).toHaveLength(0);
    expect(mgr.resume(id, b.id).ok).toBe(true);
    expect(mgr.get(id)?.hostId).toBe(b.id); // a가 먼저 입장했지만 접속 중인 b가 승계
    expect(of('hostChanged')).toEqual([{ type: 'hostChanged', roomId: id, hostId: b.id }]);
    expect(mgr.status(id).hostPresent).toBe(true);
  });

  it('TC-436 [POL-08,FR-20] 끊김·복귀의 이벤트와 유예 시간: 중복 disconnect는 이벤트·유예를 늘리지 않고, 복귀는 connected 이벤트 1회, 이미 접속 중인 resume은 이벤트 없음', () => {
    const id = newRoom();
    host(id);
    const a = guest(id, 'a');
    mgr.disconnect(id, a.id);
    vi.advanceTimersByTime(GRACE - 1000);
    mgr.disconnect(id, a.id); // 두 번째 끊김 보고: 무시되어야 함
    expect(events.filter((e) => e.type === 'participantUpdated' && 'connection' in e.patch && e.patch.connection === 'reconnecting')).toHaveLength(1);
    vi.advanceTimersByTime(1001); // 처음 끊긴 시점 + GRACE 경과
    expect(mgr.isMember(id, a.id)).toBe(false);
    expect(of('participantLeft')).toEqual([{ type: 'participantLeft', roomId: id, id: a.id, reason: 'timeout' }]);

    const c = guest(id, 'c');
    events.length = 0;
    expect(mgr.resume(id, c.id).ok).toBe(true); // 이미 접속 중
    expect(events).toHaveLength(0);
    mgr.disconnect(id, c.id);
    events.length = 0;
    mgr.resume(id, c.id);
    expect(events).toEqual([{ type: 'participantUpdated', roomId: id, id: c.id, patch: { connection: 'connected' } }]);
    vi.advanceTimersByTime(GRACE * 3); // 복귀 후에는 유예 타이머가 남아 있지 않다
    expect(mgr.isMember(id, c.id)).toBe(true);
  });

  it('TC-436b [FR-20] 알 수 없는 방·참가자에 대한 끊김/복귀/퇴장은 예외 없이 안전하게 처리된다', () => {
    const id = newRoom();
    host(id);
    expect(() => mgr.disconnect('nope', 'x')).not.toThrow();
    expect(() => mgr.disconnect(id, 'ghost')).not.toThrow();
    expect(() => mgr.leave('nope', 'x')).not.toThrow();
    expect(() => mgr.leave(id, 'ghost')).not.toThrow();
    expect(mgr.resume('nope', 'x')).toEqual({ ok: false, code: 'ROOM_NOT_FOUND' });
    expect(mgr.resume(id, 'ghost')).toEqual({ ok: false, code: 'PARTICIPANT_GONE' });
    expect(mgr.setMedia(id, 'ghost', { audio: false, video: false })).toEqual({ ok: false, code: 'PARTICIPANT_GONE' });
    expect(mgr.setMedia('nope', 'ghost', { audio: false, video: false })).toEqual({ ok: false, code: 'PARTICIPANT_GONE' });
    expect(mgr.startScreen(id, 'ghost')).toEqual({ ok: false, code: 'PARTICIPANT_GONE' });
    expect(mgr.stopScreen('nope', 'ghost')).toEqual({ ok: false, code: 'PARTICIPANT_GONE' });
    expect(events.filter((e) => e.type !== 'participantJoined')).toHaveLength(0);
  });

  it('TC-437 [FR-15,POL-06,SEC-05] 강퇴 상세: 이벤트 순서(퇴장 후 kick), 유예 중 강퇴 시 타이머가 남지 않아 나중에 timeout 퇴장이 또 나오지 않음, 같은 네트워크는 닉네임을 바꿔도 거부, 다른 네트워크는 허용', () => {
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a', 'ip-a');
    mgr.disconnect(id, a.id); // 유예 중인 참가자를 강퇴
    events.length = 0;
    expect(mgr.kick(id, h.id, a.id)).toEqual({ ok: true });
    expect(events.map((e) => e.type)).toEqual(['participantLeft', 'kick']);
    expect(events[0]).toMatchObject({ reason: 'kicked', id: a.id });
    expect(events[1]).toMatchObject({ id: a.id });
    events.length = 0;
    vi.advanceTimersByTime(GRACE * 2);
    expect(events).toHaveLength(0);
    for (const nick of ['a', 'z', '다른이름']) {
      expect(mgr.join({ roomId: id, nickname: nick, ipKey: 'ip-a', hostClaim: false, passwordOk: true }), nick).toEqual({ ok: false, code: 'KICKED' });
    }
    expect(mgr.join({ roomId: id, nickname: 'a', ipKey: 'ip-other', hostClaim: false, passwordOk: true }).ok).toBe(true);
    expect(mgr.kick('nope', h.id, a.id)).toEqual({ ok: false, code: 'ROOM_NOT_FOUND' });
    expect(mgr.participantsOf(id).map((p) => p.nickname)).not.toContain('a (2)');
  });

  it('TC-437b [FR-15,SEC-05] 강퇴 기록은 방이 사라지면 함께 사라지고(새 방은 깨끗), 호스트가 아닌 사람은 강퇴·잠금·음소거 어느 것도 못 하며 상태가 변하지 않는다', () => {
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a', 'ip-a');
    const b = guest(id, 'b', 'ip-b');
    events.length = 0;
    expect(mgr.kick(id, a.id, b.id)).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(mgr.setLocked(id, a.id, true)).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(mgr.muteAll(id, a.id)).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(mgr.kick(id, 'ghost', b.id)).toEqual({ ok: false, code: 'FORBIDDEN' });
    expect(events).toHaveLength(0);
    expect(mgr.get(id)?.locked).toBe(false);
    expect(mgr.isMember(id, b.id)).toBe(true);
    mgr.kick(id, h.id, a.id);
    mgr.leave(id, h.id);
    mgr.leave(id, b.id); // 방 삭제
    expect(mgr.get(id)).toBeUndefined();
    const id2 = newRoom();
    host(id2);
    expect(mgr.join({ roomId: id2, nickname: 'a', ipKey: 'ip-a', hostClaim: false, passwordOk: true }).ok).toBe(true);
    expect(mgr.kick('nope', h.id, a.id)).toEqual({ ok: false, code: 'ROOM_NOT_FOUND' });
    expect(mgr.setLocked('nope', h.id, true)).toEqual({ ok: false, code: 'ROOM_NOT_FOUND' });
    expect(mgr.muteAll('nope', h.id)).toEqual({ ok: false, code: 'ROOM_NOT_FOUND' });
  });

  it('TC-438 [FR-14,POL-03] 잠금: 같은 값 반복 설정은 이벤트를 만들지 않고, 변경 때만 locked 이벤트, 호스트 승계 후 새 호스트만 해제할 수 있다', () => {
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a');
    events.length = 0;
    mgr.setLocked(id, h.id, false); // 이미 잠기지 않음
    expect(events).toHaveLength(0);
    mgr.setLocked(id, h.id, true);
    mgr.setLocked(id, h.id, true);
    expect(of('locked')).toEqual([{ type: 'locked', roomId: id, locked: true }]);
    mgr.leave(id, h.id);
    expect(mgr.get(id)?.locked).toBe(true);
    expect(mgr.setLocked(id, h.id, false)).toEqual({ ok: false, code: 'FORBIDDEN' }); // 퇴장한 옛 호스트
    expect(mgr.setLocked(id, a.id, false)).toEqual({ ok: true });
    expect(of('locked')).toHaveLength(2);
  });

  it('TC-438b [POL-13,FR-23,SEC-05] 호스트 클레임: 클레임 없는 입장은 호스트 첫 입장 전에는 항상 거부, 호스트가 한 번 입장한 뒤에는 호스트가 나가도 "호스트 입장 전" 상태로 돌아가지 않는다', () => {
    const id = newRoom();
    for (let i = 0; i < 3; i++) expect(mgr.join({ roomId: id, nickname: `g${i}`, ipKey: 'ip', hostClaim: false, passwordOk: true })).toEqual({ ok: false, code: 'HOST_NOT_PRESENT' });
    expect(mgr.participantsOf(id)).toHaveLength(0);
    const h = host(id);
    const a = guest(id, 'a');
    mgr.leave(id, h.id);
    expect(mgr.status(id).hostPresent).toBe(true);
    expect(mgr.join({ roomId: id, nickname: 'b', ipKey: 'ip-b', hostClaim: false, passwordOk: true }).ok).toBe(true);
    // 클레임을 다시 내밀어도 호스트가 되지 않고 일반 입장 규칙(잠금)을 따른다
    mgr.setLocked(id, a.id, true);
    expect(mgr.join({ roomId: id, nickname: 'evil', ipKey: 'ip-evil', hostClaim: true, passwordOk: true })).toEqual({ ok: false, code: 'ROOM_LOCKED' });
    expect(mgr.get(id)?.hostId).toBe(a.id);
  });

  it('TC-438c [FR-05,SEC-02] 비밀번호 방: 호스트 클레임 입장은 검증을 요구하지 않고, 게스트는 검증 실패 시 정원이 남아도 거부, 검증 통과 시 입장', () => {
    const id = newRoom('hash-value');
    expect(mgr.status(id).needsPassword).toBe(true);
    host(id); // hostClaim=true, passwordOk=true(소켓 계층이 클레임이면 true로 전달)
    expect(mgr.join({ roomId: id, nickname: 'a', ipKey: 'ip', hostClaim: false, passwordOk: false })).toEqual({ ok: false, code: 'WRONG_PASSWORD' });
    expect(mgr.join({ roomId: id, nickname: 'a', ipKey: 'ip', hostClaim: false, passwordOk: true }).ok).toBe(true);
    // 비밀번호가 없는 방은 passwordOk 값과 무관하다
    mgr.dispose();
    mgr = make();
    const open = newRoom();
    host(open);
    expect(mgr.status(open).needsPassword).toBe(false);
    expect(mgr.join({ roomId: open, nickname: 'a', ipKey: 'ip', hostClaim: false, passwordOk: false }).ok).toBe(true);
  });

  it('TC-439 [FR-08,POL-12] 미디어·화면공유 상태: 무변화는 이벤트 없음, 변화는 patch만 전달, SCREEN_BUSY는 기존 공유자를 바꾸지 않고, 공유자 아닌 사람의 중지 요청은 공유를 끊지 못한다', () => {
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a');
    events.length = 0;
    expect(mgr.setMedia(id, a.id, { audio: true, video: true })).toEqual({ ok: true });
    expect(events).toHaveLength(0);
    mgr.setMedia(id, a.id, { audio: false, video: true });
    expect(events).toEqual([{ type: 'participantUpdated', roomId: id, id: a.id, patch: { audio: false, video: true } }]);

    events.length = 0;
    expect(mgr.startScreen(id, a.id)).toEqual({ ok: true });
    expect(mgr.startScreen(id, a.id)).toEqual({ ok: true }); // 멱등
    expect(events).toHaveLength(1);
    expect(mgr.startScreen(id, h.id)).toEqual({ ok: false, code: 'SCREEN_BUSY' });
    expect(mgr.get(id)?.screenSharerId).toBe(a.id);
    expect(mgr.stopScreen(id, h.id)).toEqual({ ok: true }); // 공유자가 아님
    expect(mgr.get(id)?.screenSharerId).toBe(a.id);
    expect(mgr.get(id)?.participants.get(a.id)?.screen).toBe(true);
    expect(mgr.get(id)?.participants.get(h.id)?.screen).toBe(false);
    events.length = 0;
    expect(mgr.stopScreen(id, a.id)).toEqual({ ok: true });
    expect(events).toEqual([{ type: 'participantUpdated', roomId: id, id: a.id, patch: { screen: false } }]);
    expect(mgr.stopScreen(id, a.id)).toEqual({ ok: true }); // 이미 중지: 이벤트 없음
    expect(events).toHaveLength(1);
  });

  it('TC-439b [FR-16,POL-05] 전체 음소거: 호스트 마이크는 유지, 이미 꺼진 사람에게는 개별 이벤트가 없고, 영상 상태는 건드리지 않으며, 각자 다시 켤 수 있다', () => {
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a');
    const b = guest(id, 'b');
    mgr.setMedia(id, b.id, { audio: false, video: false });
    events.length = 0;
    expect(mgr.muteAll(id, h.id)).toEqual({ ok: true });
    expect(events).toEqual([
      { type: 'participantUpdated', roomId: id, id: a.id, patch: { audio: false } },
      { type: 'muteAll', roomId: id, by: h.id },
    ]);
    const room = mgr.get(id);
    expect(room?.participants.get(h.id)).toMatchObject({ audio: true, video: true });
    expect(room?.participants.get(a.id)).toMatchObject({ audio: false, video: true });
    expect(mgr.setMedia(id, a.id, { audio: true, video: true })).toEqual({ ok: true });
    expect(mgr.get(id)?.participants.get(a.id)?.audio).toBe(true);
  });

  it('TC-440 [FR-18,POL-02] 방 정리: 마지막 퇴장·유예 만료·강퇴 뒤에 남는 타이머가 없고, 정리된 방은 입장·재접속이 거부되며 방 수 상한 자리가 반환된다', () => {
    const baseline = vi.getTimerCount();
    const id = newRoom();
    const h = host(id);
    const a = guest(id, 'a');
    const b = guest(id, 'b');
    mgr.disconnect(id, a.id);
    mgr.disconnect(id, b.id);
    mgr.leave(id, h.id); // 유예 중인 둘만 남음 -> 방은 아직 있음
    expect(mgr.get(id)).toBeDefined();
    vi.advanceTimersByTime(GRACE + 1); // 둘 다 timeout 퇴장 -> 방 삭제
    expect(of('participantLeft').filter((e) => 'reason' in e && e.reason === 'timeout')).toHaveLength(2);
    expect(mgr.get(id)).toBeUndefined();
    expect(vi.getTimerCount()).toBe(baseline);
    expect(mgr.join({ roomId: id, nickname: 'late', ipKey: 'ip', hostClaim: false, passwordOk: true })).toEqual({ ok: false, code: 'ROOM_NOT_FOUND' });
    expect(mgr.resume(id, a.id)).toEqual({ ok: false, code: 'ROOM_NOT_FOUND' });

    // 유예 중인 사람이 있는 방에서 마지막 접속자가 나가면 방이 지워지고 남은 유예 타이머도 정리된다
    const id2 = newRoom();
    const h2 = host(id2);
    const c = guest(id2, 'c');
    mgr.disconnect(id2, c.id);
    mgr.kick(id2, h2.id, c.id); // 유예 타이머 정리(강퇴)
    expect(vi.getTimerCount()).toBe(baseline); // 빈 방 타이머는 이미 해제됨, 방 안 타이머 없음 -> 방은 h2만
    mgr.leave(id2, h2.id);
    expect(mgr.get(id2)).toBeUndefined();
    expect(vi.getTimerCount()).toBe(baseline);

    // 방 수 상한(3) 자리 반환
    const ids = [newRoom(), newRoom(), newRoom()];
    expect(mgr.createRoom()).toEqual({ ok: false, code: 'SERVER_BUSY' });
    vi.advanceTimersByTime(10 * 60_000 + 1);
    expect(ids.every((x) => mgr.get(x) === undefined)).toBe(true);
    expect(mgr.size).toBe(0);
    expect(mgr.createRoom().ok).toBe(true);
    expect(new Set([id, id2, ...ids]).size).toBe(5); // 방 ID는 재사용되지 않는다

    // 운영자 폐쇄(unit-16 경로) 뒤에도 유예 타이머가 남지 않는다: 방 삭제는 방 안 타이머를 모두 정리해야 한다
    mgr.dispose(); // 위에서 만든 방과 타이머를 모두 비운다
    expect(vi.getTimerCount()).toBe(baseline);
    const id3 = newRoom();
    const h3 = host(id3);
    const d = guest(id3, 'd');
    mgr.disconnect(id3, d.id);
    expect(vi.getTimerCount()).toBe(baseline + 1);
    expect(mgr.closeByOperator(id3)).toEqual({ ok: true, participants: 2 });
    expect(mgr.get(id3)).toBeUndefined();
    expect(vi.getTimerCount()).toBe(baseline);
    expect(mgr.isMember(id3, h3.id)).toBe(false);
  });

  it('TC-440b [POL-04,FR-03] 중복 닉네임: 번호는 비어 있는 가장 작은 번호부터(퇴장 후 재사용), 유니코드 정규화·대소문자 차이도 같은 이름으로 취급', () => {
    mgr.dispose();
    mgr = make({ maxParticipants: 10 });
    const id = newRoom();
    host(id, 'Anna');
    const a2 = guest(id, 'anna'); // Anna (대소문자 무시)
    const a3 = guest(id, 'ANNA');
    expect([a2.nickname, a3.nickname]).toEqual(['anna (2)', 'ANNA (3)']);
    mgr.leave(id, a2.id);
    const a4 = guest(id, 'anna');
    expect(a4.nickname).toBe('anna (2)'); // 비어 있는 2번 재사용
    // 분해된 한글도 같은 이름으로 취급
    const k1 = guest(id, '한글');
    const k2 = guest(id, '한글'.normalize('NFD'));
    expect(k1.nickname).toBe('한글');
    expect(k2.nickname).toBe(`${'한글'.normalize('NFD')} (2)`);
  });

  it('TC-440c [SEC-04] 참가자 ID는 서버가 부여하며 입장 입력(닉네임·IP 키)과 무관한 난수이고 방 안에서 유일하다', () => {
    mgr.dispose();
    mgr = make({ maxParticipants: 12, maxRooms: 100 });
    const ids = new Set<string>();
    for (let r = 0; r < 20; r++) {
      const id = newRoom();
      ids.add(host(id, 'same').id);
      for (let i = 0; i < 5; i++) ids.add(guest(id, 'same', 'same-ip').id);
    }
    expect(ids.size).toBe(20 * 6);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{12}$/);
  });
});
