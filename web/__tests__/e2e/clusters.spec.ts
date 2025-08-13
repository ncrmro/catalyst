import { test, expect } from '@playwright/test';

test.describe('Clusters Page', () => {
  test('should display clusters page header', async ({ page }) => {
    await page.goto('/clusters');
    await expect(page.locator('h1')).toContainText('Clusters');
  });
}); 