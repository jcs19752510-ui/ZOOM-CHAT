import { closeAll, expect, expectRemoteMedia, extraServer, guestMeeting, hostMeeting, test } from './fixtures';

test.afterEach(async () => {
  await closeAll();
});

test('IT-13 [FR-09,FR-04] 통화 중 마이크 장치를 바꿔도 통화가 유지되고 상대가 계속 소리를 받는다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const a = await guestMeeting(browser, host.url, '민지');
  await expectRemoteMedia(host.page, 1);
  await a.page.getByTestId('btn-devices').click();
  const sel = a.page.locator('#dev-mic');
  await expect(sel).toBeVisible();
  // 장치 목록은 시트가 열린 뒤 비동기로 채워진다 — 채워질 때까지 기다린 뒤 읽는다(부하가 큰 전체 실행에서 목록이 비어 있던 순간에 실패한 경쟁 조건)
  await expect.poll(() => sel.locator('option').count(), { message: '마이크 목록이 채워짐' }).toBeGreaterThanOrEqual(2);
  const options = await sel.locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
  // Chromium 가짜 장치는 마이크를 3개 제공하므로 전환을 실제로 시험할 수 있다(2개 미만이면 시험이 성립하지 않으니 실패시킨다)
  expect(options.length, '전환할 마이크가 2개 이상 있어야 한다').toBeGreaterThanOrEqual(2);
  const before = await sel.inputValue();
  const next = options.find((v) => v !== before);
  expect(next, '현재와 다른 마이크').toBeDefined();
  await sel.selectOption(next as string);
  await expect(sel).toHaveValue(next as string);
  await a.page.keyboard.press('Escape');
  await expectRemoteMedia(host.page, 1);
  await expectRemoteMedia(a.page, 1);
  await expect(a.page.getByTestId('btn-mic')).toHaveAttribute('aria-pressed', 'false');
});

/** 시험용 합성 음성: 1초 켜고 1초 끄는 220Hz 톤을 마이크로 내보낸다(가짜 마이크는 에코 제거로 신호가 사라진다). */
const SYNTHETIC_VOICE = (): void => {
  const orig = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = async (constraints?: MediaStreamConstraints) => {
    const out = new MediaStream();
    if (constraints?.video) (await orig({ video: constraints.video })).getVideoTracks().forEach((t) => out.addTrack(t));
    if (constraints?.audio) {
      const ac = new AudioContext();
      const osc = ac.createOscillator();
      osc.frequency.value = 220;
      const gain = ac.createGain();
      gain.gain.value = 0;
      const dest = ac.createMediaStreamDestination();
      osc.connect(gain).connect(dest);
      osc.start();
      setInterval(() => {
        void ac.resume();
        gain.gain.value = gain.gain.value ? 0 : 0.6;
      }, 1000);
      dest.stream.getAudioTracks().forEach((t) => out.addTrack(t));
    }
    return out;
  };
};

test('IT-14 [FR-10,UX-07] 말하는 참가자의 타일이 강조되고, 말이 멈추면 강조가 풀린다(임계값 + 디바운스)', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
  await ctx.addInitScript(SYNTHETIC_VOICE);
  const page = await ctx.newPage();
  await page.goto(host.url);
  await page.getByTestId('lobby-nickname').fill('말하는이');
  await page.getByTestId('join-button').click();
  await page.getByTestId('room').waitFor();
  await expectRemoteMedia(host.page, 1);
  const speakingCount = (): Promise<number> =>
    host.page.evaluate(() => [...document.querySelectorAll('[data-testid^="tile-"]')].filter((el) => el.getAttribute('data-speaking') === 'true' && !el.textContent?.includes('(나)')).length);
  await expect.poll(speakingCount, { timeout: 40_000 }).toBeGreaterThan(0);
  // 합성 음성이 2초 주기(1초 끔)이고 해제 디바운스가 0.7초라 '해제된' 구간이 주기마다 약 0.3초뿐이다. 기본 폴링(최대 1초 간격)은 이 주기와 겹쳐 계속 '켜진' 순간만 볼 수 있으므로 촘촘히 확인한다.
  await expect.poll(speakingCount, { timeout: 40_000, intervals: [50] }).toBe(0); // 소리가 멈추면 강조가 풀린다
  await ctx.close();
});

