import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PublicParticipant } from '@meetlite/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MeetingState } from '../state/MeetingController';
import { S } from '../strings';
import { ConnectionBadge } from './ConnectionBadge';
import { ControlBar } from './ControlBar';
import { Toasts } from './Toasts';
import { VideoGrid } from './VideoGrid';
import { VideoTile } from './VideoTile';

afterEach(() => vi.unstubAllGlobals());

const noop = (): void => undefined;
const bar = (over: Partial<Parameters<typeof ControlBar>[0]> = {}): string =>
  renderToStaticMarkup(createElement(ControlBar, { micOn: true, camOn: true, sharing: false, chatOpen: false, peopleOpen: false, unread: 0, count: 3, onMic: noop, onCamera: noop, onShare: noop, onChat: noop, onPeople: noop, onLeave: noop, onDevices: noop, ...over }));
const ids = (html: string): string[] => [...html.matchAll(/data-testid="([^"]+)"/g)].map((m) => m[1] ?? '');
const button = (html: string, testId: string): string => html.match(new RegExp(`<button[^>]*data-testid="${testId}"[^>]*>`))?.[0] ?? '';

describe('컨트롤바 (unit-09, UX-04, UX-10)', () => {
  it('TC-455 [UX-04] 순서는 마이크, 카메라, 화면공유, 채팅, 참가자, 나가기이고 나가기는 구분선으로 분리된 위험색이다', () => {
    const html = bar();
    expect(ids(html).filter((i) => i !== 'btn-devices')).toEqual(['btn-mic', 'btn-camera', 'btn-share', 'btn-chat', 'btn-people', 'btn-leave']);
    expect(button(html, 'btn-leave')).toMatch(/bg-danger/);
    expect(html).toMatch(/<div class="[^"]*border-l[^"]*"><button[^>]*data-testid="btn-leave"/);
    for (const other of ['btn-mic', 'btn-camera', 'btn-chat', 'btn-people']) expect(button(html, other)).not.toMatch(/bg-danger/);
  });

  it('TC-456 [UX-10,FR-08] 마이크·카메라 버튼의 접근 가능한 이름과 aria-pressed는 상태를 따라 바뀐다', () => {
    const on = bar();
    expect(button(on, 'btn-mic')).toContain(`aria-label="${S.room.mute}"`);
    expect(button(on, 'btn-mic')).toContain('aria-pressed="false"');
    expect(button(on, 'btn-camera')).toContain(`aria-label="${S.room.cameraOffAction}"`);
    const off = bar({ micOn: false, camOn: false });
    expect(button(off, 'btn-mic')).toContain(`aria-label="${S.room.unmute}"`);
    expect(button(off, 'btn-mic')).toContain('aria-pressed="true"');
    expect(button(off, 'btn-camera')).toContain(`aria-label="${S.room.cameraOn}"`);
    expect(button(off, 'btn-camera')).toContain('aria-pressed="true"');
    expect(bar({ count: 4 })).toContain(`aria-label="${S.room.participants} 4"`);
    expect(bar()).toContain(`aria-label="${S.room.deviceMenuMic}"`);
    expect(bar()).toContain(`aria-label="${S.room.deviceMenuCamera}"`);
  });

  it('TC-457 [UX-10,NFR-10] 모든 버튼은 이름이 있고 터치 최소 높이 클래스(min-h-touch)를 가진다', () => {
    const buttons = bar().match(/<button[^>]*>/g) ?? [];
    expect(buttons.length).toBe(8);
    for (const b of buttons) {
      expect(b).toMatch(/aria-label="[^"]+"/);
      expect(b).toContain('min-h-touch');
    }
    for (const id of ['btn-mic', 'btn-camera', 'btn-share', 'btn-chat', 'btn-people', 'btn-leave']) expect(button(bar(), id)).toContain('min-w-touch');
  });

  it('TC-458 [FR-12,POL-12] 화면공유를 지원하지 않는 환경(모바일·미지원)은 버튼이 비활성이고 이유가 이름·title에 있다', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148', maxTouchPoints: 5, mediaDevices: { getDisplayMedia: () => Promise.resolve() } });
    const mobile = button(bar(), 'btn-share');
    expect(mobile).toContain(' disabled=""');
    expect(mobile).toContain(`aria-label="${S.room.shareUnsupportedMobile}"`);
    expect(mobile).toContain(`title="${S.room.shareUnsupportedMobile}"`);
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130', maxTouchPoints: 0, mediaDevices: { getDisplayMedia: () => Promise.resolve() } });
    const desktop = button(bar(), 'btn-share');
    expect(desktop).not.toContain(' disabled=""');
    expect(desktop).toContain(`aria-label="${S.room.shareLabel}"`);
    expect(button(bar({ sharing: true }), 'btn-share')).toContain(`aria-label="${S.room.shareStop}"`);
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130', maxTouchPoints: 0, mediaDevices: {} });
    expect(button(bar(), 'btn-share')).toContain(' disabled=""'); // getDisplayMedia 없음
  });

  it('TC-459 [FR-11,UX-12] 읽지 않은 채팅 배지: 0이면 없고 1~99는 숫자, 100 이상은 99+, 채팅이 열려 있으면 없다', () => {
    expect(bar({ unread: 0 })).not.toMatch(/rounded-pill/);
    expect(bar({ unread: 7 })).toMatch(/aria-hidden="true">7</);
    expect(bar({ unread: 99 })).toMatch(/aria-hidden="true">99</);
    expect(bar({ unread: 100 })).toMatch(/aria-hidden="true">99\+</);
    expect(bar({ unread: 5, chatOpen: true })).not.toMatch(/rounded-pill/);
  });
});

