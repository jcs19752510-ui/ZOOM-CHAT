import type { PublicParticipant } from '@meetlite/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MeetingState } from '../state/MeetingController';
import { findAll } from '../testUtil';

const h = vi.hoisted(() => ({ narrow: false, queries: [] as string[] }));
vi.mock('../lib/useMediaQuery', () => ({
  useMediaQuery: (q: string) => {
    h.queries.push(q);
    return h.narrow;
  },
}));
vi.mock('./VideoTile', () => ({ VideoTile: function VideoTile() { return null; } }));

import { VideoGrid } from './VideoGrid';
import { VideoTile } from './VideoTile';

const person = (id: string, joinSeq: number, over: Partial<PublicParticipant> = {}): PublicParticipant => ({ id, nickname: `사람${joinSeq}`, isHost: joinSeq === 1, audio: true, video: true, screen: false, connection: 'connected', joinSeq, ...over });
const state = (list: PublicParticipant[], over: Partial<MeetingState> = {}): MeetingState => ({
  status: 'live', selfId: 'p1', hostId: 'p1', locked: false, participants: list, remote: {}, chat: [], unread: 0, micOn: true, camOn: true, sharing: false, quality: 'good', graceSec: 20, reconnectingSince: null, reconnectCause: 'network', toasts: [], ...over,
});
const many = (n: number): PublicParticipant[] => Array.from({ length: n }, (_, i) => person(`p${i + 1}`, i + 1));
const self = { id: 'self-stream' } as unknown as MediaStream;
const cam = (id: string): MediaStream => ({ id }) as unknown as MediaStream;
const tiles = (tree: unknown) => findAll(tree, (e) => e.type === VideoTile).map((e) => e.props);
const gridStyle = (tree: unknown): { cols: number; rows: number } => {
  const g = findAll(tree, (e) => e.props['data-testid'] === 'gallery')[0];
  const st = g?.props.style as { gridTemplateColumns: string; gridTemplateRows: string };
  return { cols: Number(/repeat\((\d+),/.exec(st.gridTemplateColumns)?.[1]) / 2, rows: Number(/repeat\((\d+),/.exec(st.gridTemplateRows)?.[1]) };
};
const placement = (tree: unknown): string[] => findAll(tree, (e) => e.props['data-testid'] === 'gallery')[0] ? (findAll(tree, (e) => e.type === 'div' && typeof (e.props.style as { gridColumn?: string } | undefined)?.gridColumn === 'string' && e.props['data-testid'] === undefined).map((e) => (e.props.style as { gridColumn: string }).gridColumn)) : [];

beforeEach(() => {
  h.narrow = false;
  h.queries.length = 0;
});

describe('VideoGrid 배치·속성 전달 (unit-09, UX-05, UX-06, FR-08, FR-19)', () => {
  it('TC-460b [UX-05,NFR-10] 좁은 화면(639px 이하) 열 수: 1~2명 1열, 3~6명 2열이고 행 수는 올림이다. 질의 문자열은 639px', () => {
    h.narrow = true;
    const want: Record<number, [number, number]> = { 1: [1, 1], 2: [1, 2], 3: [2, 2], 4: [2, 2], 5: [2, 3], 6: [2, 3] };
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(gridStyle(VideoGrid({ state: state(many(n)), selfStream: self })), `${n}명`).toEqual({ cols: want[n]?.[0], rows: want[n]?.[1] });
    }
    expect(h.queries.every((q) => q === '(max-width: 639px)')).toBe(true);
  });

  it('TC-461b [UX-05] 좁은 화면의 홀수 마지막 줄 가운데 정렬(3·5명)과 1열(1·2명)은 span 2 그대로다', () => {
    h.narrow = true;
    expect(placement(VideoGrid({ state: state(many(3)), selfStream: self }))).toEqual(['span 2', 'span 2', '2 / span 2']);
    expect(placement(VideoGrid({ state: state(many(5)), selfStream: self }))).toEqual(['span 2', 'span 2', 'span 2', 'span 2', '2 / span 2']);
    expect(placement(VideoGrid({ state: state(many(4)), selfStream: self }))).toEqual(['span 2', 'span 2', 'span 2', 'span 2']);
    expect(placement(VideoGrid({ state: state(many(2)), selfStream: self }))).toEqual(['span 2', 'span 2']);
  });

  it('TC-461c [UX-05] 데스크톱 5명(3열): 마지막 줄 첫 사람만 2열에서 시작하고 둘째는 자동 배치로 이어져 가운데 모인다', () => {
    expect(placement(VideoGrid({ state: state(many(5)), selfStream: self }))).toEqual(['span 2', 'span 2', 'span 2', '2 / span 2', 'span 2']);
  });

  it('TC-460c [UX-05,FR-07] 참가자 0명이어도 예외 없이 1칸 틀(data-count=1)을 그리고, 입장 순서(joinSeq)로 정렬해 배치한다', () => {
    const empty = VideoGrid({ state: state([], { selfId: '' }), selfStream: self });
    expect(findAll(empty, (e) => e.props['data-testid'] === 'gallery')[0]?.props['data-count']).toBe(1);
    expect(tiles(empty)).toEqual([]);
    const shuffled = [person('c', 3), person('a', 1), person('b', 2)];
    expect(tiles(VideoGrid({ state: state(shuffled, { selfId: 'a' }), selfStream: self })).map((p) => p.peerId)).toEqual(['a', 'b', 'c']);
  });

  it('TC-463d [FR-08,FR-10,FR-19,UX-05] 타일 속성 매핑: 내 타일은 selfStream·state.camOn, 원격은 camera 스트림·참가자 video, 연결 상태·호스트·마이크·재연결 표시를 넘긴다', () => {
    const list = [person('p1', 1, { video: true }), person('p2', 2, { video: false, audio: false, connection: 'reconnecting' }), person('p3', 3, { video: true })];
    const remote = { p2: { camera: cam('c2'), screen: null, state: 'failed' }, p3: { camera: null, screen: null, state: 'connected' } } as unknown as MeetingState['remote'];
    const t = tiles(VideoGrid({ state: state(list, { camOn: false, remote }), selfStream: self, sinkId: 'spk' }));
    const [a, b, c] = t;
    expect(a).toMatchObject({ peerId: 'p1', self: true, host: true, stream: self, camOn: false, micOn: true, reconnecting: false, thumb: false, sinkId: 'spk' });
    expect('peer' in (a ?? {})).toBe(false); // 내 타일에는 연결 상태가 없다
    expect(b).toMatchObject({ peerId: 'p2', name: '사람2', self: false, host: false, stream: remote.p2?.camera, camOn: false, micOn: false, reconnecting: true, peer: 'failed' });
    expect(c).toMatchObject({ peerId: 'p3', stream: null, camOn: true, peer: 'connected', reconnecting: false });
    // 원격 정보가 아직 없으면 stream null, peer 키 없음
    const noRemote = tiles(VideoGrid({ state: state(list), selfStream: self }))[1];
    expect(noRemote?.stream).toBeNull();
    expect('peer' in (noRemote ?? {})).toBe(false);
  });

  it('TC-463e [UX-15] sinkId·onPlayBlocked는 값이 있을 때만 전달한다(빈 문자열은 전달하지 않음)', () => {
    const cb = vi.fn();
    const withBoth = tiles(VideoGrid({ state: state(many(2)), selfStream: self, sinkId: 'x', onPlayBlocked: cb }));
    expect(withBoth.every((p) => p.sinkId === 'x' && p.onPlayBlocked === cb)).toBe(true);
    const none = tiles(VideoGrid({ state: state(many(2)), selfStream: self, sinkId: '' }));
    expect(none.every((p) => !('sinkId' in p) && !('onPlayBlocked' in p))).toBe(true);
  });

  it('TC-462c [UX-06,FR-12] 공유 레이아웃: 공유 타일은 공유자의 screen 스트림·screen 플래그, 썸네일은 전원(thumb)이고 공유자가 둘이면 입장이 빠른 사람이 큰 화면이다', () => {
    const screenStream = cam('scr');
    const list = [person('p1', 1), person('p2', 2, { screen: true }), person('p3', 3, { screen: true })];
    const remote = { p2: { camera: cam('c2'), screen: screenStream, state: 'connected' }, p3: { camera: null, screen: cam('x'), state: 'connected' } } as unknown as MeetingState['remote'];
    const tree = VideoGrid({ state: state(list, { remote }), selfStream: self, sinkId: 'spk', onPlayBlocked: vi.fn() });
    const t = tiles(tree);
    const big = t.find((p) => p.screen === true);
    expect(big).toMatchObject({ peerId: 'p2', stream: screenStream, micOn: true, camOn: true, screen: true });
    expect('sinkId' in (big ?? {})).toBe(false); // 화면공유는 소리가 없으니 출력 장치 지정 없음
    const thumbs = t.filter((p) => p.thumb === true);
    expect(thumbs.map((p) => p.peerId)).toEqual(['p1', 'p2', 'p3']);
    expect(thumbs.find((p) => p.peerId === 'p2')?.stream).toMatchObject({ id: 'c2' }); // 썸네일은 카메라 스트림
    // 공유자의 screen 스트림이 아직 없으면 null로 넘어간다(크래시 없음)
    const early = tiles(VideoGrid({ state: state([person('p1', 1), person('p2', 2, { screen: true })]), selfStream: self })).find((p) => p.screen === true);
    expect(early?.stream).toBeNull();
  });

  it('TC-462d [UX-06] 내가 공유 중이면 큰 영역에는 VideoTile이 없고(안내 카드), 썸네일에는 내 타일이 포함된다', () => {
    const list = [person('p1', 1, { screen: true }), person('p2', 2)];
    const t = tiles(VideoGrid({ state: state(list), selfStream: self }));
    expect(t.filter((p) => p.screen === true)).toEqual([]);
    expect(t.map((p) => p.peerId)).toEqual(['p1', 'p2']);
    expect(t[0]).toMatchObject({ self: true, stream: self });
  });
});
