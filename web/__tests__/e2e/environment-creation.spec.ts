import { test, expect } from './fixtures/k8s-fixture';
import { ProjectsPage } from './page-objects/projects-page';

test.describe('Environment Creation and Kubernetes Verification', () => {
  test('should create environment and verify kubernetes service', async ({ page, k8s }) => {
    // Create projects page instance
    const projectsPage = new ProjectsPage(page);
    
    // Navigate to projects page
    await projectsPage.goto();
    
    // Verify projects exist
    await projectsPage.expectProjectsToExist();
    
    // Click on the first project card
    await projectsPage.clickProjectCard();
    
    // Verify project details page has loaded
    await projectsPage.verifyProjectDetailsPageLoaded();
    
    // Check if the project needs environment setup
    const needsSetup = await projectsPage.needsEnvironmentSetup();
    
    if (needsSetup) {
      // Navigate to environment setup page
      await projectsPage.navigateToEnvironmentSetup();
      
      // Verify we're on the environment setup page
      await expect(page.locator('h1:has-text("Configure Environments")')).toBeVisible();
      
      // Check that preview environment is selected by default
      const previewRadio = page.locator('input[name="environmentType"][value="preview"]');
      await expect(previewRadio).toBeChecked();
      
      // Submit the form to create a preview environment
      await page.locator('button:has-text("Configure Environment")').click();
      
      // Should be redirected back to the project page
      await expect(page).toHaveURL(/\/projects\/[^/]+$/);
      await expect(projectsPage.backToProjectsLink).toBeVisible();
    }
    
    // Verify the environment exists in the UI
    await expect(projectsPage.environmentsSection).toBeVisible();
    const hasEnvironments = await projectsPage.hasEnvironments();
    expect(hasEnvironments, 'Environment should exist in the UI').toBe(true);
    
    // Verify kubernetes cluster is accessible and can list namespaces
    const response = await k8s.coreApi.listNamespace();
    const namespaces = response.items;
    
    expect(namespaces).toBeDefined();
    expect(namespaces.length).toBeGreaterThan(0);
    
    // Verify that common namespaces exist
    const namespaceNames = namespaces.map((ns) => ns.metadata?.name);
    expect(namespaceNames).toContain('default');
    expect(namespaceNames).toContain('kube-system');
    
    console.log(`✓ Kubernetes cluster is accessible with ${namespaces.length} namespaces`);
  });
});
