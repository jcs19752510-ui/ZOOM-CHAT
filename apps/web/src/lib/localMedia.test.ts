import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalMedia, classifyMediaError, listDevices, supportsMedia } from './media';

interface FakeTrack {
  kind: 'audio' | 'video';
  enabled: boolean;
  readyState: 'live' | 'ended';
  stopped: number;
  onended: (() => void) | null;
  getSettings: () => { deviceId: string };
  stop: () => void;
}
const mk = (kind: 'audio' | 'video', deviceId: string): FakeTrack => {
  const t: FakeTrack = { kind, enabled: true, readyState: 'live', stopped: 0, onended: null, getSettings: () => ({ deviceId }), stop: () => { t.stopped++; t.readyState = 'ended'; } };
  return t;
};
const streamOf = (...tracks: FakeTrack[]) => ({ getAudioTracks: () => tracks.filter((t) => t.kind === 'audio'), getVideoTracks: () => tracks.filter((t) => t.kind === 'video') });

let gum: ReturnType<typeof vi.fn>;
beforeEach(() => {
  gum = vi.fn();
  vi.stubGlobal('navigator', { userAgent: 'x', mediaDevices: { getUserMedia: gum } });
  vi.stubGlobal('MediaStream', class { constructor(public tracks: unknown[]) {} });
});
afterEach(() => vi.unstubAllGlobals());

describe('오류 분류·환경 판정 (unit-07, FR-04, UX-03)', () => {
  it('TC-477 [FR-04,UX-03] 장치 오류 이름을 denied·notFound·inUse·unknown 4종으로 분류하고 이상한 입력도 unknown이다', () => {
    const e = (name: string): Error => Object.assign(new Error('x'), { name });
    expect(classifyMediaError(e('NotAllowedError'))).toBe('denied');
    expect(classifyMediaError(e('SecurityError'))).toBe('denied');
    expect(classifyMediaError(e('PermissionDeniedError'))).toBe('denied');
    expect(classifyMediaError(e('NotFoundError'))).toBe('notFound');
    expect(classifyMediaError(e('OverconstrainedError'))).toBe('notFound');
    expect(classifyMediaError(e('NotReadableError'))).toBe('inUse');
    expect(classifyMediaError(e('AbortError'))).toBe('inUse');
    expect(classifyMediaError(e('TypeError'))).toBe('unknown');
    for (const odd of [null, undefined, 'NotAllowedError', 42, {}, { name: 'NotAllowedError' }]) expect(classifyMediaError(odd)).toBe('unknown');
  });

  it('TC-477b [NFR-05,POL-14] supportsMedia는 보안 컨텍스트·RTCPeerConnection·getUserMedia가 모두 있어야 true다', () => {
    vi.stubGlobal('window', { isSecureContext: true });
    vi.stubGlobal('RTCPeerConnection', class {});
    expect(supportsMedia()).toBe(true);
    vi.stubGlobal('window', { isSecureContext: false });
    expect(supportsMedia()).toBe(false);
    vi.stubGlobal('window', { isSecureContext: true });
    vi.stubGlobal('RTCPeerConnection', undefined);
    expect(supportsMedia()).toBe(false);
    vi.stubGlobal('RTCPeerConnection', class {});
    vi.stubGlobal('navigator', { userAgent: 'x', mediaDevices: undefined });
    expect(supportsMedia()).toBe(false);
  });

  it('TC-477c [FR-09] 장치 목록은 이름이 가려진 빈 deviceId 항목을 제외하고, 열거 실패에도 빈 목록을 돌려준다', async () => {
    const dev = (kind: string, deviceId: string) => ({ kind, deviceId, label: deviceId });
    vi.stubGlobal('navigator', { userAgent: 'x', mediaDevices: { enumerateDevices: () => Promise.resolve([dev('audioinput', 'a1'), dev('audioinput', ''), dev('videoinput', 'v1'), dev('audiooutput', 's1')]) } });
    const l = await listDevices();
    expect(l.audioinput.map((d) => d.deviceId)).toEqual(['a1']);
    expect(l.videoinput.map((d) => d.deviceId)).toEqual(['v1']);
    expect(l.audiooutput.map((d) => d.deviceId)).toEqual(['s1']);
    vi.stubGlobal('navigator', { userAgent: 'x', mediaDevices: { enumerateDevices: () => Promise.reject(new Error('x')) } });
    expect(await listDevices()).toEqual({ audioinput: [], videoinput: [], audiooutput: [] });
  });
});

