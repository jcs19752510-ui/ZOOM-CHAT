import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ speaking: false, args: [] as unknown[][] }));
vi.mock('../lib/audioLevel', () => ({
  useAudioLevel: (...a: unknown[]) => {
    h.args.push(a);
    return { level: 0.5, speaking: h.speaking };
  },
}));

import { VideoTile } from './VideoTile';

const tile = (p: Partial<Parameters<typeof VideoTile>[0]> = {}): string =>
  renderToStaticMarkup(createElement(VideoTile, { stream: { getAudioTracks: () => [] } as unknown as MediaStream, name: '민지', peerId: 'p2', micOn: true, camOn: true, ...p }));

describe('발언자 강조 표시 (unit-09, FR-10, UX-07)', () => {
  it('TC-466b [FR-10,UX-07] 발언 중인 타일은 data-speaking=true와 굵은 강조 링(ring-speaking)이 있고, 아니면 일반 링이다', () => {
    h.speaking = true;
    const on = tile();
    expect(on).toContain('data-speaking="true"');
    expect(on).toContain('ring-4 ring-speaking');
    h.speaking = false;
    const off = tile();
    expect(off).toContain('data-speaking="false"');
    expect(off).not.toContain('ring-speaking');
  });

  it('TC-466c [FR-10] 화면공유 타일은 발언 강조를 쓰지 않고(레벨 측정 끔), 마이크가 꺼진 타일도 측정하지 않는다', () => {
    h.speaking = true;
    h.args = [];
    expect(tile({ screen: true })).not.toContain('ring-speaking');
    expect(h.args.at(-1)?.[1]).toBe(false);
    tile({ micOn: false });
    expect(h.args.at(-1)?.[1]).toBe(false);
    tile({ micOn: true });
    expect(h.args.at(-1)?.[1]).toBe(true);
  });
});
