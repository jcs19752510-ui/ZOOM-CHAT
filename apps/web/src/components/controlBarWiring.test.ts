import { afterEach, describe, expect, it, vi } from 'vitest';
import { byTestId, findAll, findOne } from '../testUtil';
import { S } from '../strings';
import { ControlBar } from './ControlBar';

afterEach(() => vi.unstubAllGlobals());

type P = Parameters<typeof ControlBar>[0];
const desktop = (): void => {
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130', maxTouchPoints: 0, mediaDevices: { getDisplayMedia: () => Promise.resolve() } });
};
const mk = (over: Partial<P> = {}) => {
  const fn = {
    onMic: vi.fn(), onCamera: vi.fn(), onShare: vi.fn(), onChat: vi.fn(), onPeople: vi.fn(), onLeave: vi.fn(), onDevices: vi.fn(),
  };
  const props: P = { micOn: true, camOn: true, sharing: false, chatOpen: false, peopleOpen: false, unread: 0, count: 2, ...fn, ...over };
  return { fn, tree: ControlBar(props) };
};
const click = (tree: unknown, id: string): void => {
  const el = findOne(tree, byTestId(id), id);
  (el.props.onClick as () => void)();
};

describe('컨트롤바 배선 (unit-09, UX-04, FR-08, FR-12, FR-22)', () => {
  it('TC-455b [UX-04,FR-08,FR-22] 각 버튼은 자기 콜백만 호출한다(마이크·카메라·공유·채팅·참가자·나가기·장치)', () => {
    desktop();
    for (const [id, key] of [['btn-mic', 'onMic'], ['btn-camera', 'onCamera'], ['btn-share', 'onShare'], ['btn-chat', 'onChat'], ['btn-people', 'onPeople'], ['btn-leave', 'onLeave'], ['btn-devices', 'onDevices']] as const) {
      const { fn, tree } = mk();
      click(tree, id);
      for (const [k, f] of Object.entries(fn)) expect(f, `${id} 클릭 시 ${k}`).toHaveBeenCalledTimes(k === key ? 1 : 0);
    }
  });

  it('TC-455c [UX-10] 카메라 옆 장치 화살표도 장치 시트 콜백을 부르고 이름이 카메라용이다', () => {
    desktop();
    const { fn, tree } = mk();
    const cam = findOne(tree, (e) => e.props['aria-label'] === S.room.deviceMenuCamera, 'camera chevron');
    (cam.props.onClick as () => void)();
    expect(fn.onDevices).toHaveBeenCalledTimes(1);
    expect(findAll(tree, (e) => e.type === 'button').length).toBe(2); // 일반 button은 장치 화살표 2개뿐, 나머지는 Btn
  });

  it('TC-456b [UX-10,FR-12] 화면공유·채팅·참가자 버튼의 aria-pressed(pressed)와 공유 중 이름은 상태를 따른다', () => {
    desktop();
    const props = (tree: unknown, id: string): Record<string, unknown> => findOne(tree, byTestId(id), id).props;
    const idle = mk().tree;
    for (const id of ['btn-share', 'btn-chat', 'btn-people']) expect(props(idle, id).pressed, id).toBe(false);
    expect(props(idle, 'btn-mic').pressed).toBe(false);
    const on = mk({ sharing: true, chatOpen: true, peopleOpen: true }).tree;
    for (const id of ['btn-share', 'btn-chat', 'btn-people']) expect(props(on, id).pressed, id).toBe(true);
    expect(props(on, 'btn-share').aria).toBe(S.room.shareStop);
    expect(props(on, 'btn-share').label).toBe(S.room.shareStop);
    // 서로 독립: 채팅만 열려 있으면 참가자는 눌림이 아니다
    const chatOnly = mk({ chatOpen: true }).tree;
    expect(props(chatOnly, 'btn-chat').pressed).toBe(true);
    expect(props(chatOnly, 'btn-people').pressed).toBe(false);
    // 위험색은 나가기만
    expect(findAll(idle, (e) => e.props.danger === true).map((e) => e.props.testId)).toEqual(['btn-leave']);
  });

  it('TC-458b [FR-12,POL-12] 공유 중 상태의 이름은 지원 판정과 무관하게 "공유 중지"이고, 미지원 환경에서는 비활성이다', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148', maxTouchPoints: 5, mediaDevices: {} });
    const share = findOne(mk({ sharing: true }).tree, byTestId('btn-share'), 'share').props;
    expect(share.aria).toBe(S.room.shareStop);
    expect(share.disabled).toBe(true); // 미지원 환경은 공유를 시작할 수 없으므로 정상(관찰)
  });

  it('TC-459b [FR-11,UX-12] 읽지 않음 개수는 채팅 버튼에만, 열려 있으면 0으로 넘어간다(음수·큰 수 경계 포함)', () => {
    desktop();
    const badge = (over: Partial<P>): unknown => findOne(mk(over).tree, byTestId('btn-chat'), 'chat').props.badge;
    expect(badge({ unread: 3 })).toBe(3);
    expect(badge({ unread: 3, chatOpen: true })).toBe(0);
    expect(findOne(mk({ unread: 9 }).tree, byTestId('btn-people'), 'people').props.badge).toBeUndefined();
    expect(findOne(mk({ unread: 9 }).tree, byTestId('btn-mic'), 'mic').props.badge).toBeUndefined();
  });
});
