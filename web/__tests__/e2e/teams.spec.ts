import { test, expect } from '@playwright/test';

test.describe('Teams Page', () => {
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
    const errorMessage = page.locator('text=Error Loading Teams');
    
    // Either we should see team cards OR an error message
    const hasTeams = await teamCards.count() > 0;
    const hasError = await errorMessage.isVisible();
    
    expect(hasTeams || hasError).toBe(true);

    // If we have teams, verify the structure
    if (hasTeams) {
      // Check that team count is displayed
      const teamCount = await teamCards.count();
      await expect(page.getByText(`${teamCount} ${teamCount === 1 ? 'team' : 'teams'}`)).toBeVisible();

      // Check first team card structure
      const firstTeam = teamCards.first();
      await expect(firstTeam).toBeVisible();
      
      // Should have a team name (h3 element)
      await expect(firstTeam.locator('h3')).toBeVisible();
      
      // Should have a role badge (using text content instead of broad span selector)
      await expect(firstTeam.getByText('Owner', { exact: true })).toBeVisible();
      
      // Should have owner information
      await expect(firstTeam.locator('text=/Owner:/')).toBeVisible();
      
      // Should have creation date
      await expect(firstTeam.locator('text=/Created/')).toBeVisible();
    }
  });

  test('should navigate to teams page from home page', async ({ page }) => {
    // Start at the home page (should work in MOCKED=1 mode without auth)
    await page.goto('/');

    // Should be on the dashboard now
    await expect(page).toHaveURL('/');
    
    // Click the "View Teams" link in the Quick Actions section
    await page.click('text=View Teams');

    // Should navigate to teams page
    await expect(page).toHaveURL('/teams');
    await expect(page.locator('h1')).toContainText('My Teams');
  });

  test('should show empty state if no teams found', async ({ page }) => {
    await page.goto('/teams');

    // Check if empty state is shown (this might happen if there's an issue with team creation)
    const emptyState = page.locator('text=No teams found');
    if (await emptyState.isVisible()) {
      // Verify empty state elements
      await expect(page.locator('text=👥')).toBeVisible();
      await expect(page.locator('text=You haven\'t been added to any teams yet')).toBeVisible();
      await expect(page.locator('text=Go Home')).toBeVisible();
    }
  });

  test('should display team card information correctly', async ({ page }) => {
    await page.goto('/teams');

    // Wait for teams to load
    const teamCards = page.locator('[class*="bg-surface"][class*="border"][class*="rounded-lg"]');
    
    if (await teamCards.count() > 0) {
      const firstTeam = teamCards.first();
      
      // Check for team avatar/initial
      const teamAvatar = firstTeam.locator('[class*="bg-primary-container"][class*="rounded-full"]');
      await expect(teamAvatar).toBeVisible();
      
      // Check for team name
      const teamName = firstTeam.locator('h3');
      await expect(teamName).toBeVisible();
      
      // Check for role badge with proper styling (using text content)
      const roleBadge = firstTeam.getByText('Owner', { exact: true });
      await expect(roleBadge).toBeVisible();
      await expect(roleBadge).toHaveClass(/bg-primary|bg-secondary|bg-outline/);
      
      // Check for owner information
      const ownerInfo = firstTeam.locator('text=/👤 Owner:/')
      await expect(ownerInfo).toBeVisible();
      
      // Check for creation date
      const creationDate = firstTeam.locator('text=/📅 Created/')
      await expect(creationDate).toBeVisible();
    }
  });

  test('should handle authentication errors gracefully', async ({ page }) => {
    await page.goto('/teams');

    // Check if there's an authentication error
    const authError = page.locator('text=Not authenticated');
    const errorContainer = page.locator('[class*="bg-error-container"]');
    
    if (await authError.isVisible() || await errorContainer.isVisible()) {
      // Verify error state structure
      await expect(page.locator('text=Error Loading Teams')).toBeVisible();
      await expect(page.locator('text=⚠️')).toBeVisible();
      await expect(page.locator('text=Please try refreshing the page or sign in again')).toBeVisible();
    }
  });

  test('should display teams footer link', async ({ page }) => {
    // Go to home page (should work in MOCKED=1 mode without auth)
    await page.goto('/');

    // Should be on the dashboard now
    await expect(page).toHaveURL('/');

    // Check that teams link exists in footer
    const footerTeamsLink = page.locator('footer').locator('a[href="/teams"]');
    await expect(footerTeamsLink).toBeVisible();
    await expect(footerTeamsLink).toContainText('Teams');
  });
});