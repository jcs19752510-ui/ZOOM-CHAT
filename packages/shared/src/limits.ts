export const PROTOCOL_VERSION = 1 as const;

export const LIMITS = {
  nicknameMin: 1,
  nicknameMax: 20,
  nicknameRawMax: 80,
  passwordMin: 4,
  passwordMax: 32,
  chatMax: 500,
  sdpMax: 16_384,
  candidateMax: 2_048,
  roomIdLength: 22,
  tokenMax: 512,
} as const;

/** Socket.IO 한 메시지 최대 크기(바이트). SDP 16KB + 여유. */
export const MAX_MESSAGE_BYTES = 32 * 1024;
