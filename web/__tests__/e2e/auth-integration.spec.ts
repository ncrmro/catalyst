import { test, expect } from '@playwright/test';
import { generateUserCredentials } from './helpers/auth';

test.describe('Auth Integration Tests', () => {
  test('should be able to make API request to auth endpoint', async ({ page }) => {
    // Test that we can reach the auth API endpoint
    const response = await page.request.get('/api/auth/providers');
    
    // Should return OK status and contain credentials provider in development
    expect(response.ok()).toBe(true);
    
    const providers = await response.json();
    
    // In development mode, should have credentials provider
    if (process.env.NODE_ENV === 'development') {
      expect(providers).toHaveProperty('credentials');
    }
  });

  test('should generate different credentials for different tests', async ({}, testInfo) => {
    const user1 = generateUserCredentials(testInfo, 'user');
    await new Promise(resolve => setTimeout(resolve, 1)); // Small delay
    const user2 = generateUserCredentials(testInfo, 'user');
    
    expect(user1).not.toBe(user2);
    expect(user1).toMatch(/^password-/);
    expect(user2).toMatch(/^password-/);
  });
});