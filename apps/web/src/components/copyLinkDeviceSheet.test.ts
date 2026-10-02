import type * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { byId, byTestId, byType, fire, mount, textOf } from '../testing/hookHarness';

vi.mock('react', async (orig) => {
  const actual = await orig<typeof React>();
  const { fakeHooks } = await import('../testing/hookHarness');
  return { ...actual, ...fakeHooks, default: { ...actual, ...fakeHooks } };
});
vi.mock('../lib/media', () => ({ listDevices: vi.fn() }));

import { listDevices, type LocalMedia } from '../lib/media';
import { S } from '../strings';
import { CopyLink, roomLink } from './CopyLink';
import { DeviceSheet } from './DeviceSheet';

const ROOM = 'AbCdEfGhIjKlMnOpQrStUv';
const flush = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('window', { location: { origin: 'https://meet.example' } });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('링크 복사 (unit-08, FR-02, UX-03)', () => {
  it('TC-469s [FR-02] 방 ID가 있으면 <origin>/r/<ID>, url이 있으면 그 값, 둘 다 없으면 origin을 복사하고 성공을 알린다(라벨·onCopied(true))', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(roomLink(ROOM)).toBe(`https://meet.example/r/${ROOM}`);
    const onCopied = vi.fn();
    for (const [props, want] of [
      [{ roomId: ROOM }, `https://meet.example/r/${ROOM}`],
      [{ url: 'https://site.example', roomId: ROOM }, 'https://site.example'],
      [{}, 'https://meet.example'],
    ] as const) {
      const v = mount(CopyLink, { ...props, onCopied });
      expect(textOf(byTestId(v.tree, 'copy-link'))).toBe(S.lobby.copyLink);
      await fire(byTestId(v.tree, 'copy-link'), 'onClick');
      expect(writeText).toHaveBeenLastCalledWith(want);
      expect(byTestId(v.tree, 'copy-link')?.props['aria-label']).toBe(S.lobby.copied);
      expect(textOf(byTestId(v.tree, 'copy-link'))).toBe(S.lobby.copied);
      expect(byType(v.tree, 'input')).toHaveLength(0); // 성공 시 대체 입력창 없음
      v.unmount();
    }
    expect(onCopied.mock.calls).toEqual([[true], [true], [true]]);
  });

  it('TC-469t [FR-02,UX-03] 복사 표시는 2.5초 뒤 원래 문구로 돌아온다(2.4초에는 유지)', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: () => Promise.resolve() } });
    const v = mount(CopyLink, { roomId: ROOM });
    await fire(byTestId(v.tree, 'copy-link'), 'onClick');
    vi.advanceTimersByTime(2400);
    expect(textOf(byTestId(v.tree, 'copy-link'))).toBe(S.lobby.copied);
    vi.advanceTimersByTime(100);
    expect(textOf(byTestId(v.tree, 'copy-link'))).toBe(S.lobby.copyLink);
  });

  it('TC-469u [FR-02,UX-03] 클립보드가 거부되거나 없으면 실패를 알리고(role=status) 읽기 전용 입력창에 링크를 보여 주며 onCopied(false), 예외는 밖으로 나오지 않는다', async () => {
    for (const nav of [{ clipboard: { writeText: () => Promise.reject(new Error('NotAllowedError')) } }, {}]) {
      vi.stubGlobal('navigator', nav);
      const onCopied = vi.fn();
      const v = mount(CopyLink, { roomId: ROOM, onCopied });
      await expect(Promise.resolve(fire(byTestId(v.tree, 'copy-link'), 'onClick'))).resolves.toBeUndefined();
      const [input] = byType(v.tree, 'input');
      expect(input?.props.readOnly).toBe(true);
      expect(input?.props.value).toBe(`https://meet.example/r/${ROOM}`);
      expect(byType(v.tree, 'p').find((p) => p.props.role === 'status')).toBeDefined();
      expect(textOf(v.tree)).toContain(S.lobby.copyFailed);
      expect(onCopied).toHaveBeenCalledWith(false);
      expect(textOf(byTestId(v.tree, 'copy-link'))).toBe(S.lobby.copyLink); // 성공 문구로 오표시 금지
      // 포커스 시 전체 선택
      const select = vi.fn();
      fire(input, 'onFocus', { currentTarget: { select } });
      expect(select).toHaveBeenCalled();
    }
  });

  it('TC-469v [UX-10,NFR-10] 버튼은 type=button이고 접근 가능한 이름이 있으며, compact는 모바일에서 글자를 숨겨도 aria-label은 남고, 사용자 지정 testId·label이 적용된다', () => {
    vi.stubGlobal('navigator', {});
    const v = mount(CopyLink, { roomId: ROOM, compact: true, testId: 'x-copy', label: '사이트 주소 복사' });
    const btn = byTestId(v.tree, 'x-copy');
    expect(btn?.props.type).toBe('button');
    expect(btn?.props['aria-label']).toBe('사이트 주소 복사');
    expect(byType(btn?.props.children as never, 'span')[0]?.props.className).toContain('hidden');
    const inline = mount(CopyLink, { roomId: ROOM, compact: true, inline: true });
    expect(byType(byTestId(inline.tree, 'copy-link')?.props.children as never, 'span')[0]?.props.className).not.toContain('hidden');
  });
});

