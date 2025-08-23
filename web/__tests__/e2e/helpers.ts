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

  // First, get CSRF token from NextAuth (not strictly required with modern NextAuth, but safe)
  const requestContext: APIRequestContext = await playwrightRequest.newContext({ baseURL: page.context()._options.baseURL as string | undefined });

  // Post to NextAuth credentials sign-in endpoint
  // Using provider id "password" as defined in src/auth.ts
  const res = await requestContext.post('/api/auth/callback/password', {
    form: {
      // NextAuth expects a "password" field based on our credentials config
      password,
      // Callback URL to redirect after login; use home
      callbackUrl: '/',
    },
  });

  if (!res.ok()) {
    throw new Error(`Login failed with status ${res.status()}: ${await res.text()}`);
  }

  // Transfer cookies from request context to the browser context so the page is authenticated
  const cookies = await requestContext.storageState();
  await page.context().addCookies((cookies.cookies || []).map(c => ({
    ...c,
    url: undefined, // Playwright requires either url or domain/path; cookies already have domain/path
  })));

  // Navigate to the homepage to ensure the session is active
  await page.goto('/');
} 