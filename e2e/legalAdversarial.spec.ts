import type { Page } from '@playwright/test';
import { closeAll, expect, test } from './fixtures';

// unit-15 6단계(적대적·키보드·터치) 추가 시험. 기존 dist를 그대로 쓰며 /api/meta는 route로 대체한다.

test.afterEach(async () => {
  await closeAll();
});

const SIZES = [{ width: 360, height: 740 }, { width: 1280, height: 800 }] as const;
const metaBody = (over: { contact?: string | null; officer?: string | null; date?: string | null; stun?: string[]; turn?: string[] }) => ({
  v: 1,
  operator: { contact: over.contact === undefined ? null : over.contact, privacyOfficer: over.officer === undefined ? null : over.officer },
  legal: { effectiveDate: over.date === undefined ? null : over.date },
  network: { stunHosts: over.stun ?? [], turnHosts: over.turn ?? [] },
});

const overflow = (page: Page): Promise<number> => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const dangerous = (page: Page): Promise<{ hrefs: string[]; handlers: string[] }> =>
  page.evaluate(() => ({
    hrefs: [...document.querySelectorAll('[href],[src],[action],[formaction]')]
      .flatMap((e) => ['href', 'src', 'action', 'formaction'].map((a) => e.getAttribute(a) ?? ''))
      .filter((v) => /^\s*(javascript|data|vbscript|file|blob):/i.test(v)),
    handlers: [...document.querySelectorAll('*')].flatMap((e) => e.getAttributeNames().filter((n) => n.toLowerCase().startsWith('on')).map((n) => `${e.tagName}.${n}`)),
  }));

const EVIL_CONTACTS = [
  'javascript:alert(1)',
  'JAVASCRIPT:alert(1)',
  'javascript:alert(1)@x.com',
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
  '" onmouseover="alert(1)',
  "' onfocus='alert(1)' autofocus='",
  'x"><img src=x onerror=alert(1)>',
  '<script>alert(1)</script>',
  'орѕ@example.com',
  '‮moc.elpmaxe@spo',
  'https://',
  'http://example.com',
  'a'.repeat(3000),
  `${'a'.repeat(3000)}@example.com`,
  `https://${'a'.repeat(3000)}.example.com/`,
];

for (const size of SIZES) {
  test(`IT-37 [SEC-07,POL-19,NFR-10] ${size.width}px: 악성·초장문 운영자 값이 와도 href에 위험 스킴·이벤트 속성이 없고 alert이 실행되지 않으며 가로 스크롤이 생기지 않는다`, async ({ browser, env }) => {
    const ctx = await browser.newContext({ viewport: size });
    const page = await ctx.newPage();
    let dialogs = 0;
    page.on('dialog', (d) => {
      dialogs += 1;
      void d.dismiss();
    });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__pwned = 0;
    });

    for (const evil of EVIL_CONTACTS) {
      const body = metaBody({ contact: evil, officer: evil, date: evil, stun: [evil], turn: [evil] });
      await page.route('**/api/meta', (route) => route.fulfill({ json: body }));
      for (const path of ['/contact', '/privacy', '/terms']) {
        await page.goto(`${env.base}${path}`);
        await expect(page.getByTestId('legal-title')).toBeVisible();
        await expect(page.getByTestId('meta-slot-top-effectiveDate')).not.toHaveAttribute('data-state', 'loading');
        const d = await dangerous(page);
        expect(d.hrefs, `${path} ${evil.slice(0, 40)}`).toEqual([]);
        expect(d.handlers, `${path} ${evil.slice(0, 40)}`).toEqual([]);
        expect(await overflow(page), `${path}@${size.width} 가로 스크롤 (${evil.slice(0, 30)})`).toBeLessThanOrEqual(0);
      }
      // 연락처 슬롯의 모든 상호작용 요소를 눌러 본다(실행 가능한 링크가 없어야 한다)
      await page.goto(`${env.base}/contact`);
      const slot = page.getByTestId('meta-slot-contact');
      await slot.click();
      for (const a of await slot.locator('a').all()) {
        const href = (await a.getAttribute('href')) ?? '';
        expect(href, evil.slice(0, 40)).toMatch(/^(mailto:|https:\/\/)/);
      }
      await page.unroute('**/api/meta');
    }
    expect(dialogs, 'alert/confirm/prompt 실행됨').toBe(0);
    expect(await page.evaluate(() => (window as unknown as Record<string, number>).__pwned)).toBe(0);
    expect(errors, '페이지 오류').toEqual([]);
    await ctx.close();
  });
}