describe('장치 시트 (unit-08, FR-09, UX-10)', () => {
  const dev = (kind: string, deviceId: string, label: string): MediaDeviceInfo => ({ kind, deviceId, label, groupId: '' }) as MediaDeviceInfo;
  const media = (over: Record<string, unknown> = {}): LocalMedia => ({ audioDeviceId: 'm2', videoDeviceId: undefined, ...over }) as unknown as LocalMedia;
  const props = (over: Partial<Parameters<typeof DeviceSheet>[0]> = {}): Parameters<typeof DeviceSheet>[0] => ({ media: media(), sinkId: '', onSwitch: vi.fn(), onSink: vi.fn(), onClose: vi.fn(), ...over });
  const lists = (): void =>
    void vi.mocked(listDevices).mockResolvedValue({
      audioinput: [dev('audioinput', 'm1', '내장 마이크'), dev('audioinput', 'm2', '')],
      videoinput: [],
      audiooutput: [dev('audiooutput', 's1', '스피커 1')],
    });
  const key = (k: string, extra: Record<string, unknown> = {}): { key: string; shiftKey: boolean; preventDefault: () => void; prevented: boolean } => {
    const e = { key: k, shiftKey: false, prevented: false, preventDefault: () => (e.prevented = true), ...extra };
    return e;
  };
  const root = (v: { tree: unknown }): never => v.tree as never;
  beforeEach(() => vi.stubGlobal('document', { activeElement: null }));

  it('TC-469w [FR-09] 마이크·카메라 목록은 장치 이름(비면 "마이크 2" 대체)으로, 현재 장치를 선택한 채 보이고 비면 "선택 가능한 장치가 없습니다"와 함께 비활성이다', async () => {
    lists();
    const v = mount(DeviceSheet, props());
    await flush();
    v.rerender(props());
    const mic = byId(root(v), 'dev-mic');
    expect(mic?.props.value).toBe('m2');
    expect(mic?.props.disabled).toBe(false);
    expect(byType(mic?.props.children as never, 'option').map(textOf)).toEqual(['내장 마이크', `${S.devices.mic} 2`]);
    const cam = byId(root(v), 'dev-cam');
    expect(cam?.props.disabled).toBe(true);
    expect(cam?.props.value).toBe('');
    expect(textOf(cam?.props.children as never)).toBe(S.devices.none);
  });

  it('TC-469x [FR-09] 선택하면 종류(audio/video)와 deviceId가 그대로 전달된다; 스피커 선택은 setSinkId 지원 브라우저에서만 나오고 아니면 안내문이 나온다', async () => {
    lists();
    vi.stubGlobal('HTMLMediaElement', { prototype: {} });
    const p = props();
    let v = mount(DeviceSheet, p);
    await flush();
    v.rerender(p);
    fire(byId(root(v), 'dev-mic'), 'onChange', { target: { value: 'm1' } });
    expect(p.onSwitch).toHaveBeenCalledWith('audio', 'm1');
    expect(byId(root(v), 'dev-spk')).toBeUndefined();
    expect(textOf(v.tree)).toContain(S.devices.speakerUnsupported);
    v.unmount();
    vi.stubGlobal('HTMLMediaElement', { prototype: { setSinkId: () => undefined } });
    v = mount(DeviceSheet, p);
    await flush();
    v.rerender(p);
    fire(byId(root(v), 'dev-spk'), 'onChange', { target: { value: 's1' } });
    expect(p.onSink).toHaveBeenCalledWith('s1');
    expect(textOf(v.tree)).not.toContain(S.devices.speakerUnsupported);
  });

  it('TC-469y [UX-10,NFR-09] Esc는 닫기, 대화상자는 role=dialog·aria-modal·이름이 있고, 닫기 버튼에 이름이 있으며 닫기를 누르면 onClose', () => {
    lists();
    const p = props();
    const v = mount(DeviceSheet, p);
    const dlg = byType(root(v), 'div').find((d) => d.props.role === 'dialog');
    expect(dlg?.props['aria-modal']).toBe('true');
    expect(dlg?.props['aria-label']).toBe(S.devices.title);
    const outer = byType(root(v), 'div')[0];
    fire(outer, 'onKeyDown', key('Escape'));
    expect(p.onClose).toHaveBeenCalledTimes(1);
    const close = byType(root(v), 'button')[0];
    expect(close?.props['aria-label']).toBe(S.devices.close);
    fire(close, 'onClick');
    expect(p.onClose).toHaveBeenCalledTimes(2);
  });

  it('TC-469z [UX-10,NFR-09] Tab 순환: 마지막에서 Tab이면 첫째로, 첫째(또는 창 밖)에서 Shift+Tab이면 마지막으로 가고, 중간에서는 브라우저 기본 이동을 막지 않는다; 비활성 항목은 제외', () => {
    lists();
    const el = (name: string, disabled = false): { name: string; disabled: boolean; focus: ReturnType<typeof vi.fn> } => ({ name, disabled, focus: vi.fn() });
    const [a, b, c, off, off2] = [el('close'), el('mic'), el('spk'), el('off', true), el('off2', true)] as const;
    let active: unknown = c;
    vi.stubGlobal('document', { get activeElement() { return active; } });
    const v = mount(DeviceSheet, props());
    const boxRef = byType(root(v), 'div').find((d) => d.props.role === 'dialog')?.props.ref as { current: unknown };
    let inside = true;
    boxRef.current = { querySelectorAll: () => [off2, a, b, off, c, off2], contains: () => inside }; // 맨 앞·맨 뒤가 비활성이어도 실제 첫·끝은 활성 항목
    const outer = byType(root(v), 'div')[0];
    let e = key('Tab');
    fire(outer, 'onKeyDown', e);
    expect(e.prevented).toBe(true);
    expect(a.focus).toHaveBeenCalledTimes(1);
    active = b;
    e = key('Tab');
    fire(outer, 'onKeyDown', e);
    expect(e.prevented).toBe(false);
    active = a;
    e = key('Tab', { shiftKey: true });
    fire(outer, 'onKeyDown', e);
    expect(e.prevented).toBe(true);
    expect(c.focus).toHaveBeenCalledTimes(1);
    expect(off.focus).not.toHaveBeenCalled();
    expect(off2.focus).not.toHaveBeenCalled();
    active = { outside: true };
    inside = false;
    e = key('Tab', { shiftKey: true });
    fire(outer, 'onKeyDown', e);
    expect(c.focus).toHaveBeenCalledTimes(2);
    e = key('Tab');
    fire(outer, 'onKeyDown', e);
    expect(a.focus).toHaveBeenCalledTimes(2);
    for (const k of ['a', 'x', 'Enter']) {
      const other = key(k);
      fire(outer, 'onKeyDown', other);
      expect(other.prevented, k).toBe(false);
    }
    boxRef.current = { querySelectorAll: () => [off, off2], contains: () => true }; // 포커스 가능한 항목이 하나도 없으면 가로채지 않는다
    const none = key('Tab');
    fire(outer, 'onKeyDown', none);
    expect(none.prevented).toBe(false);
  });

  it('TC-453k [UX-10] 열리면 닫기 버튼에 포커스, 닫히면 열기 전 요소로 포커스를 돌려주고 devicechange 구독을 해제하며 해제 뒤 목록 응답은 무시한다', async () => {
    const prev = { focus: vi.fn() };
    const closeFocus = vi.fn();
    vi.stubGlobal('document', { activeElement: prev });
    const add = vi.fn();
    const remove = vi.fn();
    vi.stubGlobal('navigator', { mediaDevices: { addEventListener: add, removeEventListener: remove } });
    let resolve: (v: Awaited<ReturnType<typeof listDevices>>) => void = () => undefined;
    vi.mocked(listDevices).mockReturnValue(new Promise((r) => (resolve = r)));
    const p = props();
    const v = mount(DeviceSheet, p, { beforeEffects: (t) => void ((byType(t, 'button')[0]?.props.ref as { current: unknown }).current = { focus: closeFocus }) });
    const closeBtn = byType(root(v), 'button')[0]?.props.ref as { current: unknown };
    expect(closeFocus).toHaveBeenCalledTimes(1); // 열리면 닫기 버튼에 포커스
    expect(add).toHaveBeenCalledWith('devicechange', expect.any(Function));
    v.unmount();
    expect(remove).toHaveBeenCalledWith('devicechange', add.mock.calls[0]?.[1]);
    expect(prev.focus).toHaveBeenCalledTimes(1);
    expect(closeBtn).toBeDefined();
    resolve({ audioinput: [dev('audioinput', 'late', 'x')], videoinput: [], audiooutput: [] });
    await flush();
    v.rerender(p);
    expect(byType(byId(root(v), 'dev-mic')?.props.children as never, 'option').map(textOf)).toEqual([S.devices.none]); // 해제 뒤 응답은 반영되지 않는다
  });
});
