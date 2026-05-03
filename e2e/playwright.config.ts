import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,       // Sequential — game state is shared
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,                 // Single worker to avoid race conditions
  timeout: 60_000,            // 60s per test (socket events can be slow)

  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ...(process.env.CI ? [['junit', { outputFile: 'test-results/junit.xml' }] as any] : []),
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // NOTE: Start backend (port 3001) and frontend (port 5173) manually before running:
  //   cd be && npm run dev
  //   cd fe && npm run dev
  //   cd e2e && npx playwright test
})
