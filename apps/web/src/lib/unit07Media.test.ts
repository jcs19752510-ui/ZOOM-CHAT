import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalMedia, classifyMediaError, isMobileBrowser, supportsMedia, supportsScreenShare } from './media';

// unit-07 소급 6단계 변이 시험이 찾은 빈틈 보강(media.ts). 기존 localMedia.test.ts(TC-477~478g)와 겹치지 않는 경로만 다룬다.

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
const stubNav = (extra: Record<string, unknown> = {}): void => {
  vi.stubGlobal('navigator', { userAgent: 'x', maxTouchPoints: 0, mediaDevices: { getUserMedia: gum }, ...extra });
};
beforeEach(() => {
  gum = vi.fn();
  stubNav();
  vi.stubGlobal('MediaStream', class { constructor(public tracks: unknown[]) {} });
});
afterEach(() => vi.unstubAllGlobals());

describe('모바일 판정·화면공유 지원 (unit-07, FR-12, NFR-05)', () => {
  const UA = {
    android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36',
    iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1',
    ipad: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1',
    ipod: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)',
    ipadOsDesktopMode: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15',
    mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15',
    win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36',
    firefoxMobile: 'Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0',
  };

  it('TC-477d [FR-12,NFR-05] Android·iPhone·iPad·iPod·모바일 Firefox와 iPadOS 데스크톱 모드(Macintosh+터치 2점 이상)는 모바일이고, 일반 Windows·터치 없는 Mac은 아니다', () => {
    for (const ua of [UA.android, UA.iphone, UA.ipad, UA.ipod, UA.firefoxMobile]) {
      stubNav({ userAgent: ua });
      expect(isMobileBrowser(), ua).toBe(true);
    }
    stubNav({ userAgent: UA.ipadOsDesktopMode, maxTouchPoints: 5 });
    expect(isMobileBrowser(), 'iPadOS 데스크톱 모드').toBe(true);
    stubNav({ userAgent: UA.ipadOsDesktopMode, maxTouchPoints: 2 });
    expect(isMobileBrowser(), '경계: 터치 2점').toBe(true);
    stubNav({ userAgent: UA.ipadOsDesktopMode, maxTouchPoints: 1 });
    expect(isMobileBrowser(), '경계: 터치 1점(일반 Mac)').toBe(false);
    stubNav({ userAgent: UA.mac, maxTouchPoints: 0 });
    expect(isMobileBrowser()).toBe(false);
    stubNav({ userAgent: UA.win, maxTouchPoints: 10 }); // 터치 노트북은 Macintosh가 아니므로 데스크톱
    expect(isMobileBrowser()).toBe(false);
  });

  it('TC-477f [FR-12,NFR-05] 모바일 토큰이 iPhone뿐인 UA(Mobile·iPad·iPod 없음)도 모바일로 판정한다', () => {
    stubNav({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5)' });
    expect(isMobileBrowser()).toBe(true);
    stubNav({ userAgent: 'Mozilla/5.0 (Linux; U; Android 4.4)' });
    expect(isMobileBrowser(), 'Android 단독 토큰').toBe(true);
  });

  it('TC-477e [FR-12] 화면공유는 getDisplayMedia가 있는 데스크톱에서만 지원하고, 모바일이거나 API가 없으면 지원하지 않는다', () => {
    const gdm = (): Promise<unknown> => Promise.resolve();
    stubNav({ userAgent: UA.win, mediaDevices: { getUserMedia: gum, getDisplayMedia: gdm } });
    expect(supportsScreenShare()).toBe(true);
    stubNav({ userAgent: UA.android, mediaDevices: { getUserMedia: gum, getDisplayMedia: gdm } });
    expect(supportsScreenShare(), '모바일은 API가 있어도 미지원').toBe(false);
    stubNav({ userAgent: UA.iphone, mediaDevices: { getUserMedia: gum, getDisplayMedia: gdm } });
    expect(supportsScreenShare()).toBe(false);
    stubNav({ userAgent: UA.win, mediaDevices: { getUserMedia: gum } });
    expect(supportsScreenShare(), 'API 없음').toBe(false);
    stubNav({ userAgent: UA.win, mediaDevices: undefined });
    expect(supportsScreenShare(), 'mediaDevices 없음').toBe(false);
  });
});

