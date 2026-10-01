import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PublicParticipant } from '@meetlite/shared';
import { describe, expect, it } from 'vitest';
import { S } from '../strings';
import { ParticipantsPanel } from './ParticipantsPanel';

const noop = (): void => undefined;
const p = (id: string, joinSeq: number, over: Partial<PublicParticipant> = {}): PublicParticipant => ({ id, nickname: `사람${joinSeq}`, isHost: false, audio: true, video: true, screen: false, connection: 'connected', joinSeq, ...over });
const render = (o: { participants?: PublicParticipant[]; selfId?: string; hostId?: string | null; locked?: boolean }): string =>
  renderToStaticMarkup(
    createElement(ParticipantsPanel, { participants: o.participants ?? [p('a', 1, { isHost: true }), p('b', 2), p('c', 3)], selfId: o.selfId ?? 'a', hostId: o.hostId === undefined ? 'a' : o.hostId, locked: o.locked ?? false, onClose: noop, onToggleLock: noop, onMuteAll: noop, onKick: noop }),
  );

describe('참가자 패널·호스트 도구 UI (unit-11, FR-13~17, SEC-05)', () => {
  it('TC-470 [FR-14,FR-15,FR-16,SEC-05] 호스트에게만 잠금·전체 음소거·내보내기 도구가 보이고, 호스트가 아닌 사람(또는 호스트 불명)에게는 하나도 없다', () => {
    const host = render({ selfId: 'a' });
    expect(host).toContain('data-testid="btn-lock"');
    expect(host).toContain('data-testid="btn-mute-all"');
    expect(host).toContain('data-testid="kick-b"');
    expect(host).toContain('data-testid="kick-c"');
    for (const guest of ['b', 'c']) {
      const html = render({ selfId: guest });
      expect(html, `${guest}`).not.toContain('btn-lock');
      expect(html).not.toContain('btn-mute-all');
      expect(html).not.toMatch(/data-testid="kick-/);
      expect(html).not.toContain(S.people.hostOnly);
    }
    const none = render({ hostId: null, selfId: 'a' }); // 호스트가 아직 정해지지 않은 순간
    expect(none).not.toContain('btn-lock');
    expect(none).not.toMatch(/data-testid="kick-/);
  });

  it('TC-471 [FR-16] 호스트도 자기 자신에게는 내보내기 버튼이 없고, 내보내기 버튼 이름에 대상 닉네임이 있다', () => {
    const html = render({});
    expect(html).not.toContain('data-testid="kick-a"');
    expect(html).toContain(`aria-label="사람2 ${S.people.kick}"`);
    expect(html).toMatch(/<button[^>]*data-testid="kick-b"[^>]*class="[^"]*min-h-touch/);
  });

  it('TC-472 [FR-14] 잠금 버튼은 상태에 따라 문구·aria-pressed가 바뀐다', () => {
    const open = render({ locked: false });
    expect(open).toContain(S.people.lock);
    expect(open).toMatch(/data-testid="btn-lock"[^>]*aria-pressed="false"|aria-pressed="false"[^>]*data-testid="btn-lock"/);
    const locked = render({ locked: true });
    expect(locked).toContain(S.people.unlock);
    expect(locked).toMatch(/aria-pressed="true"/);
  });

  it('TC-473 [FR-13,FR-17] 목록은 입장 순서이고 (나)·호스트 왕관·재연결 중·화면공유·마이크·카메라 상태가 이름 있는 아이콘으로 나온다', () => {
    const html = render({
      participants: [p('c', 3, { audio: false, video: false }), p('a', 1, { isHost: true }), p('b', 2, { connection: 'reconnecting', screen: true })],
      selfId: 'b',
      hostId: 'a',
    });
    const order = [...html.matchAll(/data-testid="person-([a-z])"/g)].map((m) => m[1]);
    expect(order).toEqual(['a', 'b', 'c']);
    expect(html).toContain(S.people.count(3));
    expect(html).toContain(S.room.you);
    expect((html.match(new RegExp(`aria-label="${S.room.host}"`, 'g')) ?? []).length).toBe(1);
    expect(html).toContain(S.people.reconnecting);
    expect(html).toContain(`aria-label="${S.people.sharing}"`);
    expect(html).toContain(`aria-label="${S.people.micOff}"`);
    expect(html).toContain(`aria-label="${S.people.camOff}"`);
    expect(html).toContain(`aria-label="${S.people.micOn}"`);
    expect(html).toContain(`aria-label="${S.people.camOn}"`);
  });

  it('TC-474 [FR-13,SEC-07] 닉네임의 HTML은 이스케이프되고, 이니셜은 첫 글자(이모지 포함 코드포인트 단위)다', () => {
    const html = render({ participants: [p('a', 1, { isHost: true, nickname: '<img src=x onerror=1>' }), p('b', 2, { nickname: '😀철수' }), p('c', 3, { nickname: 'abc' })] });
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=1&gt;');
    expect(html).toContain('>😀<');
    expect(html).toContain('>A<');
  });

  it('TC-475 [UX-10] 닫기 버튼과 패널에 접근 가능한 이름이 있다', () => {
    const html = render({});
    expect(html).toContain(`aria-label="${S.people.close}"`);
    expect(html).toContain(`aria-label="${S.people.title}"`);
  });
});
