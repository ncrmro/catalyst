import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect to login page when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Sign In');
    await expect(page.locator('button:has-text("Sign in with GitHub")')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('should login with development credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in the password
    await page.fill('input[name="password"]', 'password');
    
    // Click login button
    await page.click('button:has-text("Sign in with Password")');
    
    // Should redirect to home page
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Welcome to NextJS Starter');
  });

  test('should login as admin with admin password', async ({ page }) => {
    await page.goto('/login');
    
    // Fill in the admin password
    await page.fill('input[name="password"]', 'admin');
    
    // Click login button
    await page.click('button:has-text("Sign in with Password")');
    
    // Should redirect to home page
    await expect(page).toHaveURL('/');
    await expect(page.locator('h1')).toContainText('Welcome to NextJS Starter');
    
    // Should show admin role
    await expect(page.locator('text=Admin')).toBeVisible();
  });
});