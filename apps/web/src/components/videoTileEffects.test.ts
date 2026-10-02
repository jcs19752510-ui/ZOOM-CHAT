import type * as ReactTypes from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findAll, findOne, textOf } from '../testUtil';
import { S } from '../strings';

const h = vi.hoisted(() => ({ refs: [] as { current: unknown }[], effects: [] as (() => void | (() => void))[], audio: [] as unknown[][] }));
vi.mock('react', async (orig) => ({
  ...(await orig<typeof ReactTypes>()),
  useRef: (init: unknown) => {
    const r = { current: init };
    h.refs.push(r);
    return r;
  },
  useEffect: (fn: () => void | (() => void)) => {
    h.effects.push(fn);
  },
}));
vi.mock('../lib/audioLevel', () => ({
  useAudioLevel: (...a: unknown[]) => {
    h.audio.push(a);
    return { level: 0, speaking: false };
  },
}));

import { VideoTile } from './VideoTile';

type Props = Parameters<typeof VideoTile>[0];
const stream = { id: 's1' } as unknown as MediaStream;
const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

interface FakeVideo { srcObject: unknown; play: ReturnType<typeof vi.fn>; setSinkId?: ReturnType<typeof vi.fn> }
const render = (over: Partial<Props>, video: FakeVideo | null) => {
  h.refs.length = 0;
  h.effects.length = 0;
  h.audio.length = 0;
  const tree = VideoTile({ stream, name: '민지', peerId: 'p2', micOn: true, camOn: true, ...over });
  (h.refs[0] as { current: unknown }).current = video;
  return tree;
};
const notAllowed = (): DOMException => new DOMException('x', 'NotAllowedError');

beforeEach(() => vi.unstubAllGlobals());

