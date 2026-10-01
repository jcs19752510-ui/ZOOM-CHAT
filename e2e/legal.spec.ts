import type { Page } from '@playwright/test';
import { closeAll, expect, extraServer, test } from './fixtures';

test.afterEach(async () => {
  await closeAll();
});

const PAGES = [
  { path: '/privacy', title: '개인정보 처리방침' },
  { path: '/terms', title: '이용약관' },
  { path: '/contact', title: '문의·신고' },
] as const;

const hrefsOf = (page: Page): Promise<string[]> => page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href') ?? ''));
const noHorizontalScroll = async (page: Page, label: string): Promise<void> => {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over, `${label}: 가로 스크롤 ${over}px`).toBeLessThanOrEqual(0);
};

for (const size of [{ width: 360, height: 740 }, { width: 1280, height: 800 }] as const) {
  test(`IT-32 [POL-17,POL-19,POL-20,NFR-10] ${size.width}px: 처리방침·약관·문의 3개 페이지가 열리고 초안 리본·미정 표시·문서 간 이동·가로 스크롤 없음을 만족한다`, async ({ browser, env }) => {
    const ctx = await browser.newContext({ viewport: size });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    for (const doc of PAGES) {
      await page.goto(`${env.base}${doc.path}`);
      await expect(page.getByTestId('legal-title')).toHaveText(doc.title);
      await expect(page).toHaveTitle(`${doc.title} · MeetLite`);
      await expect(page.getByTestId('draft-ribbon')).toContainText('초안(법률 검토 전)');
      await expect(page.getByTestId('draft-ribbon')).toContainText('법률 자문이 아닌 초안');
      // 운영자 값이 없는 서버: 빈칸·가짜 값 없이 미정 문구
      const slot = page.getByTestId('meta-slot-top-effectiveDate');
      await expect(slot).toHaveAttribute('data-state', 'pending');
      await expect(slot).toContainText('시행일이 아직 정해지지 않았습니다(공개 전 필수)');
      await expect(page.getByTestId('legal-nav-' + doc.path.slice(1))).toHaveAttribute('aria-current', 'page');
      await noHorizontalScroll(page, `${doc.path}@${size.width}`);
    }
    await page.goto(`${env.base}/contact`);
    await expect(page.getByTestId('meta-slot-contact')).toHaveAttribute('data-state', 'pending');
    await expect(page.getByTestId('meta-slot-contact')).toContainText('운영자가 아직 정하지 않았습니다(공개 전 필수)');
    await expect(page.locator('main a[href^="mailto:"], main a[href^="https:"]')).toHaveCount(0);

    // 처리방침: 필수 섹션 10개, 목차, STUN/TURN 호스트 슬롯(이 서버는 STUN 없음 → "없음")
    await page.goto(`${env.base}/privacy/`);
    for (const id of ['collected', 'purpose', 'retention', 'destruction', 'thirdParty', 'overseas', 'contact', 'rights', 'breach', 'effectiveDate']) {
      await expect(page.getByTestId(`legal-section-${id}`), id).toBeVisible();
    }
    await expect(page.getByTestId('meta-slot-networkHosts')).toContainText('없음');
    await expect(page.getByTestId('meta-slot-officer')).toContainText('지정 전');
    await page.getByTestId('legal-toc').getByRole('link', { name: '보유 기간' }).click();
    await expect(page).toHaveURL(/\/privacy\/#retention$/);
    await expect(page.getByTestId('legal-title')).toHaveText('개인정보 처리방침');

    // 같은 탭 이동: 제목·포커스, 처음으로 링크
    await page.getByTestId('legal-nav-terms').click();
    await expect(page).toHaveURL(`${env.base}/terms`);
    await expect(page.getByTestId('legal-title')).toHaveText('이용약관');
    await expect(page).toHaveTitle('이용약관 · MeetLite');
    await expect(page.getByTestId('legal-title')).toBeFocused();
    await expect(page.getByTestId('legal-section-age')).toContainText('14세');
    await page.getByTestId('legal-home').click();
    await expect(page.getByTestId('nickname')).toBeVisible();
    await expect(page).toHaveTitle('MeetLite');

    // 알 수 없는 경로는 랜딩
    await page.goto(`${env.base}/privacy/x`);
    await expect(page.getByTestId('nickname')).toBeVisible();

    expect(errors, '페이지 오류').toEqual([]);
    await ctx.close();
  });
}

test('IT-32b [POL-17,POL-19] 랜딩 푸터 링크는 새 탭으로 법률 페이지를 열고 원래 탭은 그대로 남는다', async ({ browser, env }) => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const landing = await ctx.newPage();
  await landing.goto(env.base);
  const [popup] = await Promise.all([ctx.waitForEvent('page'), landing.getByTestId('legal-link-contact').click()]);
  await popup.waitForLoadState();
  await expect(popup.getByTestId('legal-title')).toHaveText('문의·신고');
  await expect(landing.getByTestId('nickname')).toBeVisible();
  await ctx.close();
});

