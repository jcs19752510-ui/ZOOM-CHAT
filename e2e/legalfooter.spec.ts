import type { Page } from '@playwright/test';
import { closeAll, expect, hostMeeting, test } from './fixtures';

test.afterEach(async () => {
  await closeAll();
});

const SIZES = [
  { width: 360, height: 740 },
  { width: 1280, height: 800 },
] as const;
const EXPECTED = [
  { id: 'privacy', href: '/privacy', name: '개인정보 처리방침 (새 탭에서 열림)' },
  { id: 'terms', href: '/terms', name: '이용약관 (새 탭에서 열림)' },
  { id: 'contact', href: '/contact', name: '문의·신고 (새 탭에서 열림)' },
] as const;

async function checkFooter(page: Page, label: string, size: { width: number; height: number }): Promise<void> {
  const footer = page.getByTestId('legal-footer');
  await expect(footer, `${label}: 푸터 표시`).toBeVisible();
  // 가로 스크롤 없음
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(over, `${label}: 가로 스크롤 ${over}px`).toBeLessThanOrEqual(0);
  // 링크 3개: 순서·href·target·rel·접근 가능한 이름·44px
  const links = footer.locator('a');
  await expect(links).toHaveCount(3);
  for (const [i, e] of EXPECTED.entries()) {
    const a = links.nth(i);
    await expect(a, `${label}/${e.id} href`).toHaveAttribute('href', e.href);
    await expect(a).toHaveAttribute('target', '_blank');
    const rel = (await a.getAttribute('rel')) ?? '';
    expect(rel.split(/\s+/).sort(), `${label}/${e.id} rel`).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    await expect(a).toHaveAttribute('aria-label', e.name);
    const box = (await a.boundingBox()) ?? { x: -1, y: -1, width: 0, height: 0 };
    expect(box.height, `${label}/${e.id} 높이 ${box.height}`).toBeGreaterThanOrEqual(44);
    // 링크가 뷰포트 가로 폭 안에 있다
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(size.width + 0.5);
  }
  // 푸터가 본문 뒤(DOM 마지막)에 있고 화면 하단에 붙는다
  const fb = (await footer.boundingBox()) ?? { x: -1, y: -1, width: 0, height: 0 };
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(fb.y + fb.height, `${label}: 푸터 하단 ${fb.y + fb.height} / 문서 ${docH}`).toBeGreaterThanOrEqual(docH - 24);
  // 키보드: Tab으로 세 링크에 순서대로 도달
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const seen: string[] = [];
  for (let i = 0; i < 40 && seen.length < 3; i++) {
    await page.keyboard.press('Tab');
    const id = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute('data-testid') ?? '');
    if (id.startsWith('legal-link-')) seen.push(id);
  }
  expect(seen, `${label}: Tab 도달 순서`).toEqual(['legal-link-privacy', 'legal-link-terms', 'legal-link-contact']);
}

for (const size of SIZES) {
  test(`IT-31 [POL-17,POL-19,NFR-10,UX-10] ${size.width}px: 랜딩·대기실에 법률 푸터(링크 3개·새 탭·접근 이름·44px·Tab 도달·가로 스크롤 없음)가 있고 회의실에는 없다`, async ({ browser, env }) => {
    const viewport = { width: size.width, height: size.height };
    const host = await hostMeeting(browser, env, '지은', { viewport });
    // 랜딩
    const ctx = await browser.newContext({ viewport, permissions: ['camera', 'microphone'] });
    const landing = await ctx.newPage();
    await landing.goto(env.base);
    await landing.getByTestId('nickname').waitFor();
    await checkFooter(landing, `landing${size.width}`, size);
    if (size.width === 1280) {
      const vOver = await landing.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      expect(vOver, `landing1280 세로 넘침 ${vOver}px`).toBeLessThanOrEqual(0);
    }
    // 대기실
    const lobby = await ctx.newPage();
    await lobby.goto(host.url);
    await lobby.getByTestId('lobby-nickname').waitFor();
    await lobby.waitForTimeout(500);
    await checkFooter(lobby, `lobby${size.width}`, size);
    if (size.width === 1280) {
      const vOver = await lobby.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
      expect(vOver, `lobby1280 세로 넘침 ${vOver}px`).toBeLessThanOrEqual(0);
    }
    // 회의실(live)에는 푸터 없음
    await expect(host.page.getByTestId('room')).toBeVisible();
    await expect(host.page.getByTestId('legal-footer')).toHaveCount(0);
    await ctx.close();
  });
}
