import type { PublicParticipant } from '@meetlite/shared';
import type * as ReactTypes from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LocalMedia } from '../lib/media';
import type { EndReason, MeetingController, MeetingState } from '../state/MeetingController';
import { S } from '../strings';
import { byTestId, findAll, findOne, textOf } from '../testUtil';

/* react 훅을 직접 제어해 Room 함수를 호출하고 반환된 엘리먼트 트리를 검사한다(DOM 없이 상태 전이·핸들러·효과를 시험). */
const h = vi.hoisted(() => ({
  slots: [] as unknown[],
  idx: 0,
  refs: [] as { current: unknown }[],
  refIdx: 0,
  effects: [] as { fn: () => void | (() => void); deps: unknown[] }[],
  state: undefined as unknown,
  narrow: false,
  queries: [] as string[],
  foreground: 0,
}));
vi.mock('react', async (orig) => ({
  ...(await orig<typeof ReactTypes>()),
  useState: (init: unknown) => {
    const i = h.idx++;
    if (!(i in h.slots)) h.slots[i] = init;
    const set = (v: unknown): void => {
      h.slots[i] = typeof v === 'function' ? (v as (c: unknown) => unknown)(h.slots[i]) : v;
    };
    return [h.slots[i], set];
  },
  useRef: (init: unknown) => {
    const i = h.refIdx++;
    if (!h.refs[i]) h.refs[i] = { current: init };
    return h.refs[i];
  },
  useMemo: (fn: () => unknown) => fn(),
  useCallback: (fn: unknown) => fn,
  useEffect: (fn: () => void | (() => void), deps: unknown[]) => {
    h.effects.push({ fn, deps });
  },
  useSyncExternalStore: (_s: unknown, get: () => unknown) => get(),
}));
vi.mock('../state/useMeeting', () => ({ useMeeting: () => h.state }));
vi.mock('../state/useForeground', () => ({ useForeground: () => void h.foreground++ }));
vi.mock('../lib/useMediaQuery', () => ({
  useMediaQuery: (q: string) => {
    h.queries.push(q);
    return h.narrow;
  },
}));

import { ChatPanel } from '../components/ChatPanel';
import { ConfirmModal } from '../components/ConfirmModal';
import { ControlBar } from '../components/ControlBar';
import { DeviceSheet } from '../components/DeviceSheet';
import { ParticipantsPanel } from '../components/ParticipantsPanel';
import { VideoGrid } from '../components/VideoGrid';
import { Room } from './Room';

const person = (id: string, joinSeq: number, over: Partial<PublicParticipant> = {}): PublicParticipant => ({ id, nickname: `사람${joinSeq}`, isHost: joinSeq === 1, audio: true, video: true, screen: false, connection: 'connected', joinSeq, ...over });
const mkState = (over: Partial<MeetingState> = {}): MeetingState => ({
  status: 'live', selfId: 'p1', hostId: 'p1', locked: false, participants: [person('p1', 1), person('p2', 2)], remote: {}, chat: [], unread: 0, micOn: true, camOn: true, sharing: false, quality: 'good', graceSec: 20, reconnectingSince: null, reconnectCause: 'network', toasts: [], ...over,
});
const ctl = () => ({
  toast: vi.fn(), markChatRead: vi.fn(), sendChat: vi.fn(), setLocked: vi.fn(() => Promise.resolve()), muteAll: vi.fn(() => Promise.resolve()), kick: vi.fn(() => Promise.resolve()), leave: vi.fn(() => Promise.resolve()),
  toggleMic: vi.fn(), toggleCamera: vi.fn(() => Promise.resolve()), startShare: vi.fn(() => Promise.resolve()), stopShare: vi.fn(() => Promise.resolve()), switchDevice: vi.fn(() => Promise.resolve()),
});
const media = { stream: vi.fn(() => ({ id: 'self' }) as unknown as MediaStream), subscribe: vi.fn(), getVersion: vi.fn(() => 1) };

