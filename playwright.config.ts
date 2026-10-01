import fs from 'node:fs';
import { defineConfig } from '@playwright/test';

// 로컬 샌드박스에는 미리 설치된 Chromium이 있고, CI에서는 `npx playwright install chromium`으로 받는다.
const preinstalled = fs.readdirSync('/opt/pw-browsers', { withFileTypes: true }).find((d) => d.isDirectory() && /^chromium-\d+$/.test(d.name));
const executablePath = process.env.PW_CHROMIUM_PATH ?? (preinstalled ? `/opt/pw-browsers/${preinstalled.name}/chrome-linux/chrome` : undefined);

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    headless: true,
    launchOptions: {
      ...(executablePath && fs.existsSync(executablePath) ? { executablePath } : {}),
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
        '--auto-select-desktop-capture-source=Entire screen',
        '--disable-features=WebRtcHideLocalIpsWithMdns',
        '--no-sandbox',
      ],
    },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
