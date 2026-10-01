import { nicknameKey, type ConnectionState, type ErrorCode, type PublicParticipant, type RoomStatusResponse } from '@meetlite/shared';
import { newParticipantId, newRoomId } from '../security/ids';

export interface Participant {
  id: string;
  nickname: string;
  joinSeq: number;
  ipKey: string;
  audio: boolean;
  video: boolean;
  screen: boolean;
  connected: boolean;
  graceTimer?: NodeJS.Timeout;
}

export interface Room {
  id: string;
  passwordHash?: string;
  locked: boolean;
  hostId: string | null;
  /** 방 생성자(호스트)가 한 번이라도 입장했는가. false인 동안 다른 사람은 입장할 수 없다(POL-13). */
  hostClaimUsed: boolean;
  screenSharerId: string | null;
  nextSeq: number;
  participants: Map<string, Participant>;
  banned: { ids: Set<string>; ipKeys: Set<string> };
  emptyTimer?: NodeJS.Timeout;
}

export type RoomEvent =
  | { type: 'participantJoined'; roomId: string; participant: PublicParticipant }
  | { type: 'participantLeft'; roomId: string; id: string; reason: 'left' | 'timeout' | 'kicked' }
  | { type: 'participantUpdated'; roomId: string; id: string; patch: { audio?: boolean; video?: boolean; screen?: boolean; connection?: ConnectionState } }
  | { type: 'hostChanged'; roomId: string; hostId: string }
  | { type: 'locked'; roomId: string; locked: boolean }
  | { type: 'kick'; roomId: string; id: string }
  | { type: 'muteAll'; roomId: string; by: string };

export interface RoomManagerOptions {
  maxParticipants: number;
  maxRooms: number;
  emptyTtlMs: number;
  graceMs: number;
  onEvent: (event: RoomEvent) => void;
}

export type Result<T> = ({ ok: true } & T) | { ok: false; code: ErrorCode };
const fail = (code: ErrorCode): { ok: false; code: ErrorCode } => ({ ok: false, code });

export interface JoinInput {
  roomId: string;
  nickname: string; // normalizeNickname 통과 값
  ipKey: string;
  /** 서명 검증을 통과한 방 생성자 토큰을 가졌는가 */
  hostClaim: boolean;
  /** 비밀번호 방이면 검증을 통과했는가(방에 비밀번호가 없으면 무시) */
  passwordOk: boolean;
}

/**
 * 방 도메인 로직. 소켓·HTTP를 모르며 모든 변경은 동기 함수 안에서 끝난다(정원 경쟁 방지, POL-01).
 * 결과 알림은 onEvent로만 내보낸다.
 */
export class RoomManager {
  private rooms = new Map<string, Room>();
  constructor(private readonly opts: RoomManagerOptions) {}

  get size(): number {
    return this.rooms.size;
  }