const person = (id: string, joinSeq: number, over: Partial<PublicParticipant> = {}): PublicParticipant => ({ id, nickname: `사람${joinSeq}`, isHost: joinSeq === 1, audio: true, video: true, screen: false, connection: 'connected', joinSeq, ...over });
const state = (n: number, over: Partial<MeetingState> = {}): MeetingState => ({
  status: 'live', selfId: 'p1', hostId: 'p1', locked: false, participants: Array.from({ length: n }, (_, i) => person(`p${i + 1}`, i + 1)), remote: {}, chat: [], unread: 0, micOn: true, camOn: true, sharing: false, quality: 'good', graceSec: 20, reconnectingSince: null, reconnectCause: 'network', toasts: [], ...over,
});
const fakeStream = { getAudioTracks: () => [] } as unknown as MediaStream;
const grid = (s: MeetingState): string => renderToStaticMarkup(createElement(VideoGrid, { state: s, selfStream: fakeStream }));
const cols = (html: string): number => Number(html.match(/grid-template-columns:repeat\((\d+), /)?.[1]) / 2;

describe('비디오 그리드 (unit-09, UX-05, UX-06)', () => {
  it('TC-460 [UX-05] 데스크톱 열 수: 1명 1열, 2~4명 2열, 5~6명 3열이고 타일 수가 참가자 수와 같다', () => {
    const expected: Record<number, number> = { 1: 1, 2: 2, 3: 2, 4: 2, 5: 3, 6: 3 };
    for (const n of [1, 2, 3, 4, 5, 6]) {
      const html = grid(state(n));
      expect(cols(html), `${n}명`).toBe(expected[n]);
      expect(html).toContain(`data-count="${n}"`);
      expect((html.match(/data-testid="tile-p\d"/g) ?? []).length).toBe(n);
    }
  });

  it('TC-461 [UX-05] 마지막 줄이 덜 찼으면 가운데로 모은다(3명: 2열 중 마지막 1명, 5명: 3열 중 마지막 2명), 꽉 차면 그대로다', () => {
    expect(grid(state(3))).toContain('grid-column:2 / span 2');
    expect(grid(state(5))).toContain('grid-column:2 / span 2');
    expect(grid(state(4))).not.toContain('/ span 2');
    expect(grid(state(6))).not.toContain('/ span 2');
    expect(grid(state(2))).not.toContain('/ span 2');
  });

  it('TC-462 [UX-06,FR-12] 다른 사람이 화면을 공유하면 큰 공유 타일과 참가자 썸네일이 나오고 갤러리는 사라진다', () => {
    const s = state(3);
    s.participants[1] = person('p2', 2, { screen: true });
    const html = grid(s);
    expect(html).toContain('data-testid="share-layout"');
    expect(html).not.toContain('data-testid="gallery"');
    expect(html).toContain('data-testid="tile-p2-screen"');
    expect(html).toContain(S.room.sharingNow('사람2'));
    expect(html).toContain('data-kind="screen"');
    expect(html).toContain('object-contain'); // 공유 화면은 잘리지 않게
    expect((html.match(/data-testid="tile-p\d"/g) ?? []).length).toBe(3); // 썸네일
    // 내가 공유 중이면 큰 영역에는 안내 카드
    const mine = state(2);
    mine.participants[0] = person('p1', 1, { screen: true });
    const own = grid(mine);
    expect(own).toContain(S.room.youSharing);
    expect(own).not.toContain('data-testid="tile-p1-screen"');
  });

  it('TC-463 [FR-08,FR-10,UX-10] 타일: 카메라 꺼짐은 이니셜 아바타와 "이름: 카메라 꺼짐" 이름, 마이크 꺼짐·호스트는 아이콘 이름, 내 타일은 muted·(나) 표시다', () => {
    const tile = (p: Partial<Parameters<typeof VideoTile>[0]>): string => renderToStaticMarkup(createElement(VideoTile, { stream: fakeStream, name: '민지', peerId: 'p2', micOn: true, camOn: true, ...p }));
    const off = tile({ camOn: false, micOn: false, host: true });
    expect(off).toContain(`aria-label="민지: ${S.room.cameraIsOff}"`);
    expect(off).toContain('>민<');
    expect(off).toContain(`aria-label="${S.people.micOff}"`);
    expect(off).toContain(`aria-label="${S.room.host}"`);
    expect(off).toMatch(/<video[^>]*class="[^"]*hidden/);
    const self = tile({ self: true, name: '나', peerId: 'p1' });
    expect(self).toMatch(/<video[^>]*muted/);
    expect(self).toContain(`나 ${S.room.you}`);
    expect(self).toContain('-scale-x-100'); // 거울상
    expect(tile({})).not.toMatch(/<video[^>]*muted/); // 원격은 소리가 나야 한다
    expect(tile({})).toMatch(/<video[^>]*playsinline/i); // iOS Safari
    expect(tile({})).toContain('data-speaking="false"'); // 초기에는 강조 없음
    expect(tile({ name: '😀철수' })).not.toContain('>?<'); // 이모지 이니셜
    expect(tile({ camOn: false, name: '😀철수' })).toContain('>😀<');
    expect(tile({ camOn: false, name: '  ' })).toContain('>?<');
  });

  it('TC-464 [FR-19] 타일 상태 띠: 상대 연결 실패·끊김과 재연결 중은 role=status 문구, 내 타일과 정상 연결에는 없다', () => {
    const tile = (p: Partial<Parameters<typeof VideoTile>[0]>): string => renderToStaticMarkup(createElement(VideoTile, { stream: fakeStream, name: '민지', peerId: 'p2', micOn: true, camOn: true, ...p }));
    expect(tile({ peer: 'failed' })).toContain(S.room.peerProblem);
    expect(tile({ peer: 'disconnected' })).toContain(S.room.peerProblem);
    expect(tile({ reconnecting: true })).toContain(S.people.reconnecting);
    expect(tile({ reconnecting: true })).toMatch(/role="status"/);
    expect(tile({ peer: 'connected' })).not.toContain(S.room.peerProblem);
    expect(tile({ peer: 'connecting' })).not.toContain(S.room.peerProblem);
    expect(tile({ peer: 'failed', self: true })).not.toContain(S.room.peerProblem);
  });
});

