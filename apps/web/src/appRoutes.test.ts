import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { S } from './strings';

// App 라우팅과 진입 파일을 DOM 없이 정적 렌더로 시험한다(소급 6단계 보강).
const ID = 'C'.repeat(22);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  vi.doUnmock('react-dom/client');
  vi.doUnmock('./App');
});

async function renderAt(pathname: string, media = false): Promise<string> {
  vi.resetModules();
  vi.stubGlobal('window', { location: { pathname, origin: 'https://meet.example' }, isSecureContext: media, addEventListener: () => undefined, removeEventListener: () => undefined });
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 Chrome/130', maxTouchPoints: 0, ...(media ? { mediaDevices: { getUserMedia: () => Promise.resolve() } } : {}) });
  if (media) vi.stubGlobal('RTCPeerConnection', class {});
  const { App } = await import('./App');
  return renderToStaticMarkup(createElement(App));
}

describe('App 라우팅 (unit-06 보강, FR-01, FR-03, FR-06)', () => {
  it('TC-509 [FR-01] "/"와 알 수 없는 경로, 길이가 다른 방 경로(/r/짧은ID)는 랜딩을 보인다', async () => {
    for (const p of ['/', '/nowhere', `/r/${'C'.repeat(21)}`, `/r/${ID}/x`]) {
      const html = await renderAt(p);
      expect(html, p).toContain(S.landing.createButton);
    }
  });

  it('TC-509b [FR-03,FR-06] 올바른 방 경로는 방 페이지로 가고, 이 브라우저가 미디어를 지원하지 않으면 입장 폼 대신 "지원 안 됨" 상태 화면과 링크 복사를 보인다', async () => {
    const html = await renderAt(`/r/${ID}`);
    expect(html).toContain(S.state.unsupported.title);
    expect(html).not.toContain(S.landing.createButton);
    expect(html).toMatch(/role="alert"/);
  });

  it('TC-509c [FR-06,UX-02] 미디어를 지원하는 브라우저의 방 페이지는 먼저 "확인 중" 로딩 화면(방 상태 확인 전에는 입력 폼 없음)을 보인다', async () => {
    const html = await renderAt(`/r/${ID}`, true);
    expect(html).toContain(S.state.loading.title);
    expect(html).not.toContain('data-testid="nickname"');
  });

  it('TC-509d [POL-01] 법률 문서 경로 3종은 법률 페이지로 가고 랜딩이 아니다', async () => {
    for (const p of ['/privacy', '/terms', '/contact', '/privacy/']) {
      const html = await renderAt(p);
      expect(html, p).not.toContain(S.landing.createButton);
      expect(html, p).toMatch(/<h1/);
    }
  });
});

describe('App 방 전환 (unit-06 보강, FR-03)', () => {
  it('TC-509e [FR-03] 방 ID가 바뀌면 방 페이지를 새로 시작하도록 key에 방 ID를 쓴다(이전 방의 연결·입력 상태 재사용 금지)', async () => {
    vi.resetModules();
    vi.doMock('./lib/useRoute', async (orig) => ({ ...(await orig<Record<string, unknown>>()), useRoute: () => ({ path: `/r/${ID}`, navigate: () => undefined }) }));
    try {
      const { App } = await import('./App');
      const el = App() as unknown as { key: string | null; props: { roomId: string } };
      expect(el.key).toBe(ID);
      expect(el.props.roomId).toBe(ID);
    } finally {
      vi.doUnmock('./lib/useRoute');
    }
  });
});

describe('진입 파일 (unit-06 보강)', () => {
  it('TC-510 [NFR-01] main은 #root가 있으면 App을 렌더하고, 없으면 아무것도 하지 않는다', async () => {
    const render = vi.fn();
    const createRoot = vi.fn(() => ({ render }));
    vi.doMock('react-dom/client', () => ({ createRoot }));
    vi.doMock('./App', () => ({ App: () => null }));
    vi.stubGlobal('document', { getElementById: (id: string) => (id === 'root' ? { id } : null) });
    await import('./main');
    expect(createRoot).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
    const el = (render.mock.calls[0] as unknown[])[0] as { type: unknown };
    const { App } = await import('./App');
    expect(el.type).toBe(App);
    vi.resetModules();
    createRoot.mockClear();
    vi.stubGlobal('document', { getElementById: () => null });
    await import('./main');
    expect(createRoot).not.toHaveBeenCalled();
  });
});
