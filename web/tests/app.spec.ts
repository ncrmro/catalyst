import { test, expect } from '@playwright/test';

test.describe('GitHub App Integration', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads and has expected content
    await expect(page).toHaveTitle(/Catalyst/);
    
    // Look for some expected content on the homepage
    await expect(page.locator('body')).toBeVisible();
  });

  test('github app page loads successfully', async ({ page }) => {
    await page.goto('/github');
    
    // Check that the GitHub app page loads
    await expect(page.locator('body')).toBeVisible();
  });

  test('api endpoints are accessible', async ({ page }) => {
    // Test that API endpoints return appropriate responses
    const response = await page.request.get('/api/github/register');
    expect(response.status()).toBe(405); // Should be method not allowed for GET without proper setup
  });
});