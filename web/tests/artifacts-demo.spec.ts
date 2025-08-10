import { test, expect } from '@playwright/test';

test.describe('Video and Screenshot Capture Demo', () => {
  test('successful test - no artifacts generated', async ({ page }) => {
    await page.goto('/');
    
    // This test should pass, so no video/screenshot will be saved
    await expect(page.locator('body')).toBeVisible();
  });

  test.skip('failed test demo - will generate video and screenshot', async ({ page }) => {
    await page.goto('/');
    
    // This test will intentionally fail to demonstrate video/screenshot capture
    // It's skipped by default to avoid CI failures, but can be enabled for testing
    await expect(page.locator('[data-testid="nonexistent-element"]')).toBeVisible({
      timeout: 5000
    });
  });
});