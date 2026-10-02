import type { PublicParticipant } from '@meetlite/shared';
import { describe, expect, it, vi, type Mock } from 'vitest';
import { byTestId, findAll, findOne, textOf, type TreeEl } from '../testUtil';
import { S } from '../strings';
import { Lock, LockOpen } from './icons';
import { ParticipantsPanel } from './ParticipantsPanel';

// unit-11 6단계(소급) 보강: 렌더 문자열이 아니라 엘리먼트 트리의 핸들러 배선·조건 분기를 직접 검사한다.
const mk = (id: string, joinSeq: number, over: Partial<PublicParticipant> = {}): PublicParticipant => ({ id, nickname: `n${joinSeq}`, isHost: false, audio: true, video: true, screen: false, connection: 'connected', joinSeq, ...over });
interface H {
  onClose: Mock<() => void>;
  onToggleLock: Mock<() => void>;
  onMuteAll: Mock<() => void>;
  onKick: Mock<(p: PublicParticipant) => void>;
}
const setup = (o: { participants?: PublicParticipant[]; selfId?: string; hostId?: string | null; locked?: boolean } = {}): { tree: unknown; h: H } => {
  const h: H = { onClose: vi.fn(), onToggleLock: vi.fn(), onMuteAll: vi.fn(), onKick: vi.fn() };
  const tree = ParticipantsPanel({
    participants: o.participants ?? [mk('a', 1, { isHost: true }), mk('b', 2), mk('c', 3)],
    selfId: o.selfId ?? 'a',
    hostId: o.hostId === undefined ? 'a' : o.hostId,
    locked: o.locked ?? false,
    ...h,
  });
  return { tree, h };
};
const call = (e: TreeEl): void => (e.props.onClick as () => void)();
const labelOf = (e: TreeEl): unknown => e.props['aria-label'];

