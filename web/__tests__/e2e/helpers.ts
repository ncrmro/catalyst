import { Page, TestInfo } from '@playwright/test';

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
 * Perform a development credentials login with a FIXED test user for e2e tests.
 * This ensures tests use a consistent user that can access seeded data.
 */
export async function loginWithFixedTestUser(page: Page, role: 'user' | 'admin' = 'user') {
  // Use a fixed password that will always create the same user
  const password = role === 'admin' ? 'admin-e2e-test' : 'password-e2e-test';
  await page.goto('/api/auth/signin');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in with Password' }).click();
  await page.waitForURL('/');
}

/**
 * Ensure test data exists by creating a user through the login system
 * and then checking for projects. Tests WILL FAIL if no projects exist.
 * This should be called before tests that require projects to exist.
 */
export async function ensureTestDataExists(page: Page, testInfo: TestInfo) {
  // First, create a user by logging in (this creates user + team automatically)
  await loginWithDevPassword(page, testInfo);
  
  // Navigate to a page to ensure the auth session is established
  await page.goto('/projects');
  await page.waitForLoadState('networkidle');
  
  // Now we should have a user and team, we can check for projects
  // Check if projects exist by looking for project cards
  const projectCards = page.locator('[data-testid^="project-card-"]');
  const projectCount = await projectCards.count();
  
  if (projectCount === 0) {
    // No projects exist - test should FAIL
    // This is exactly what the user wants - no fallback, no console.log
    throw new Error('No projects found in database. E2E tests require projects to exist. Please run: npm run db:seed');
  }
  
  console.log(`Found ${projectCount} existing project(s) for testing`);
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