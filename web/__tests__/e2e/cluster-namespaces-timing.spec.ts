import { test, expect } from '@playwright/test';

test.describe('Cluster Namespaces Timing Robustness', () => {
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

  test('should handle non-existent cluster with short timeout gracefully', async ({ page }) => {
    // Test with a more aggressive timeout to verify robustness
    test.setTimeout(30_000);
    
    // Try to navigate to namespaces for non-existent cluster
    await page.goto('/clusters/non-existent-cluster/namespaces', { 
      waitUntil: 'domcontentloaded', 
      timeout: 20_000 
    });
    
    // Verify 404 handling with shorter timeout
    await expect(async () => {
      // Check for common 404 indicators
      const is404Page = await page.locator('text=404').isVisible() ||
                       await page.locator('text=Not Found').isVisible() ||
                       await page.locator('text=Page not found').isVisible() ||
                       await page.getByRole('heading', { name: /404|not found/i }).isVisible();
      
      if (!is404Page) {
        throw new Error('404 page not found');
      }
    }).toPass({ timeout: 10_000 });
  });

  test('should handle multiple rapid navigation attempts', async ({ page }) => {
    test.setTimeout(45_000);
    
    // Navigate to clusters page
    await page.goto('/clusters');
    await expect(page.getByRole('heading', { name: 'Clusters' })).toBeVisible();
    
    // Rapidly navigate to different non-existent clusters to test robustness
    const nonExistentClusters = [
      'fake-cluster-1',
      'fake-cluster-2', 
      'fake-cluster-3'
    ];
    
    for (const clusterName of nonExistentClusters) {
      await page.goto(`/clusters/${clusterName}/namespaces`, { 
        waitUntil: 'domcontentloaded', 
        timeout: 15_000 
      });
      
      // Verify we get some kind of error response (404 or error page)
      await expect(async () => {
        const hasErrorIndicator = await page.locator('text=404').isVisible() ||
                                 await page.locator('text=Not Found').isVisible() ||
                                 await page.locator('text=Error').isVisible() ||
                                 await page.locator('text=Failed').isVisible();
        
        if (!hasErrorIndicator) {
          throw new Error('No error indicator found');
        }
      }).toPass({ timeout: 8_000 });
    }
  });

  test('should handle existing cluster navigation consistently', async ({ page }) => {
    test.setTimeout(45_000);
    
    // Navigate multiple times to the same valid endpoint to test caching
    for (let i = 0; i < 3; i++) {
      await page.goto('/clusters');
      await expect(page.getByRole('heading', { name: 'Clusters' })).toBeVisible();
      
      // Navigate to namespaces
      const viewNamespacesLink = page.getByRole('link', { name: 'View Namespaces' }).first();
      await expect(viewNamespacesLink).toBeVisible();
      await viewNamespacesLink.click();

      // Verify we reach the namespaces page
      await expect(page.getByRole('heading', { name: /Namespaces - /, level: 1 })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/Found \d+ namespace/)).toBeVisible({ timeout: 10_000 });
    }
  });
});