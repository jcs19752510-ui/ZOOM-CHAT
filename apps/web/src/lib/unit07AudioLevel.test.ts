import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// unit-07 소급 6단계 변이 시험이 찾은 빈틈 보강(audioLevel.ts). 기존 audioLevel.test.ts(TC-476~476d)와 겹치지 않는 경로만 다룬다.
// 모듈 전역 AudioContext를 시험마다 새로 만들기 위해 시험마다 모듈을 다시 불러온다.

const h = vi.hoisted(() => ({
  setCalls: [] as { level: number; speaking: boolean }[],
  rms: 0,
  contexts: 0,
  samples: 0,
  fft: [] as number[],
  bufLens: [] as number[],
  connects: 0,
  resumes: 0,
  state: 'running',
  resumeRejects: false,
  disconnectThrows: false,
  ctxThrows: false,
  raf: null as ((t: number) => void) | null,
  cleanups: [] as (() => void)[],
}));

vi.mock('react', () => ({
  useState: (init: unknown) => [init, (v: { level: number; speaking: boolean }) => h.setCalls.push(v)],
  useEffect: (fn: () => void | (() => void)) => {
    const c = fn();
    if (typeof c === 'function') h.cleanups.push(c);
  },
}));

const track = { id: 'trk-1' };
const stream = { getAudioTracks: () => [track] } as unknown as MediaStream;

async function load(): Promise<(s: MediaStream | null | undefined, enabled?: boolean) => { level: number; speaking: boolean }> {
  vi.resetModules();
  const m = await import('./audioLevel');
  return m.useAudioLevel;
}
function run(fromMs: number, toMs: number, step = 70): number {
  let t = fromMs;
  while (t <= toMs) {
    h.raf?.(t);
    t += step;
  }
  return t;
}

beforeEach(() => {
  Object.assign(h, { setCalls: [], rms: 0, contexts: 0, samples: 0, fft: [], bufLens: [], connects: 0, resumes: 0, state: 'running', resumeRejects: false, disconnectThrows: false, ctxThrows: false, raf: null, cleanups: [] });
  vi.stubGlobal('AudioContext', class {
    state = h.state;
    constructor() {
      if (h.ctxThrows) throw new Error('no audio');
      h.contexts++;
    }
    resume() {
      h.resumes++;
      return h.resumeRejects ? Promise.reject(new Error('blocked')) : Promise.resolve();
    }
    createMediaStreamSource() {
      return {
        connect: () => void h.connects++,
        disconnect: () => {
          if (h.disconnectThrows) throw new Error('already disconnected');
        },
      };
    }
    createAnalyser() {
      const a = {
        fftSize: 0,
        getByteTimeDomainData(buf: Uint8Array) {
          h.samples++;
          h.fft.push(a.fftSize);
          h.bufLens.push(buf.length);
          buf.fill(Math.round(128 + h.rms * 128));
        },
      };
      return a;
    }
  });
  vi.stubGlobal('MediaStream', class {});
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
    h.raf = cb;
    return 1;
  });
  vi.stubGlobal('cancelAnimationFrame', () => undefined);
});
afterEach(() => vi.unstubAllGlobals());

