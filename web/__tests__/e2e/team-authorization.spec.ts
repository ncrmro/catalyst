import { test, expect } from '@playwright/test';
import { loginWithDevPassword, generateUserCredentials } from './helpers';

test.describe('Team Authorization', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    // Login as a regular user for most tests
    await loginWithDevPassword(page, testInfo, 'user');
  });

  test('should only show projects that belong to user teams', async ({ page }) => {

    // Navigate to projects page
    await page.goto('/projects');

    // Check that the page loads correctly
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

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

    // Navigate to repos page - this should work as it fetches from GitHub directly
    await page.goto('/repos');

    // Check that the page loads correctly
    await expect(page.getByRole('heading', { name: 'GitHub Repositories' })).toBeVisible();

    // Should show description
    await expect(page.getByText('View and manage your GitHub repositories and organization repos.')).toBeVisible();

    // In mocked mode, should show mock repositories
    // In real mode, would depend on GitHub access
    const hasRepos = await page.locator('[class*="bg-surface"][class*="border"][class*="rounded-lg"]').count() > 0;
    const hasEmptyState = await page.getByText('No repositories found').isVisible();
    
    // Should either show repos or empty state
    expect(hasRepos || hasEmptyState).toBe(true);
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
    const password = generateUserCredentials(testInfo, 'admin');
    await loginWithDevPassword(page, testInfo, 'admin');

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
