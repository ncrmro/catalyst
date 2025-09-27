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

    // Check that specific mocked repositories are displayed (from YAML data)
    await expect(page.locator('text=ncrmro/catalyst')).toBeVisible();
    await expect(page.locator('text=ncrmro/meze')).toBeVisible();
    await expect(page.locator('text=ncrmro/dotfiles')).toBeVisible();

    // Check organization names are displayed (from YAML data)
    await expect(page.getByRole('heading', { name: 'catalyst-dev' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'open-source-lab' })).toBeVisible();

    // Check specific organization repositories (from YAML data)
    await expect(page.locator('text=catalyst-dev/catalyst-infra')).toBeVisible();
    await expect(page.locator('text=catalyst-dev/catalyst-helm-charts')).toBeVisible();
    await expect(page.locator('text=open-source-lab/k8s-operator-examples')).toBeVisible();

    // Check that repository cards contain expected information (from YAML data)
    const firstRepo = page.locator('[href="https://github.com/ncrmro/catalyst"]').first();
    await expect(firstRepo).toBeVisible();

    // Check that Connect buttons are present
    const connectButtons = page.getByRole('link', { name: 'Connect' });
    await expect(connectButtons.first()).toBeVisible();
    
    // Verify multiple Connect buttons exist (for multiple repos)
    const connectButtonsCount = await connectButtons.count();
    expect(connectButtonsCount).toBeGreaterThan(0);
    
  });

});
