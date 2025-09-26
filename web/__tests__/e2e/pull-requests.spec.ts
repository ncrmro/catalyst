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

    // Check that pull requests section is shown with count (based on YAML data - 5 PRs)
    await expect(page.getByRole('heading', { name: 'Your Pull Requests (5)' })).toBeVisible();

    // Check that specific mocked pull requests are displayed by their titles (as links) - from YAML
    await expect(page.getByRole('link', { name: 'feat: implement Docker buildx support for PR pods' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'fix: correct build context for Docker images in PR pods' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'docs: update integration test documentation' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'feat: add restaurant menu management interface' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'chore: update Helm chart values for new features' })).toBeVisible();

    // Check that pull request numbers and metadata are visible - from YAML
    await expect(page.locator('text=#254')).toBeVisible();
    await expect(page.locator('text=#255')).toBeVisible();
    await expect(page.locator('text=#256')).toBeVisible();
    await expect(page.locator('text=#78')).toBeVisible();
    await expect(page.locator('text=#23')).toBeVisible();

    // Check that repository names are shown - from YAML
    await expect(page.locator('text=catalyst').first()).toBeVisible();
    await expect(page.locator('text=meze').first()).toBeVisible();
    await expect(page.locator('text=catalyst-helm-charts').first()).toBeVisible();

    // Check that author information is shown - from YAML
    await expect(page.locator('text=by ncrmro').first()).toBeVisible();

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
    expect(linkCount).toBeGreaterThanOrEqual(5);

    // Check that pull request cards are in a grid layout
    const prGrid = page.locator('.grid');
    await expect(prGrid).toBeVisible();
    
    // Verify we have 5 pull request link titles
    const prTitleLinks = page.locator('a').filter({ hasText: /^(feat:|fix:|docs:|chore:)/ });
    const titleLinkCount = await prTitleLinks.count();
    expect(titleLinkCount).toBe(5);
  });

  test.skip('should show no pull requests message when none exist', async ({ page }) => {
    // Skipped: No way to return no PRs because of the mocked data
    // The GITHUB_REPOS_MODE=mocked always returns the same mock data
  });
});