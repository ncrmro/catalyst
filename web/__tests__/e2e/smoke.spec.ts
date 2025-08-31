import { test, expect } from '@playwright/test';
import { loginWithDevPassword } from './helpers';

test.describe('Smoke Tests', () => {
  test('should load home page successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads without errors
    await expect(page.locator('html')).toBeVisible();
    
    // Basic check for navigation or main content
    // This works in both authenticated and non-authenticated modes
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should access readiness endpoint', async ({ page }) => {
    const response = await page.goto('/api/health/readiness');
    expect(response?.status()).toBe(200);
    
    // Navigate back to a page for proper cleanup
    await page.goto('/');
  });

  test('should perform basic authentication flow', async ({ page }, testInfo) => {
    // Test authentication - core functionality
    await loginWithDevPassword(page, testInfo);
    
    // Verify we're logged in by checking we're at home page
    await expect(page).toHaveURL('/');
  });

  test('should navigate to teams page when authenticated', async ({ page }, testInfo) => {
    await loginWithDevPassword(page, testInfo);
    
    // Navigate to teams page - basic navigation test
    await page.goto('/teams');
    
    // Check that the page title is correct
    await expect(page.locator('h1')).toContainText('My Teams');
  });

  test('should display repos page when authenticated', async ({ page }, testInfo) => {
    await loginWithDevPassword(page, testInfo);
    
    // Navigate to repos page - another core page
    await page.goto('/repos');
    
    // Check that the page title is correct
    await expect(page.getByRole('heading', { name: 'Git Repositories' })).toBeVisible();
  });
});
