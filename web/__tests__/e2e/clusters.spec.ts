import { test, expect } from '@playwright/test';
import { loginWithDevPassword } from './helpers';

test.describe('Clusters Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await loginWithDevPassword(page, testInfo);
  });

  test('should display clusters page header', async ({ page }) => {
    await page.goto('/clusters');
    await expect(page.locator('h1')).toContainText('Clusters');
  });
}); 