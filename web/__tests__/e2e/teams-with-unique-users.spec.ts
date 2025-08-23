import { test, expect } from '@playwright/test';
import { signInWithUniqueUser } from './helpers/auth';

test.describe('Teams Page with Unique Users Example', () => {
  // ⚠️ EXAMPLE TEST - This demonstrates how to use unique users per test
  // This test does NOT use MOCKED=1 mode and requires real authentication
  // To run this test, you would need to:
  // 1. Set up a database (npm run db:migrate)
  // 2. Modify playwright.config.ts to remove MOCKED=1 from the webServer command
  // 3. Run: npx playwright test teams-with-unique-users.spec.ts
  
  test.beforeEach(async ({ page }, testInfo) => {
    // Each test gets a unique user to avoid conflicts between parallel test runs
    await signInWithUniqueUser(page, testInfo, 'user');
  });

  test('should display teams for unique user', async ({ page }) => {
    // Navigate to the teams page
    await page.goto('/teams');

    // Check that the page title is correct
    await expect(page.locator('h1')).toContainText('My Teams');

    // Check that the description is shown
    await expect(page.getByText('Teams you\'re a member of and their roles')).toBeVisible();

    // Since users get personal teams created automatically on signup,
    // each unique user should have at least one team
    const teamCards = page.locator('[class*="bg-surface"][class*="border"][class*="rounded-lg"]');
    const teamCount = await teamCards.count();
    
    // Should have at least one team (personal team)
    expect(teamCount).toBeGreaterThan(0);

    // Check that team count is displayed
    await expect(page.getByText(`${teamCount} ${teamCount === 1 ? 'team' : 'teams'}`)).toBeVisible();
  });

  test('should create independent teams for different test users', async ({ page }) => {
    // This test gets a different unique user from the previous test
    // due to the beforeEach hook, demonstrating isolation between tests
    
    await page.goto('/teams');

    // Each test should have its own user and therefore its own teams
    await expect(page.locator('h1')).toContainText('My Teams');
    
    // The user should have at least one team (their personal team)
    const teamCards = page.locator('[class*="bg-surface"][class*="border"][class*="rounded-lg"]');
    const teamCount = await teamCards.count();
    expect(teamCount).toBeGreaterThan(0);
  });
});

test.describe('Teams Page with Admin Users', () => {
  // Test admin users separately with their own beforeEach
  test.beforeEach(async ({ page }, testInfo) => {
    // Each test gets a unique admin user
    await signInWithUniqueUser(page, testInfo, 'admin');
  });

  test('should work with admin users', async ({ page }) => {
    // Navigate to teams page with admin user
    await page.goto('/teams');

    // Admin users should also have teams
    await expect(page.locator('h1')).toContainText('My Teams');
    
    const teamCards = page.locator('[class*="bg-surface"][class*="border"][class*="rounded-lg"]');
    const teamCount = await teamCards.count();
    expect(teamCount).toBeGreaterThan(0);
  });
});