import { Page, TestInfo, request } from "@playwright/test";

/**
 * Generate unique user credentials for E2E tests based on worker index and timestamp
 * to avoid conflicts between parallel test runs
 */
export function generateUserCredentials(
  testInfo: TestInfo,
  role: "user" | "admin" = "user",
) {
  const workerIndex = testInfo.workerIndex;
  const timestamp = Date.now();
  const suffix = `${workerIndex}-${timestamp}`;

  const basePassword = role === "admin" ? "admin" : "password";
  return `${basePassword}-${suffix}`;
}

/**
 * Perform a development credentials login via NextAuth and attach auth cookies to the provided page.
 * Requires NODE_ENV=development and the Credentials provider enabled (id: "password").
 * This will automatically create a user and team if they don't exist.
 *
 * @returns The password used for login
 */
export async function loginWithDevPassword(
  page: Page,
  testInfo: TestInfo,
  role: "user" | "admin" = "user",
) {
  // Generate a unique dev password that NextAuth credentials provider understands
  const password = generateUserCredentials(testInfo, role);
  await page.goto("/api/auth/signin");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in with Password" }).click();
  await page.waitForURL("**/projects");

  // Return the password so it can be used for seeding
  return password;
}

/**
 * For E2E tests - seed projects for the authenticated user via API
 * This calls the /api/e2e/seed endpoint which runs inside the app container
 * and has direct database access
 */
export async function seedProjectsForE2EUser(password: string) {
  const baseURL =
    process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000";
  const apiContext = await request.newContext({ baseURL });

  const response = await apiContext.post("/api/e2e/seed", {
    data: { password, createProjects: true },
  });

  let result;
  if (!response.ok()) {
    const text = await response.text();
    console.warn(`Seed API returned ${response.status()}: ${text}`);
    result = { success: false, message: text };
  } else {
    result = await response.json();
  }

  await apiContext.dispose();
  return result;
}

/**
 * Login and seed projects for E2E testing
 * This is a convenience function that combines login and seeding
 */
export async function loginAndSeedForE2E(
  page: Page,
  testInfo: TestInfo,
  role: "user" | "admin" = "user",
) {
  // First login the user and get the password used
  const password = await loginWithDevPassword(page, testInfo, role);

  // Then seed projects for this user via API endpoint
  await seedProjectsForE2EUser(password);
}
