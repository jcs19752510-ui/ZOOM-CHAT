import { describe, expect, it } from 'vitest';
import { detectInApp } from './inApp';

const IOS_WK = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)';
const AND_WV = 'Mozilla/5.0 (Linux; Android 13; SM-S918N Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36';

describe('detectInApp (UX-13, UA 샘플표)', () => {
  const inApp: Array<[string, string, string, 'ios' | 'android']> = [
    ['카카오톡 iOS', `${IOS_WK} Mobile/15E148 KAKAOTALK 10.4.0`, 'kakaotalk', 'ios'],
    ['카카오톡 Android', `${AND_WV} KAKAOTALK 2510`, 'kakaotalk', 'android'],
    ['인스타그램 iOS', `${IOS_WK} Mobile/15E148 Instagram 300.0.0.0 (iPhone14,2; iOS 17_0; ko_KR)`, 'instagram', 'ios'],
    ['페이스북 iOS', `${IOS_WK} Mobile/15E148 [FBAN/FBIOS;FBAV/430.0.0;FBDV/iPhone14,2]`, 'facebook', 'ios'],
    ['페이스북 Android', `${AND_WV} [FB_IAB/FB4A;FBAV/430.0.0.0;]`, 'facebook', 'android'],
    ['라인 iOS', `${IOS_WK} Mobile/15E148 Safari Line/13.0.0`, 'line', 'ios'],
    ['네이버 iOS', `${IOS_WK} Mobile/15E148 NAVER(inapp; search; 1000; 12.0.0; 14PRO)`, 'naver', 'ios'],
    ['다음 Android', `${AND_WV} DaumApps/1.0`, 'daum', 'android'],
    ['알 수 없는 Android 웹뷰', AND_WV, 'webview', 'android'],
    ['알 수 없는 iOS 웹뷰(Safari 토큰 없음)', `${IOS_WK} Mobile/15E148`, 'webview', 'ios'],
  ];
  it('TC-360 [UX-13] 카카오톡·인스타그램·페이스북·라인·네이버·다음·일반 웹뷰 UA는 앱 안 브라우저로 판정한다', () => {
    for (const [name, ua, app, os] of inApp) expect(detectInApp(ua), name).toEqual({ inApp: true, app, os });
  });

  const regular: Array<[string, string]> = [
    ['Chrome 데스크톱', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'],
    ['Edge 데스크톱', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'],
    ['Firefox 데스크톱', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'],
    ['Safari macOS', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'],
    ['Chrome Android', 'Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'],
    ['삼성 인터넷', 'Mozilla/5.0 (Linux; Android 13; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36'],
    ['Safari iOS', `${IOS_WK} Version/17.0 Mobile/15E148 Safari/604.1`],
    ['Chrome iOS', `${IOS_WK} CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1`],
    ['Firefox iOS', `${IOS_WK} FxiOS/121.0 Mobile/15E148 Safari/605.1.15`],
    ['Edge iOS', `${IOS_WK} EdgiOS/120.0.2210.126 Version/17.0 Mobile/15E148 Safari/605.1.15`],
    ['Line 경계(Baseline/)', 'Mozilla/5.0 (X11; Linux x86_64) Baseline/1.0 Chrome/120.0.0.0 Safari/537.36'],
    ['빈 문자열', ''],
  ];
  it('TC-360b [UX-13] 일반 Chrome·Edge·Firefox·Safari·삼성 인터넷·iOS Chrome/Firefox/Edge UA와 빈 문자열은 오탐하지 않는다', () => {
    for (const [name, ua] of regular) expect(detectInApp(ua), name).toMatchObject({ inApp: false, app: null });
  });
});
