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

  test('should display clusters page with View Namespaces button', async ({ page }) => {
    // Navigate to clusters page
    await page.goto('/clusters');
    
    // Verify page displays correctly
    await expect(page.getByRole('heading', { name: 'Clusters' })).toBeVisible();
    await expect(page.getByText('Monitor and manage your Kubernetes clusters')).toBeVisible();
    
    // Verify cluster card exists with namespace button
    await expect(page.getByRole('link', { name: 'View Namespaces' })).toBeVisible();
  });

  test('should navigate to cluster namespaces page and display namespaces', async ({ page }) => {
    // Navigate to clusters page
    await page.goto('/clusters');
    
    // Click View Namespaces button
    await page.getByRole('link', { name: 'View Namespaces' }).click();
    
    // Verify namespace page displays correctly
    await expect(page.getByRole('heading', { name: /Namespaces - / })).toBeVisible();
    await expect(page.getByText('Browse and manage namespaces in this Kubernetes cluster')).toBeVisible();
    
    // Verify back link exists
    await expect(page.getByRole('link', { name: '← Back to Clusters' })).toBeVisible();
    
    // Verify namespace count is displayed
    await expect(page.getByText(/Found \d+ namespace/)).toBeVisible();
    
    // Verify some default namespaces are displayed
    await expect(page.getByRole('heading', { name: 'default' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'kube-system' })).toBeVisible();
  });

  test('should navigate back from namespaces to clusters page', async ({ page }) => {
    // Navigate to clusters page
    await page.goto('/clusters');
    
    // Click View Namespaces button
    await page.getByRole('link', { name: 'View Namespaces' }).click();
    
    // Click back to clusters
    await page.getByRole('link', { name: '← Back to Clusters' }).click();
    
    // Verify we're back on clusters page
    await expect(page.getByRole('heading', { name: 'Clusters' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View Namespaces' })).toBeVisible();
  });

  test('should display namespace cards with proper information', async ({ page }) => {
    // Navigate directly to namespaces page
    await page.goto('/clusters/kind-preview-cluster/namespaces');
    
    // Verify default namespace card shows correct information
    // Use a more specific locator that targets the card container
    const defaultNamespaceCard = page.locator('.border.border-outline').filter({ has: page.getByRole('heading', { name: 'default' }) });
    await expect(defaultNamespaceCard.getByText('Age')).toBeVisible();
    await expect(defaultNamespaceCard.getByText('Labels')).toBeVisible();
    await expect(defaultNamespaceCard.getByText('Less than 1 day')).toBeVisible();
  });

  test('should handle non-existent cluster gracefully', async ({ page }) => {
    // Try to navigate to namespaces for non-existent cluster
    await page.goto('/clusters/non-existent-cluster/namespaces');
    
    // Should get 404 page
    await expect(page.getByText('404')).toBeVisible();
  });

  test('should make namespace cards clickable and navigate to namespace detail page', async ({ page }) => {
    // Navigate to clusters page
    await page.goto('/clusters');
    
    // Click View Namespaces button
    await page.getByRole('link', { name: 'View Namespaces' }).click();
    
    // Wait for namespaces to load
    await expect(page.getByRole('heading', { name: 'default' })).toBeVisible();
    
    // Click on the default namespace card
    await page.getByRole('heading', { name: 'default' }).click();
    
    // Should navigate to the namespace detail page
    await expect(page.getByRole('heading', { name: 'Namespace: default' })).toBeVisible();
    await expect(page.getByText('Resources in the default namespace')).toBeVisible();
    
    // Should have a back link
    await expect(page.getByRole('link', { name: '← Back to Namespaces' })).toBeVisible();
    
    // Should show pods section
    await expect(page.getByRole('heading', { name: 'Pods' })).toBeVisible();
  });

  test('should navigate back from namespace detail to namespaces page', async ({ page }) => {
    // Navigate directly to namespace detail page
    await page.goto('/clusters/kind-preview-cluster/namespaces/default');
    
    // Verify we're on the namespace detail page
    await expect(page.getByRole('heading', { name: 'Namespace: default' })).toBeVisible();
    
    // Click back to namespaces
    await page.getByRole('link', { name: '← Back to Namespaces' }).click();
    
    // Should be back on namespaces page
    await expect(page.getByRole('heading', { name: /Namespaces - / })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'default' })).toBeVisible();
  });

  test('should handle non-existent namespace gracefully', async ({ page }) => {
    // Try to navigate to non-existent namespace
    await page.goto('/clusters/kind-preview-cluster/namespaces/non-existent-namespace');
    
    // Should get 404 page
    await expect(page.getByText('404')).toBeVisible();
  });
});