describe('연결 배지·토스트 (unit-09, FR-19, UX-12)', () => {
  const badge = (over: Partial<MeetingState>): string => renderToStaticMarkup(createElement(ConnectionBadge, { state: { status: 'live', quality: 'good', reconnectingSince: null, graceSec: 20, ...over } }));
  it('TC-465 [FR-19] 배지는 색뿐 아니라 글자로 연결됨·불안정·재연결 중(남은 시간)을 구분한다', () => {
    expect(badge({})).toContain(S.room.live);
    expect(badge({})).toContain('data-state="live"');
    expect(badge({ quality: 'poor' })).toContain(S.room.poor);
    expect(badge({ quality: 'poor' })).toContain('data-state="poor"');
    const re = badge({ status: 'reconnecting', graceSec: 20 });
    expect(re).toContain(S.room.reconnecting);
    expect(re).toContain('data-state="reconnecting"');
    expect(re).toMatch(/20s/);
    expect(badge({ status: 'reconnecting', graceSec: 0 })).toMatch(/ 0s/); // 음수로 내려가지 않는다
    expect(badge({ status: 'reconnecting', graceSec: 20, reconnectingSince: Date.now() - 999_000 })).toMatch(/ 0s/);
  });

  it('TC-466 [UX-12,FR-13] 토스트 영역은 알림이 없을 때도 role=status aria-live=polite로 존재하고, 경고는 경고색 테두리다', () => {
    const empty = renderToStaticMarkup(createElement(Toasts, { toasts: [] }));
    expect(empty).toContain('role="status"');
    expect(empty).toContain('aria-live="polite"');
    const html = renderToStaticMarkup(createElement(Toasts, { toasts: [{ id: 1, text: '일반 알림', kind: 'info' }, { id: 2, text: '경고 알림', kind: 'warn' }] }));
    expect(html).toContain('일반 알림');
    expect(html).toMatch(/border-warning[^>]*>경고 알림/);
    expect(html).not.toMatch(/border-warning[^>]*>일반 알림/);
    const evil = renderToStaticMarkup(createElement(Toasts, { toasts: [{ id: 3, text: '<img src=x onerror=1>', kind: 'info' }] }));
    expect(evil).not.toContain('<img');
  });
});
