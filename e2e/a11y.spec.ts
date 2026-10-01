import type { Page } from '@playwright/test';
import { closeAll, expect, expectRemoteMedia, guestMeeting, hostMeeting, test } from './fixtures';

test.afterEach(async () => {
  await closeAll();
});

/** Tab으로만 이동해 data-testid 대상에 포커스를 맞춘다(키보드 접근성). 도달하지 못하면 실패. */
async function tabTo(page: Page, testId: string, max = 60): Promise<void> {
  for (let i = 0; i < max; i++) {
    const id = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute('data-testid') ?? '');
    if (id === testId) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab으로 ${testId}에 도달하지 못했습니다`);
}

test('IT-11 [UX-10,NFR-09] 키보드만으로 랜딩 → 방 만들기 → 입장 → 채팅 → 참가자 → 나가기까지 할 수 있다', async ({ browser, env }) => {
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const page = await ctx.newPage();
  await page.goto(env.base);

  // 랜딩: 닉네임 입력 → Enter로 방 만들기
  await tabTo(page, 'nickname');
  await page.keyboard.type('키보드');
  await tabTo(page, 'create-room');
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/r\//);

  // 대기실: 닉네임은 저장된 값, 입장 버튼까지 Tab → Enter
  await page.getByTestId('lobby-nickname').waitFor();
  await tabTo(page, 'join-button');
  await expect(page.getByTestId('join-button')).toBeEnabled();
  await page.keyboard.press('Enter');
  await page.getByTestId('room').waitFor();

  // 회의실: 컨트롤바 각 버튼에 키보드로 도달하고 동작시킨다
  await tabTo(page, 'btn-mic');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('btn-mic')).toHaveAttribute('aria-pressed', 'true');
  await tabTo(page, 'btn-chat');
  await page.keyboard.press('Enter');
  await tabTo(page, 'chat-input');
  await page.keyboard.type('키보드로 보냅니다');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('chat-text')).toHaveText('키보드로 보냅니다');
  await page.keyboard.press('Escape'); // 패널 닫기
  await expect(page.getByTestId('chat-panel')).toHaveCount(0);
  await tabTo(page, 'btn-people');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('people-panel')).toBeVisible();

  // 나가기: 확인창은 기본 포커스가 취소, Tab으로 확인 → Enter
  await tabTo(page, 'btn-leave');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: '취소' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await tabTo(page, 'btn-leave');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: '나가기' }).last()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('회의에서 나왔습니다')).toBeVisible();
  await ctx.close();
});

test('IT-12 [UX-10,NFR-09] 모든 아이콘 버튼에 접근 가능한 이름이 있고, 상태 화면은 스크린리더에 알려진다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const g = await guestMeeting(browser, host.url, '민지');
  await expectRemoteMedia(host.page, 1);
  for (const m of [host, g]) {
    await m.page.getByTestId('btn-people').click();
    const unnamed = await m.page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('button, a, select, input')]
        .filter((el) => el.offsetWidth > 0 && !el.hasAttribute('hidden'))
        .filter((el) => {
          const name = (el.getAttribute('aria-label') ?? '').trim() || (el.textContent ?? '').trim() || (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim()) || (el.getAttribute('placeholder') ?? '').trim() || el.getAttribute('title') || '';
          return !name;
        })
        .map((el) => el.outerHTML.slice(0, 120)),
    );
    expect(unnamed, `이름 없는 컨트롤: ${unnamed.join('\n')}`).toEqual([]);
  }
  // 알림 영역과 상태 영역
  await expect(host.page.locator('[role="status"][aria-live="polite"]').first()).toBeAttached();
  // 방이 사라지면 알림 역할(alert)로 안내
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const p = await ctx.newPage();
  await p.goto(`${env.base}/r/${'A'.repeat(22)}`);
  await expect(p.getByRole('alert')).toContainText('회의를 찾을 수 없습니다');
  await ctx.close();
});