describe('참가자 패널 핸들러·분기 보강 (unit-11, FR-13~17, SEC-05)', () => {
  it('TC-470b [FR-14,FR-16] 잠금·전체 음소거·닫기 버튼은 각자의 콜백을 정확히 1번만 호출하고 서로 섞이지 않는다', () => {
    const { tree, h } = setup();
    call(findOne(tree, byTestId('btn-lock')));
    expect([h.onToggleLock.mock.calls.length, h.onMuteAll.mock.calls.length, h.onKick.mock.calls.length, h.onClose.mock.calls.length]).toEqual([1, 0, 0, 0]);
    call(findOne(tree, byTestId('btn-mute-all')));
    expect([h.onToggleLock.mock.calls.length, h.onMuteAll.mock.calls.length, h.onKick.mock.calls.length, h.onClose.mock.calls.length]).toEqual([1, 1, 0, 0]);
    call(findOne(tree, (e) => e.type === 'button' && labelOf(e) === S.people.close, 'close'));
    expect([h.onToggleLock.mock.calls.length, h.onMuteAll.mock.calls.length, h.onKick.mock.calls.length, h.onClose.mock.calls.length]).toEqual([1, 1, 0, 1]);
    // 인자 없이 호출(이벤트 객체가 서버 호출로 새어 나가지 않음)
    expect(h.onToggleLock).toHaveBeenCalledWith();
    expect(h.onMuteAll).toHaveBeenCalledWith();
  });

  it('TC-470c [FR-15,SEC-05] 내보내기 버튼은 그 줄의 참가자 객체로만 onKick을 호출한다(다른 줄·자기 자신 아님)', () => {
    const list = [mk('a', 1, { isHost: true }), mk('b', 2), mk('c', 3)];
    const { tree, h } = setup({ participants: list });
    call(findOne(tree, byTestId('kick-c')));
    expect(h.onKick).toHaveBeenCalledTimes(1);
    expect(h.onKick.mock.calls[0]?.[0]).toBe(list[2]);
    call(findOne(tree, byTestId('kick-b')));
    expect(h.onKick.mock.calls[1]?.[0]).toBe(list[1]);
    expect(findAll(tree, (e) => String(e.props['data-testid'] ?? '').startsWith('kick-')).map((e) => e.props['data-testid'])).toEqual(['kick-b', 'kick-c']);
  });

  it('TC-470d [FR-14,FR-15,FR-16,SEC-05] 호스트가 아니면 도구 컨테이너·잠금·음소거·내보내기가 트리에 전혀 없고, 목록·닫기는 그대로다', () => {
    for (const sel of ['b', 'zzz', '']) {
      const { tree } = setup({ selfId: sel });
      expect(findAll(tree, byTestId('btn-lock')), sel).toHaveLength(0);
      expect(findAll(tree, byTestId('btn-mute-all'))).toHaveLength(0);
      expect(findAll(tree, (e) => String(e.props['data-testid'] ?? '').startsWith('kick-'))).toHaveLength(0);
      expect(findAll(tree, (e) => e.props['aria-label'] === S.people.hostOnly)).toHaveLength(0);
      expect(findAll(tree, (e) => String(e.props['data-testid'] ?? '').startsWith('person-'))).toHaveLength(3);
      expect(findAll(tree, (e) => e.props['aria-label'] === S.people.close)).toHaveLength(1);
    }
    // 호스트 불명(null)이면 선택한 selfId가 무엇이든 도구 없음
    const { tree } = setup({ hostId: null, selfId: 'a' });
    expect(findAll(tree, byTestId('btn-lock'))).toHaveLength(0);
  });

  it('TC-470e [FR-14] 잠금 버튼 상태: pressed가 locked와 같고 문구가 잠금/해제로 바뀐다(트리 기준)', () => {
    for (const locked of [false, true]) {
      const { tree } = setup({ locked });
      const b = findOne(tree, byTestId('btn-lock'));
      expect(b.props['aria-pressed']).toBe(locked);
      expect(textOf(b)).toBe(locked ? S.people.unlock : S.people.lock);
    }
  });

  it('TC-470f [FR-13] 호스트 1명만 있는 방: 목록 1줄·내보내기 없음·도구는 보임. 빈 목록도 터지지 않는다', () => {
    const solo = setup({ participants: [mk('a', 1, { isHost: true })] });
    expect(findAll(solo.tree, byTestId('person-a'))).toHaveLength(1);
    expect(findAll(solo.tree, (e) => String(e.props['data-testid'] ?? '').startsWith('kick-'))).toHaveLength(0);
    expect(findAll(solo.tree, byTestId('btn-lock'))).toHaveLength(1);
    expect(textOf(findOne(solo.tree, (e) => e.type === 'h2'))).toBe(S.people.count(1));
    const empty = setup({ participants: [] });
    expect(findAll(empty.tree, (e) => String(e.props['data-testid'] ?? '').startsWith('person-'))).toHaveLength(0);
    expect(textOf(findOne(empty.tree, (e) => e.type === 'h2'))).toBe(S.people.count(0));
  });

  it('TC-470g [FR-13,FR-17] 정렬은 입력 배열을 바꾸지 않고(복사), 승계 후(호스트가 뒤 순번)에도 왕관은 hostId에만 붙는다', () => {
    const input = [mk('c', 3), mk('a', 1), mk('b', 2)];
    const snapshot = input.map((x) => x.id);
    const { tree } = setup({ participants: input, selfId: 'c', hostId: 'c' });
    expect(input.map((x) => x.id)).toEqual(snapshot);
    const ids = findAll(tree, (e) => String(e.props['data-testid'] ?? '').startsWith('person-')).map((e) => e.props['data-testid']);
    expect(ids).toEqual(['person-a', 'person-b', 'person-c']);
    const crowns = findAll(tree, (e) => e.props['aria-label'] === S.room.host);
    expect(crowns).toHaveLength(1);
    const crownRow = findOne(tree, byTestId('person-c'));
    expect(findAll(crownRow, (e) => e.props['aria-label'] === S.room.host)).toHaveLength(1);
    // 자기 자신이 호스트이므로 자기 줄에는 내보내기 없음, 다른 줄에는 있음
    expect(findAll(tree, byTestId('kick-c'))).toHaveLength(0);
    expect(findAll(tree, byTestId('kick-a'))).toHaveLength(1);
  });

  it('TC-470h [FR-13] 상태 표시는 줄별로 독립이다: 재연결 중·화면공유는 해당 참가자 줄에만, 꺼짐 아이콘은 꺼진 줄에만', () => {
    const { tree } = setup({ participants: [mk('a', 1, { isHost: true }), mk('b', 2, { connection: 'reconnecting', screen: true, audio: false }), mk('c', 3, { video: false })], selfId: 'b', hostId: 'a' });
    const row = (id: string): unknown => findOne(tree, byTestId(`person-${id}`));
    const has = (id: string, label: string): number => findAll(row(id), (e) => e.props['aria-label'] === label).length;
    const hasText = (id: string, t: string): boolean => textOf(row(id)).includes(t);
    expect([hasText('a', S.people.reconnecting), hasText('b', S.people.reconnecting), hasText('c', S.people.reconnecting)]).toEqual([false, true, false]);
    expect([has('a', S.people.sharing), has('b', S.people.sharing), has('c', S.people.sharing)]).toEqual([0, 1, 0]);
    expect([has('a', S.people.micOff), has('b', S.people.micOff), has('c', S.people.micOff)]).toEqual([0, 1, 0]);
    expect([has('a', S.people.camOff), has('b', S.people.camOff), has('c', S.people.camOff)]).toEqual([0, 0, 1]);
    expect([has('a', S.people.micOn), has('b', S.people.micOn), has('c', S.people.micOn)]).toEqual([1, 0, 1]);
    expect([has('a', S.people.camOn), has('b', S.people.camOn), has('c', S.people.camOn)]).toEqual([1, 1, 0]);
    // (나) 표시는 selfId 줄에만
    expect([hasText('a', S.room.you), hasText('b', S.room.you), hasText('c', S.room.you)]).toEqual([false, true, false]);
    // 왕관은 호스트(a) 줄에만 — 나(b)와 호스트가 다를 때도 구분된다
    expect([has('a', S.room.host), has('b', S.room.host), has('c', S.room.host)]).toEqual([1, 0, 0]);
  });

  it('TC-470i [FR-13,SEC-07] 이니셜: 빈 닉네임은 오류 없이 빈 칸, 소문자는 대문자, 결합 이모지는 코드포인트 첫 글자, 닉네임은 텍스트 노드로만 들어간다', () => {
    const { tree } = setup({ participants: [mk('a', 1, { isHost: true, nickname: '' }), mk('b', 2, { nickname: 'zed' }), mk('c', 3, { nickname: '<b>x</b>' })] });
    const initial = (id: string): string => textOf(findOne(findOne(tree, byTestId(`person-${id}`)), (e) => e.props['aria-hidden'] === 'true' && typeof e.props.className === 'string' && String(e.props.className).includes('rounded-pill')));
    expect(initial('a')).toBe('');
    expect(initial('b')).toBe('Z');
    expect(initial('c')).toBe('<');
    // HTML 주입 경로(dangerouslySetInnerHTML) 없음
    expect(findAll(tree, (e) => 'dangerouslySetInnerHTML' in e.props)).toHaveLength(0);
  });

  it('TC-470j [UX-10] 내보내기·닫기 버튼은 type=button이고 터치 크기 클래스, 아이콘은 aria-hidden이다(폼 제출 방지)', () => {
    const { tree } = setup();
    const buttons = findAll(tree, (e) => e.type === 'button');
    expect(buttons.length).toBe(5); // 닫기, 잠금, 음소거, kick-b, kick-c
    for (const b of buttons) expect(b.props.type).toBe('button');
    // 제목은 보조기기에서 숨겨지지 않고, 버튼 안 아이콘은 장식(aria-hidden)이다
    expect(findOne(tree, (e) => e.type === 'h2').props['aria-hidden']).toBeUndefined();
    for (const b of buttons) {
      const icons = findAll(b, (e) => typeof e.type !== 'string' && 'size' in e.props);
      expect(icons.length).toBeGreaterThan(0);
      for (const ic of icons) expect(ic.props['aria-hidden']).toBe('true');
    }
    for (const id of ['kick-b', 'kick-c']) expect(String(findOne(tree, byTestId(id)).props.className)).toMatch(/min-h-touch.*min-w-touch/);
    expect(String(findOne(tree, (e) => e.type === 'button' && labelOf(e) === S.people.close).props.className)).toMatch(/min-h-touch.*min-w-touch/);
  });

  it('TC-470k [FR-14,UX-10] 잠금 아이콘은 상태 반영(잠금 중=열림 아이콘), 호스트 도구 묶음에 이름이 있고, e2e가 쓰는 testid(people-panel·people-list)와 닉네임 원문 표시가 유지된다', () => {
    const iconOf = (locked: boolean): unknown => {
      const b = findOne(setup({ locked }).tree, byTestId('btn-lock'));
      const icons = findAll(b, (e) => e.type === Lock || e.type === LockOpen);
      expect(icons).toHaveLength(1);
      return (icons[0] as TreeEl).type;
    };
    expect([iconOf(false), iconOf(true)]).toEqual([Lock, LockOpen]);
    const { tree } = setup({ participants: [mk('a', 1, { isHost: true, nickname: ' a b ' })] });
    expect(findAll(tree, (e) => e.props['aria-label'] === S.people.hostOnly)).toHaveLength(1);
    expect(findAll(tree, byTestId('people-panel'))).toHaveLength(1);
    const list = findOne(tree, byTestId('people-list'));
    expect(list.type).toBe('ul');
    expect(textOf(findOne(list, byTestId('person-a')))).toContain(' a b ');
  });
});
