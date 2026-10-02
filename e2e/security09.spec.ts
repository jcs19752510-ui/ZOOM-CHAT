import { io } from 'socket.io-client';
import { closeAll, expect, extraServer, guestMeeting, hostMeeting, test } from './fixtures';

// 9단계(보안 검증) 실브라우저 공격 시험. 제품 코드는 건드리지 않는다.

test.afterEach(async () => {
  await closeAll();
});

test('IT-110 [SEC-07,SEC-08] 화면 UI를 거치지 않고 소켓으로 직접 보낸 악성 채팅(javascript:·속성 탈출·HTML·방향 제어 문자)도 텍스트로만 그려지고, 링크는 http(s)+noopener뿐이며 CSP가 인라인 스크립트·eval·외부 연결을 실제로 막는다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env, '호스트');
  const dialogs: string[] = [];
  host.page.on('dialog', (d) => {
    dialogs.push(d.message());
    void d.dismiss();
  });
  await host.page.getByTestId('btn-chat').click();

  // 공격자: 브라우저 UI 없이 서버에 직접 입장해 채팅을 보낸다(클라이언트 쪽 입력 제한을 우회)
  const url = new URL(host.url);
  const roomId = url.pathname.split('/r/')[1] ?? '';
  const attacker = io(env.base, { transports: ['websocket'], reconnection: false, forceNew: true, extraHeaders: { origin: env.base } });
  await new Promise<void>((resolve, reject) => {
    attacker.once('connect', () => resolve());
    attacker.once('connect_error', reject);
  });
  const join = await new Promise<{ ok: boolean }>((resolve) => attacker.emit('room:join', { v: 1, roomId, nickname: 'mallory' }, resolve));
  expect(join.ok).toBe(true);
  const payloads = [
    'javascript:window.__xss=1',
    'JaVaScRiPt:window.__xss=2',
    'data:text/html,<script>window.__xss=3</script>',
    'https://example.com/"onmouseover="window.__xss=4"',
    'https://example.com/<img src=x onerror=window.__xss=5>',
    '[x](javascript:window.__xss=6)',
    '<a href="javascript:window.__xss=7">클릭</a>',
    '<iframe srcdoc="<script>parent.__xss=8</script>"></iframe>',
    'http://example.com/‮evil.txt',
    '<svg><script>window.__xss=9</script></svg>',
  ];
  for (const p of payloads) {
    const ack = await new Promise<{ ok: boolean }>((resolve) => attacker.emit('chat:send', { v: 1, text: p }, resolve));
    expect(ack.ok).toBe(true);
    await new Promise((r) => setTimeout(r, 700)); // chat:send 속도 제한(초당 약 1.7회)을 지킨다
  }
  attacker.close();

  const panel = host.page.getByTestId('chat-panel');
  await expect(panel.getByTestId('chat-text')).toHaveCount(payloads.length);
  expect(await host.page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  expect(dialogs).toEqual([]);
  expect(await panel.getByTestId('chat-text').locator('img, script, svg, iframe, object, embed, style').count(), '본문 안에는 HTML 요소가 생기지 않는다(패널의 아이콘 svg는 본문 밖)').toBe(0);
  const anchors = await panel.getByTestId('chat-text').locator('a').evaluateAll((els) => els.map((a) => ({ href: (a as HTMLAnchorElement).href, rel: a.getAttribute('rel'), target: a.getAttribute('target'), attrs: a.getAttributeNames().sort().join(',') })));
  for (const a of anchors) {
    expect(a.href).toMatch(/^https?:\/\//);
    expect(a.rel).toBe('noopener noreferrer');
    expect(a.target).toBe('_blank');
    expect(a.attrs, '링크에는 href·target·rel·class 외 속성(on* 등)이 없다').toBe('class,href,rel,target');
  }

  // CSP: 인라인 스크립트·eval·외부 연결이 브라우저에서 실제로 차단된다
  const csp = await host.page.evaluate(async () => {
    const violations: string[] = [];
    document.addEventListener('securitypolicyviolation', (e) => violations.push(e.violatedDirective));
    const w = window as unknown as { __csp?: number; __cspEval?: number };
    const s = document.createElement('script');
    s.textContent = 'window.__csp = 1';
    document.head.append(s);
    // CDP로 실행되는 코드 안의 eval은 CSP 검사를 받지 않으므로, 페이지 자신의 타이머가 문자열을 실행하게 해 CSP가 막는지 본다
    (window.setTimeout as unknown as (code: string, ms: number) => void)('window.__cspEval = 1', 0);
    let fetchBlocked = false;
    try {
      await fetch('https://example.invalid/steal', { mode: 'no-cors' });
    } catch {
      fetchBlocked = true;
    }
    const ext = document.createElement('script');
    ext.src = 'https://example.invalid/x.js';
    document.head.append(ext);
    await new Promise((r) => setTimeout(r, 300));
    return { injected: w.__csp, evalRan: w.__cspEval, fetchBlocked, violations };
  });
  expect(csp.injected, '인라인 스크립트는 실행되지 않는다').toBeUndefined();
  expect(csp.evalRan, '문자열 eval(unsafe-eval)은 실행되지 않는다').toBeUndefined();
  expect(csp.fetchBlocked).toBe(true);
  expect(csp.violations).toEqual(expect.arrayContaining(['script-src-elem', 'script-src', 'connect-src']));
});

test('IT-111 [SEC-08,SEC-04] 다른 Origin의 웹 페이지가 브라우저에서 이 서버의 API·소켓을 쓰려 하면 CORS·Origin 허용 목록에 막히고, 서버의 응답 헤더가 클릭재킹·MIME 스니핑·카메라 권한 위임을 막는다', async ({ browser, env }) => {
  const roomsBefore = env.server.rooms.size; // 서버는 시험들이 공유하므로 앞선 시험의 방이 남아 있을 수 있다
  const evil = await extraServer();
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(evil.base);
    const r = await page.evaluate(
      async ({ victim }) => {
        const out: Record<string, unknown> = {};
        try {
          const res = await fetch(`${victim}/api/rooms`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ v: 1 }) });
          out.fetch = `status ${res.status}`;
        } catch (e) {
          out.fetch = `blocked ${(e as Error).name}`;
        }
        try {
          const res = await fetch(`${victim}/api/meta`, { mode: 'no-cors' });
          out.opaque = res.type;
        } catch (e) {
          out.opaque = `blocked ${(e as Error).name}`;
        }
        out.ws = await new Promise<string>((resolve) => {
          const ws = new WebSocket(`${victim.replace('http', 'ws')}/socket.io/?EIO=4&transport=websocket`);
          ws.onopen = () => resolve('OPEN');
          ws.onerror = () => resolve('error');
          ws.onclose = () => resolve('closed');
          setTimeout(() => resolve('timeout'), 4000);
        });
        return out;
      },
      { victim: env.base },
    );
    expect(String(r.fetch), 'CORS 사전 요청이 거부되어 방이 만들어지지 않는다').toMatch(/^blocked/);
    expect(r.ws, '허용되지 않은 Origin의 소켓은 열리지 않는다').not.toBe('OPEN');
    expect(env.server.rooms.size, '공격 페이지가 서버에 방을 만들지 못했다').toBe(roomsBefore);
    await ctx.close();

    const res = await fetch(`${env.base}/`);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(res.headers.get('content-security-policy')).toContain("script-src 'self'");
    expect(res.headers.get('permissions-policy')).toContain('camera=(self)');
    expect(res.headers.get('permissions-policy')).toContain('microphone=(self)');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    expect(res.headers.get('x-powered-by')).toBeNull();
  } finally {
    await evil.server.close();
  }
  // 정상 Origin의 회의는 영향이 없다
  const host = await hostMeeting(browser, env, '호스트');
  const g = await guestMeeting(browser, host.url, '민지');
  await expect(g.page.getByTestId('room')).toBeVisible();
});
