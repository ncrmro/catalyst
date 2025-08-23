import { Page, TestInfo, request as playwrightRequest, APIRequestContext } from '@playwright/test';

/**
 * Generate unique user credentials for E2E tests based on worker index and timestamp
 * to avoid conflicts between parallel test runs
 */
export function generateUserCredentials(testInfo: TestInfo, role: 'user' | 'admin' = 'user') {
  const workerIndex = testInfo.workerIndex;
  const timestamp = Date.now();
  const suffix = `${workerIndex}-${timestamp}`;
  
  const basePassword = role === 'admin' ? 'admin' : 'password';
  return `${basePassword}-${suffix}`;
}

/**
 * Perform a development credentials login via NextAuth and attach auth cookies to the provided page.
 * Requires NODE_ENV=development and the Credentials provider enabled (id: "password").
 */
export async function loginWithDevPassword(page: Page, testInfo: TestInfo, role: 'user' | 'admin' = 'user') {
  // Generate a unique dev password that NextAuth credentials provider understands
  const password = generateUserCredentials(testInfo, role);
  await page.goto('/api/auth/signin');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in with Password' }).click();
  await page.waitForURL('/');
} 