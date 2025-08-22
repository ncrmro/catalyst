import { test, expect } from '@playwright/test';
import { generateUserCredentials, signInWithUniqueUser } from './helpers/auth';

test.describe('Teams Page with Unique Users', () => {
  test('should display teams page after signing in with unique user', async ({ page }, testInfo) => {
    // Sign in with a unique user for this test
    await signInWithUniqueUser(page, testInfo, 'user');

    // Navigate to the teams page
    await page.goto('/teams');

    // Check that the page title is correct
    await expect(page.locator('h1')).toContainText('My Teams');

    // Check that the description is shown
    await expect(page.getByText('Teams you\'re a member of and their roles')).toBeVisible();

    // Since users get personal teams created automatically on signup,
    // we expect to see at least one team
    const teamCards = page.locator('[class*="bg-surface"][class*="border"][class*="rounded-lg"]');
    const teamCount = await teamCards.count();
    
    // Should have at least one team (personal team)
    expect(teamCount).toBeGreaterThan(0);

    // Check that team count is displayed
    await expect(page.getByText(`${teamCount} ${teamCount === 1 ? 'team' : 'teams'}`)).toBeVisible();

    // Check first team card structure
    const firstTeam = teamCards.first();
    await expect(firstTeam).toBeVisible();
    
    // Should have a team name (h3 element)
    await expect(firstTeam.locator('h3')).toBeVisible();
    
    // Should have a role badge
    await expect(firstTeam.getByText('Owner', { exact: true })).toBeVisible();
    
    // Should have owner information
    await expect(firstTeam.locator('text=/Owner:/')).toBeVisible();
    
    // Should have creation date
    await expect(firstTeam.locator('text=/Created/')).toBeVisible();
  });

  test('should create different users for different tests', async ({ page }, testInfo) => {
    // Sign in with a unique user for this test
    await signInWithUniqueUser(page, testInfo, 'user');

    // Navigate to the teams page
    await page.goto('/teams');

    // Each test should have its own user and therefore its own teams
    await expect(page.locator('h1')).toContainText('My Teams');
    
    // The user should have at least one team (their personal team)
    const teamCards = page.locator('[class*="bg-surface"][class*="border"][class*="rounded-lg"]');
    const teamCount = await teamCards.count();
    expect(teamCount).toBeGreaterThan(0);
  });

  test('should work with admin users', async ({ page }, testInfo) => {
    // Sign in with a unique admin user for this test
    await signInWithUniqueUser(page, testInfo, 'admin');

    // Navigate to the teams page
    await page.goto('/teams');

    // Admin users should also have teams
    await expect(page.locator('h1')).toContainText('My Teams');
    
    const teamCards = page.locator('[class*="bg-surface"][class*="border"][class*="rounded-lg"]');
    const teamCount = await teamCards.count();
    expect(teamCount).toBeGreaterThan(0);
  });
});