test('IT-15 [FR-21,NFR-06] 서버가 재시작되어 방이 사라지면 이유와 다시 시작하는 방법을 안내한다', async ({ browser }) => {
  const first = await extraServer();
  const host = await hostMeeting(browser, { server: first.server, base: first.base });
  await expect(host.page.getByTestId('room')).toBeVisible();
  await first.server.close();
  await expect(host.page.getByTestId('conn-badge')).toHaveAttribute('data-state', 'reconnecting');
  const second = await extraServer({}, first.port); // 같은 주소로 다시 시작, 방 상태는 비어 있음
  try {
    await expect(host.page.getByText('서비스가 재시작되어 회의가 종료되었습니다')).toBeVisible({ timeout: 30_000 });
    await expect(host.page.getByRole('button', { name: '새 회의 만들기' })).toBeVisible();
  } finally {
    await second.server.close();
  }
});

test('IT-16 [FR-06,FR-07,POL-01] 정원이 차면 세 번째 사람은 "방이 가득 찼습니다"를 본다', async ({ browser }) => {
  const small = await extraServer({ MAX_PARTICIPANTS: '2' });
  try {
    const env = { server: small.server, base: small.base };
    const host = await hostMeeting(browser, env);
    await guestMeeting(browser, host.url, '민지');
    const ctx = await browser.newContext({ permissions: ['camera', 'microphone'] });
    const page = await ctx.newPage();
    await page.goto(host.url);
    await expect(page.getByRole('alert')).toContainText('방이 가득 찼습니다');
    await ctx.close();
  } finally {
    await small.server.close();
  }
});

test('IT-17 [FR-04,UX-03,UX-02] 카메라·마이크 권한이 거부돼도 원인과 해결 방법을 안내하고 장치 없이 입장할 수 있다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = () => Promise.reject(new DOMException('denied', 'NotAllowedError'));
  });
  const page = await ctx.newPage();
  await page.goto(host.url);
  await expect(page.getByTestId('permission-problem')).toContainText('카메라 또는 마이크 권한이 차단되었습니다');
  await expect(page.getByTestId('permission-problem')).toContainText('자물쇠 아이콘');
  await page.getByTestId('lobby-nickname').fill('무장치');
  await expect(page.getByTestId('join-button')).toHaveText('장치 없이 입장');
  await page.getByTestId('join-button').click();
  await page.getByTestId('room').waitFor();
  // 장치가 없는 참가자도 상대를 보고 들을 수 있다(수신 전용)
  await expectRemoteMedia(page, 1);
  await host.page.getByTestId('btn-people').click();
  await expect(host.page.getByTestId('people-list').locator('li', { hasText: '무장치' }).getByLabel('마이크 꺼짐')).toBeVisible();
  await ctx.close();
});

test('IT-18 [NFR-05,POL-14,FR-06] 지원하지 않는 환경(WebRTC 없음)은 안내 화면과 링크 복사를 보여 준다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    Object.defineProperty(window, 'RTCPeerConnection', { value: undefined, configurable: true });
  });
  const page = await ctx.newPage();
  await page.goto(host.url);
  await expect(page.getByRole('alert')).toContainText('이 브라우저에서는 사용할 수 없습니다');
  await expect(page.getByTestId('copy-link')).toBeVisible();
  await ctx.close();
});

test('IT-19 [FR-22,FR-03] 나간 뒤 "다시 입장"으로 같은 링크에 다시 들어갈 수 있다', async ({ browser, env }) => {
  const host = await hostMeeting(browser, env);
  const a = await guestMeeting(browser, host.url, '민지');
  await a.page.getByTestId('btn-leave').click();
  await a.page.getByRole('button', { name: '나가기' }).last().click();
  await expect(a.page.getByText('회의에서 나왔습니다')).toBeVisible();
  await a.page.getByTestId('rejoin').click();
  await a.page.getByTestId('lobby-nickname').waitFor();
  await a.page.getByTestId('lobby-nickname').fill('민지');
  await a.page.getByTestId('join-button').click();
  await a.page.getByTestId('room').waitFor();
  await expectRemoteMedia(a.page, 1);
});
