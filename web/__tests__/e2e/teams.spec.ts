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

  test('should navigate to teams page from home page', async ({ page }) => {
    // Start at the home page (should work in MOCKED=1 mode without auth)
    await page.goto('/');
    
    // First generate a report to see the Quick Actions section
    await page.click('text=Generate Report');
    
    // Wait for the report to be generated and displayed
    await expect(page.locator('text=Quick Actions')).toBeVisible({ timeout: 30000 });
    
    // Click the "View Teams" link in the Quick Actions section
    await page.click('text=View Teams');

    // Should navigate to teams page
    await expect(page).toHaveURL('/teams');
    await expect(page.locator('h1')).toContainText('My Teams');
  });

});