import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env", quiet: true });

const webPort = process.env.WEB_PORT || "3000";
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL || `http://localhost:${webPort}`;

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./__tests__/e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 0 : 0,
  /* Run tests two at a time on CI. */
  workers: process.env.CI ? 2 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? "github" : "list",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",

    /* Capture screenshot only when test fails. */
    screenshot: "only-on-failure",

    /* Record video only when test fails. */
    video: "retain-on-failure",
  },

  expect: {
    timeout: 10_000, // 10 Seconds
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chromium" },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    // Note: E2E tests should never use the full MOCKED=1 flag, only specific mocked modes
    // This allows testing against real database while mocking only GitHub API calls
    // GITHUB_REPOS_MODE=mocked enables GitHub repository and pull request mocking
    // KUBECONFIG_PRIMARY is passed through for K8s integration tests
    command: `GITHUB_DISABLE_APP_CHECKS=true GITHUB_REPOS_MODE=mocked ${process.env.KUBECONFIG_PRIMARY ? `KUBECONFIG_PRIMARY=${process.env.KUBECONFIG_PRIMARY}` : ""} node_modules/.bin/next dev --port ${webPort} --turbopack`,
    url: baseURL,
    // In CI, we port-forward to the K8s web service, so reuse that server
    reuseExistingServer: true,
  },
});
