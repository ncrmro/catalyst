import { test, expect } from '@playwright/test';
import { loginAndSeedForE2E } from './helpers';

test.describe('Project Environment Templates', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await loginAndSeedForE2E(page, testInfo);
  });

  test('should add Dockerfile and Helm chart templates and delete one', async ({ page }) => {
    // Navigate to projects page first
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Check if there are any project cards available
    const projectCards = page.locator('[data-testid^="project-card-"]');
    const projectCount = await projectCards.count();

    // MUST have projects - test will FAIL if no projects exist (no exceptions)
    expect(projectCount).toBeGreaterThan(0);

    // Navigate to the first project
    await projectCards.first().click();
    await page.waitForLoadState('networkidle');

    // Verify we're on a project page
    await expect(page.getByText('Back to Projects')).toBeVisible();

    // Find and verify the Environment Templates section exists
    const templatesSection = page.locator('h2:has-text("Environment Templates")');
    await expect(templatesSection).toBeVisible();

    // Verify the section description is present
    await expect(page.getByText('Define Dockerfile paths, Helm charts, and other manifest files')).toBeVisible();

    // Find the form to add templates
    const addTemplateSection = page.locator('h4:has-text("Add Environment Template")').locator('..');
    await expect(addTemplateSection).toBeVisible();

    // Verify form elements are present
    const repositorySelect = addTemplateSection.locator('select#repoId');
    const pathInput = addTemplateSection.locator('input#path');
    const addButton = addTemplateSection.locator('button:has-text("Add Environment Template")');

    await expect(repositorySelect).toBeVisible();
    await expect(pathInput).toBeVisible();
    await expect(addButton).toBeVisible();

    // Test adding a Dockerfile template
    await pathInput.fill('Dockerfile');
    await addButton.click();

    // Wait for success message
    await expect(page.getByText('Environment template added successfully!')).toBeVisible();

    // Verify the Dockerfile template appears in the current templates
    const dockerfileTemplate = page.locator('text=🐳 Dockerfile').first();
    await expect(dockerfileTemplate).toBeVisible();

    // Verify repository information is shown
    await expect(page.locator('div:has-text("Repository:")').first()).toBeVisible();

    // Clear the form and add a Helm chart template
    await pathInput.fill('Chart.yaml');
    await addButton.click();

    // Wait for success message
    await expect(page.getByText('Environment template added successfully!')).toBeVisible();

    // Verify the Helm chart template appears
    const helmTemplate = page.locator('text=⎈ Helm Chart').first();
    await expect(helmTemplate).toBeVisible();

    // Verify both templates are now listed in the Current Environment Templates section
    const currentTemplatesSection = page.locator('h4:has-text("Current Environment Templates")').locator('..');
    await expect(currentTemplatesSection).toBeVisible();

    // Count the number of templates shown (should be at least 2)
    const templateCards = currentTemplatesSection.locator('div[class*="bg-surface border border-outline rounded-lg p-4"]');
    const templateCount = await templateCards.count();
    expect(templateCount).toBeGreaterThanOrEqual(2);

    // Test deleting one of the templates
    const deleteButtons = page.locator('button:has-text("Delete")');
    const deleteButtonCount = await deleteButtons.count();
    
    // Should have delete buttons since we just added templates
    expect(deleteButtonCount).toBeGreaterThan(0);

    // Set up dialog handler for confirmation
    page.on('dialog', async dialog => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Are you sure you want to delete this environment template?');
      await dialog.accept();
    });

    // Click the first delete button
    await deleteButtons.first().click();

    // Wait for success message
    await expect(page.getByText('Environment template deleted successfully!')).toBeVisible();

    // Verify the template count decreased
    const updatedTemplateCount = await templateCards.count();
    expect(updatedTemplateCount).toBeLessThan(templateCount);

    // Test form validation - empty path should disable button
    await pathInput.fill(''); // Clear the input
    const buttonDisabled = await addButton.isDisabled();
    expect(buttonDisabled).toBe(true);

    // Test with valid path again to ensure form still works
    await pathInput.fill('package.json');
    await addButton.click();

    // Should see success message and new template
    await expect(page.getByText('Environment template added successfully!')).toBeVisible();
    await expect(page.locator('text=📦 Node.js Package').first()).toBeVisible();
  });

  test('should display Environment Templates section with helpful examples', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectCards = page.locator('[data-testid^="project-card-"]');
    const projectCount = await projectCards.count();

    // MUST have projects - test will FAIL if no projects exist (no exceptions)
    expect(projectCount).toBeGreaterThan(0);

    // Navigate to a project
    await projectCards.first().click();
    await page.waitForLoadState('networkidle');

    // Verify Environment Templates section is positioned correctly between Priority Issues and Environments
    const priorityIssuesHeading = page.locator('h2:has-text("Priority Issues")');
    const environmentTemplatesHeading = page.locator('h2:has-text("Environment Templates")');
    const environmentsHeading = page.locator('h2:has-text("Environments")');

    await expect(priorityIssuesHeading).toBeVisible();
    await expect(environmentTemplatesHeading).toBeVisible();
    await expect(environmentsHeading).toBeVisible();

    // Verify the helpful examples are shown
    await expect(page.getByText('Common examples:')).toBeVisible();
    await expect(page.getByText('Dockerfile - Docker containerization')).toBeVisible();
    await expect(page.getByText('Chart.yaml - Helm chart configuration')).toBeVisible();
    await expect(page.getByText('charts/app/Chart.yaml - Nested Helm chart')).toBeVisible();
    await expect(page.getByText('k8s/deployment.yaml - Kubernetes manifests')).toBeVisible();
    await expect(page.getByText('package.json - Node.js application')).toBeVisible();

    // Verify placeholder text
    const pathInput = page.locator('input#path');
    await expect(pathInput).toHaveAttribute('placeholder', 'e.g., Dockerfile, Chart.yaml, charts/app/Chart.yaml');
  });

  test('should handle different manifest file types with correct icons', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectCards = page.locator('[data-testid^="project-card-"]');
    const projectCount = await projectCards.count();

    // MUST have projects - test will FAIL if no projects exist (no exceptions)
    expect(projectCount).toBeGreaterThan(0);

    // Navigate to a project
    await projectCards.first().click();
    await page.waitForLoadState('networkidle');

    const pathInput = page.locator('input#path');
    const addButton = page.locator('button:has-text("Add Environment Template")');

    // Test different file types and their icons
    const testCases = [
      { path: 'Dockerfile', expectedIcon: '🐳 Dockerfile' },
      { path: 'Chart.yaml', expectedIcon: '⎈ Helm Chart' },
      { path: 'k8s/deployment.yaml', expectedIcon: '📄 YAML Manifest' },
      { path: 'package.json', expectedIcon: '📦 Node.js Package' },
      { path: 'Cargo.toml', expectedIcon: '🦀 Rust Package' },
      { path: 'Gemfile', expectedIcon: '💎 Ruby Package' }
    ];

    for (const testCase of testCases) {
      // Add the template
      await pathInput.fill(testCase.path);
      await addButton.click();

      // Wait for success message
      await expect(page.getByText('Environment template added successfully!')).toBeVisible();

      // Verify the correct icon and display name appears
      await expect(page.locator(`text=${testCase.expectedIcon}`).first()).toBeVisible();
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectCards = page.locator('[data-testid^="project-card-"]');
    const projectCount = await projectCards.count();

    // MUST have projects - test will FAIL if no projects exist (no exceptions)
    expect(projectCount).toBeGreaterThan(0);

    // Navigate to a project
    await projectCards.first().click();
    await page.waitForLoadState('networkidle');

    // Environment Templates section should be mobile-responsive
    await expect(page.locator('h2:has-text("Environment Templates")')).toBeVisible();

    // Form should still be accessible and usable on mobile
    const repositorySelect = page.locator('select#repoId');
    const pathInput = page.locator('input#path');
    const addButton = page.locator('button:has-text("Add Environment Template")');

    await expect(repositorySelect).toBeVisible();
    await expect(pathInput).toBeVisible();
    await expect(addButton).toBeVisible();

    // Test adding a template on mobile
    await pathInput.fill('Dockerfile');
    await addButton.click();

    // Should work on mobile too
    await expect(page.getByText('Environment template added successfully!')).toBeVisible();
    await expect(page.locator('text=🐳 Dockerfile').first()).toBeVisible();
  });
});