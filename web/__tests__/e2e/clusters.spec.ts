import { test, expect } from '@playwright/test';

test.describe('Clusters Page Admin Access', () => {
  test('should deny access for non-admin users', async ({ page }) => {
    // Login as non-admin user
    await page.goto('/login');
    await page.click('button:has-text("Sign in (dev password)")');
    await page.fill('input[name="password"]', 'password');
    await page.click('button:has-text("Sign in with Password")');
    
    // Wait for authentication
    await page.waitForURL('/');
    
    // Try to access clusters page - should get 404
    await page.goto('/clusters');
    await expect(page.locator('h1')).toContainText('404');
  });
  
  test('should allow access for admin users', async ({ page }) => {
    // Login as admin user
    await page.goto('/login');
    await page.click('button:has-text("Sign in (dev password)")');
    await page.fill('input[name="password"]', 'admin');
    await page.click('button:has-text("Sign in with Password")');
    
    // Wait for authentication
    await page.waitForURL('/');
    
    // Access clusters page - should work
    await page.goto('/clusters');
    await expect(page.locator('h1')).toContainText('Clusters');
  });
}); 