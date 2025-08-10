import { test, expect } from '@playwright/test';

test.describe('GitHub Repositories Page', () => {
  test('should display mocked repositories when NODE_ENV=mocked', async ({ page }) => {
    // Go to the repos page
    await page.goto('/repos');

    // Check that the page title is correct
    await expect(page.locator('h1')).toContainText('GitHub Repositories');

    // Check that the description is shown
    await expect(page.locator('p')).toContainText('Connected repositories from your account and organizations');

    // Check that user repositories section is shown
    await expect(page.locator('h2').filter({ hasText: 'Your Repositories' })).toBeVisible();

    // Check that specific mocked repositories are displayed
    await expect(page.locator('text=testuser/my-awesome-project')).toBeVisible();
    await expect(page.locator('text=testuser/personal-website')).toBeVisible();

    // Check that organization repositories section is shown
    await expect(page.locator('h2').filter({ hasText: 'Organization Repositories' })).toBeVisible();

    // Check organization names are displayed
    await expect(page.locator('text=awesome-org')).toBeVisible();
    await expect(page.locator('text=open-source-collective')).toBeVisible();

    // Check specific organization repositories
    await expect(page.locator('text=awesome-org/main-product')).toBeVisible();
    await expect(page.locator('text=awesome-org/infrastructure')).toBeVisible();
    await expect(page.locator('text=open-source-collective/community-tools')).toBeVisible();

    // Check that repository cards contain expected information
    const firstRepo = page.locator('[href="https://github.com/testuser/my-awesome-project"]').first();
    await expect(firstRepo).toBeVisible();

    // Check for language indicators
    await expect(page.locator('text=TypeScript')).toBeVisible();
    await expect(page.locator('text=JavaScript')).toBeVisible();
    await expect(page.locator('text=Python')).toBeVisible();

    // Check for star counts (should show star emoji and count)
    await expect(page.locator('text=⭐ 42')).toBeVisible();
    await expect(page.locator('text=⭐ 156')).toBeVisible();

    // Check for private repository indicator
    await expect(page.locator('text=Private')).toBeVisible();

    // Check repository count summary
    await expect(page.locator('text=5 repositories across 3 accounts')).toBeVisible();
  });

  test('should navigate to repositories page from home page', async ({ page }) => {
    // Start at the home page
    await page.goto('/');

    // Click the "View Repositories" link
    await page.click('text=View Repositories');

    // Should navigate to repos page
    await expect(page).toHaveURL('/repos');
    await expect(page.locator('h1')).toContainText('GitHub Repositories');
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
    const awesomeOrgSection = page.locator('text=awesome-org').locator('..').locator('..');
    await expect(awesomeOrgSection.locator('text=An awesome organization building great software')).toBeVisible();
    
    // Check that org repos are listed under the organization
    await expect(awesomeOrgSection.locator('text=awesome-org/main-product')).toBeVisible();
    await expect(awesomeOrgSection.locator('text=awesome-org/infrastructure')).toBeVisible();

    // Check open-source-collective section
    const oscSection = page.locator('text=open-source-collective').locator('..').locator('..');
    await expect(oscSection.locator('text=Collective for open source projects')).toBeVisible();
    await expect(oscSection.locator('text=open-source-collective/community-tools')).toBeVisible();
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