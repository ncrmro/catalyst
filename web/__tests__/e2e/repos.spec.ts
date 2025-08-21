import { test, expect } from '@playwright/test';

test.describe('GitHub Repositories Page', () => {
  test('should display mocked repositories when MOCKED=1', async ({ page }) => {
    // Go to the repos page
    await page.goto('/repos');

    // Check that the page title is correct
    await expect(page.locator('h1')).toContainText('GitHub Repositories');

    // Check that the description is shown
    await expect(page.getByText('Connected repositories from your account and organizations')).toBeVisible();

    // Check that user repositories section is shown
    await expect(page.locator('h2').filter({ hasText: 'Your Repositories' })).toBeVisible();

    // Check that specific mocked repositories are displayed
    await expect(page.locator('text=testuser/my-awesome-project')).toBeVisible();
    await expect(page.locator('text=testuser/personal-website')).toBeVisible();

    // Check that organization repositories section is shown
    await expect(page.locator('h2').filter({ hasText: 'Organization Repositories' })).toBeVisible();

    // Check organization names are displayed
    await expect(page.getByRole('heading', { name: 'awesome-org' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'open-source-collective' })).toBeVisible();

    // Check specific organization repositories
    await expect(page.locator('text=awesome-org/main-product')).toBeVisible();
    await expect(page.locator('text=awesome-org/infrastructure')).toBeVisible();
    await expect(page.locator('text=open-source-collective/community-tools')).toBeVisible();

    // Check that repository cards contain expected information
    const firstRepo = page.locator('[href="https://github.com/testuser/my-awesome-project"]').first();
    await expect(firstRepo).toBeVisible();
  });

  test('should redirect to login page when accessing home without authentication', async ({ page }) => {
    // Start at the home page without authentication
    await page.goto('/');

    // Should redirect to login page
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1')).toContainText('Catalyst');
    await expect(page.locator('h2')).toContainText('Sign in to your account');
  });

  test('should display repository cards with correct information', async ({ page }) => {
    await page.goto('/repos');

    // Find the first repository card and check its details
    const repoCard = page.locator('text=testuser/my-awesome-project').locator('..').locator('..');
    
    // Check for repository description
    await expect(repoCard.locator('text=An awesome project built with Next.js')).toBeVisible();
    
    // Check for stats
    await expect(repoCard.locator('text=⭐ 42')).toBeVisible();
    await expect(repoCard.locator('text=🍴 8')).toBeVisible();
    await expect(repoCard.locator('text=📋 3 issues')).toBeVisible();
    
    // Check for language
    await expect(repoCard.locator('text=TypeScript')).toBeVisible();
  });

  test('should handle organization repositories correctly', async ({ page }) => {
    await page.goto('/repos');

    // Check awesome-org section
    const awesomeOrgSection = page.getByRole('heading', { name: 'awesome-org' }).locator('..').locator('..');
    await expect(awesomeOrgSection.locator('text=An awesome organization building great software')).toBeVisible();
  });

  test('should show links to GitHub repositories', async ({ page }) => {
    await page.goto('/repos');

    // Check that repository links point to GitHub
    const repoLink = page.locator('[href="https://github.com/testuser/my-awesome-project"]').first();
    await expect(repoLink).toBeVisible();
    await expect(repoLink).toHaveAttribute('target', '_blank');
    await expect(repoLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
