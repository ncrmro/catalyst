import { test, expect } from '@playwright/test';
import { loginWithDevPassword } from './helpers';

test.describe('Teams Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await loginWithDevPassword(page, testInfo);
  });

  test('should display teams page and verify user has at least one team', async ({ page }) => {
    // Navigate to the teams page
    await page.goto('/teams');

    // Check that the page title is correct
    await expect(page.locator('h1')).toContainText('My Teams');

    // Check that the description is shown
    await expect(page.getByText('Teams you\'re a member of and their roles')).toBeVisible();

    // Since users get personal teams created automatically on signup,
    // we expect to see at least one team (unless there's an error)
    const teamCards = page.locator('[class*="bg-surface"][class*="border"][class*="rounded-lg"]');
    const hasTeams = await teamCards.count() > 0;
    
    expect(hasTeams).toBe(true);

  });

});