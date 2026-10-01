import { describe, expect, it } from 'vitest';
import { nicknameKey, normalizeNickname, sanitizeChatText } from './text';

describe('normalizeNickname (POL-04, SEC-06)', () => {
  it('한글, 영문, 숫자, 공백, _-. 를 허용한다', () => {
    expect(normalizeNickname('민지')).toBe('민지');
    expect(normalizeNickname('Jane_Doe-1.0')).toBe('Jane_Doe-1.0');
    expect(normalizeNickname('  민지   2  ')).toBe('민지 2');
  });
  it('빈 값, 21자, 기호, 이모지, 제어/방향 문자를 거부한다', () => {
    expect(normalizeNickname('')).toBeNull();
    expect(normalizeNickname('   ')).toBeNull();
    expect(normalizeNickname('가'.repeat(21))).toBeNull();
    expect(normalizeNickname('<script>')).toBeNull();
    expect(normalizeNickname('a😀')).toBeNull();
    expect(normalizeNickname('a‮b')).toBeNull();
    expect(normalizeNickname('a​b')).toBeNull();
    expect(normalizeNickname('a\nb')).toBeNull();
  });
  it('20자는 허용하고 원문이 너무 길면 거부한다', () => {
    expect(normalizeNickname('가'.repeat(20))).toBe('가'.repeat(20));
    expect(normalizeNickname(' '.repeat(100))).toBeNull();
  });
  it('중복 비교 키는 대소문자를 구분하지 않는다', () => {
    expect(nicknameKey('Min')).toBe(nicknameKey('min'));
  });
});

describe('sanitizeChatText (POL-07, SEC-07)', () => {
  it('일반 텍스트와 HTML 문자는 그대로 둔다(렌더링은 텍스트로만)', () => {
    expect(sanitizeChatText('<img src=x onerror=alert(1)>')).toBe('<img src=x onerror=alert(1)>');
  });
  it('제어·방향 문자를 제거한다', () => {
    expect(sanitizeChatText('hi‮evil\u0007')).toBe('hievil');
  });
  it('빈 값과 500자 초과를 거부한다', () => {
    expect(sanitizeChatText('   ')).toBeNull();
    expect(sanitizeChatText('가'.repeat(500))).not.toBeNull();
    expect(sanitizeChatText('가'.repeat(501))).toBeNull();
  });
  it('줄바꿈은 유지한다', () => {
    expect(sanitizeChatText('a\r\nb')).toBe('a\nb');
  });
});
