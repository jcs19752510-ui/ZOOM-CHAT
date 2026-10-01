import { randomBytes } from 'node:crypto';

/** 128비트 난수 방 ID, base64url 22자(SEC-01). */
export const newRoomId = (): string => randomBytes(16).toString('base64url');
/** 72비트 난수 참가자 ID, 12자. 서버만 만든다(SEC-04). */
export const newParticipantId = (): string => randomBytes(9).toString('base64url');
export const newMessageId = (): string => randomBytes(6).toString('base64url');
