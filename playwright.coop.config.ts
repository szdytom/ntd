import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

process.env.NO_PROXY = [process.env.NO_PROXY, '127.0.0.1', 'localhost'].filter(Boolean).join(',');
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH
  ?? (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : null);

export default defineConfig({
  testDir: './e2e-coop',
  fullyParallel: false,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4273',
    browserName: 'chromium',
    headless: true,
    launchOptions: {
      ...(chromiumPath ? { executablePath: chromiumPath } : {}),
      args: ['--no-sandbox'],
    },
  },
  webServer: {
    command: 'env COOP_CLIENT_PORT=4273 COOP_SERVER_PORT=4274 pnpm dev:coop',
    url: 'http://127.0.0.1:4273',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
