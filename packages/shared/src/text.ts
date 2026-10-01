import { LIMITS } from './limits';

const NICKNAME_ALLOWED = /^[가-힣A-Za-z0-9 _.-]+$/;
// 제어문자, 제로폭 문자, 방향 제어 문자, BOM
// eslint-disable-next-line no-control-regex -- 제어문자를 제거하는 것이 목적이다
const INVISIBLE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;

const codePointLength = (s: string): number => [...s].length;

/** 닉네임 규칙(POL-04). 규칙을 지키면 정규화된 값을, 아니면 null을 돌려준다. */
export function normalizeNickname(raw: string): string | null {
  if (raw.length > LIMITS.nicknameRawMax) return null;
  const nfc = raw.normalize('NFC');
  const collapsed = nfc.replace(/ {2,}/g, ' ').trim();
  const len = codePointLength(collapsed);
  if (len < LIMITS.nicknameMin || len > LIMITS.nicknameMax) return null;
  if (!NICKNAME_ALLOWED.test(collapsed)) return null;
  return collapsed;
}

/** 채팅 본문 정리(POL-07). 제어·방향 문자를 제거하고 길이를 검사한다. 빈 값이거나 너무 길면 null. */
export function sanitizeChatText(raw: string): string | null {
  if (raw.length > LIMITS.chatMax * 4) return null;
  const cleaned = raw.normalize('NFC').replace(/\r\n?/g, '\n').replace(INVISIBLE, (c) => (c === '\n' ? c : ''));
  const text = cleaned.trim();
  const len = codePointLength(text);
  if (len < 1 || len > LIMITS.chatMax) return null;
  return text;
}

/** 중복 닉네임 비교용 키: 정규화 후 소문자(POL-04). */
export const nicknameKey = (nickname: string): string => nickname.normalize('NFC').toLowerCase();
