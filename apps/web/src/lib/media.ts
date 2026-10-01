export type MediaErrorKind = 'denied' | 'notFound' | 'inUse' | 'unknown';

export function classifyMediaError(e: unknown): MediaErrorKind {
  const name = e instanceof DOMException || e instanceof Error ? e.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') return 'denied';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return 'notFound';
  if (name === 'NotReadableError' || name === 'TrackStartError' || name === 'AbortError') return 'inUse';
  return 'unknown';
}

export const supportsMedia = (): boolean =>
  typeof window !== 'undefined' && typeof RTCPeerConnection !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;

export const isMobileBrowser = (): boolean => /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));

export const supportsScreenShare = (): boolean => typeof navigator.mediaDevices?.getDisplayMedia === 'function' && !isMobileBrowser();

export interface DeviceLists {
  audioinput: MediaDeviceInfo[];
  videoinput: MediaDeviceInfo[];
  audiooutput: MediaDeviceInfo[];
}

export async function listDevices(): Promise<DeviceLists> {
  const all = (await navigator.mediaDevices?.enumerateDevices?.().catch(() => [])) ?? [];
  const pick = (k: MediaDeviceKind): MediaDeviceInfo[] => all.filter((d) => d.kind === k && d.deviceId !== '');
  return { audioinput: pick('audioinput'), videoinput: pick('videoinput'), audiooutput: pick('audiooutput') };
}

const audioConstraints = (deviceId?: string): MediaTrackConstraints => ({
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
});
const videoConstraints = (deviceId?: string): MediaTrackConstraints => ({
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30, max: 30 },
  ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
});

type Listener = () => void;

/**
 * 내 카메라·마이크를 관리한다. 대기실에서 만들어 회의실로 그대로 넘긴다(권한을 다시 묻지 않기 위해).
 * 카메라를 끄면 장치를 해제해 카메라 표시등이 꺼지고, 마이크는 track.enabled로 즉시 음소거한다.
 */
export class LocalMedia {
  audio: MediaStreamTrack | null = null;
  video: MediaStreamTrack | null = null;
  audioDeviceId: string | undefined;
  videoDeviceId: string | undefined;
  micOn = true;
  camOn = true;
  errors: { audio?: MediaErrorKind; video?: MediaErrorKind } = {};
  private listeners = new Set<Listener>();
  private version = 0;

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getVersion = (): number => this.version;
  private changed(): void {
    this.version++;
    this.listeners.forEach((l) => l());
  }

  /** 카메라·마이크를 한 번에 요청하고, 실패하면 따로 시도해 되는 것만 켠다. */
  async start(opts: { audio: boolean; video: boolean }): Promise<void> {
    this.errors = {};
    if (opts.audio && opts.video) {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints(this.audioDeviceId), video: videoConstraints(this.videoDeviceId) });
        this.adopt('audio', s.getAudioTracks()[0] ?? null);
        this.adopt('video', s.getVideoTracks()[0] ?? null);
        this.changed();
        return;
      } catch {
        /* 아래에서 따로 시도 */
      }
    }
    if (opts.audio) await this.acquire('audio');
    if (opts.video) await this.acquire('video');
    this.changed();
  }

  private adopt(kind: 'audio' | 'video', track: MediaStreamTrack | null): void {
    if (!track) return;
    const prev = kind === 'audio' ? this.audio : this.video;
    prev?.stop();
    if (kind === 'audio') {
      this.audio = track;
      track.enabled = this.micOn;
      this.audioDeviceId = track.getSettings().deviceId ?? this.audioDeviceId;
    } else {
      this.video = track;
      this.videoDeviceId = track.getSettings().deviceId ?? this.videoDeviceId;
      track.onended = () => {
        if (this.video === track) {
          this.video = null;
          this.changed();
        }
      };
    }
  }

  private async acquire(kind: 'audio' | 'video'): Promise<boolean> {
    try {
      const s = await navigator.mediaDevices.getUserMedia(kind === 'audio' ? { audio: audioConstraints(this.audioDeviceId) } : { video: videoConstraints(this.videoDeviceId) });
      this.adopt(kind, (kind === 'audio' ? s.getAudioTracks() : s.getVideoTracks())[0] ?? null);
      delete this.errors[kind];
      return true;
    } catch (e) {
      this.errors[kind] = classifyMediaError(e);
      return false;
    }
  }

  setMic(on: boolean): void {
    this.micOn = on;
    if (this.audio) this.audio.enabled = on;
    this.changed();
  }

  /** 카메라 켜기/끄기. 끄면 장치를 놓고, 켜면 다시 연다. 성공 여부를 돌려준다. */
  async setCamera(on: boolean): Promise<boolean> {
    this.camOn = on;
    if (!on) {
      this.video?.stop();
      this.video = null;
      this.changed();
      return true;
    }
    const ok = await this.acquire('video');
    this.changed();
    if (!ok) this.camOn = false;
    return ok;
  }

  async switchDevice(kind: 'audio' | 'video', deviceId: string): Promise<boolean> {
    const prev = kind === 'audio' ? this.audioDeviceId : this.videoDeviceId;
    if (kind === 'audio') this.audioDeviceId = deviceId;
    else this.videoDeviceId = deviceId;
    if (kind === 'video' && !this.camOn) {
      this.changed();
      return true;
    }
    const ok = await this.acquire(kind);
    if (!ok) {
      if (kind === 'audio') this.audioDeviceId = prev;
      else this.videoDeviceId = prev;
    }
    this.changed();
    return ok;
  }

  /** 미리보기·재생용 스트림(트랙 구성이 바뀔 때마다 새로 만든다) */
  stream(): MediaStream {
    const tracks = [this.audio, this.video].filter((t): t is MediaStreamTrack => !!t);
    return new MediaStream(tracks);
  }

  stopAll(): void {
    this.audio?.stop();
    this.video?.stop();
    this.audio = null;
    this.video = null;
    this.changed();
  }
}
