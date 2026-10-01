import { pino, type Logger } from 'pino';

/** 구조화 로그. 닉네임·토큰·비밀번호·SDP·ICE·채팅은 어떤 경우에도 남기지 않는다(SEC-10, POL-09). */
export function createLogger(level: string): Logger {
  return pino({
    level,
    redact: {
      paths: ['*.token', '*.password', '*.hostClaim', '*.sdp', '*.candidate', '*.text', '*.nickname', 'token', 'password', 'sdp', 'text', 'nickname'],
      censor: '[redacted]',
    },
  });
}

/** 방 ID는 앞 6자만 로그에 남긴다. */
export const shortId = (id: string): string => id.slice(0, 6);