describe('LocalMedia 요청 제약·시작 경로 (unit-07, FR-04, FR-08, FR-09)', () => {
  it('TC-478h [FR-04] 합친 요청이 성공하면 getUserMedia는 1번만 부르고, 제약은 에코 제거·잡음 억제·자동 게인과 720p·30fps 상한이며 장치 ID는 지정했을 때만 exact로 넣는다', async () => {
    gum.mockResolvedValueOnce(streamOf(mk('audio', 'm'), mk('video', 'c')));
    const m = new LocalMedia();
    let notified = 0;
    m.subscribe(() => notified++);
    await m.start({ audio: true, video: true });
    expect(gum).toHaveBeenCalledTimes(1);
    expect(notified).toBe(1);
    expect(m.errors).toEqual({});
    const arg = gum.mock.calls[0]?.[0] as { audio: Record<string, unknown>; video: Record<string, unknown> };
    expect(arg.audio).toEqual({ echoCancellation: true, noiseSuppression: true, autoGainControl: true });
    expect(arg.video).toEqual({ width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } });
    expect('deviceId' in arg.audio).toBe(false);
    // 한 번 얻은 장치 ID는 다음 요청에 exact로 실린다
    gum.mockResolvedValueOnce(streamOf(mk('audio', 'm')));
    await m.switchDevice('audio', 'mic9');
    const arg2 = gum.mock.calls[1]?.[0] as { audio: { deviceId?: unknown } };
    expect(arg2.audio.deviceId).toEqual({ exact: 'mic9' });
  });

  it('TC-478i [FR-04] 마이크만·카메라만 요청하면 해당 종류만 열고, 둘 다 false면 장치를 열지 않는다(알림은 1번)', async () => {
    const m = new LocalMedia();
    let notified = 0;
    m.subscribe(() => notified++);
    gum.mockResolvedValueOnce(streamOf(mk('audio', 'm')));
    await m.start({ audio: true, video: false });
    expect(gum).toHaveBeenCalledTimes(1);
    expect(Object.keys(gum.mock.calls[0]?.[0] as object)).toEqual(['audio']);
    expect(m.audio).not.toBeNull();
    expect(m.video).toBeNull();
    gum.mockClear();
    gum.mockResolvedValueOnce(streamOf(mk('video', 'c')));
    await new LocalMedia().start({ audio: false, video: true });
    expect(gum).toHaveBeenCalledTimes(1);
    expect(Object.keys(gum.mock.calls[0]?.[0] as object)).toEqual(['video']);
    gum.mockClear();
    const empty = new LocalMedia();
    await empty.start({ audio: false, video: false });
    expect(gum).not.toHaveBeenCalled();
    expect(empty.errors).toEqual({});
    expect(notified).toBe(1);
  });

  it('TC-478j [FR-08] 음소거한 뒤 장치를 새로 얻어도(전환·재시작) 새 마이크 트랙은 음소거 상태를 그대로 따른다', async () => {
    const m = new LocalMedia();
    m.setMic(false);
    const a1 = mk('audio', 'm');
    gum.mockResolvedValueOnce(streamOf(a1));
    await m.start({ audio: true, video: false });
    expect(a1.enabled, '시작 시 음소거 유지').toBe(false);
    const a2 = mk('audio', 'm2');
    gum.mockResolvedValueOnce(streamOf(a2));
    await m.switchDevice('audio', 'm2');
    expect(a2.enabled, '장치 전환 뒤에도 음소거 유지').toBe(false);
  });

  it('TC-478k [FR-04,UX-03] 실패했던 종류를 나중에 성공하면 그 종류의 오류만 지워지고 다른 종류의 오류는 남는다', async () => {
    gum.mockRejectedValue(new DOMException('x', 'NotAllowedError'));
    const m = new LocalMedia();
    await m.start({ audio: true, video: true });
    expect(m.errors).toEqual({ audio: 'denied', video: 'denied' });
    gum.mockReset();
    gum.mockResolvedValueOnce(streamOf(mk('audio', 'm')));
    expect(await m.switchDevice('audio', 'm')).toBe(true);
    expect(m.errors).toEqual({ video: 'denied' });
  });

  it('TC-478l [FR-09] 카메라 장치 전환이 실패하면 카메라가 켜진 상태에서도 이전 카메라 ID로 되돌린다', async () => {
    gum.mockResolvedValueOnce(streamOf(mk('audio', 'm'), mk('video', 'cam1')));
    const m = new LocalMedia();
    await m.start({ audio: true, video: true });
    gum.mockRejectedValueOnce(new DOMException('x', 'NotFoundError'));
    expect(await m.switchDevice('video', 'cam2')).toBe(false);
    expect(m.videoDeviceId).toBe('cam1');
    expect(m.errors.video).toBe('notFound');
  });

  it('TC-478m [FR-04] 이미 교체된 옛 카메라 트랙의 ended 콜백은 새 트랙과 구독자에게 영향을 주지 않는다(경쟁 조건)', async () => {
    const v1 = mk('video', 'cam1');
    gum.mockResolvedValueOnce(streamOf(mk('audio', 'm'), v1));
    const m = new LocalMedia();
    await m.start({ audio: true, video: true });
    const v2 = mk('video', 'cam2');
    gum.mockResolvedValueOnce(streamOf(v2));
    await m.switchDevice('video', 'cam2');
    expect(v1.stopped).toBe(1);
    expect(m.video).toBe(v2);
    let notified = 0;
    m.subscribe(() => notified++);
    v1.onended?.();
    expect(m.video, '새 트랙 유지').toBe(v2);
    expect(notified).toBe(0);
  });

  it('TC-478n [FR-08] setMic·stopAll은 구독자에게 알리고, stopAll은 마이크·카메라를 모두 멈추며, stream()에는 살아 있는 트랙만 담긴다', async () => {
    const a = mk('audio', 'm');
    const v = mk('video', 'c');
    gum.mockResolvedValueOnce(streamOf(a, v));
    const m = new LocalMedia();
    await m.start({ audio: true, video: true });
    expect((m.stream() as unknown as { tracks: unknown[] }).tracks).toEqual([a, v]);
    let notified = 0;
    m.subscribe(() => notified++);
    const before = m.getVersion();
    m.setMic(false);
    expect(notified).toBe(1);
    expect(m.getVersion()).toBe(before + 1);
    await m.setCamera(false);
    expect((m.stream() as unknown as { tracks: unknown[] }).tracks, '카메라 해제 뒤에는 null이 섞이지 않는다').toEqual([a]);
    m.stopAll();
    expect(a.stopped).toBe(1);
    expect(m.audio).toBeNull();
    expect((m.stream() as unknown as { tracks: unknown[] }).tracks).toEqual([]);
    const m2 = new LocalMedia();
    const v2 = mk('video', 'c');
    m2.video = v2 as unknown as MediaStreamTrack;
    m2.stopAll();
    expect(v2.stopped, '카메라 표시등을 끄려면 비디오 트랙도 멈춰야 한다').toBe(1);
  });

  it('TC-478o [UX-14] 백그라운드에서 카메라만 끊기면 reconcile이 카메라만 비우고 마이크는 유지한다', () => {
    const m = new LocalMedia();
    const a = mk('audio', 'm');
    const v = mk('video', 'c');
    v.readyState = 'ended';
    m.audio = a as unknown as MediaStreamTrack;
    m.video = v as unknown as MediaStreamTrack;
    expect(m.reconcile()).toEqual({ audioLost: false, videoLost: true });
    expect(m.video).toBeNull();
    expect(m.audio).toBe(a);
  });
});