  get(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  createRoom(passwordHash?: string): Result<{ room: Room }> {
    if (this.rooms.size >= this.opts.maxRooms) return fail('SERVER_BUSY');
    let id = newRoomId();
    while (this.rooms.has(id)) id = newRoomId();
    const room: Room = {
      id,
      ...(passwordHash ? { passwordHash } : {}),
      locked: false,
      hostId: null,
      hostClaimUsed: false,
      screenSharerId: null,
      nextSeq: 1,
      participants: new Map(),
      banned: { ids: new Set(), ipKeys: new Set() },
    };
    this.rooms.set(id, room);
    this.armEmptyTimer(room);
    return { ok: true, room };
  }

  status(roomId: string): RoomStatusResponse {
    const room = this.rooms.get(roomId);
    if (!room) return { v: 1, exists: false, locked: false, needsPassword: false, full: false, hostPresent: false };
    return {
      v: 1,
      exists: true,
      locked: room.locked,
      needsPassword: !!room.passwordHash,
      full: room.participants.size >= this.opts.maxParticipants,
      hostPresent: room.hostClaimUsed,
    };
  }

  publicParticipant(room: Room, p: Participant): PublicParticipant {
    return {
      id: p.id,
      nickname: p.nickname,
      isHost: room.hostId === p.id,
      audio: p.audio,
      video: p.video,
      screen: p.screen,
      connection: p.connected ? 'connected' : 'reconnecting',
      joinSeq: p.joinSeq,
    };
  }

  participantsOf(roomId: string): PublicParticipant[] {
    const room = this.rooms.get(roomId);
    if (!room) return [];
    return [...room.participants.values()].sort((a, b) => a.joinSeq - b.joinSeq).map((p) => this.publicParticipant(room, p));
  }

  isMember(roomId: string, participantId: string): boolean {
    return !!this.rooms.get(roomId)?.participants.has(participantId);
  }

  join(input: JoinInput): Result<{ room: Room; participant: Participant }> {
    const room = this.rooms.get(input.roomId);
    if (!room) return fail('ROOM_NOT_FOUND');
    if (room.banned.ipKeys.has(input.ipKey)) return fail('KICKED');

    const isHost = input.hostClaim && !room.hostClaimUsed;
    if (!isHost) {
      if (!room.hostClaimUsed) return fail('HOST_NOT_PRESENT');
      if (room.locked) return fail('ROOM_LOCKED');
      if (room.passwordHash && !input.passwordOk) return fail('WRONG_PASSWORD');
    }
    if (room.participants.size >= this.opts.maxParticipants) return fail('ROOM_FULL');

    if (room.emptyTimer) {
      clearTimeout(room.emptyTimer);
      delete room.emptyTimer;
    }
    const participant: Participant = {
      id: this.freshParticipantId(room),
      nickname: this.uniqueNickname(room, input.nickname),
      joinSeq: room.nextSeq++,
      ipKey: input.ipKey,
      audio: true,
      video: true,
      screen: false,
      connected: true,
    };
    room.participants.set(participant.id, participant);
    if (isHost) {
      room.hostClaimUsed = true;
      room.hostId = participant.id;
    }
    this.opts.onEvent({ type: 'participantJoined', roomId: room.id, participant: this.publicParticipant(room, participant) });
    return { ok: true, room, participant };
  }

  /** 끊겼다 돌아온 참가자의 자리를 복구한다(FR-20). */
  resume(roomId: string, participantId: string): Result<{ room: Room; participant: Participant }> {
    const room = this.rooms.get(roomId);
    if (!room) return fail('ROOM_NOT_FOUND');
    const p = room.participants.get(participantId);
    if (!p) return fail('PARTICIPANT_GONE');
    if (p.graceTimer) {
      clearTimeout(p.graceTimer);
      delete p.graceTimer;
    }
    if (!p.connected) {
      p.connected = true;
      this.opts.onEvent({ type: 'participantUpdated', roomId, id: p.id, patch: { connection: 'connected' } });
    }
    this.ensureHost(room);
    return { ok: true, room, participant: p };
  }

  /** 신호 없는 연결 끊김. 유예 시간 동안 자리를 유지하고 호스트 승계를 보류한다(POL-05, POL-08). */
  disconnect(roomId: string, participantId: string): void {
    const room = this.rooms.get(roomId);
    const p = room?.participants.get(participantId);
    if (!room || !p || !p.connected) return;
    p.connected = false;
    this.opts.onEvent({ type: 'participantUpdated', roomId, id: p.id, patch: { connection: 'reconnecting' } });
    p.graceTimer = setTimeout(() => this.removeParticipant(room, p.id, 'timeout'), this.opts.graceMs);
    p.graceTimer.unref?.();
  }

  /** 명시적 나가기: 유예 없이 즉시 퇴장(POL-08). */
  leave(roomId: string, participantId: string): void {
    const room = this.rooms.get(roomId);
    if (room) this.removeParticipant(room, participantId, 'left');
  }

  kick(roomId: string, byId: string, targetId: string): Result<object> {
    const room = this.rooms.get(roomId);
    if (!room) return fail('ROOM_NOT_FOUND');
    if (room.hostId !== byId) return fail('FORBIDDEN');
    if (targetId === byId) return fail('CANNOT_KICK_SELF');
    const target = room.participants.get(targetId);
    if (!target) return fail('TARGET_NOT_FOUND');
    room.banned.ids.add(target.id);
    room.banned.ipKeys.add(target.ipKey);
    this.removeParticipant(room, target.id, 'kicked');
    this.opts.onEvent({ type: 'kick', roomId, id: target.id });
    return { ok: true };
  }

  setLocked(roomId: string, byId: string, locked: boolean): Result<object> {
    const room = this.rooms.get(roomId);
    if (!room) return fail('ROOM_NOT_FOUND');
    if (room.hostId !== byId) return fail('FORBIDDEN');
    if (room.locked !== locked) {
      room.locked = locked;
      this.opts.onEvent({ type: 'locked', roomId, locked });
    }
    return { ok: true };
  }

  /** 호스트를 뺀 모두의 마이크를 끈다. 끄기만 가능하고 각자 다시 켤 수 있다(POL-05). */
  muteAll(roomId: string, byId: string): Result<object> {
    const room = this.rooms.get(roomId);
    if (!room) return fail('ROOM_NOT_FOUND');
    if (room.hostId !== byId) return fail('FORBIDDEN');
    for (const p of room.participants.values()) {
      if (p.id !== byId && p.audio) {
        p.audio = false;
        this.opts.onEvent({ type: 'participantUpdated', roomId, id: p.id, patch: { audio: false } });
      }
    }
    this.opts.onEvent({ type: 'muteAll', roomId, by: byId });
    return { ok: true };
  }

  setMedia(roomId: string, participantId: string, state: { audio: boolean; video: boolean }): Result<object> {
    const p = this.rooms.get(roomId)?.participants.get(participantId);
    if (!p) return fail('PARTICIPANT_GONE');
    if (p.audio !== state.audio || p.video !== state.video) {
      p.audio = state.audio;
      p.video = state.video;
      this.opts.onEvent({ type: 'participantUpdated', roomId, id: p.id, patch: { audio: p.audio, video: p.video } });
    }
    return { ok: true };
  }

  /** 화면공유는 방당 동시 1명, 먼저 시작한 사람 우선(POL-12). */
  startScreen(roomId: string, participantId: string): Result<object> {
    const room = this.rooms.get(roomId);
    const p = room?.participants.get(participantId);
    if (!room || !p) return fail('PARTICIPANT_GONE');
    if (room.screenSharerId && room.screenSharerId !== participantId) return fail('SCREEN_BUSY');
    room.screenSharerId = participantId;
    if (!p.screen) {
      p.screen = true;
      this.opts.onEvent({ type: 'participantUpdated', roomId, id: p.id, patch: { screen: true } });
    }
    return { ok: true };
  }

  stopScreen(roomId: string, participantId: string): Result<object> {
    const room = this.rooms.get(roomId);
    const p = room?.participants.get(participantId);
    if (!room || !p) return fail('PARTICIPANT_GONE');
    if (room.screenSharerId === participantId) room.screenSharerId = null;
    if (p.screen) {
      p.screen = false;
      this.opts.onEvent({ type: 'participantUpdated', roomId, id: p.id, patch: { screen: false } });
    }
    return { ok: true };
  }

  dispose(): void {
    for (const room of this.rooms.values()) this.clearTimers(room);
    this.rooms.clear();
  }

  // ---- 내부 ----
  private freshParticipantId(room: Room): string {
    let id = newParticipantId();
    while (room.participants.has(id)) id = newParticipantId();
    return id;
  }

  private uniqueNickname(room: Room, base: string): string {
    const taken = new Set([...room.participants.values()].map((p) => nicknameKey(p.nickname)));
    if (!taken.has(nicknameKey(base))) return base;
    for (let n = 2; ; n++) {
      const candidate = `${base} (${n})`;
      if (!taken.has(nicknameKey(candidate))) return candidate;
    }
  }

  private removeParticipant(room: Room, participantId: string, reason: 'left' | 'timeout' | 'kicked'): void {
    const p = room.participants.get(participantId);
    if (!p) return;
    if (p.graceTimer) clearTimeout(p.graceTimer);
    room.participants.delete(participantId);
    if (room.screenSharerId === participantId) room.screenSharerId = null;
    this.opts.onEvent({ type: 'participantLeft', roomId: room.id, id: participantId, reason });

    if (room.participants.size === 0) {
      this.closeRoom(room);
      return;
    }
    if (room.hostId === participantId) {
      room.hostId = null;
      this.ensureHost(room);
    }
  }

  /** 호스트가 없고 접속 중인 사람이 있으면 입장 순번이 가장 앞선 사람이 승계한다(FR-17, POL-05). */
  private ensureHost(room: Room): void {
    if (room.hostId) return;
    const next = [...room.participants.values()].filter((p) => p.connected).sort((a, b) => a.joinSeq - b.joinSeq)[0];
    if (!next) return;
    room.hostId = next.id;
    this.opts.onEvent({ type: 'hostChanged', roomId: room.id, hostId: next.id });
  }

  private armEmptyTimer(room: Room): void {
    room.emptyTimer = setTimeout(() => this.closeRoom(room), this.opts.emptyTtlMs);
    room.emptyTimer.unref?.();
  }

  private clearTimers(room: Room): void {
    if (room.emptyTimer) clearTimeout(room.emptyTimer);
    for (const p of room.participants.values()) if (p.graceTimer) clearTimeout(p.graceTimer);
  }

  private closeRoom(room: Room): void {
    this.clearTimers(room);
    this.rooms.delete(room.id);
  }
}
