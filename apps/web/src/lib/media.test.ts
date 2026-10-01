import { describe, expect, it } from 'vitest';
import { LocalMedia } from './media';

const track = (readyState: 'live' | 'ended'): MediaStreamTrack => ({ readyState, stop: () => undefined }) as unknown as MediaStreamTrack;

describe('LocalMedia.reconcile (UX-14)', () => {
  it('TC-362 [UX-14] ended 트랙만 비우고 잃은 종류를 알려 주며, 살아 있는 트랙은 유지한다', () => {
    const m = new LocalMedia();
    const live = track('live');
    m.audio = track('ended');
    m.video = live;
    let notified = 0;
    m.subscribe(() => notified++);
    expect(m.reconcile()).toEqual({ audioLost: true, videoLost: false });
    expect(m.audio).toBeNull();
    expect(m.video).toBe(live);
    expect(notified).toBe(1);
  });

  it('TC-362b [UX-14] 잃은 트랙이 없으면 알림도 상태 변경도 없다', () => {
    const m = new LocalMedia();
    m.audio = track('live');
    let notified = 0;
    m.subscribe(() => notified++);
    expect(m.reconcile()).toEqual({ audioLost: false, videoLost: false });
    expect(notified).toBe(0);
    expect(new LocalMedia().reconcile()).toEqual({ audioLost: false, videoLost: false });
  });
});