describe('LocalMedia (unit-07, FR-04, FR-08, FR-09)', () => {
  it('TC-478 [FR-04] 한 번에 얻지 못하면 따로 시도해 되는 것만 켜고, 실패한 종류의 원인을 errors에 남긴다', async () => {
    const audio = mk('audio', 'mic1');
    gum.mockRejectedValueOnce(new DOMException('x', 'NotAllowedError')); // 합친 요청 실패
    gum.mockResolvedValueOnce(streamOf(audio)); // 오디오만 성공
    gum.mockRejectedValueOnce(new DOMException('x', 'NotFoundError')); // 비디오 실패
    const m = new LocalMedia();
    await m.start({ audio: true, video: true });
    expect(m.audio).toBe(audio);
    expect(m.video).toBeNull();
    expect(m.errors).toEqual({ video: 'notFound' });
    expect(m.audioDeviceId).toBe('mic1');
    expect(gum).toHaveBeenCalledTimes(3);
  });

  it('TC-478b [FR-04] 둘 다 거부되면 장치 없이 시작하고 errors에 두 원인이 남으며(입장은 막지 않는다), 다시 시작하면 오류가 초기화된다', async () => {
    gum.mockRejectedValue(new DOMException('x', 'NotAllowedError'));
    const m = new LocalMedia();
    await m.start({ audio: true, video: true });
    expect(m.audio).toBeNull();
    expect(m.video).toBeNull();
    expect(m.errors).toEqual({ audio: 'denied', video: 'denied' });
    gum.mockReset();
    gum.mockResolvedValue(streamOf(mk('audio', 'm'), mk('video', 'c')));
    await m.start({ audio: true, video: true });
    expect(m.errors).toEqual({});
    expect(m.audio).not.toBeNull();
    expect(m.video).not.toBeNull();
  });

  it('TC-478c [FR-08] 마이크는 track.enabled로 즉시 음소거되고(장치는 유지), 카메라를 끄면 장치를 해제하며 다시 켜면 새로 연다', async () => {
    const a = mk('audio', 'm');
    const v1 = mk('video', 'c');
    gum.mockResolvedValueOnce(streamOf(a, v1));
    const m = new LocalMedia();
    await m.start({ audio: true, video: true });
    m.setMic(false);
    expect(a.enabled).toBe(false);
    expect(a.stopped).toBe(0);
    expect(m.micOn).toBe(false);
    m.setMic(true);
    expect(a.enabled).toBe(true);
    expect(await m.setCamera(false)).toBe(true);
    expect(v1.stopped).toBe(1); // 카메라 표시등이 꺼지도록 장치를 놓는다
    expect(m.video).toBeNull();
    expect(m.camOn).toBe(false);
    const v2 = mk('video', 'c');
    gum.mockResolvedValueOnce(streamOf(v2));
    expect(await m.setCamera(true)).toBe(true);
    expect(m.video).toBe(v2);
    expect(m.camOn).toBe(true);
  });

  it('TC-478d [FR-08,UX-03] 카메라를 다시 켜지 못하면 false를 돌려주고 camOn은 꺼진 채로 둔다', async () => {
    const m = new LocalMedia();
    gum.mockRejectedValueOnce(new DOMException('x', 'NotReadableError'));
    expect(await m.setCamera(true)).toBe(false);
    expect(m.camOn).toBe(false);
    expect(m.errors.video).toBe('inUse');
  });

  it('TC-478e [FR-09] 장치 전환 실패 시 이전 장치 ID로 되돌리고 false를 돌려주며, 성공하면 새 트랙으로 바뀌고 이전 트랙은 멈춘다', async () => {
    const a1 = mk('audio', 'mic1');
    gum.mockResolvedValueOnce(streamOf(a1, mk('video', 'c')));
    const m = new LocalMedia();
    await m.start({ audio: true, video: true });
    gum.mockRejectedValueOnce(new DOMException('x', 'OverconstrainedError'));
    expect(await m.switchDevice('audio', 'mic2')).toBe(false);
    expect(m.audioDeviceId).toBe('mic1');
    const a2 = mk('audio', 'mic2');
    gum.mockResolvedValueOnce(streamOf(a2));
    expect(await m.switchDevice('audio', 'mic2')).toBe(true);
    expect(m.audio).toBe(a2);
    expect(m.audioDeviceId).toBe('mic2');
    expect(a1.stopped).toBe(1);
    expect(JSON.stringify(gum.mock.calls.at(-1)?.[0])).toContain('"exact":"mic2"');
  });

  it('TC-478f [FR-09] 카메라가 꺼진 상태에서 카메라 장치를 바꾸면 장치를 열지 않고 선택만 기억한다', async () => {
    const m = new LocalMedia();
    await m.setCamera(false);
    gum.mockClear();
    expect(await m.switchDevice('video', 'cam2')).toBe(true);
    expect(gum).not.toHaveBeenCalled();
    expect(m.videoDeviceId).toBe('cam2');
  });

  it('TC-478g [FR-04] 카메라 트랙이 외부 요인으로 끝나면(ended) 비디오를 비우고 구독자에게 알리며, stopAll은 모든 트랙을 멈춘다', async () => {
    const a = mk('audio', 'm');
    const v = mk('video', 'c');
    gum.mockResolvedValueOnce(streamOf(a, v));
    const m = new LocalMedia();
    await m.start({ audio: true, video: true });
    const seen: number[] = [];
    m.subscribe(() => seen.push(m.getVersion()));
    v.onended?.();
    expect(m.video).toBeNull();
    expect(seen.length).toBe(1);
    m.stopAll();
    expect(a.stopped).toBe(1);
    expect(m.audio).toBeNull();
  });
});
