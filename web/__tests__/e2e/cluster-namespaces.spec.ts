import { test, expect } from '@playwright/test';

test.describe('Cluster Namespaces Browsing', () => {
  // Admin login before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Sign in (dev password)' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('admin');
    await page.getByRole('button', { name: 'Sign in with Password' }).click();
    await page.waitForURL('/');
  });

  test('should navigate to cluster and namespace pages which display correct info', async ({ page }) => {
    // Navigate to clusters page
    await page.goto('/clusters');
    
    // Click View Namespaces button
    await page.getByRole('link', { name: 'View Namespaces' }).click();

    await test.step('Verify namespace page displays correctly', async () => {
      await expect(page.getByRole('heading', { name: /Namespaces - /, levle: 1 })).toBeVisible();
      await expect(page.getByText('Browse and manage namespaces in this Kubernetes cluster')).toBeVisible();
      await expect(page.getByText(/Found \d+ namespace/)).toBeVisible();
      
      await expect(page.getByRole('heading', { name: 'default', level: 3 })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'kube-system', level: 3 })).toBeVisible();

      const kubeSystemCard = page.locator('.border.border-outline').filter({ has: page.getByRole('heading', { name: 'kube-system', level: 3 }) });
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
    // Try to navigate to namespaces for non-existent cluster
    await page.goto('/clusters/non-existent-cluster/namespaces');
    
    // Should get 404 page
    await expect(page.getByText('404')).toBeVisible();
  });

  test('should handle non-existent namespace gracefully', async ({ page }) => {
    // TODO: In the future, implement direct navigation when we have a reliable way to handle 
    // different cluster names across environments
    
    await test.step('Navigate to namespaces of first cluster', async () => {
      // Start from clusters page and navigate to the first cluster
      await page.goto('/clusters');
      
      // Click View Namespaces button on the first cluster
      await page.getByRole('link', { name: 'View Namespaces' }).first().click();
      
      // Navigate to a non-existent namespace by appending to the current URL
      const currentUrl = page.url();
      await page.goto(`${currentUrl}/non-existent-namespace`);
    });
    
    // Should get 404 page
    await expect(page.getByText('404')).toBeVisible();
  });
});
