import type * as React from 'react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byId, byTestId, byType, findAll, fire, mount, submitEvent, textOf, type Mounted } from '../testing/hookHarness';

vi.mock('react', async (orig) => {
  const actual = await orig<typeof React>();
  const { fakeHooks } = await import('../testing/hookHarness');
  return { ...actual, ...fakeHooks, default: { ...actual, ...fakeHooks } };
});
vi.mock('../lib/media', () => ({ listDevices: vi.fn() }));
vi.mock('../lib/audioLevel', () => ({ useAudioLevel: vi.fn(() => ({ level: 0, speaking: false })) }));

import { useAudioLevel } from '../lib/audioLevel';
import { listDevices, type LocalMedia, type MediaErrorKind } from '../lib/media';
import { S } from '../strings';
import { Lobby } from './Lobby';

type P = Parameters<typeof Lobby>[0];
interface FakeMedia {
  audio: object | null;
  video: object | null;
  micOn: boolean;
  camOn: boolean;
  errors: { audio?: MediaErrorKind; video?: MediaErrorKind };
  audioDeviceId?: string;
  videoDeviceId?: string;
  subscribe: () => () => void;
  getVersion: () => number;
  stream: () => object;
  start: ReturnType<typeof vi.fn<(o: { audio: boolean; video: boolean }) => Promise<void>>>;
  setMic: ReturnType<typeof vi.fn>;
  setCamera: ReturnType<typeof vi.fn>;
  switchDevice: ReturnType<typeof vi.fn>;
}
const flush = async (): Promise<void> => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
const dev = (kind: string, deviceId: string, label: string): MediaDeviceInfo => ({ kind, deviceId, label, groupId: '' }) as MediaDeviceInfo;
const fakeMedia = (over: Partial<FakeMedia> = {}): FakeMedia => ({
  audio: {},
  video: {},
  micOn: true,
  camOn: true,
  errors: {},
  audioDeviceId: 'm1',
  videoDeviceId: undefined,
  subscribe: () => () => undefined,
  getVersion: () => 0,
  stream: () => ({}),
  start: vi.fn<(o: { audio: boolean; video: boolean }) => Promise<void>>(() => Promise.resolve()),
  setMic: vi.fn(),
  setCamera: vi.fn(),
  switchDevice: vi.fn(),
  ...over,
});

let m: FakeMedia;
let props: P;
let view: Mounted<P>;
const setup = async (media: Partial<FakeMedia> = {}, p: Partial<P> = {}): Promise<void> => {
  m = fakeMedia(media);
  props = { roomId: 'AbCdEfGhIjKlMnOpQrStUv', isHost: false, needsPassword: false, initialNickname: '민지', media: m as unknown as LocalMedia, onJoin: vi.fn(() => Promise.resolve(null)), onCancel: vi.fn(), ...p };
  view = mount(Lobby, props);
  await flush();
};
const joinBtn = (): ReactElement<Record<string, unknown>> | undefined => byTestId(view.tree, 'join-button');
const form = (): ReactElement<Record<string, unknown>> | undefined => byType(view.tree, 'form')[0];
const alerts = (): string => byType(view.tree, 'p').filter((p) => p.props.role === 'alert').map(textOf).join('|');
const typeNick = (v: string): void => void fire(byTestId(view.tree, 'lobby-nickname'), 'onChange', { target: { value: v } });
const submit = async (): Promise<void> => void (await fire(form(), 'onSubmit', submitEvent()));

beforeEach(() => {
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 Chrome/130', mediaDevices: undefined });
  vi.mocked(listDevices).mockResolvedValue({ audioinput: [dev('audioinput', 'm1', '내장 마이크'), dev('audioinput', 'm2', '')], videoinput: [], audiooutput: [] });
  vi.mocked(useAudioLevel).mockReturnValue({ level: 0, speaking: false });
});
afterEach(() => {
  view.unmount();
  vi.unstubAllGlobals();
});

