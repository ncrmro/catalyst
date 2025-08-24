import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Helm tests
 * This configuration is used when running E2E tests against a deployed service
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './__tests__/e2e',
  /* Run tests in files in parallel */
  fullyParallel: false, // Disable parallel for helm tests to reduce resource usage
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1, // Allow one retry for helm tests
  /* Opt out of parallel tests on CI. */
  workers: 1, // Use single worker for helm tests
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'],
    ['json', { outputFile: '/tmp/test-results.json' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test. */
    trace: 'on-first-retry',
    
    /* Capture screenshot only when test fails. */
    screenshot: 'only-on-failure',
    
    /* Record video only when test fails. */
    video: 'retain-on-failure',
    
    /* Set timeout for each test action */
    actionTimeout: 30000,
    
    /* Set timeout for navigations */
    navigationTimeout: 30000,
  },

  /* Global test timeout */
  timeout: 60000,

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Output directory for test artifacts */
  outputDir: '/tmp/test-results',
  
  /* Don't use web server in helm test mode - we expect the service to be running */
});