test('IT-37b [SEC-06,UX-03] 서버가 이상한 응답(HTML 200·429·500·빈 본문·배열·거대 JSON·지연)을 보내도 본문은 읽히고 슬롯은 실패 안내로 수렴하며 로딩은 aria-busy다', async ({ browser, env }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const bad: Array<[string, Parameters<Page['route']>[1]]> = [
    ['html200', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<html><script>alert(1)</script></html>' })],
    ['429', (r) => r.fulfill({ status: 429, json: { code: 'RATE_LIMITED' } })],
    ['500', (r) => r.fulfill({ status: 500, body: 'boom' })],
    ['empty200', (r) => r.fulfill({ status: 200, body: '' })],
    ['array', (r) => r.fulfill({ json: [1, 2, 3] })],
    ['typeerr', (r) => r.fulfill({ json: { v: 1, operator: { contact: 123, privacyOfficer: null }, legal: { effectiveDate: null }, network: { stunHosts: [], turnHosts: [] } } })],
  ];
  for (const [name, handler] of bad) {
    await page.route('**/api/meta', handler);
    await page.goto(`${env.base}/privacy`);
    await expect(page.getByTestId('legal-section-collected'), name).toBeVisible();
    await expect(page.getByTestId('meta-slot-contact'), name).toHaveAttribute('data-state', 'error');
    await expect(page.getByTestId('meta-slot-top-effectiveDate'), name).toHaveAttribute('data-state', 'error');
    expect(await overflow(page), name).toBeLessThanOrEqual(0);
    await page.unroute('**/api/meta');
  }
  // 거대 JSON(2MB 문자열, 모양은 정상): 화면이 죽거나 가로로 넘치지 않는다
  await page.route('**/api/meta', (r) => r.fulfill({ json: metaBody({ contact: 'https://example.com/' + 'p'.repeat(2_000_000), officer: 'o'.repeat(100_000) }) }));
  await page.goto(`${env.base}/contact`);
  await expect(page.getByTestId('meta-slot-contact')).toHaveAttribute('data-state', 'ok');
  expect(await overflow(page)).toBeLessThanOrEqual(0);
  await page.unroute('**/api/meta');
  // 지연 응답: 로딩 중에는 aria-busy, 이후 값으로 교체
  let release: () => void = () => undefined;
  const gate = new Promise<void>((res) => (release = res));
  await page.route('**/api/meta', async (r) => {
    await gate;
    await r.fulfill({ json: metaBody({ contact: 'ops@example.com', date: '2026-10-01' }) });
  });
  await page.goto(`${env.base}/contact`);
  await expect(page.getByTestId('meta-slot-contact')).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByTestId('legal-section-whatToSend')).toBeVisible();
  release();
  await expect(page.getByTestId('meta-slot-contact').locator('a')).toHaveAttribute('href', 'mailto:ops@example.com');
  expect(errors, '페이지 오류').toEqual([]);
  await ctx.close();
});