describe('대기실 동작 (unit-08, FR-03, FR-04, FR-05, UX-03)', () => {
  it('TC-453l [FR-04] 마운트 때 카메라·마이크를 한 번만 요청하고(리렌더 무관), 준비되기 전에는 입장 버튼이 꺼져 있다가 준비되면 켜진다', async () => {
    let done: () => void = () => undefined;
    m = fakeMedia({ video: null, start: vi.fn(() => new Promise<void>((r) => (done = r))) });
    props = { roomId: 'r'.repeat(22), isHost: false, needsPassword: false, initialNickname: '민지', media: m as unknown as LocalMedia, onJoin: vi.fn(), onCancel: vi.fn() };
    view = mount(Lobby, props, { strict: true }); // StrictMode처럼 효과를 두 번 돌려도 장치 요청은 한 번
    expect(m.start).toHaveBeenCalledTimes(1);
    expect(m.start).toHaveBeenCalledWith({ audio: true, video: true });
    expect(joinBtn()?.props.disabled).toBe(true);
    expect(textOf(byTestId(view.tree, 'preview'))).toContain(S.state.loading.title);
    view.rerender(props);
    expect(m.start).toHaveBeenCalledTimes(1);
    done();
    await flush();
    expect(joinBtn()?.props.disabled).toBe(false);
    expect(textOf(byTestId(view.tree, 'preview'))).toContain(S.lobby.cameraOff);
  });

  it('TC-453m [FR-03,UX-03] 닉네임이 규칙 위반이면 입장을 시도하지 않고 안내하며, 유효하면 정규화한 닉네임과 비밀번호로 onJoin을 부른다', async () => {
    await setup({}, { needsPassword: true });
    for (const bad of ['', '   ', 'a'.repeat(21), '<script>']) {
      typeNick(bad);
      await submit();
      expect(alerts(), JSON.stringify(bad)).toBe(S.lobby.invalidNickname);
    }
    expect(props.onJoin).not.toHaveBeenCalled();
    typeNick('  지우  ');
    fire(byTestId(view.tree, 'lobby-password'), 'onChange', { target: { value: 'pw1234' } });
    await submit();
    expect(props.onJoin).toHaveBeenCalledWith('지우', 'pw1234');
    expect(alerts()).toBe('');
  });

  it('TC-453n [FR-05,UX-03] onJoin이 돌려준 오류 문구는 입력 화면에 role=alert로 남고(입력값 유지) 버튼이 다시 활성화된다; 성공(null)이면 오류가 없다; 처리 중에는 "입장하는 중…"이고 비활성이다', async () => {
    let release: (v: string | null) => void = () => undefined;
    await setup({}, { onJoin: vi.fn(() => new Promise<string | null>((r) => (release = r))) });
    const pending = submit();
    expect(joinBtn()?.props.disabled).toBe(true);
    expect(textOf(joinBtn())).toBe(S.lobby.joining);
    release(S.lobby.wrongPassword);
    await pending;
    expect(alerts()).toBe(S.lobby.wrongPassword);
    expect(joinBtn()?.props.disabled).toBe(false);
    expect(byTestId(view.tree, 'lobby-nickname')?.props.value).toBe('민지');
    (props.onJoin as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
    await submit();
    expect(alerts()).toBe(''); // 새 시도 시작 때 이전 오류 제거
  });

  it('TC-453o [FR-05] 비밀번호 칸은 비밀번호 방의 참가자에게만 보이고(호스트·공개 방에는 없음), 호스트 배지는 호스트에게만 보인다', async () => {
    await setup({}, { needsPassword: true, isHost: false });
    expect(byId(view.tree, 'lobby-password')?.props.type).toBe('password');
    expect(byId(view.tree, 'lobby-password')?.props.maxLength).toBe(32);
    expect(byId(view.tree, 'lobby-password')?.props.autoComplete).toBe('off');
    expect(textOf(view.tree)).not.toContain(S.lobby.hostBadge);
    view.rerender({ ...props, isHost: true });
    expect(byId(view.tree, 'lobby-password')).toBeUndefined();
    expect(textOf(view.tree)).toContain(S.lobby.hostBadge);
    view.rerender({ ...props, isHost: false, needsPassword: false });
    expect(byId(view.tree, 'lobby-password')).toBeUndefined();
  });

  it('TC-453p [FR-04,UX-03] 장치가 하나도 없으면(준비 끝) 버튼이 "장치 없이 입장"이고 입장은 막히지 않는다; 하나라도 있으면 "회의 입장"', async () => {
    m = fakeMedia({ audio: null, video: null, start: vi.fn(() => new Promise<void>(() => undefined)) });
    props = { roomId: 'r'.repeat(22), isHost: false, needsPassword: false, initialNickname: '민지', media: m as unknown as LocalMedia, onJoin: vi.fn(), onCancel: vi.fn() };
    view = mount(Lobby, props);
    expect(textOf(joinBtn())).toBe(S.lobby.join); // 준비 중에는 아직 "장치 없이"라고 단정하지 않는다
    expect(joinBtn()?.props.disabled).toBe(true);
    view.unmount();
    await setup({ audio: null, video: null });
    expect(textOf(joinBtn())).toBe(S.lobby.joinWithoutDevices);
    expect(joinBtn()?.props.disabled).toBe(false);
    view.unmount();
    await setup({ audio: null, video: {} });
    expect(textOf(joinBtn())).toBe(S.lobby.join);
  });

  it('TC-453q [FR-04,UX-03] 권한 문제는 원인 4종별 문구를 role=alert로 보이고(카메라 오류 우선), 다시 확인을 누르면 재요청하며, 앱 안 브라우저 안내를 펼친다(forceOpenInApp)', async () => {
    const kinds: MediaErrorKind[] = ['denied', 'notFound', 'inUse', 'unknown'];
    const text = { denied: S.state.permission.denied, notFound: S.state.permission.notFound, inUse: S.state.permission.inUse, unknown: S.state.permission.unknown };
    for (const k of kinds) {
      await setup({ errors: { video: k, audio: 'unknown' } });
      const box = byTestId(view.tree, 'permission-problem');
      expect(box?.props.role).toBe('alert');
      expect(textOf(box)).toContain(text[k]);
      expect(textOf(box)).toContain(S.state.permission.title);
      expect((view.tree as ReactElement<Record<string, unknown>>).props.forceOpenInApp).toBe(true);
      view.unmount();
    }
    await setup({ errors: { audio: 'inUse' } });
    expect(textOf(byTestId(view.tree, 'permission-problem'))).toContain(S.state.permission.inUse);
    const retry = byType(byTestId(view.tree, 'permission-problem'), 'button')[0];
    expect(textOf(retry)).toBe(S.state.permission.retry);
    fire(retry, 'onClick');
    expect(m.start).toHaveBeenCalledTimes(2);
    expect(joinBtn()?.props.disabled).toBe(true); // 재확인 동안 다시 준비 중
    await flush();
    expect(joinBtn()?.props.disabled).toBe(false);
    view.unmount();
    await setup();
    expect(byTestId(view.tree, 'permission-problem')).toBeUndefined();
    expect((view.tree as ReactElement<Record<string, unknown>>).props.forceOpenInApp).toBe(false);
  });

  it('TC-453r [FR-04,UX-10] 인앱 브라우저이면 권한 문제에 추가 안내(inApp.permissionExtra)를 붙이고, 일반 브라우저에는 붙이지 않는다', async () => {
    await setup({ errors: { video: 'denied' } });
    expect(textOf(byTestId(view.tree, 'permission-problem'))).not.toContain(S.inApp.permissionExtra);
    view.unmount();
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 KAKAOTALK 10.0.0', mediaDevices: undefined });
    await setup({ errors: { video: 'denied' } });
    expect(textOf(byTestId(view.tree, 'permission-problem'))).toContain(S.inApp.permissionExtra);
  });

  it('TC-453s [FR-04,FR-08,UX-10] 마이크·카메라 토글: aria-pressed·aria-label이 상태를 따르고 누르면 반대 값으로 호출하며, 마이크 장치가 없으면 마이크 버튼은 비활성이다', async () => {
    await setup();
    const mic = byTestId(view.tree, 'lobby-mic');
    const cam = byTestId(view.tree, 'lobby-camera');
    expect(mic?.props['aria-label']).toBe(S.room.mute);
    expect(mic?.props['aria-pressed']).toBe(false);
    expect(cam?.props['aria-label']).toBe(S.room.cameraOffAction);
    expect(cam?.props['aria-pressed']).toBe(false);
    fire(mic, 'onClick');
    fire(cam, 'onClick');
    expect(m.setMic).toHaveBeenCalledWith(false);
    expect(m.setCamera).toHaveBeenCalledWith(false);
    view.unmount();
    await setup({ micOn: false, camOn: false, audio: null });
    expect(byTestId(view.tree, 'lobby-mic')?.props['aria-label']).toBe(S.room.unmute);
    expect(byTestId(view.tree, 'lobby-mic')?.props['aria-pressed']).toBe(true);
    expect(byTestId(view.tree, 'lobby-mic')?.props.disabled).toBe(true);
    expect(byTestId(view.tree, 'lobby-camera')?.props['aria-label']).toBe(S.room.cameraOn);
    expect(byTestId(view.tree, 'lobby-camera')?.props['aria-pressed']).toBe(true);
    fire(byTestId(view.tree, 'lobby-camera'), 'onClick');
    expect(m.setCamera).toHaveBeenLastCalledWith(true);
    expect(byTestId(view.tree, 'preview-video')?.props.className).toContain('hidden'); // 카메라 끔 → 영상 숨김
  });

  it('TC-453t [FR-04] 장치 선택: 이름(빈 이름은 "마이크 2")·현재 장치 선택·장치 없음 비활성, 선택하면 종류와 ID로 switchDevice를 부른다', async () => {
    await setup();
    const mic = byId(view.tree, 'lobby-mic-select');
    expect(mic?.props.value).toBe('m1');
    expect(byType(mic?.props.children as never, 'option').map(textOf)).toEqual(['내장 마이크', `${S.lobby.mic} 2`]);
    const cam = byId(view.tree, 'lobby-cam-select');
    expect(cam?.props.disabled).toBe(true);
    expect(textOf(cam?.props.children as never)).toBe(S.lobby.noDevice);
    fire(mic, 'onChange', { target: { value: 'm2' } });
    expect(m.switchDevice).toHaveBeenCalledWith('audio', 'm2');
    fire(cam, 'onChange', { target: { value: 'c9' } });
    expect(m.switchDevice).toHaveBeenCalledWith('video', 'c9');
  });

  it('TC-453u [FR-04,UX-10] 마이크 레벨 미터는 role=meter, 0~100 범위이며 값은 level×100 반올림이다; 개인정보(IP) 고지·취소·초대 링크 복사가 있다', async () => {
    vi.mocked(useAudioLevel).mockReturnValue({ level: 0.456, speaking: false });
    await setup();
    const meter = byType(view.tree, 'div').find((d) => d.props.role === 'meter');
    expect(meter?.props['aria-valuenow']).toBe(46);
    expect(meter?.props['aria-valuemin']).toBe(0);
    expect(meter?.props['aria-valuemax']).toBe(100);
    expect(meter?.props['aria-label']).toBe(S.lobby.micLevel);
    expect(textOf(byTestId(view.tree, 'privacy-notice'))).toBe(S.lobby.privacy);
    const cancel = byType(view.tree, 'button').find((b) => textOf(b) === S.lobby.cancel);
    fire(cancel, 'onClick');
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(byType(view.tree, 'button').filter((b) => b.props.type === 'submit')).toHaveLength(1);
  });

  it('TC-453v [FR-04] 장치 목록은 devicechange 때 다시 읽고, 닫히면 구독을 해제하며 해제 뒤 응답은 반영하지 않는다', async () => {
    const add = vi.fn();
    const remove = vi.fn();
    vi.stubGlobal('navigator', { userAgent: 'Chrome', mediaDevices: { addEventListener: add, removeEventListener: remove } });
    await setup();
    expect(add).toHaveBeenCalledWith('devicechange', expect.any(Function));
    const calls = vi.mocked(listDevices).mock.calls.length;
    (add.mock.calls[0]?.[1] as () => void)();
    expect(vi.mocked(listDevices).mock.calls.length).toBe(calls + 1);
    // 장치 구성(version)이 바뀌면(권한 허용 뒤 이름이 보이게 됨) 목록을 다시 읽는다
    m.getVersion = () => 1;
    view.rerender(props);
    await flush();
    expect(vi.mocked(listDevices).mock.calls.length).toBe(calls + 2);
    expect(remove).toHaveBeenCalledTimes(1); // 이전 구독 정리
    view.unmount();
    expect(remove).toHaveBeenCalledTimes(2);
    expect(remove).toHaveBeenLastCalledWith('devicechange', add.mock.calls[1]?.[1]);
  });

  it('TC-453w [FR-04] 해제(언마운트) 뒤에 도착한 장치 목록 응답은 반영하지 않는다', async () => {
    let resolve: (v: Awaited<ReturnType<typeof listDevices>>) => void = () => undefined;
    vi.mocked(listDevices).mockReturnValue(new Promise((r) => (resolve = r)));
    await setup();
    view.unmount();
    resolve({ audioinput: [dev('audioinput', 'late', '늦게 온 장치')], videoinput: [], audiooutput: [] });
    await flush();
    view.rerender(props);
    expect(textOf(byId(view.tree, 'lobby-mic-select')?.props.children as never)).toBe(S.lobby.noDevice);
  });

  // DEF-001(후보): 권한 프롬프트가 닫히기만 하고 getUserMedia가 끝나지 않는 브라우저(Firefox "나중에" 등, 실제 브라우저 재현은 미검증)에서
  // 입장 버튼이 영구 비활성이다. 제품 코드는 수정하지 않으므로 기대 동작(일정 시간 뒤 입장 가능)을 it.fails로 남긴다. 수정되면 이 시험이 "예상 밖 통과"로 바뀌어 알려 준다.
  it.fails('TC-453y [FR-04,NFR-01] 장치 요청이 끝나지 않아도 일정 시간(30초) 뒤에는 입장 버튼이 다시 활성화된다(현재는 영구 비활성 — DEF-001)', async () => {
    vi.useFakeTimers();
    try {
      await setup({ start: vi.fn(() => new Promise<void>(() => undefined)) });
      expect(joinBtn()?.props.disabled).toBe(true);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(joinBtn()?.props.disabled).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('TC-453x [FR-02] 대기실의 초대 링크 복사는 이 방의 ID로 만든다', async () => {
    await setup();
    const links = findAll(view.tree, (e) => typeof e.type === 'function' && e.type.name === 'CopyLink');
    expect(links).toHaveLength(1);
    expect(links[0]?.props.roomId).toBe(props.roomId);
  });
});
