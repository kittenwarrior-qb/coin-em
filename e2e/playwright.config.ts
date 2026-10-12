import { defineConfig, devices } from '@playwright/test'

// Legacy suites still contain obsolete selectors/rules and bot/random-role skips.
// Read-only discovery is allowed; execution needs an explicitly approved local target.
const listing = process.argv.includes('--list')
const target = process.env.BASE_URL
if (!listing) {
  if (process.env.EMCOIN_LEGACY_E2E_APPROVED !== '1' || !target) {
    throw new Error('Legacy E2E is unverified. Use the isolated browser suite (be/vitest.browser.config.ts). Legacy execution requires EMCOIN_LEGACY_E2E_APPROVED=1 and explicit BASE_URL pointing to an approved isolated fixture, never production/shared data.')
  }
  const url = new URL(target)
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
    throw new Error('Legacy E2E refuses non-loopback targets.')
  }
}

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
    baseURL: target,
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
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'], browserName: 'chromium' } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
  ],

  // No auto-start or shared-port fallback. Listing/configured projects are not QA proof.
})
