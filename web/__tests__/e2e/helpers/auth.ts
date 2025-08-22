import { TestInfo, Page } from '@playwright/test';

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
 * Sign in a user with unique credentials for E2E testing by calling NextAuth API directly
 */
export async function signInWithUniqueUser(page: Page, testInfo: TestInfo, role: 'user' | 'admin' = 'user') {
  const password = generateUserCredentials(testInfo, role);
  
  // Make a POST request to the NextAuth credentials sign-in endpoint
  const response = await page.request.post('/api/auth/callback/credentials', {
    form: {
      password: password,
      callbackUrl: '/',
      json: 'true'
    }
  });

  // If the response is successful, the cookies should be set automatically
  if (response.ok()) {
    // Navigate to home page to verify authentication worked
    await page.goto('/');
    
    // Wait for the page to load and verify we're authenticated
    // In development mode, authenticated users should see the dashboard
    await page.waitForSelector('text=Welcome back', { timeout: 5000 });
  } else {
    throw new Error(`Authentication failed with status: ${response.status()}`);
  }
}