import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './__tests__/e2e',
  timeout: 60000, // Timeout is shared between all tests.
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Capture screenshot only when test fails. */
    screenshot: 'only-on-failure',
    
    /* Record video only when test fails. */
    video: 'retain-on-failure',
  },

  /* Configure projects for different test types */
  projects: [
    {
      name: 'Kubernetes',
      testMatch: /.*kubernetes.*\.spec\.ts/,
      retries: 0,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Default',
      testIgnore: /.*kubernetes.*\.spec\.ts/,
      retries: process.env.CI ? 2 : 0,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'MOCKED=1 npm run dev',
    url: 'http://localhost:3000/api/health/readiness',
    reuseExistingServer: !process.env.CI,
  },
});
