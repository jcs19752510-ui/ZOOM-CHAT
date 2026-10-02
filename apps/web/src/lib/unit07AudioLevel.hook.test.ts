import type * as React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, type Mounted } from '../testing/hookHarness';

// unit-07 소급 6단계: audioLevel.ts의 훅 수명(트랙 교체 시 재연결, 비활성 전환 시 초기화)을 실제 훅 규칙으로 구동한다.
vi.mock('react', async (orig) => {
  const actual = await orig<typeof React>();
  const { fakeHooks } = await import('../testing/hookHarness');
  return { ...actual, ...fakeHooks, default: { ...actual, ...fakeHooks } };
});

import { useAudioLevel, type Level } from './audioLevel';

const h = { sources: 0, disconnects: 0, rafCb: null as ((t: number) => void) | null, cancels: 0, rms: 0 };
const seen: Level[] = [];
const report = (l: Level): void => void seen.push(l);
const current = (): Level | undefined => seen.at(-1);
type Props = { stream: MediaStream | null; enabled: boolean };
let view: Mounted<Props>;
const Probe = (p: Props): null => {
  report(useAudioLevel(p.stream, p.enabled));
  return null;
};
const streamWith = (id: string): MediaStream => ({ getAudioTracks: () => [{ id }] }) as unknown as MediaStream;

beforeEach(() => {
  Object.assign(h, { sources: 0, disconnects: 0, rafCb: null, cancels: 0, rms: 0 });
  seen.length = 0;
  vi.stubGlobal('MediaStream', class { constructor(public tracks: unknown[]) {} });
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
    h.rafCb = cb;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => void h.cancels++);
  vi.stubGlobal('AudioContext', class {
    state = 'running';
    createMediaStreamSource() {
      h.sources++;
      return { connect: () => undefined, disconnect: () => void h.disconnects++ };
    }
    createAnalyser() {
      return { fftSize: 0, getByteTimeDomainData: (b: Uint8Array) => b.fill(Math.round(128 + h.rms * 128)) };
    }
  });
});
afterEach(() => {
  view?.unmount();
  vi.unstubAllGlobals();
});

describe('useAudioLevel 훅 수명 (unit-07, FR-10)', () => {
  it('TC-476p [FR-10,UX-07] 오디오 트랙이 다른 트랙으로 바뀌면 이전 연결을 정리하고 새 트랙에 다시 연결하며, 같은 트랙이면 다시 연결하지 않는다', () => {
    view = mount<Props>(Probe, { stream: streamWith('t1'), enabled: true });
    expect(h.sources).toBe(1);
    view.rerender({ stream: streamWith('t1'), enabled: true });
    expect(h.sources, '같은 트랙 ID는 재연결 없음').toBe(1);
    view.rerender({ stream: streamWith('t2'), enabled: true });
    expect(h.sources, '새 트랙에 재연결').toBe(2);
    expect(h.disconnects, '이전 소스 연결 해제').toBe(1);
    expect(h.cancels, '이전 측정 루프 중단').toBe(1);
  });

  it('TC-476q [FR-10,UX-07] 발언 중에 enabled가 꺼지거나 스트림이 사라지면 곧바로 레벨 0·발언 없음을 돌려주고 연결을 정리한다', () => {
    view = mount<Props>(Probe, { stream: streamWith('t1'), enabled: true });
    h.rms = 0.2;
    h.rafCb?.(1000);
    h.rafCb?.(1200);
    expect(current()?.speaking, '사전 조건: 발언 중').toBe(true);
    view.rerender({ stream: streamWith('t1'), enabled: false });
    expect(current(), 'enabled=false').toEqual({ level: 0, speaking: false });
    expect(h.disconnects).toBe(1);
    view.rerender({ stream: streamWith('t1'), enabled: true });
    view.rerender({ stream: null, enabled: true });
    expect(current(), '스트림 없음').toEqual({ level: 0, speaking: false });
  });
});