describe('오디오 레벨 측정기 자원·예외 처리 (unit-07, FR-10, NFR-05)', () => {
  it('TC-476h [FR-10,NFR-05] AudioContext는 모든 타일이 하나를 공유하고(브라우저 한도 보호), 일시정지(suspended) 상태면 resume하며 resume이 거부돼도 예외가 없다', async () => {
    const use = await load();
    use(stream, true);
    use(stream, true);
    use(stream, true);
    expect(h.contexts, '컨텍스트는 1개').toBe(1);
    expect(h.resumes, 'running이면 resume 불필요').toBe(0);
    const use2 = await load(); // 새 모듈 = 새 컨텍스트, 이번엔 suspended + resume 거부
    h.state = 'suspended';
    h.resumeRejects = true;
    expect(() => use2(stream, true)).not.toThrow();
    expect(h.resumes).toBe(1);
    await Promise.resolve(); // 거부가 처리되지 않은 rejection으로 새지 않는지(Vitest가 감지)
  });

  it('TC-476i [FR-10,NFR-05] AudioContext를 만들 수 없는 환경(구형·정책 차단)에서는 예외 없이 강조 없음을 돌려주고 측정 루프를 돌리지 않는다', async () => {
    h.ctxThrows = true;
    const use = await load();
    let r: { level: number; speaking: boolean } | undefined;
    expect(() => (r = use(stream, true))).not.toThrow();
    expect(r).toEqual({ level: 0, speaking: false });
    expect(h.raf).toBeNull();
  });

  it('TC-476j [FR-10] 분석기는 fftSize 512로 소스에 연결되고 샘플 버퍼도 512다', async () => {
    const use = await load();
    use(stream, true);
    run(100, 100);
    expect(h.connects).toBe(1);
    expect(h.fft).toEqual([512]);
    expect(h.bufLens).toEqual([512]);
  });

  it('TC-476k [FR-10] 측정은 약 15fps(66ms)로 제한된다: 10ms 간격으로 호출돼도 66ms 전에는 다시 읽지 않는다', async () => {
    const use = await load();
    use(stream, true);
    run(100, 160, 10); // 100(읽음), 110~160(66ms 미만)
    expect(h.samples).toBe(1);
    run(166, 166, 10);
    expect(h.samples).toBe(2);
    run(200, 230, 10); // 166+66=232 미만
    expect(h.samples).toBe(2);
    run(232, 232, 10);
    expect(h.samples).toBe(3);
  });

  it('TC-476l [FR-10,UX-07] 레벨 변화가 0.05 이하이면 상태를 갱신하지 않고, 초과하면 갱신한다', async () => {
    const use = await load();
    use(stream, true);
    h.rms = 0.1;
    run(0, 700);
    const afterFirst = h.setCalls.length;
    const lvl = h.setCalls.at(-1)?.level ?? 0;
    expect(lvl).toBeCloseTo(0.4, 1);
    h.rms = 0.11; // 레벨 약 +0.03
    run(770, 1400);
    expect(h.setCalls.length, '0.05 이하 변화').toBe(afterFirst);
    h.rms = 0.13; // 레벨 약 +0.12
    run(1470, 1700);
    expect(h.setCalls.length, '0.05 초과 변화').toBeGreaterThan(afterFirst);
  });

  it('TC-476m [FR-10,UX-07] 소리가 띄엄띄엄(켜짐·꺼짐 번갈아) 나면 누적되지 않아 발언으로 보지 않는다', async () => {
    const use = await load();
    use(stream, true);
    let t = 0;
    for (let i = 0; i < 40; i++) {
      h.rms = i % 2 === 0 ? 0.2 : 0;
      h.raf?.(t);
      t += 70;
    }
    expect(h.setCalls.some((s) => s.speaking)).toBe(false);
  });

  it('TC-476n [FR-10] 정리 중 소스 연결 해제가 예외를 던져도(이미 해제됨) 정리는 예외 없이 끝난다', async () => {
    const use = await load();
    use(stream, true);
    h.disconnectThrows = true;
    expect(() => h.cleanups.forEach((c) => c())).not.toThrow();
  });

  it('TC-476o [FR-10,UX-07] 유지 시간 경계: 소리가 120ms 이어진 순간(119ms는 아직)에 켜지고, 침묵이 700ms 이어진 순간(699ms는 아직)에 꺼진다', async () => {
    const speakingAfter = async (onGap: number, offGap: number | null): Promise<boolean | undefined> => {
      const measure = await load();
      h.setCalls = [];
      measure(stream, true);
      h.rms = 0.2;
      h.raf?.(1000);
      h.raf?.(1000 + onGap);
      if (offGap === null) return h.setCalls.at(-1)?.speaking;
      h.rms = 0;
      h.raf?.(3000); // 침묵 시작(켜진 뒤 가장 가까운 샘플)
      h.raf?.(3000 + offGap);
      return h.setCalls.at(-1)?.speaking;
    };
    expect(await speakingAfter(119, null), '소리 119ms').not.toBe(true);
    expect(await speakingAfter(120, null), '소리 120ms').toBe(true);
    expect(await speakingAfter(200, 699), '침묵 699ms').toBe(true);
    expect(await speakingAfter(200, 700), '침묵 700ms').toBe(false);
  });
});
