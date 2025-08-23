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
  
  // Look for the "Sign in (dev password)" button
  const devSignInButton = page.locator('button:has-text("Sign in (dev password)")');
  
  if (await devSignInButton.isVisible()) {
    // Click the development sign in button
    await devSignInButton.click();
    
    // Wait for navigation to the auth form
    await page.waitForLoadState('networkidle');
    
    // Now we should be on the auth signin page, look for password field
    const passwordField = page.locator('input[name="password"], input[type="password"], textbox:has-text("Password")').first();
    await passwordField.waitFor({ timeout: 10000 });
    await passwordField.fill(password);
    
    // Click the "Sign in with Password" button
    const submitButton = page.locator('button:has-text("Sign in with Password")');
    await submitButton.click();
    
    // Wait for redirect to home page
    await page.waitForURL('/', { timeout: 10000 });
  } else {
    throw new Error('Development sign-in button not found on login page');
  }
  
  // Verify we're now authenticated by checking for authenticated content
  // Look for welcome message or navigation to be more flexible
  try {
    await page.waitForSelector('text=Welcome back, h1:has-text("My Teams"), nav', { timeout: 10000 });
  } catch {
    // Fallback check - just verify we're not on login page
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      throw new Error(`Still on login page after authentication attempt. URL: ${currentUrl}`);
    }
  }
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