import { describe, expect, it } from 'vitest';
import { detectInApp } from './inApp';

const IOS_WK = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';

describe('detectInApp 경계·예외 입력 (UX-13)', () => {
  it('TC-363 [UX-13] 대소문자·위치가 달라도 토큰을 찾고, 비정상 UA(공백·무관 문자열·매우 긴 문자열)는 오탐 없이 빠르게 끝난다', () => {
    expect(detectInApp('xx kakaotalk 10.0')).toMatchObject({ inApp: true, app: 'kakaotalk' });
    expect(detectInApp('instagram 1.0')).toMatchObject({ inApp: true, app: 'instagram' });
    expect(detectInApp('NAVER(INAPP; search)')).toMatchObject({ inApp: true, app: 'naver' });
    // 페이스북 토큰은 대소문자를 구분한다(소문자 fban은 일반 문자열)
    expect(detectInApp('fban fbav')).toMatchObject({ inApp: false });
    // Line은 단어 경계가 필요하다(OnLine/, Pipeline/ 등 오탐 금지)
    expect(detectInApp('OnLine/1.0 Safari/1')).toMatchObject({ inApp: false });
    expect(detectInApp('Mozilla/5.0 Line/13.0 Mobile')).toMatchObject({ inApp: true, app: 'line' });
    for (const ua of ['', ' ', '\n', 'null', 'undefined', '<script>alert(1)</script>', '😀', 'Mozilla']) expect(detectInApp(ua), JSON.stringify(ua)).toMatchObject({ inApp: false, app: null, os: 'other' });
    const long = 'A'.repeat(200_000) + ' (Linux; Android 13; wv';
    const t0 = performance.now();
    expect(detectInApp(long).inApp).toBe(false);
    expect(performance.now() - t0).toBeLessThan(200);
  });

  it('TC-363b [UX-13] Android 웹뷰 표지(; wv))는 Android에서만 인정하고, iOS WebKit은 Safari/·CriOS·FxiOS·EdgiOS 중 하나라도 있으면 일반 브라우저로 본다', () => {
    expect(detectInApp('Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A; wv) Chrome/120 Mobile Safari/537.36')).toMatchObject({ inApp: true, app: 'webview', os: 'android' });
    expect(detectInApp('Mozilla/5.0 (X11; Linux x86_64; wv) AppleWebKit/537.36')).toMatchObject({ inApp: false });
    expect(detectInApp('Mozilla/5.0 (Linux; Android 13; Pixel 7) Chrome/120 Mobile Safari/537.36')).toMatchObject({ inApp: false });
    expect(detectInApp('Mozilla/5.0 (Android 13; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0')).toMatchObject({ inApp: false });
    expect(detectInApp(`${IOS_WK} Mobile/15E148 Safari/604.1`).inApp).toBe(false);
    expect(detectInApp(`${IOS_WK} CriOS/120 Mobile/15E148`).inApp).toBe(false);
    expect(detectInApp(`${IOS_WK} FxiOS/121 Mobile/15E148`).inApp).toBe(false);
    expect(detectInApp(`${IOS_WK} EdgiOS/120 Mobile/15E148`).inApp).toBe(false);
    expect(detectInApp(`${IOS_WK} Mobile/15E148`)).toMatchObject({ inApp: true, app: 'webview', os: 'ios' });
    // iPad·iPod도 iOS로 본다
    expect(detectInApp('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 KAKAOTALK 10')).toMatchObject({ app: 'kakaotalk', os: 'ios' });
    // iPadOS 데스크톱 모드(Macintosh UA)는 일반 Safari로 보인다
    expect(detectInApp('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15').inApp).toBe(false);
  });
});
