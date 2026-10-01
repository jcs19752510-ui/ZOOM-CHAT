export type InAppName = 'kakaotalk' | 'instagram' | 'facebook' | 'line' | 'naver' | 'daum' | 'webview';
export interface InAppInfo {
  inApp: boolean;
  app: InAppName | null;
  os: 'ios' | 'android' | 'other';
}

const KNOWN_APPS: ReadonlyArray<readonly [InAppName, RegExp]> = [
  ['kakaotalk', /KAKAOTALK/i],
  ['instagram', /Instagram/i],
  ['facebook', /FBAN|FBAV|FB_IAB/],
  ['line', /\bLine\//],
  ['naver', /NAVER\(inapp/i],
  ['daum', /DaumApps/i],
];

/**
 * UA 문자열로 앱 안 브라우저를 추정한다(UX-13). 토큰은 공개된 일반 지식이며 실기기 확인 전(UAT-04)이다.
 * 오탐·미탐이 있어도 안내만 보이거나 안 보일 뿐 입장은 막지 않는다.
 */
export function detectInApp(ua: string): InAppInfo {
  const os = /iPhone|iPad|iPod/.test(ua) ? 'ios' : /Android/.test(ua) ? 'android' : 'other';
  for (const [app, re] of KNOWN_APPS) if (re.test(ua)) return { inApp: true, app, os };
  if (os === 'android' && /; wv\)/.test(ua)) return { inApp: true, app: 'webview', os };
  // iOS의 독립 브라우저(Safari·Chrome·Firefox·Edge)는 UA에 Safari/ 토큰이 있고, WKWebView 기반 앱은 없다.
  if (os === 'ios' && /AppleWebKit/.test(ua) && !/Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) return { inApp: true, app: 'webview', os };
  return { inApp: false, app: null, os };
}