for (const size of SIZES) {
  test(`IT-38 [NFR-10,POL-17] ${size.width}px: 키보드만으로 문서 이동·뒤로가기, 터치 대상 44px 이상, 포커스 표시, CSP 위반·콘솔 오류 없음`, async ({ browser, env }) => {
    const ctx = await browser.newContext({ viewport: size });
    const page = await ctx.newPage();
    const problems: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error' || /content security policy/i.test(m.text())) problems.push(m.text());
    });
    page.on('pageerror', (e) => problems.push(e.message));

    await page.goto(`${env.base}/privacy`);
    await expect(page.getByTestId('legal-title')).toBeVisible();

    // 터치 대상: 헤더 링크 4개·목차 링크·(실패 시) 재시도 버튼
    for (const id of ['legal-home', 'legal-nav-privacy', 'legal-nav-terms', 'legal-nav-contact']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box?.height ?? 0, `${id} 높이`).toBeGreaterThanOrEqual(44);
    }
    for (const a of await page.getByTestId('legal-toc').locator('a').all()) expect((await a.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

    // 키보드: 첫 Tab은 "처음으로" → nav 3개 순서, 현재 문서에 aria-current
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('legal-home')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('legal-nav-privacy')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('legal-nav-terms')).toBeFocused();
    // 포커스 표시: 아웃라인 또는 box-shadow가 있어야 한다(키보드 사용자가 위치를 알 수 있음)
    const ring = await page.getByTestId('legal-nav-terms').evaluate((el) => {
      const cs = getComputedStyle(el);
      return { outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0, shadow: cs.boxShadow !== 'none' };
    });
    expect(ring.outline || ring.shadow, '포커스 표시 없음').toBe(true);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`${env.base}/terms`);
    await expect(page.getByTestId('legal-title')).toBeFocused();
    await expect(page).toHaveTitle('이용약관 · MeetLite');
    // 뒤로가기: 처리방침 페이지로 돌아오고 제목·nav 상태가 맞는다
    await page.goBack();
    await expect(page).toHaveURL(`${env.base}/privacy`);
    await expect(page.getByTestId('legal-title')).toHaveText('개인정보 처리방침');
    await expect(page.getByTestId('legal-nav-privacy')).toHaveAttribute('aria-current', 'page');
    await expect(page).toHaveTitle('개인정보 처리방침 · MeetLite');
    await page.goForward();
    await expect(page.getByTestId('legal-title')).toHaveText('이용약관');
    // 수정키(Ctrl)+클릭은 가로채지 않고 새 탭 동작에 맡긴다(같은 탭은 이동하지 않는다)
    const [popup] = await Promise.all([ctx.waitForEvent('page'), page.getByTestId('legal-nav-contact').click({ modifiers: ['Control'] })]);
    await popup.close();
    await expect(page).toHaveURL(`${env.base}/terms`);
    // 처음으로 → 랜딩, 제목 복원
    await page.keyboard.press('Shift+Tab');
    await page.getByTestId('legal-home').focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('nickname')).toBeVisible();
    await expect(page).toHaveTitle('MeetLite');

    // 랜딩 푸터 링크도 44px 이상
    for (const id of ['legal-link-privacy', 'legal-link-terms', 'legal-link-contact']) {
      const box = await page.getByTestId(id).boundingBox();
      expect(box?.height ?? 0, `${id} 높이`).toBeGreaterThanOrEqual(44);
    }
    // 여기까지(정상 흐름)에서 콘솔 오류·CSP 위반이 없어야 한다. 아래 abort 시험은 의도된 네트워크 오류라 제외
    expect(problems, '콘솔 오류/CSP 위반').toEqual([]);
    // 실패 상태의 재시도 버튼은 키보드로 눌러 복구할 수 있다
    await page.route('**/api/meta', (r) => r.abort());
    await page.goto(`${env.base}/contact`);
    const retry = page.getByTestId('meta-slot-contact').getByTestId('meta-retry');
    await expect(retry).toBeVisible();
    expect((await retry.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await page.unroute('**/api/meta');
    await retry.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('meta-slot-contact')).toHaveAttribute('data-state', 'pending');
    expect(await overflow(page)).toBeLessThanOrEqual(0);
    await ctx.close();
  });
}