test('IT-33 [POL-19,POL-20,POL-17,SEC-07] 운영자 값이 있으면 mailto 링크·책임자·시행일(2026년 10월 1일)·STUN 호스트가 보이고, https 연락처는 새 탭 + rel noopener noreferrer로 열린다', async ({ browser }) => {
  const a = await extraServer({
    OPERATOR_CONTACT: 'ops@example.com',
    PRIVACY_OFFICER: '홍길동',
    LEGAL_EFFECTIVE_DATE: '2026-10-01',
    STUN_URLS: 'stun:stun.example.org:3478',
  });
  const b = await extraServer({ OPERATOR_CONTACT: 'https://example.com/report' });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${a.base}/contact`);
    const mail = page.getByTestId('meta-slot-contact').locator('a');
    await expect(mail).toHaveAttribute('href', 'mailto:ops@example.com');
    await expect(page.getByTestId('meta-slot-top-effectiveDate')).toContainText('2026년 10월 1일');
    await expect(page.getByTestId('meta-slot-contact')).toHaveAttribute('data-state', 'ok');

    await page.goto(`${a.base}/privacy`);
    await expect(page.getByTestId('meta-slot-officer')).toContainText('홍길동');
    await expect(page.getByTestId('meta-slot-networkHosts')).toContainText('stun.example.org');
    await expect(page.getByTestId('meta-slot-networkHosts')).not.toContainText('3478');
    await expect(page.getByTestId('meta-slot-effectiveDate')).toContainText('2026년 10월 1일');

    await page.goto(`${b.base}/contact`);
    const web = page.getByTestId('meta-slot-contact').locator('a');
    await expect(web).toHaveAttribute('href', 'https://example.com/report');
    await expect(web).toHaveAttribute('target', '_blank');
    expect(((await web.getAttribute('rel')) ?? '').split(/\s+/).sort()).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    await expect(web).toHaveAttribute('aria-label', 'https://example.com/report (새 탭에서 열림)');
    await ctx.close();
  } finally {
    await a.server.close();
    await b.server.close();
  }
});

test('IT-33b [SEC-07,POL-19] 서버 응답에 javascript:·data: 연락처가 섞여 와도 화면에 링크가 만들어지지 않고 텍스트로만 보인다(방어적 처리)', async ({ browser, env }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  let dialog = false;
  page.on('dialog', (d) => {
    dialog = true;
    void d.dismiss();
  });
  for (const evil of ['javascript:alert(1)@x.com', 'javascript:alert(1)', 'data:text/html,<script>alert(1)</script>']) {
    await page.route('**/api/meta', (route) =>
      route.fulfill({ json: { v: 1, operator: { contact: evil, privacyOfficer: evil }, legal: { effectiveDate: '2026-10-01' }, network: { stunHosts: [], turnHosts: [] } } }),
    );
    await page.goto(`${env.base}/contact`);
    const slot = page.getByTestId('meta-slot-contact');
    await expect(slot).toHaveAttribute('data-state', 'ok');
    await expect(slot).toContainText(evil);
    expect((await hrefsOf(page)).filter((h) => /^(javascript|data):/i.test(h)), evil).toEqual([]);
    await expect(slot.locator('a')).toHaveCount(0);
    await slot.click();
    await page.unroute('**/api/meta');
  }
  expect(dialog, 'alert 실행됨').toBe(false);
  await ctx.close();
});

test('IT-33c [POL-17,UX-03] /api/meta 호출이 실패하면 본문은 그대로 읽히고 슬롯에 안내와 다시 불러오기가 나오며, 재시도하면 복구된다', async ({ browser, env }) => {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const page = await ctx.newPage();
  await page.route('**/api/meta', (route) => route.abort());
  await page.goto(`${env.base}/privacy`);
  await expect(page.getByTestId('legal-section-collected')).toBeVisible();
  const slot = page.getByTestId('meta-slot-contact');
  await expect(slot).toHaveAttribute('data-state', 'error');
  await expect(slot).toContainText('운영자 정보를 불러오지 못했습니다');
  const retry = slot.getByTestId('meta-retry');
  expect((await retry.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  await page.unroute('**/api/meta');
  await retry.click();
  await expect(page.getByTestId('meta-slot-contact')).toHaveAttribute('data-state', 'pending');
  await noHorizontalScroll(page, 'privacy@360');
  // 5xx와 모양이 다른 응답도 실패로 처리한다
  await page.route('**/api/meta', (route) => route.fulfill({ json: { v: 1, nope: true } }));
  await page.goto(`${env.base}/terms`);
  await expect(page.getByTestId('meta-slot-contact')).toHaveAttribute('data-state', 'error');
  await ctx.close();
});
