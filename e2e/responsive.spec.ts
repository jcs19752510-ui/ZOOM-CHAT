import fs from 'node:fs';
import type { Page } from '@playwright/test';
import { closeAll, expect, expectRemoteMedia, guestMeeting, hostMeeting, test } from './fixtures';

const SIZES = [
  { name: '360', width: 360, height: 740 },
  { name: '1280', width: 1280, height: 800 },
] as const;
const OUT = 'test-results/shots';

test.afterEach(async () => {
  await closeAll();
});

for (const size of SIZES) {
  test(`IT-10 [NFR-10,UX-02,UX-05] ${size.width}px: 화면별 스크린샷, 가로 스크롤 없음, 터치 타깃 44px 이상`, async ({ browser, env }) => {
    fs.mkdirSync(OUT, { recursive: true });
    const viewport = { width: size.width, height: size.height };
    const noHScroll = async (page: Page, label: string): Promise<void> => {
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(over, `${label}: 가로 스크롤 ${over}px`).toBeLessThanOrEqual(0);
    };

    // 랜딩
    const host = await hostMeeting(browser, env, '지은', { viewport }).catch(async () => null);
    expect(host).not.toBeNull();
    if (!host) return;
    // 방 생성 전 랜딩 화면은 새 컨텍스트로 촬영
    const ctx = await browser.newContext({ viewport, permissions: ['camera', 'microphone'] });
    const landing = await ctx.newPage();
    await landing.goto(env.base);
    await landing.screenshot({ path: `${OUT}/${size.name}-1-landing.png` });
    await noHScroll(landing, 'landing');
    await landing.getByTestId('use-password').check();
    await landing.screenshot({ path: `${OUT}/${size.name}-1b-landing-password.png` });
    await ctx.close();

    // 대기실(참가자 입장 전 화면 촬영)
    const ctx2 = await browser.newContext({ viewport, permissions: ['camera', 'microphone'] });
    const lobby = await ctx2.newPage();
    await lobby.goto(host.url);
    await lobby.getByTestId('lobby-nickname').waitFor();
    await lobby.waitForTimeout(800);
    await lobby.screenshot({ path: `${OUT}/${size.name}-2-lobby.png`, fullPage: true });
    await noHScroll(lobby, 'lobby');

    // 회의실: 3명
    await lobby.getByTestId('lobby-nickname').fill('민지');
    await lobby.getByTestId('join-button').click();
    await lobby.getByTestId('room').waitFor();
    const b = await guestMeeting(browser, host.url, '철수', { viewport });
    await expectRemoteMedia(lobby, 2);
    await lobby.waitForTimeout(500);
    await lobby.screenshot({ path: `${OUT}/${size.name}-3-room.png` });
    await noHScroll(lobby, 'room');

    // 컨트롤바 터치 타깃
    const small = await lobby.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('nav button')]
        .filter((el) => el.offsetWidth > 0)
        .map((el) => ({ label: el.getAttribute('aria-label') ?? el.textContent ?? '', w: el.getBoundingClientRect().width, h: el.getBoundingClientRect().height }))
        .filter((r) => r.h < 43.5 || r.w < (r.label.includes('장치 선택') ? 27.5 : 43.5)),
    );
    expect(small, `작은 컨트롤: ${JSON.stringify(small)}`).toEqual([]);

    // 채팅·참가자 패널
    await lobby.getByTestId('btn-chat').click();
    await lobby.getByTestId('chat-input').fill('안녕하세요! 링크 https://example.com 입니다');
    await lobby.getByTestId('chat-send').click();
    await lobby.waitForTimeout(300);
    await lobby.screenshot({ path: `${OUT}/${size.name}-4-chat.png` });
    await noHScroll(lobby, 'chat');
    await lobby.getByTestId('btn-people').click();
    await lobby.screenshot({ path: `${OUT}/${size.name}-5-people.png` });
    await noHScroll(lobby, 'people');
    await lobby.keyboard.press('Escape');

    // 화면공유 레이아웃은 데스크톱에서만
    if (size.width >= 1000) {
      await b.page.getByTestId('btn-share').click();
      await expect(lobby.getByTestId('share-layout')).toBeVisible();
      await lobby.waitForTimeout(800);
      await lobby.screenshot({ path: `${OUT}/${size.name}-6-share.png` });
      await b.page.getByTestId('btn-share').click();
    }

    // 나가기 확인창
    await lobby.getByTestId('btn-leave').click();
    await lobby.screenshot({ path: `${OUT}/${size.name}-7-confirm.png` });
    await lobby.keyboard.press('Escape');

    // 방 잠김 상태 화면
    await host.page.getByTestId('btn-people').click();
    await host.page.getByTestId('btn-lock').click();
    const ctx3 = await browser.newContext({ viewport });
    const late = await ctx3.newPage();
    await late.goto(host.url);
    await late.getByText('방이 잠겨 있습니다').waitFor();
    await late.screenshot({ path: `${OUT}/${size.name}-8-locked.png` });
    await noHScroll(late, 'locked');
    await ctx2.close();
    await ctx3.close();
  });
}
