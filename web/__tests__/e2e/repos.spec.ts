import { test, expect } from '@playwright/test';
import { loginWithDevPassword } from './helpers';

test.describe('GitHub Repositories Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await loginWithDevPassword(page, testInfo);
  });

  // NOTE: These are mocked repositires since we don't have a GitHub account for testing
  test('should display repositories', async ({ page }) => {
    // Go to the repos page
    await page.goto('/repos');

    // Check that the page title is correct
    await expect(page.getByRole('heading', { name: 'Git Repositories' })).toBeVisible();

    // Check that user repositories section is shown
    await expect(page.locator('h3').filter({ hasText: 'Your Repositories' })).toBeVisible();

    // Check that specific mocked repositories are displayed
    await expect(page.locator('text=testuser/my-awesome-project')).toBeVisible();
    await expect(page.locator('text=testuser/personal-website')).toBeVisible();

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

    // Check that Connect buttons are present
    const connectButtons = page.getByRole('link', { name: 'Connect' });
    await expect(connectButtons.first()).toBeVisible();
    
    // Verify multiple Connect buttons exist (for multiple repos)
    const connectButtonsCount = await connectButtons.count();
    expect(connectButtonsCount).toBeGreaterThan(0);
    
  });

});
