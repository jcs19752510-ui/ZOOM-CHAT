import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { S } from '../strings';
import { Landing } from './Landing';

const html = renderToStaticMarkup(createElement(Landing, { navigate: () => undefined }));

describe('랜딩 초기 화면 (unit-08, FR-01, FR-02, NFR-01, UX-10)', () => {
  it('TC-476e [FR-01,NFR-01] 첫 화면에 h1·닉네임·[새 회의 만들기]·링크 입장 폼이 있어 조작 3번 이내(닉네임→만들기→입장)에 닿는다', () => {
    expect(html).toMatch(new RegExp(`<h1[^>]*>${S.landing.title}</h1>`));
    expect(html).toContain('data-testid="nickname"');
    expect(html).toContain('data-testid="create-room"');
    expect(html).toContain(S.landing.createButton);
    expect(html).toContain('data-testid="join-link"');
    expect(html).toContain('data-testid="join-by-link"');
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toMatch(/<main/);
  });

  it('TC-476f [FR-05,UX-10] 모든 입력에 라벨이 연결돼 있고(for/id), 비밀번호 입력은 체크하기 전에는 없으며, 닉네임 힌트가 aria-describedby로 연결된다', () => {
    for (const id of ['nickname', 'join-link']) {
      expect(html).toMatch(new RegExp(`<label[^>]*for="${id}"`));
      expect(html).toMatch(new RegExp(`<input id="${id}"`));
    }
    expect(html).not.toContain('data-testid="room-password"');
    expect(html).toContain('data-testid="use-password"');
    expect(html).toMatch(/aria-describedby="nickname-hint"/);
    expect(html).toContain('id="nickname-hint"');
    expect(html).toMatch(/<input[^>]*data-testid="nickname"[^>]*maxLength="80"|<input[^>]*maxlength="80"[^>]*data-testid="nickname"/i);
    expect(html).not.toContain('role="alert"'); // 처음에는 오류가 없다
  });

  it('TC-476g [NFR-10,UX-10] 만들기 버튼은 type=submit이고 두 폼 모두 noValidate(브라우저 기본 팝업 대신 한국어 오류)이며 법률 푸터가 포함된다', () => {
    expect(html).toMatch(/<button type="submit" class="btn-primary"[^>]*data-testid="create-room"/);
    expect((html.match(/<form[^>]*novalidate/gi) ?? []).length).toBe(2);
    expect(html).toContain('<footer');
    expect(html).toContain(S.landing.support);
  });
});
