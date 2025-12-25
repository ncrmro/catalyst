import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should login with admin password', async ({ page }) => {
    // Navigate to the signin page
    await page.goto('/api/auth/signin');
    
    // Wait for the password field to be visible
    await expect(page.getByLabel('Password')).toBeVisible();
    
    // Fill in the admin password
    await page.getByLabel('Password').fill('admin');
    
    // Click the sign in button
    await page.getByRole('button', { name: 'Sign in with Password' }).click();
    
    // Wait for redirect to home page or projects page
    await page.waitForURL('**/projects');
    
    // Verify we're logged in by checking for the Projects heading
    await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
  });
});
