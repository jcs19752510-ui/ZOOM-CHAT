import type { AckError, ErrorCode } from '@meetlite/shared';

/** 개발용 짧은 영문 설명. 사용자 문구는 클라이언트 strings.ts가 code로 정한다. 내부 정보는 담지 않는다(SEC-08). */
const MESSAGES: Record<ErrorCode, string> = {
  INVALID_PAYLOAD: 'invalid request',
  RATE_LIMITED: 'too many requests',
  NOT_JOINED: 'join a room first',
  ALREADY_JOINED: 'already joined',
  ROOM_NOT_FOUND: 'room not found',
  ROOM_FULL: 'room is full',
  ROOM_LOCKED: 'room is locked',
  WRONG_PASSWORD: 'wrong password',
  TOO_MANY_ATTEMPTS: 'too many attempts',
  KICKED: 'removed by host',
  HOST_NOT_PRESENT: 'host has not joined yet',
  TOKEN_INVALID: 'invalid session',
  PARTICIPANT_GONE: 'participant not in room',
  FORBIDDEN: 'not allowed',
  TARGET_NOT_FOUND: 'target not found',
  CANNOT_KICK_SELF: 'cannot remove yourself',
  SCREEN_BUSY: 'someone is already sharing',
  SERVER_BUSY: 'server busy',
  INTERNAL: 'internal error',
};

export const err = (code: ErrorCode): AckError => ({ ok: false, code, message: MESSAGES[code] });
