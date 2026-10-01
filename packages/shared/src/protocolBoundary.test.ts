import { describe, expect, it } from 'vitest';
import { ERROR_CODES } from './protocol';
import { LIMITS, MAX_MESSAGE_BYTES, PROTOCOL_VERSION } from './limits';
import {
  ChatSendRequestSchema,
  CreateRoomRequestSchema,
  EmptyRequestSchema,
  JoinRequestSchema,
  KickRequestSchema,
  LockRequestSchema,
  MediaStateRequestSchema,
  ParticipantIdSchema,
  ResumeRequestSchema,
  RoomIdSchema,
  SignalRequestSchema,
} from './schemas';
import { nicknameKey, normalizeNickname, sanitizeChatText } from './text';

const roomId = 'A'.repeat(22);
const pid = 'abcdefgh';
const ok = (r: { success: boolean }): boolean => r.success;

describe('unit-01 경계·적대 입력 (소급 06단계 보강)', () => {
  it('TC-420 [SEC-06,NFR-12] 스키마 경계값: 토큰·비밀번호·SDP·candidate·sdpMLineIndex·참가자ID·채팅 원문 길이의 상·하한 바로 안/밖', () => {
    // 토큰 길이 20~512
    expect(ok(ResumeRequestSchema.safeParse({ v: 1, token: 'a'.repeat(19) }))).toBe(false);
    expect(ok(ResumeRequestSchema.safeParse({ v: 1, token: 'a'.repeat(20) }))).toBe(true);
    expect(ok(ResumeRequestSchema.safeParse({ v: 1, token: 'a'.repeat(512) }))).toBe(true);
    expect(ok(ResumeRequestSchema.safeParse({ v: 1, token: 'a'.repeat(513) }))).toBe(false);
    expect(ok(JoinRequestSchema.safeParse({ v: 1, roomId, nickname: '민지', hostClaim: 'a'.repeat(513) }))).toBe(false);
    // 비밀번호 4~32
    for (const [len, expected] of [[3, false], [4, true], [32, true], [33, false]] as const) {
      expect(ok(CreateRoomRequestSchema.safeParse({ v: 1, password: 'p'.repeat(len) })), `create pw ${len}`).toBe(expected);
      expect(ok(JoinRequestSchema.safeParse({ v: 1, roomId, nickname: '민지', password: 'p'.repeat(len) })), `join pw ${len}`).toBe(expected);
    }
    // SDP 정확히 16384자는 허용, 16385자는 거부 (answer 타입도 동일)
    expect(ok(SignalRequestSchema.safeParse({ v: 1, to: pid, description: { type: 'answer', sdp: 'x'.repeat(16_384) } }))).toBe(true);
    expect(ok(SignalRequestSchema.safeParse({ v: 1, to: pid, description: { type: 'answer', sdp: 'x'.repeat(16_385) } }))).toBe(false);
    expect(ok(SignalRequestSchema.safeParse({ v: 1, to: pid, description: { type: 'pranswer', sdp: 'x' } }))).toBe(false);
    // ICE candidate 2048자, sdpMLineIndex 정수 0~255
    expect(ok(SignalRequestSchema.safeParse({ v: 1, to: pid, candidate: { candidate: 'c'.repeat(2048) } }))).toBe(true);
    expect(ok(SignalRequestSchema.safeParse({ v: 1, to: pid, candidate: { candidate: 'c'.repeat(2049) } }))).toBe(false);
    for (const [idx, expected] of [[-1, false], [0, true], [255, true], [256, false], [1.5, false], ['1', false], [null, true]] as const) {
      expect(ok(SignalRequestSchema.safeParse({ v: 1, to: pid, candidate: { candidate: 'c', sdpMLineIndex: idx } })), `mline ${String(idx)}`).toBe(expected);
    }
    expect(ok(SignalRequestSchema.safeParse({ v: 1, to: pid, candidate: { candidate: 'c', sdpMid: 'm'.repeat(65) } }))).toBe(false);
    expect(ok(SignalRequestSchema.safeParse({ v: 1, to: pid, candidate: { candidate: 'c', extra: 1 } }))).toBe(false);
    // 참가자 ID 8~24자, URL-safe 문자만
    for (const [id, expected] of [['a'.repeat(7), false], ['a'.repeat(8), true], ['a'.repeat(24), true], ['a'.repeat(25), false], ['abc def gh', false], ['../../etc', false], ['abcdefg\n', false], ['한글한글한글한글한글', false]] as const) {
      expect(ok(ParticipantIdSchema.safeParse(id)), JSON.stringify(id)).toBe(expected);
      expect(ok(KickRequestSchema.safeParse({ v: 1, targetId: id })), `kick ${JSON.stringify(id)}`).toBe(expected);
    }
    // 방 ID: 정확히 22자, 개행·공백·널 문자 불가 (정규식 끝 앵커 우회 방지)
    for (const [id, expected] of [['A'.repeat(21), false], ['A'.repeat(22), true], ['A'.repeat(23), false], [`${'A'.repeat(21)}\n`, false], [`${'A'.repeat(21)} `, false], [`${'A'.repeat(21)}\0`, false], [`${'A'.repeat(21)}=`, false]] as const) {
      expect(ok(RoomIdSchema.safeParse(id)), JSON.stringify(id)).toBe(expected);
    }
    // 채팅 요청 원문 1~2000자(그 안에서 500자 규칙은 sanitizeChatText가 담당)
    expect(ok(ChatSendRequestSchema.safeParse({ v: 1, text: '' }))).toBe(false);
    expect(ok(ChatSendRequestSchema.safeParse({ v: 1, text: 'x'.repeat(2000) }))).toBe(true);
    expect(ok(ChatSendRequestSchema.safeParse({ v: 1, text: 'x'.repeat(2001) }))).toBe(false);
  });

  it('TC-420b [SEC-04,SEC-06,NFR-12] 모든 클라이언트→서버 스키마는 strict(추가 키 거부)이고 타입을 강제변환하지 않으며 v가 필수다', () => {
    const cases: Array<[string, { safeParse: (x: unknown) => { success: boolean } }, Record<string, unknown>]> = [
      ['create', CreateRoomRequestSchema, {}],
      ['join', JoinRequestSchema, { roomId, nickname: '민지' }],
      ['resume', ResumeRequestSchema, { token: 'a'.repeat(30) }],
      ['empty', EmptyRequestSchema, {}],
      ['signal', SignalRequestSchema, { to: pid, candidate: { candidate: 'c' } }],
      ['chat', ChatSendRequestSchema, { text: 'hi' }],
      ['media', MediaStateRequestSchema, { audio: true, video: false }],
      ['lock', LockRequestSchema, { locked: true }],
      ['kick', KickRequestSchema, { targetId: pid }],
    ];
    for (const [name, schema, body] of cases) {
      expect(ok(schema.safeParse({ v: 1, ...body })), `${name} 정상`).toBe(true);
      expect(ok(schema.safeParse({ ...body })), `${name} v 없음`).toBe(false);
      expect(ok(schema.safeParse({ v: 2, ...body })), `${name} v=2`).toBe(false);
      expect(ok(schema.safeParse({ v: '1', ...body })), `${name} v 문자열`).toBe(false);
      expect(ok(schema.safeParse({ v: 1, ...body, from: 'evil1234' })), `${name} from 추가`).toBe(false);
      expect(ok(schema.safeParse({ v: 1, ...body, isHost: true })), `${name} isHost 추가`).toBe(false);
      for (const bad of [null, undefined, 'x', 1, [], true]) expect(ok(schema.safeParse(bad)), `${name} ${String(bad)}`).toBe(false);
    }
    // 불리언 필드는 "true"/1 같은 값을 받지 않는다
    expect(ok(MediaStateRequestSchema.safeParse({ v: 1, audio: 'true', video: 1 }))).toBe(false);
    expect(ok(MediaStateRequestSchema.safeParse({ v: 1, audio: true }))).toBe(false);
    expect(ok(LockRequestSchema.safeParse({ v: 1, locked: 'false' }))).toBe(false);
    expect(ok(LockRequestSchema.safeParse({ v: 1, locked: 0 }))).toBe(false);
    // 닉네임 원문 80자 초과는 스키마에서 거부
    expect(ok(JoinRequestSchema.safeParse({ v: 1, roomId, nickname: `${'a'.repeat(20)}${' '.repeat(61)}` }))).toBe(false);
  });

  it('TC-421 [POL-04,SEC-06] 닉네임: 분해된 한글(NFC 정규화)·연속 공백 축약·경계 20 코드포인트·거부 문자', () => {
    const decomposed = '한글'.normalize('NFD');
    expect(decomposed).not.toBe('한글');
    expect(normalizeNickname(decomposed)).toBe('한글');
    expect(nicknameKey(decomposed)).toBe(nicknameKey('한글'));
    expect(normalizeNickname('a    b')).toBe('a b');
    expect(normalizeNickname(`${'a'.repeat(19)} b`)).toBeNull(); // 정규화 후 21자
    expect(normalizeNickname(`${'a'.repeat(18)} b`)).toBe(`${'a'.repeat(18)} b`); // 정규화 후 20자
    expect(normalizeNickname('a'.repeat(20))).toBe('a'.repeat(20));
    expect(normalizeNickname('a'.repeat(21))).toBeNull();
    for (const bad of ['a/b', 'a@b', "a'b", 'a"b', 'a<b', 'a\tb', 'a\0b', 'ａｂ', '한글😀', 'a b', 'ab​c', '‮ab']) {
      expect(normalizeNickname(bad), JSON.stringify(bad)).toBeNull();
    }
    expect(normalizeNickname('  ')).toBeNull();
    expect(normalizeNickname('-')).toBe('-');
    expect(normalizeNickname('.')).toBe('.');
  });

  it('TC-421b [POL-07,SEC-07] 채팅 정리: 모든 제어·제로폭·방향 문자 범위 제거, 코드포인트 기준 500자 경계, 줄바꿈 정규화, 공백만 있으면 거부', () => {
    const invisibles = ['\u0000', '\u0008', '\u000B', '\u000C', '\u000E', '\u001F', '\u007F', '\u0085', '\u009F', '​', '‌', '‍', '‎', '‏', '‪', '‬', '‮', '⁠', '⁢', '⁤', '⁦', '⁩', '﻿'];
    for (const c of invisibles) expect(sanitizeChatText(`a${c}b`), `U+${c.charCodeAt(0).toString(16)}`).toBe('ab');
    expect(sanitizeChatText('a\tb')).toBe('a\tb'); // 탭은 보존
    expect(sanitizeChatText('a\rb')).toBe('a\nb');
    expect(sanitizeChatText('a\r\n\r\nb')).toBe('a\n\nb');
    expect(sanitizeChatText('  앞뒤 공백  ')).toBe('앞뒤 공백');
    expect(sanitizeChatText('​ ‮')).toBeNull();
    expect(sanitizeChatText('')).toBeNull();
    // 이모지 500개는 코드포인트 500이므로 허용(UTF-16 길이는 1000), 501개는 거부
    expect(sanitizeChatText('😀'.repeat(500))).toBe('😀'.repeat(500));
    expect(sanitizeChatText('😀'.repeat(501))).toBeNull();
    // 정리 후 길이로 판정: 제어문자를 섞어 원문이 길어도 정리 결과가 500자면 허용
    expect(sanitizeChatText(`${'a'.repeat(500)}${'​'.repeat(100)}`)).toBe('a'.repeat(500));
    // 원문이 상한(2000)을 넘으면 즉시 거부
    expect(sanitizeChatText('a'.repeat(2001))).toBeNull();
    // HTML은 변형하지 않는다(렌더링이 텍스트로만 하므로)
    expect(sanitizeChatText('<b>&amp;</b>')).toBe('<b>&amp;</b>');
  });

  it('TC-421c [NFR-12,SEC-06] 계약 상수 고정: 버전 1, 한도값, 오류 코드 목록(중복 없음·핵심 코드 포함)', () => {
    expect(PROTOCOL_VERSION).toBe(1);
    expect(LIMITS).toMatchObject({ nicknameMin: 1, nicknameMax: 20, nicknameRawMax: 80, passwordMin: 4, passwordMax: 32, chatMax: 500, sdpMax: 16_384, candidateMax: 2_048, roomIdLength: 22, tokenMax: 512 });
    expect(MAX_MESSAGE_BYTES).toBe(32 * 1024);
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
    for (const c of ['INVALID_PAYLOAD', 'RATE_LIMITED', 'NOT_JOINED', 'ROOM_FULL', 'ROOM_LOCKED', 'WRONG_PASSWORD', 'TOO_MANY_ATTEMPTS', 'KICKED', 'HOST_NOT_PRESENT', 'TOKEN_INVALID', 'FORBIDDEN', 'INTERNAL']) {
      expect(ERROR_CODES, c).toContain(c);
    }
  });
});