describe('VideoTile 재생·장치·표시 로직 (unit-09/17, UX-15, FR-10, FR-12)', () => {
  it('TC-462b [FR-12,UX-06] 화면공유 타일: 레벨 측정 끔·이름은 "OO님의 화면"·크라운/마이크꺼짐 아이콘 없음·거울상 없음·object-contain', () => {
    const tree = render({ screen: true, host: true, micOn: false, self: true }, null);
    expect(h.audio[0]).toEqual([stream, false]);
    const root = tree as unknown as { props: Record<string, unknown> };
    expect(root.props['data-testid']).toBe('tile-p2-screen');
    const vid = findOne(tree, (e) => e.type === 'video', 'video').props;
    expect(vid.className).toContain('object-contain');
    expect(vid.className).not.toContain('-scale-x-100');
    expect(vid.className).not.toContain('hidden'); // 화면은 카메라 상태와 무관하게 보인다
    expect(findAll(tree, (e) => e.props['aria-label'] === S.room.host || e.props['aria-label'] === S.people.micOff)).toEqual([]);
    expect(findAll(tree, (e) => e.type === 'span').map((e) => textOf(e))).toContain(S.room.sharingNow('민지'));
    // 카메라가 꺼진 화면 타일에도 아바타는 없다
    expect(findAll(tree, (e) => typeof e.props['aria-label'] === 'string' && String(e.props['aria-label']).includes(S.room.cameraIsOff))).toEqual([]);
  });

  it('TC-463b [FR-10,FR-08] 음성 레벨 측정은 마이크가 켜진 카메라 타일에만 켠다', () => {
    render({ micOn: true }, null);
    expect(h.audio[0]?.[1]).toBe(true);
    render({ micOn: false }, null);
    expect(h.audio[0]?.[1]).toBe(false);
  });

  it('TC-463c [FR-08,UX-05] 썸네일 크기 클래스와 이니셜 크기가 일반 타일과 다르다', () => {
    const cls = (t: unknown): string => String((t as { props: { className: string } }).props.className);
    expect(cls(render({ thumb: true }, null))).toContain('h-24 w-40');
    expect(cls(render({}, null))).toContain('h-full w-full');
    const av = (over: Partial<Props>): string => String(findOne(render({ camOn: false, ...over }, null), (e) => e.props['aria-hidden'] === 'true', 'avatar').props.className);
    expect(av({ thumb: true })).toContain('h-10 w-10');
    expect(av({})).toContain('h-20 w-20');
  });

  it('TC-464b [UX-15] 원격 타일: srcObject를 연결하고 play 성공이면 차단 해제(false), NotAllowedError면 차단(true), AbortError 등은 알리지 않는다', async () => {
    const onPlayBlocked = vi.fn();
    const ok: FakeVideo = { srcObject: null, play: vi.fn(() => Promise.resolve()) };
    render({ onPlayBlocked }, ok);
    (h.effects[0] as () => void)();
    expect(ok.srcObject).toBe(stream);
    await flush();
    expect(onPlayBlocked).toHaveBeenLastCalledWith(ok, false);

    onPlayBlocked.mockClear();
    const denied: FakeVideo = { srcObject: null, play: vi.fn(() => Promise.reject(notAllowed())) };
    render({ onPlayBlocked }, denied);
    (h.effects[0] as () => void)();
    await flush();
    expect(onPlayBlocked).toHaveBeenCalledTimes(1);
    expect(onPlayBlocked).toHaveBeenCalledWith(denied, true);

    onPlayBlocked.mockClear();
    for (const err of [new DOMException('x', 'AbortError'), new DOMException('x', 'NotSupportedError'), new Error('NotAllowedError'), 'NotAllowedError']) {
      const v: FakeVideo = { srcObject: null, play: vi.fn(() => Promise.reject(err)) };
      render({ onPlayBlocked }, v);
      (h.effects[0] as () => void)();
      await flush();
    }
    expect(onPlayBlocked).not.toHaveBeenCalled();
  });

  it('TC-464c [UX-15] cleanup은 차단 목록에서 빼고(false), 정리된 뒤 늦게 끝난 play 결과는 무시한다', async () => {
    const onPlayBlocked = vi.fn();
    let rej: (e: unknown) => void = () => undefined;
    const v: FakeVideo = { srcObject: null, play: vi.fn(() => new Promise<void>((_, r) => { rej = r; })) };
    render({ onPlayBlocked }, v);
    const cleanup = (h.effects[0] as () => () => void)();
    cleanup();
    expect(onPlayBlocked).toHaveBeenCalledTimes(1);
    expect(onPlayBlocked).toHaveBeenCalledWith(v, false);
    rej(notAllowed());
    await flush();
    expect(onPlayBlocked).toHaveBeenCalledTimes(1); // 늦은 거부로 true가 불리지 않는다
  });

  it('TC-464d [UX-15,FR-08] 내 타일·스트림 없음·콜백 없음이면 play를 부르지 않고, 스트림이 같으면 srcObject를 다시 대입하지 않는다', () => {
    const cb = vi.fn();
    for (const over of [{ self: true, onPlayBlocked: cb }, { stream: null, onPlayBlocked: cb }, { onPlayBlocked: undefined }] as Partial<Props>[]) {
      const v: FakeVideo = { srcObject: null, play: vi.fn(() => Promise.resolve()) };
      render(over, v);
      const cleanup = (h.effects[0] as () => void | (() => void))();
      expect(v.play, JSON.stringify(Object.keys(over))).not.toHaveBeenCalled();
      expect(cleanup).toBeUndefined();
    }
    const same: FakeVideo = { srcObject: stream, play: vi.fn(() => Promise.resolve()) };
    let sets = 0;
    Object.defineProperty(same, 'srcObject', { get: () => stream, set: () => { sets++; } });
    render({}, same);
    (h.effects[0] as () => void)();
    expect(sets).toBe(0);
    // 스트림이 null로 바뀌면 srcObject도 비운다
    const v: FakeVideo = { srcObject: stream, play: vi.fn() };
    render({ stream: null }, v);
    (h.effects[0] as () => void)();
    expect(v.srcObject).toBeNull();
    // 비디오 요소가 아직 없으면 예외 없이 지나간다
    render({}, null);
    expect(() => (h.effects[0] as () => void)()).not.toThrow();
  });

  it('TC-464e [UX-15] 출력 장치(sinkId)는 지원되고 값이 있을 때만 적용하고, 거부돼도 예외가 새지 않는다', async () => {
    const v: FakeVideo = { srcObject: null, play: vi.fn(), setSinkId: vi.fn(() => Promise.resolve()) };
    render({ sinkId: 'spk1' }, v);
    (h.effects[1] as () => void)();
    expect(v.setSinkId).toHaveBeenCalledWith('spk1');
    const none: FakeVideo = { srcObject: null, play: vi.fn(), setSinkId: vi.fn(() => Promise.resolve()) };
    render({}, none);
    (h.effects[1] as () => void)();
    expect(none.setSinkId).not.toHaveBeenCalled();
    const rejecting: FakeVideo = { srcObject: null, play: vi.fn(), setSinkId: vi.fn(() => Promise.reject(new Error('x'))) };
    render({ sinkId: 'bad' }, rejecting);
    (h.effects[1] as () => void)();
    await flush();
    expect(rejecting.setSinkId).toHaveBeenCalledTimes(1);
    const unsupported: FakeVideo = { srcObject: null, play: vi.fn() }; // Safari 등 setSinkId 없음
    render({ sinkId: 'spk' }, unsupported);
    expect(() => (h.effects[1] as () => void)()).not.toThrow();
    render({ sinkId: 'spk' }, null);
    expect(() => (h.effects[1] as () => void)()).not.toThrow();
  });
});
