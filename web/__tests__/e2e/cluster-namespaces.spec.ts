import { test, expect } from '@playwright/test';

test.describe('Cluster Namespaces Browsing', () => {
  // Admin login before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');
    
    // Wait for login page to load and click sign in button
    await expect(page.getByRole('button', { name: 'Sign in (dev password)' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign in (dev password)' }).click();
    
    // Fill password and submit
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: 'Sign in with Password' }).click();
    
    // Wait for redirect to home page with increased timeout
    await page.waitForURL('/', { timeout: 15_000 });
    
    // Verify we're actually logged in by checking for the sign out button specifically
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible({ timeout: 5_000 });
  });

  test('should navigate to cluster and namespace pages which display correct info', async ({ page }) => {
    // TODO unset this once we split this test
    test.setTimeout(60_000);

    // Navigate to clusters page and wait for it to load
    await page.goto('/clusters');
    await expect(page.getByRole('heading', { name: 'Clusters' })).toBeVisible();
    
    // Wait for and click View Namespaces button
    const viewNamespacesLink = page.getByRole('link', { name: 'View Namespaces' }).first();
    await expect(viewNamespacesLink).toBeVisible();
    await viewNamespacesLink.click();

    await test.step('Verify namespace page displays correctly', async () => {
      // Wait for navigation to complete and page to load
      await expect(page.getByRole('heading', { name: /Namespaces - /, level: 1 })).toBeVisible();
      await expect(page.getByText('Browse and manage namespaces in this Kubernetes cluster')).toBeVisible();
      
      // Wait for namespace data to load - use a retry approach
      await expect(page.getByText(/Found \d+ namespace/)).toBeVisible({ timeout: 15_000 });
      
      // Wait for default namespaces to be visible with retries
      await expect(page.getByRole('heading', { name: 'default', level: 3 })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('heading', { name: 'kube-system', level: 3 })).toBeVisible({ timeout: 10_000 });

      // Verify namespace card structure
      const kubeSystemCard = page.locator('.border.border-outline').filter({ has: page.getByRole('heading', { name: 'kube-system', level: 3 }) });
      await expect(kubeSystemCard).toBeVisible();
      await expect(kubeSystemCard.getByText('Age')).toBeVisible();
      await expect(kubeSystemCard.getByText('Labels')).toBeVisible();
    });
    
    // Click on the kube-system namespace card
    await page.getByRole('heading', { name: 'kube-system' }).click();
    
    await test.step('Verify namespace detail page', async () => {
      await expect(page.getByRole('heading', { name: 'Namespace: kube-system' })).toBeVisible();
      await expect(page.getByText('Resources in the kube-system namespace')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Pods' })).toBeVisible();
    });

    // Click back to namespaces
    await page.getByRole('link', { name: '← Back to Namespaces' }).click();

    // Verify we're back on namespaces page
    await expect(page.getByRole('heading', { name: /Namespaces - / })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'kube-system' })).toBeVisible();

    // Click back to clusters
    await page.getByRole('link', { name: '← Back to Clusters' }).click();
    
    // Verify we're back on clusters page
    await expect(page.getByRole('heading', { name: 'Clusters' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View Namespaces' })).toBeVisible();
  });

  test('should handle non-existent cluster gracefully', async ({ page }) => {
    // Increase timeout for this specific test since it involves server-side cluster validation
    test.setTimeout(45_000);
    
    // Try to navigate to namespaces for non-existent cluster
    // Use domcontentloaded instead of load to avoid waiting for all resources
    await page.goto('/clusters/non-existent-cluster/namespaces', { 
      waitUntil: 'domcontentloaded', 
      timeout: 30_000 
    });
    
    // Wait for the page to render and check for 404 content with more flexible selectors
    await expect(async () => {
      // Check for common 404 indicators
      const is404Page = await page.locator('text=404').isVisible() ||
                       await page.locator('text=Not Found').isVisible() ||
                       await page.locator('text=Page not found').isVisible() ||
                       await page.getByRole('heading', { name: /404|not found/i }).isVisible();
      
      if (!is404Page) {
        throw new Error('404 page not found');
      }
    }).toPass({ timeout: 15_000 });
  });

  test('should handle non-existent namespace gracefully', async ({ page }) => {
    // Increase timeout for this test as it involves multiple navigation steps
    test.setTimeout(45_000);
    
    // TODO: In the future, implement direct navigation when we have a reliable way to handle 
    // different cluster names across environments
    
    await test.step('Navigate to namespaces of first cluster', async () => {
      // Start from clusters page and wait for it to load
      await page.goto('/clusters');
      await expect(page.getByRole('heading', { name: 'Clusters' })).toBeVisible();
      
      // Wait for and click View Namespaces button on the first cluster
      const viewNamespacesLink = page.getByRole('link', { name: 'View Namespaces' }).first();
      await expect(viewNamespacesLink).toBeVisible();
      await viewNamespacesLink.click();
      
      // Wait for namespaces page to load
      await expect(page.getByRole('heading', { name: /Namespaces - /, level: 1 })).toBeVisible();
      
      // Navigate to a non-existent namespace by appending to the current URL
      const currentUrl = page.url();
      await page.goto(`${currentUrl}/non-existent-namespace`, { 
        waitUntil: 'domcontentloaded', 
        timeout: 30_000 
      });
    });
    
    // Wait for the page to render and check for 404 content with more flexible approach
    await expect(async () => {
      // Check for common 404 indicators
      const is404Page = await page.locator('text=404').isVisible() ||
                       await page.locator('text=Not Found').isVisible() ||
                       await page.locator('text=Page not found').isVisible() ||
                       await page.getByRole('heading', { name: /404|not found/i }).isVisible();
      
      if (!is404Page) {
        throw new Error('404 page not found');
      }
    }).toPass({ timeout: 15_000 });
  });
});