describe('오류 분류·지원 판정·구독 해제 (unit-07, 2차 변이 보강)', () => {
  it('TC-477g [FR-04,UX-03] 구형 이름(TrackStartError·PermissionDeniedError·DevicesNotFoundError·OverconstrainedError·AbortError)도 같은 종류로 분류하고, 이름만 흉내 낸 일반 객체는 unknown이다', () => {
    const err = (name: string): Error => Object.assign(new Error('x'), { name });
    expect(classifyMediaError(err('TrackStartError'))).toBe('inUse');
    expect(classifyMediaError(err('AbortError'))).toBe('inUse');
    expect(classifyMediaError(err('PermissionDeniedError'))).toBe('denied');
    expect(classifyMediaError(err('DevicesNotFoundError'))).toBe('notFound');
    expect(classifyMediaError(err('OverconstrainedError'))).toBe('notFound');
    expect(classifyMediaError({ name: 'NotAllowedError' }), '일반 객체').toBe('unknown');
    expect(classifyMediaError(null)).toBe('unknown');
    expect(classifyMediaError('NotAllowedError')).toBe('unknown');
  });

  it('TC-477h [NFR-05] window가 없는 환경에서도 supportsMedia는 예외 없이 false다', () => {
    vi.stubGlobal('RTCPeerConnection', class {});
    stubNav({ mediaDevices: { getUserMedia: gum } });
    vi.stubGlobal('window', undefined);
    expect(() => supportsMedia()).not.toThrow();
    expect(supportsMedia()).toBe(false);
    vi.stubGlobal('window', { isSecureContext: true });
    expect(supportsMedia(), '대조군: 전부 갖추면 true').toBe(true);
    vi.stubGlobal('window', { isSecureContext: false });
    expect(supportsMedia()).toBe(false);
  });

  it('TC-478p [FR-08] subscribe가 돌려준 해제 함수를 부르면 더 이상 알리지 않고, 다른 구독자는 계속 알린다', () => {
    const m = new LocalMedia();
    let a = 0;
    let b = 0;
    const offA = m.subscribe(() => a++);
    m.subscribe(() => b++);
    m.setMic(false);
    offA();
    m.setMic(true);
    expect([a, b]).toEqual([1, 2]);
  });
});
