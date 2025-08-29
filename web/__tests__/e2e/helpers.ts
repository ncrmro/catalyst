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

/**
 * Seed projects for the current E2E test user
 * This ensures that the user has projects available in the database
 */
export async function seedProjectsForE2EUser(page: Page) {
  try {
    // Call the E2E seeding endpoint after user is logged in
    const response = await page.request.post('/api/e2e/seed');
    
    if (!response.ok()) {
      const errorText = await response.text();
      console.warn('Failed to seed projects for E2E user:', errorText);
      return { success: false, message: errorText };
    }
    
    const result = await response.json();
    console.log('E2E projects seeded:', result);
    return result;
  } catch (error) {
    console.error('Error seeding projects for E2E user:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Login and seed projects for E2E testing
 * This is a convenience function that combines login and seeding
 */
export async function loginAndSeedForE2E(page: Page, testInfo: TestInfo, role: 'user' | 'admin' = 'user') {
  // First login the user
  await loginWithDevPassword(page, testInfo, role);
  
  // Then seed projects for this user
  await seedProjectsForE2EUser(page);
} 