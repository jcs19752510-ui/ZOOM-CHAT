import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  setCalls: [] as { level: number; speaking: boolean }[],
  cleanups: [] as (() => void)[],
  rms: 0,
  contexts: 0,
  disconnects: 0,
  raf: null as ((t: number) => void) | null,
  cancelled: 0,
}));

vi.mock('react', () => ({
  useState: (init: unknown) => [init, (v: { level: number; speaking: boolean }) => h.setCalls.push(v)],
  useEffect: (fn: () => void | (() => void)) => {
    const c = fn();
    if (typeof c === 'function') h.cleanups.push(c);
  },
}));

import { useAudioLevel } from './audioLevel';

const track = { id: 'trk-1' };
const stream = { getAudioTracks: () => [track] } as unknown as MediaStream;

/** 시간을 66ms 이상씩 진행하며 rAF 콜백을 구동한다. rms는 현재 h.rms 값으로 읽힌다. */
function run(fromMs: number, toMs: number, step = 70): number {
  let t = fromMs;
  while (t <= toMs) {
    h.raf?.(t);
    t += step;
  }
  return t;
}
const lastSpeaking = (): boolean | undefined => h.setCalls.at(-1)?.speaking;

beforeEach(() => {
  h.setCalls = [];
  h.cleanups = [];
  h.rms = 0;
  h.contexts = 0;
  h.disconnects = 0;
  h.raf = null;
  h.cancelled = 0;
  vi.stubGlobal('AudioContext', class {
    state = 'running';
    constructor() {
      h.contexts++;
    }
    createMediaStreamSource() {
      return { connect: () => undefined, disconnect: () => void h.disconnects++ };
    }
    createAnalyser() {
      return {
        fftSize: 0,
        getByteTimeDomainData(buf: Uint8Array) {
          buf.fill(Math.round(128 + h.rms * 128));
        },
      };
    }
  });
  vi.stubGlobal('MediaStream', class {});
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
    h.raf = cb;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => void h.cancelled++);
});
afterEach(() => vi.unstubAllGlobals());

describe('발언자 강조 임계값·디바운스 (unit-07, FR-10, UX-07)', () => {
  it('TC-476 [FR-10,UX-07] 임계값(RMS 0.035) 이하의 소리는 아무리 길어도 발언으로 보지 않고, 초과하면 120ms 이상 이어질 때 켜진다', () => {
    useAudioLevel(stream, true);
    h.rms = 0.03;
    run(0, 3000);
    expect(h.setCalls.some((s) => s.speaking)).toBe(false);
    h.rms = 0.045;
    run(3100, 3100 + 60); // 첫 샘플 + 60ms: 아직 120ms 미만
    expect(lastSpeaking()).not.toBe(true);
    h.rms = 0.045;
    run(3300, 3600);
    expect(lastSpeaking()).toBe(true);
  });

  it('TC-476b [FR-10,UX-07] 짧은 소음(120ms 미만)에는 켜지지 않고, 발언이 멈춰도 700ms가 지나야 꺼지며, 그 안에 다시 말하면 꺼지지 않는다', () => {
    useAudioLevel(stream, true);
    h.rms = 0.2;
    let t = run(0, 70, 70); // 샘플 2개(0, 70ms)
    h.rms = 0;
    t = run(t, t + 1500);
    expect(h.setCalls.some((s) => s.speaking), '짧은 소음').toBe(false);
    // 발언 시작
    h.rms = 0.2;
    t = run(t, t + 500);
    expect(lastSpeaking()).toBe(true);
    // 침묵 시작: 600ms 후에도 유지, 800ms 뒤에는 꺼짐
    h.rms = 0;
    const silenceStart = t;
    t = run(silenceStart, silenceStart + 560);
    expect(lastSpeaking(), '침묵 600ms 이내').toBe(true);
    t = run(t, silenceStart + 900);
    expect(lastSpeaking(), '침묵 700ms 초과').toBe(false);
    // 다시 말하고, 짧은 침묵(400ms) 뒤 계속 말하면 유지
    h.rms = 0.2;
    t = run(t, t + 400);
    expect(lastSpeaking()).toBe(true);
    h.rms = 0;
    t = run(t, t + 350);
    h.rms = 0.2;
    t = run(t, t + 700);
    h.rms = 0;
    run(t, t + 420);
    expect(lastSpeaking(), '침묵이 끊기면 타이머가 다시 시작된다').toBe(true);
  });

  it('TC-476c [FR-10] 입력 레벨은 rms×4(최대 1)로 계산되고 거의 변하지 않으면 상태를 갱신하지 않는다', () => {
    useAudioLevel(stream, true);
    h.rms = 0.1;
    run(0, 600);
    expect(h.setCalls.at(-1)?.level).toBeCloseTo(0.4, 1);
    const n = h.setCalls.length;
    run(700, 1500);
    expect(h.setCalls.length, '변화 없으면 갱신 없음').toBe(n);
    h.rms = 0.9;
    run(1600, 1800);
    expect(h.setCalls.at(-1)?.level).toBe(1);
  });

  it('TC-476d [FR-10] 비활성(enabled=false)이거나 오디오 트랙이 없으면 오디오 컨텍스트를 만들지 않고 강조 없음을 돌려주며, 정리 시 rAF 취소·연결 해제한다', () => {
    expect(useAudioLevel(stream, false)).toEqual({ level: 0, speaking: false });
    expect(useAudioLevel(null, true)).toEqual({ level: 0, speaking: false });
    expect(useAudioLevel({ getAudioTracks: () => [] } as unknown as MediaStream, true)).toEqual({ level: 0, speaking: false });
    expect(h.raf, '측정 루프가 시작되지 않는다').toBeNull();
    useAudioLevel(stream, true);
    expect(h.raf, '활성이면 측정 루프가 시작된다').not.toBeNull();
    for (const c of h.cleanups) c();
    expect(h.cancelled).toBe(1);
    expect(h.disconnects).toBe(1);
  });
});
