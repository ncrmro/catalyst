import { TestInfo, Page, BrowserContext } from '@playwright/test';

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
 * Sign in a user with unique credentials for E2E testing
 * This function navigates to the login page and performs authentication
 */
export async function signInWithUniqueUser(page: Page, testInfo: TestInfo, role: 'user' | 'admin' = 'user') {
  const password = generateUserCredentials(testInfo, role);
  
  // Navigate to the login page
  await page.goto('/login');
  
  // Check if we need to perform sign-in or if already authenticated
  const signInButton = page.locator('button[type="submit"]');
  
  if (await signInButton.isVisible()) {
    // Click the sign in button which should trigger the development authentication flow
    await signInButton.click();
    
    // In development mode, this might show a password form
    // Wait for either a password field or successful redirect
    try {
      // If a password field appears, fill it
      const passwordField = page.locator('input[name="password"]');
      await passwordField.waitFor({ timeout: 2000 });
      await passwordField.fill(password);
      
      const submitButton = page.locator('button[type="submit"]').last();
      await submitButton.click();
      
      // Wait for redirect to home page
      await page.waitForURL('/', { timeout: 5000 });
    } catch (error) {
      // If no password field appears, the sign-in might have succeeded already
      // Check if we're redirected to home page
      try {
        await page.waitForURL('/', { timeout: 5000 });
      } catch {
        throw new Error(`Authentication failed: ${error.message}`);
      }
    }
  }
  
  // Verify we're now authenticated by checking for authenticated content
  await page.waitForSelector('text=Welcome back', { timeout: 10000 });
}

/**
 * Create a browser context with authentication for E2E testing
 * This can be used to set up authentication state before running tests
 */
export async function createAuthenticatedContext(
  browser: any, 
  testInfo: TestInfo, 
  role: 'user' | 'admin' = 'user'
): Promise<BrowserContext> {
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await signInWithUniqueUser(page, testInfo, role);
  
  return context;
}