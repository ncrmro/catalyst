import { test, expect } from '@playwright/test';
import { loginWithDevPassword } from './helpers';

test.describe('Pull Requests Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await loginWithDevPassword(page, testInfo);
  });

  test('should display mocked pull requests', async ({ page }) => {
    // Go to the pull requests page
    await page.goto('/pull-requests');

    // Check that the main page title is correct (use more specific selector)
    await expect(page.locator('h1').filter({ hasText: 'Pull Requests' })).toBeVisible();

    // Check that the page description is shown
    await expect(page.locator('text=View and manage your pull requests across all connected repositories.')).toBeVisible();

    // Check that pull requests section is shown with count
    await expect(page.getByRole('heading', { name: 'Your Pull Requests (4)' })).toBeVisible();

    // Check that specific mocked pull requests are displayed by their titles (as links)
    await expect(page.getByRole('link', { name: 'Add authentication middleware for API endpoints' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Implement caching layer for database queries' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Update documentation for new features' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Fix responsive design issues on mobile' })).toBeVisible();

    // Check that pull request numbers and metadata are visible
    await expect(page.locator('text=#247')).toBeVisible();
    await expect(page.locator('text=#156')).toBeVisible();
    await expect(page.locator('text=#89')).toBeVisible();
    await expect(page.locator('text=#112')).toBeVisible();

    // Check that repository names are shown
    await expect(page.locator('text=my-awesome-project').first()).toBeVisible();
    await expect(page.locator('text=personal-website').first()).toBeVisible();

    // Check that author information is shown
    await expect(page.locator('text=by testuser').first()).toBeVisible();

    // Check that priority and status information is shown
    await expect(page.locator('text=high priority').first()).toBeVisible();
    await expect(page.locator('text=medium priority')).toBeVisible();
    await expect(page.locator('text=low priority')).toBeVisible();
    await expect(page.locator('text=ready').first()).toBeVisible();
    await expect(page.locator('text=draft')).toBeVisible();
    await expect(page.locator('text=changes requested')).toBeVisible();

    // Verify that all PRs have GitHub links
    const githubLinks = page.locator('a[href*="github.com"]');
    const linkCount = await githubLinks.count();
    expect(linkCount).toBeGreaterThanOrEqual(4);

    // Check that pull request cards are in a grid layout
    const prGrid = page.locator('.grid');
    await expect(prGrid).toBeVisible();
    
    // Verify we have 4 pull request link titles
    const prTitleLinks = page.locator('a').filter({ hasText: /^(Add authentication|Implement caching|Update documentation|Fix responsive)/ });
    const titleLinkCount = await prTitleLinks.count();
    expect(titleLinkCount).toBe(4);
  });

  test.skip('should show no pull requests message when none exist', async ({ page }) => {
    // Skipped: No way to return no PRs because of the mocked data
    // The GITHUB_REPOS_MODE=mocked always returns the same mock data
  });
});