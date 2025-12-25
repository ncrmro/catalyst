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
    
    // Navigate to environment setup page
    await expect(projectsPage.addEnvironmentLink).toBeVisible();
    await projectsPage.addEnvironmentLink.click();
    
    // Verify we're on the environment setup page
    await expect(page.locator('h1:has-text("Configure Environments")')).toBeVisible();
    
    // Check that development environment is selected by default
    const devRadio = page.locator('input[name="environmentType"][value="development"]');
    await expect(devRadio).toBeChecked();
    
    // Submit the form to create a development environment
    await page.locator('button:has-text("Configure Environment")').click();
    
    // Should be redirected back to the project page
    await expect(page).toHaveURL(/\/projects\/[^/]+$/);
    
    // Verify the environment exists in the UI
    await expect(projectsPage.environmentsSection).toBeVisible();
    
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
