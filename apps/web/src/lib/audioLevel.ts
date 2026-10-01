import { useEffect, useState } from 'react';

let sharedCtx: AudioContext | null = null;
function ctx(): AudioContext | null {
  try {
    sharedCtx ??= new AudioContext();
    if (sharedCtx.state === 'suspended') void sharedCtx.resume().catch(() => undefined);
    return sharedCtx;
  } catch {
    return null;
  }
}

export interface Level {
  /** 0~1 입력 레벨(대기실 미터용) */
  level: number;
  /** 임계값 + 디바운스를 거친 발언 여부(UX-07) */
  speaking: boolean;
}

const ON_THRESHOLD = 0.035;
const ON_HOLD_MS = 120;
const OFF_HOLD_MS = 700;

/** 스트림의 오디오 레벨을 측정한다. 짧은 소음에 깜빡이지 않도록 켜짐/꺼짐에 각각 유지 시간을 둔다. */
export function useAudioLevel(stream: MediaStream | null | undefined, enabled = true): Level {
  const [state, setState] = useState<Level>({ level: 0, speaking: false });

  const audioTrack = stream?.getAudioTracks()[0];
  const trackId = audioTrack?.id;
  const active = enabled && !!audioTrack;

  useEffect(() => {
    if (!active || !audioTrack) return;
    const c = ctx();
    if (!c) return;
    const source = c.createMediaStreamSource(new MediaStream([audioTrack]));
    const analyser = c.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    let raf = 0;
    let last = 0;
    let aboveSince = 0;
    let belowSince = 0;
    let speaking = false;
    let shown: Level = { level: 0, speaking: false };
    const tick = (now: number): void => {
      raf = requestAnimationFrame(tick);
      if (now - last < 66) return; // 약 15fps
      last = now;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) {
        const d = (v - 128) / 128;
        sum += d * d;
      }
      const rms = Math.sqrt(sum / buf.length);
      const level = Math.min(1, rms * 4);
      if (rms > ON_THRESHOLD) {
        belowSince = 0;
        aboveSince ||= now;
        if (!speaking && now - aboveSince >= ON_HOLD_MS) speaking = true;
      } else {
        aboveSince = 0;
        belowSince ||= now;
        if (speaking && now - belowSince >= OFF_HOLD_MS) speaking = false;
      }
      if (shown.speaking !== speaking || Math.abs(shown.level - level) > 0.05) {
        shown = { level, speaking };
        setState(shown);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      try {
        source.disconnect();
      } catch {
        /* 무시 */
      }
    };
    // trackId가 바뀔 때마다 새 트랙에 다시 연결한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, active]);

  return active ? state : { level: 0, speaking: false };
}
