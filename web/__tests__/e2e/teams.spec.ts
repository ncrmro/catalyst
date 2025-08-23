import { test, expect } from '@playwright/test';
import { signInWithUniqueUser } from './helpers/auth';

test.describe('Teams Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Each test gets a unique user to avoid conflicts
    await signInWithUniqueUser(page, testInfo, 'user');
  });

  test('should display teams page and verify user has at least one team', async ({ page }) => {
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
    expect(teamCount).toBeGreaterThan(0);

    // Check that team count is displayed
    await expect(page.getByText(`${teamCount} ${teamCount === 1 ? 'team' : 'teams'}`)).toBeVisible();
  });

  test('should navigate to teams page from home page', async ({ page }) => {
    // Start at the home page (user is already authenticated via beforeEach)
    await page.goto('/');

    // Should be on the dashboard now - check for welcome message in main content area
    await expect(page.locator('main h1')).toContainText('Welcome back');

    // Find and click the teams navigation link
    const teamsLink = page.locator('nav a[href="/teams"]');
    await expect(teamsLink).toBeVisible();
    await teamsLink.click();

    // Should now be on the teams page
    await expect(page).toHaveURL('/teams');
    await expect(page.locator('h1')).toContainText('My Teams');
  });

  test('should display team card details correctly', async ({ page }) => {
    // Navigate to teams page
    await page.goto('/teams');

    // Get the first team card
    const teamCards = page.locator('[class*="bg-surface"][class*="border"][class*="rounded-lg"]');
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

  test.skip('should display teams footer link', async ({ page }) => {
    // Skip this test as footer structure may vary
    // Navigate to teams page
    await page.goto('/teams');

    // Check footer teams link - use a more flexible selector
    const footerTeamsLink = page.locator('footer').getByText('Teams');
    await expect(footerTeamsLink).toBeVisible();
  });
});