let c: ReturnType<typeof ctl>;
let onEnded: ReturnType<typeof vi.fn<(r: EndReason) => void>>;
const render = () => {
  h.idx = 0;
  h.refIdx = 0;
  h.effects.length = 0;
  return Room({ controller: c as unknown as MeetingController, media: media as unknown as LocalMedia, roomId: 'room1', onEnded });
};
const press = (tree: unknown, id: string): void => (findOne(tree, byTestId(id), id).props.onClick as () => void)();
const barProp = (tree: unknown, name: string): () => void => findOne(tree, (e) => e.type === ControlBar, 'ControlBar').props[name] as () => void;
const modals = (tree: unknown) => findAll(tree, (e) => e.type === ConfirmModal).map((e) => e.props);
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));
const keys: ((e: { key: string }) => void)[] = [];

beforeEach(() => {
  h.slots = [];
  h.refs = [];
  h.narrow = false;
  h.queries = [];
  h.foreground = 0;
  h.state = mkState();
  c = ctl();
  onEnded = vi.fn<(r: EndReason) => void>();
  keys.length = 0;
  vi.stubGlobal('window', { addEventListener: vi.fn((_: string, cb: (e: { key: string }) => void) => keys.push(cb)), removeEventListener: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

describe('Room 회의실 (unit-09, FR-19, FR-22, UX-04, UX-12, UX-14)', () => {
  it('TC-466j [FR-19,UX-14] 상단 배너: 재연결 중(원인 network/foreground별 문구), 불안정, 정상(없음). 재연결이 불안정보다 우선한다', () => {
    const banner = (over: Partial<MeetingState>): string | null => {
      h.state = mkState(over);
      const t = findAll(render(), (e) => e.type === 'p' && e.props.role === 'status');
      return t[0] ? textOf(t[0]) : null;
    };
    expect(banner({})).toBeNull();
    expect(banner({ status: 'reconnecting', reconnectCause: 'network' })).toBe(S.room.reconnectingBanner);
    expect(banner({ status: 'reconnecting', reconnectCause: 'foreground' })).toBe(S.background.returned);
    expect(banner({ status: 'reconnecting', quality: 'poor' })).toBe(S.room.reconnectingBanner);
    expect(banner({ quality: 'poor' })).toBe(S.room.poorBanner);
    h.state = mkState({ quality: 'poor' });
    expect(findAll(render(), byTestId('poor-banner')).length).toBe(1);
    h.state = mkState();
    expect(findAll(render(), byTestId('poor-banner')).length).toBe(0);
    expect(h.foreground).toBeGreaterThan(0); // 복귀 감지 훅 연결
  });

  it('TC-466k [FR-02,UX-02] 혼자일 때만 "아직 아무도 없어요" 카드를 띄운다(1명 또는 0명), 2명이면 없다', () => {
    const has = (n: number): boolean => {
      h.state = mkState({ participants: Array.from({ length: n }, (_, i) => person(`p${i + 1}`, i + 1)) });
      return findAll(render(), byTestId('alone')).length === 1;
    };
    expect([has(0), has(1), has(2), has(6)]).toEqual([true, true, false, false]);
  });

  it('TC-466l [FR-14] 잠금 아이콘은 잠긴 방에서만 보이고 이름이 붙는다', () => {
    const lock = (locked: boolean): number => {
      h.state = mkState({ locked });
      return findAll(render(), (e) => e.props['aria-label'] === S.room.locked).length;
    };
    expect([lock(false), lock(true)]).toEqual([0, 1]);
  });

  it('TC-466m [UX-04,FR-11] 채팅·참가자 패널: 한 번에 하나만, 같은 버튼을 다시 누르면 닫힘. 넓은 화면은 옆 패널(aside w-340), 좁은 화면은 영상 위 덮개(absolute inset-0)', () => {
    let t = render();
    expect(findAll(t, (e) => e.type === 'aside').length).toBe(0);
    barProp(t, 'onChat')();
    t = render();
    const side = findAll(t, (e) => e.type === 'aside');
    expect(side.length).toBe(1);
    expect(String(side[0]?.props.className)).toContain('w-[340px]');
    expect(findAll(t, (e) => e.type === ChatPanel).length).toBe(1);
    expect(findOne(t, (e) => e.type === ControlBar, 'bar').props.chatOpen).toBe(true);
    barProp(t, 'onPeople')(); // 채팅 → 참가자로 전환
    t = render();
    expect(findAll(t, (e) => e.type === ChatPanel).length).toBe(0);
    expect(findAll(t, (e) => e.type === ParticipantsPanel).length).toBe(1);
    expect(findOne(t, (e) => e.type === ControlBar, 'bar').props).toMatchObject({ peopleOpen: true, chatOpen: false });
    barProp(t, 'onPeople')(); // 다시 누르면 닫힘
    t = render();
    expect(findAll(t, (e) => e.type === 'aside').length).toBe(0);
    // 좁은 화면
    h.narrow = true;
    barProp(t, 'onChat')();
    t = render();
    const over = findAll(t, (e) => e.type === 'aside');
    expect(over.length).toBe(1);
    expect(String(over[0]?.props.className)).toContain('absolute inset-0');
    expect(String(over[0]?.props.className)).not.toContain('w-[340px]');
    // 컨트롤바는 패널과 무관하게 항상 그려진다
    expect(findAll(t, (e) => e.type === ControlBar).length).toBe(1);
  });

  it('TC-466n [UX-10] Esc는 패널을 닫되, 확인창이나 장치 시트가 열려 있으면 패널을 닫지 않는다. 효과 해제 시 리스너를 뗀다', () => {
    let t = render();
    barProp(t, 'onChat')();
    render();
    // Esc 리스너 등록(effect 3개 중 마지막)
    const run = (): (() => void) => {
      keys.length = 0;
      const escEffect = h.effects[h.effects.length - 1] as { fn: () => () => void };
      return escEffect.fn();
    };
    const cleanup = run();
    keys[0]?.({ key: 'a' });
    t = render();
    expect(findAll(t, (e) => e.type === 'aside').length).toBe(1); // 다른 키는 무시
    keys[0]?.({ key: 'Escape' });
    t = render();
    expect(findAll(t, (e) => e.type === 'aside').length).toBe(0);
    cleanup();
    expect((window.removeEventListener as unknown as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('keydown', keys[0]);
    // 확인창이 열린 동안
    barProp(t, 'onChat')();
    barProp(t, 'onLeave')();
    render();
    run();
    keys[0]?.({ key: 'Escape' });
    t = render();
    expect(findAll(t, (e) => e.type === 'aside').length).toBe(1);
    expect(modals(t).length).toBe(1);
    // 장치 시트가 열린 동안
    (modals(t)[0]?.onCancel as () => void)();
    barProp(t, 'onDevices')();
    render();
    run();
    keys[0]?.({ key: 'Escape' });
    t = render();
    expect(findAll(t, (e) => e.type === 'aside').length).toBe(1);
    expect(findAll(t, (e) => e.type === DeviceSheet).length).toBe(1);
  });

  it('TC-466o [FR-22] 나가기: 확인창이 먼저 뜨고(위험 버튼), 취소하면 leave를 부르지 않으며, 확인해야 leave를 부른다', () => {
    let t = render();
    expect(modals(t).length).toBe(0);
    barProp(t, 'onLeave')();
    t = render();
    expect(modals(t).length).toBe(1);
    expect(modals(t)[0]).toMatchObject({ title: S.confirm.leaveTitle, body: S.confirm.leaveBody, confirmLabel: S.confirm.leaveConfirm, danger: true });
    expect(c.leave).not.toHaveBeenCalled();
    (modals(t)[0]?.onCancel as () => void)();
    t = render();
    expect(modals(t).length).toBe(0);
    expect(c.leave).not.toHaveBeenCalled();
    barProp(t, 'onLeave')();
    t = render();
    (modals(t)[0]?.onConfirm as () => void)();
    expect(c.leave).toHaveBeenCalledTimes(1);
  });

  it('TC-466p [FR-15,FR-16,SEC-05] 전체 음소거·내보내기도 확인창을 거치고, 확인 시 창을 닫은 뒤 해당 id로만 서버 호출한다(내보내기는 위험 버튼, 전체 음소거는 일반)', () => {
    let t = render();
    barProp(t, 'onPeople')();
    t = render();
    const panel = findOne(t, (e) => e.type === ParticipantsPanel, 'panel').props;
    expect(panel).toMatchObject({ selfId: 'p1', hostId: 'p1', locked: false });
    (panel.onToggleLock as () => void)();
    expect(c.setLocked).toHaveBeenCalledWith(true);
    // 전체 음소거
    (panel.onMuteAll as () => void)();
    t = render();
    expect(modals(t)[0]).toMatchObject({ title: S.confirm.muteAllTitle, confirmLabel: S.confirm.muteAllConfirm });
    expect(modals(t)[0]?.danger).toBeUndefined();
    expect(c.muteAll).not.toHaveBeenCalled();
    (modals(t)[0]?.onConfirm as () => void)();
    expect(c.muteAll).toHaveBeenCalledTimes(1);
    t = render();
    expect(modals(t).length).toBe(0);
    // 내보내기
    (findOne(t, (e) => e.type === ParticipantsPanel, 'panel').props.onKick as (p: PublicParticipant) => void)(person('p2', 2));
    t = render();
    expect(modals(t)[0]).toMatchObject({ title: S.confirm.kickTitle('사람2'), body: S.confirm.kickBody, confirmLabel: S.confirm.kickConfirm, danger: true });
    expect(c.kick).not.toHaveBeenCalled();
    (modals(t)[0]?.onConfirm as () => void)();
    expect(c.kick).toHaveBeenCalledWith('p2');
    expect(c.kick).toHaveBeenCalledTimes(1);
    t = render();
    expect(modals(t).length).toBe(0);
    // 취소는 서버 호출 없음
    (findOne(t, (e) => e.type === ParticipantsPanel, 'panel').props.onKick as (p: PublicParticipant) => void)(person('p3', 3));
    t = render();
    (modals(t)[0]?.onCancel as () => void)();
    expect(c.kick).toHaveBeenCalledTimes(1);
    expect(modals(render()).length).toBe(0);
  });

  it('TC-466q [FR-12,POL-12] 공유 버튼: 내 참가자 정보의 screen이 우선이고(없으면 state.sharing), 공유 중이면 중지·아니면 시작을 부른다', () => {
    let t = render();
    barProp(t, 'onShare')();
    expect([c.startShare.mock.calls.length, c.stopShare.mock.calls.length]).toEqual([1, 0]);
    expect(findOne(t, (e) => e.type === ControlBar, 'bar').props.sharing).toBe(false);
    h.state = mkState({ participants: [person('p1', 1, { screen: true }), person('p2', 2)] });
    t = render();
    expect(findOne(t, (e) => e.type === ControlBar, 'bar').props.sharing).toBe(true);
    barProp(t, 'onShare')();
    expect([c.startShare.mock.calls.length, c.stopShare.mock.calls.length]).toEqual([1, 1]);
    // 서버 목록에는 없는데 로컬 state.sharing만 true인 경우(내 정보가 목록에 없음)
    h.state = mkState({ participants: [person('p2', 2)], sharing: true });
    expect(findOne(render(), (e) => e.type === ControlBar, 'bar').props.sharing).toBe(true);
    // 목록의 내 정보가 screen=false면 state.sharing(true)보다 서버 값을 따른다
    h.state = mkState({ sharing: true });
    expect(findOne(render(), (e) => e.type === ControlBar, 'bar').props.sharing).toBe(false);
  });

  it('TC-455d [UX-04,FR-08] 컨트롤바에 마이크·카메라 상태·읽지 않음·참가자 수가 그대로 전달되고 마이크·카메라 버튼이 컨트롤러에 연결된다', () => {
    h.state = mkState({ micOn: false, camOn: false, unread: 4, participants: [person('p1', 1), person('p2', 2), person('p3', 3)] });
    const t = render();
    expect(findOne(t, (e) => e.type === ControlBar, 'bar').props).toMatchObject({ micOn: false, camOn: false, unread: 4, count: 3 });
    barProp(t, 'onMic')();
    barProp(t, 'onCamera')();
    expect([c.toggleMic.mock.calls.length, c.toggleCamera.mock.calls.length]).toEqual([1, 1]);
  });

  it('TC-466r [FR-11,UX-12] 채팅 패널을 열면 읽음 처리하고, 열려 있는 동안 unread가 늘 때마다 다시 읽음 처리한다(효과 의존성에 unread 포함). 닫혀 있으면 호출하지 않는다', () => {
    render();
    const readEffect = (): { fn: () => void; deps: unknown[] } => h.effects[1] as { fn: () => void; deps: unknown[] };
    readEffect().fn();
    expect(c.markChatRead).not.toHaveBeenCalled();
    barProp(render(), 'onChat')();
    h.state = mkState({ unread: 2 });
    render();
    readEffect().fn();
    expect(c.markChatRead).toHaveBeenCalledTimes(1);
    expect(readEffect().deps).toContain(2); // unread가 의존성에 들어 있어 값이 바뀌면 다시 실행된다
    // 채팅 패널에 메시지·전송 핸들러 연결
    const t = render();
    h.state = mkState({ chat: [] });
    const chat = findOne(t, (e) => e.type === ChatPanel, 'chat').props;
    (chat.onSend as (t: string) => void)('안녕');
    expect(c.sendChat).toHaveBeenCalledWith('안녕');
  });

  it('TC-466s [FR-22,FR-17] 회의가 끝났고 사유가 있을 때만 onEnded(사유)를 한 번 알린다(진행 중·사유 없음은 알리지 않는다)', () => {
    const fire = (over: Partial<MeetingState>): void => {
      h.state = mkState(over);
      render();
      (h.effects[0] as { fn: () => void }).fn();
    };
    fire({});
    fire({ status: 'ended' });
    fire({ status: 'live', endReason: 'kicked' });
    expect(onEnded).not.toHaveBeenCalled();
    fire({ status: 'ended', endReason: 'kicked' });
    expect(onEnded).toHaveBeenCalledTimes(1);
    expect(onEnded).toHaveBeenCalledWith('kicked');
    for (const r of ['left', 'expired', 'closed', 'restarted', 'operator'] as const) fire({ status: 'ended', endReason: r });
    expect(onEnded.mock.calls.map((x) => x[0])).toEqual(['kicked', 'left', 'expired', 'closed', 'restarted', 'operator']);
  });

  it('TC-466t [UX-15] 자동재생 배너: 차단된 영상이 있을 때만 보이고, 같은 요소의 중복 보고는 개수를 늘리지 않으며 해제하면 사라진다', () => {
    let t = render();
    expect(findAll(t, byTestId('autoplay-banner')).length).toBe(0);
    const onBlocked = findOne(t, (e) => e.type === VideoGrid, 'grid').props.onPlayBlocked as (el: unknown, b: boolean) => void;
    const a = { play: vi.fn() };
    const b = { play: vi.fn() };
    onBlocked(a, true);
    onBlocked(a, true);
    onBlocked(b, true);
    t = render();
    expect(findAll(t, byTestId('autoplay-banner')).length).toBe(1);
    expect(h.slots[4]).toBe(2);
    onBlocked(a, false);
    onBlocked(a, false); // 없는 요소 해제는 무시
    expect(h.slots[4]).toBe(1);
    onBlocked(b, false);
    t = render();
    expect(findAll(t, byTestId('autoplay-banner')).length).toBe(0);
  });

  it('TC-466u [UX-15] 탭하여 재생: 막힌 모든 요소의 play()를 먼저 시작하고, 전부 성공하면 시작 토스트+무대 포커스, 일부 실패하면 경고 토스트(포커스 없음)', async () => {
    let t = render();
    const onBlocked = findOne(t, (e) => e.type === VideoGrid, 'grid').props.onPlayBlocked as (el: unknown, b: boolean) => void;
    const ok1 = { play: vi.fn(() => Promise.resolve()) };
    const ok2 = { play: vi.fn(() => Promise.resolve()) };
    onBlocked(ok1, true);
    onBlocked(ok2, true);
    t = render();
    const focus = vi.fn();
    (h.refs[1] as { current: unknown }).current = { focus };
    press(t, 'autoplay-button');
    expect(ok1.play).toHaveBeenCalledTimes(1); // await 이전(동기)에 모두 시작해야 사용자 제스처가 유지된다
    expect(ok2.play).toHaveBeenCalledTimes(1);
    await flush();
    expect(c.toast).toHaveBeenCalledWith(S.autoplay.started);
    expect(focus).toHaveBeenCalledTimes(1);
    expect(h.slots[4]).toBe(0);
    // 일부 실패
    c.toast.mockClear();
    focus.mockClear();
    const good = { play: vi.fn(() => Promise.resolve()) };
    const bad = { play: vi.fn(() => Promise.reject(new DOMException('x', 'NotAllowedError'))) };
    onBlocked(good, true);
    onBlocked(bad, true);
    t = render();
    press(t, 'autoplay-button');
    await flush();
    expect(c.toast).toHaveBeenCalledWith(S.autoplay.stillBlocked, 'warn');
    expect(c.toast).toHaveBeenCalledTimes(1);
    expect(focus).not.toHaveBeenCalled();
    expect(h.slots[4]).toBe(1); // 실패한 요소는 남아 있어 배너가 유지된다
    expect(findAll(render(), byTestId('autoplay-banner')).length).toBe(1);
  });

  it('TC-466v [UX-15] 장치 시트: 열고 닫을 수 있고, 출력 장치 선택은 그리드(sinkId)로 전달되며 장치 전환은 컨트롤러로 간다. 모바일 상단 설정 버튼도 시트를 연다', () => {
    let t = render();
    expect(findAll(t, (e) => e.type === DeviceSheet).length).toBe(0);
    expect(findOne(t, (e) => e.type === VideoGrid, 'grid').props.sinkId).toBeUndefined();
    press(t, 'btn-devices-top');
    t = render();
    const sheet = findOne(t, (e) => e.type === DeviceSheet, 'sheet').props;
    (sheet.onSink as (id: string) => void)('spk9');
    (sheet.onSwitch as (k: string, id: string) => void)('audioinput', 'mic2');
    expect(c.switchDevice).toHaveBeenCalledWith('audioinput', 'mic2');
    t = render();
    expect(findOne(t, (e) => e.type === VideoGrid, 'grid').props.sinkId).toBe('spk9');
    (findOne(t, (e) => e.type === DeviceSheet, 'sheet').props.onClose as () => void)();
    expect(findAll(render(), (e) => e.type === DeviceSheet).length).toBe(0);
    barProp(render(), 'onDevices')();
    expect(findAll(render(), (e) => e.type === DeviceSheet).length).toBe(1);
  });

  it('TC-466w [UX-12,FR-19] 상태 표시(배지·토스트·그리드)에 현재 상태가 그대로 전달되고 data-status가 상태를 따른다', () => {
    h.state = mkState({ status: 'reconnecting', toasts: [{ id: 1, text: '알림', kind: 'info' }] });
    const t = render();
    expect((t as unknown as { props: Record<string, unknown> }).props['data-status']).toBe('reconnecting');
    expect(findOne(t, (e) => typeof e.type === 'function' && (e.type as { name: string }).name === 'Toasts', 'toasts').props.toasts).toEqual([{ id: 1, text: '알림', kind: 'info' }]);
    expect(findOne(t, (e) => e.type === VideoGrid, 'grid').props.state).toBe(h.state);
    expect(findOne(t, (e) => e.type === VideoGrid, 'grid').props.selfStream).toEqual({ id: 'self' });
  });

  it('TC-466x [NFR-10,UX-04] 회의실의 좁은 화면 기준은 767px 이하(패널 덮개 전환 질의)다', () => {
    render();
    expect(h.queries).toEqual(['(max-width: 767px)']);
  });
});
