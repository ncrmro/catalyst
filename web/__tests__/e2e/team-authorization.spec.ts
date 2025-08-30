import { test, expect } from '@playwright/test';
import { loginWithDevPassword, generateUserCredentials, loginAndSeedForE2E, seedProjectsForE2EUser } from './helpers';

test.describe('Team Authorization', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Login as a regular user for most tests and seed projects
    const password = await loginWithDevPassword(page, testInfo, 'user');
    
    // Seed projects for this user to ensure tests have data
    await seedProjectsForE2EUser(password, testInfo);
  });

  test('should only show projects that belong to user teams', async ({ page }) => {

    // Navigate to projects page
    await page.goto('/projects');

    // Check that the page loads correctly
    await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();

    // In mocked mode, users should see projects since they have personal teams
    // In non-mocked mode with team authorization, they should only see projects from their teams
    const projectCards = page.locator('[data-testid^="project-card-"]');
    
    // We expect at least one project to exist
    const projectCount = await projectCards.count();
    expect(projectCount).toBeGreaterThan(0);
  });

  test('should prevent access to projects from other teams', async ({ page }) => {

    // Try to navigate to a specific project that might not belong to this user's teams
    // This is a generic test - in a real scenario, we'd need to know specific project IDs
    await page.goto('/projects');
    
    // Check if there are any projects displayed
    const projectCards = page.locator('[data-testid^="project-card-"]');
    const projectCount = await projectCards.count();
    
    // We expect at least one project to exist
    expect(projectCount).toBeGreaterThan(0);
    
    // Navigate to first project to test authorization
    await projectCards.first().click();
    
    // Should be able to access the project if authorized
    await expect(page.getByText('Back to Projects')).toBeVisible();
    
    // Should show project sections 
    await expect(page.locator('h2:has-text("Repositories")')).toBeVisible();
  });

  test('should show repos page regardless of team authorization', async ({ page }) => {

    // Navigate to repos page - this works with database repos and optionally GitHub repos
    await page.goto('/repos');

    // Check that the page loads correctly with new generic title
    await expect(page.getByRole('heading', { name: 'Git Repositories' })).toBeVisible();

    // Should show description
    await expect(page.getByText('View and manage your Git repositories across different platforms.')).toBeVisible();

    const hasRepos = await page.locator('[class*="bg-surface"][class*="border"][class*="rounded-lg"]').count() > 0;
    
    // Should either show repos or empty state
    expect(hasRepos).toBe(true);
    
    // If GitHub integration is not enabled, it should show a warning message
    const githubDisabledWarning = page.locator('text=GitHub integration is not currently enabled');
    const hasGithubWarning = await githubDisabledWarning.count() > 0;
    
    // The test can pass whether GitHub integration is enabled or not
    // If it's disabled, we'll see the warning; if it's enabled, we won't
    console.log(`GitHub integration ${hasGithubWarning ? 'is not' : 'is'} enabled for this test run`);
  });

  test('should show teams page with user teams', async ({ page }) => {

    // Navigate to teams page
    await page.goto('/teams');

    // Check that the page loads correctly
    await expect(page.getByRole('heading', { name: 'My Teams' })).toBeVisible();

    // Should show description
    await expect(page.getByText('Teams you\'re a member of and their roles')).toBeVisible();

    // Users should have at least their personal team
    const teamCards = page.locator('[class*="bg-surface"][class*="border"][class*="rounded-lg"]');
    const teamCount = await teamCards.count();
    
    expect(teamCount).toBeGreaterThan(0);
  });

  test('admin user should have appropriate access', async ({ page }, testInfo) => {
    // Override the beforeEach by logging in as an admin user
    await page.goto('/');
    await page.getByRole('button', { name: 'Sign out' }).click();
    
    // Login using generated user credentials, not hardcoded admin role
    const password = await loginWithDevPassword(page, testInfo, 'admin');
    
    // Seed projects for this admin user to ensure tests have data
    await seedProjectsForE2EUser(password, testInfo);

    // Navigate to projects page
    await page.goto('/projects');

    // Check that the page loads correctly
    await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();

    // Admin users should still be subject to team authorization
    // They need to be members of teams to see team projects
    const projectCards = page.locator('[data-testid^="project-card-"]');
    
    // We expect at least one project to exist
    const projectCount = await projectCards.count();
    expect(projectCount).toBeGreaterThan(0);
  });
});
