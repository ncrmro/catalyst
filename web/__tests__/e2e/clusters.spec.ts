import { test, expect } from '@playwright/test';
import { loginWithDevPassword } from './helpers';

test.describe('Clusters Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Login as admin since clusters page requires admin access
    await loginWithDevPassword(page, testInfo, 'admin');
  });

  test('should display clusters page header', async ({ page }) => {
    await page.goto('/clusters');
    await expect(page.locator('h1')).toContainText('Clusters');
  });

  test('should deny access to non-admin users', async ({ page }, testInfo) => {
    // Override the beforeEach by logging in as a regular user
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign out' }).click();
    
    // Login as regular user
    await loginWithDevPassword(page, testInfo, 'user');
    
    // Try to access clusters page
    await page.goto('/clusters');
    
    // Should get 404 error
    await expect(page.locator('h1')).toContainText('404');
    await expect(page.locator('h2')).toContainText('This page could not be found');
  });
}); 