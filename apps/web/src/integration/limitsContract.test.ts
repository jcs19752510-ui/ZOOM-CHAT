import fs from 'node:fs';
import path from 'node:path';
import { LIMITS, normalizeNickname, sanitizeChatText } from '@meetlite/shared';
import { describe, expect, it } from 'vitest';
import { S } from '../strings';

// 7단계 통합: shared 한도(LIMITS)가 서버 검증과 웹 입력·안내 문구에서 같은 수로 쓰이는지 본다.
// 어긋나면 "입력 칸은 허용하는데 서버가 거부"하거나 "안내 문구의 숫자가 틀린" 상태가 되어 사용자가 원인을 오해한다.

const src = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

describe('shared LIMITS ↔ 웹 입력 속성·문구', () => {
  it('IT-78 [FR-03,FR-05,FR-11,POL-04,POL-07] 입력 maxLength·검증식·안내 문구의 숫자가 LIMITS와 같다', () => {
    // 문구 속 숫자
    expect(S.landing.passwordHint).toContain(`${LIMITS.passwordMin}~${LIMITS.passwordMax}`);
    expect(S.lobby.invalidNickname).toContain(`${LIMITS.nicknameMin}~${LIMITS.nicknameMax}`);
    expect(S.chat.tooLong).toContain(String(LIMITS.chatMax));
    expect(S.chat.placeholder).toContain(String(LIMITS.chatMax));
    expect(S.chat.counter(7)).toBe(`7/${LIMITS.chatMax}`);

    // 입력 칸 maxLength: 닉네임은 정규화 전 원문 상한(서버 zod max와 같음), 비밀번호는 최대 길이
    for (const file of ['pages/Landing.tsx', 'pages/Lobby.tsx']) {
      const t = src(file);
      expect([...t.matchAll(/id="(?:lobby-)?nickname"[^\n]*maxLength=\{(\d+)\}/g)].map((m) => Number(m[1])), file).toEqual([LIMITS.nicknameRawMax]);
      expect([...t.matchAll(/type="password"[^\n]*maxLength=\{(\d+)\}/g)].map((m) => Number(m[1])), file).toEqual([LIMITS.passwordMax]);
    }

    // 랜딩의 비밀번호 검증식 리터럴(공유 상수를 쓰지 않고 숫자를 직접 씀 — 값이 같아야 한다)
    const m = /password\.length < (\d+) \|\| password\.length > (\d+)/.exec(src('pages/Landing.tsx'));
    expect(m && [Number(m[1]), Number(m[2])]).toEqual([LIMITS.passwordMin, LIMITS.passwordMax]);

    // 채팅 입력은 shared 상수를 그대로 쓴다
    expect(src('components/ChatPanel.tsx')).toContain('LIMITS.chatMax');
  });

  it('IT-79 [POL-04,POL-07] 웹이 쓰는 정규화 함수는 서버가 쓰는 것과 같은 shared 구현이다(경계값에서 서버·웹 판정이 갈릴 수 없다)', () => {
    expect(src('pages/Landing.tsx')).toMatch(/import \{[^}]*normalizeNickname[^}]*\} from '@meetlite\/shared'/);
    expect(src('pages/Lobby.tsx')).toMatch(/import \{[^}]*normalizeNickname[^}]*\} from '@meetlite\/shared'/);
    const server = fs.readFileSync(path.resolve(__dirname, '../../../server/src/socket/server.ts'), 'utf8');
    expect(server).toMatch(/normalizeNickname/);
    expect(server).toMatch(/sanitizeChatText/);
    // 경계: 20자/21자, 500자/501자(코드 포인트 기준), 앞뒤 공백 정리
    expect(normalizeNickname('a'.repeat(LIMITS.nicknameMax))).not.toBeNull();
    expect(normalizeNickname('a'.repeat(LIMITS.nicknameMax + 1))).toBeNull();
    expect(sanitizeChatText('😀'.repeat(LIMITS.chatMax))).not.toBeNull();
    expect(sanitizeChatText('😀'.repeat(LIMITS.chatMax + 1))).toBeNull();
  });
});
