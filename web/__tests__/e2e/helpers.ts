import { Page, TestInfo } from '@playwright/test';
import { seedProjectsForE2EUser } from './e2e-seed';

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
 * This will automatically create a user and team if they don't exist.
 * 
 * @returns The password used for login
 */
export async function loginWithDevPassword(page: Page, testInfo: TestInfo, role: 'user' | 'admin' = 'user') {
  // Generate a unique dev password that NextAuth credentials provider understands
  const password = generateUserCredentials(testInfo, role);
  await page.goto('/api/auth/signin');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in with Password' }).click();
  await page.waitForURL('/');
  
  // Return the password so it can be used for seeding
  return password;
}

/**
 * Login and seed projects for E2E testing
 * This is a convenience function that combines login and seeding
 */
export async function loginAndSeedForE2E(page: Page, testInfo: TestInfo, role: 'user' | 'admin' = 'user') {
  // First login the user and get the password used
  const password = await loginWithDevPassword(page, testInfo, role);
  
  // Then seed projects for this user using the database directly
  await seedProjectsForE2EUser(password, testInfo);
} 