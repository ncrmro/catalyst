import { test, expect } from '@playwright/test';

test.describe('Project Workloads', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login and authenticate as admin
    await page.goto('/login');
    await page.fill('input[name="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('should display workload management page', async ({ page }) => {
    // Navigate to projects page
    await page.goto('/projects');
    await expect(page.locator('h1')).toContainText('Projects');

    // Click on first project
    await page.click('.grid .bg-surface:first-child a');
    await page.waitForLoadState('networkidle');

    // Find and click on "Manage Workloads" link for the first repository
    const manageWorkloadsLink = page.locator('text=Manage Workloads').first();
    await expect(manageWorkloadsLink).toBeVisible();
    await manageWorkloadsLink.click();

    // Verify we're on the workloads page
    await expect(page.locator('h1')).toContainText('Workloads');
    await expect(page.locator('text=Define and manage deployable workloads')).toBeVisible();
  });

  test('should create a new Docker workload', async ({ page }) => {
    // Navigate to workloads page via direct URL (using mock data IDs)
    await page.goto('/projects/proj-1/workloads/repo-uuid-1001');
    await page.waitForLoadState('networkidle');

    // Verify empty state is shown
    await expect(page.locator('text=No workloads defined')).toBeVisible();

    // Click "Create First Workload" button
    await page.click('button:has-text("Create First Workload")');

    // Fill out the form
    await page.fill('input[id="name"]', 'frontend');
    await page.fill('textarea[id="description"]', 'Frontend React application');
    await page.fill('input[id="rootPath"]', 'apps/frontend');

    // Docker deployment type should be selected by default
    await expect(page.locator('input[value="dockerfile"]:checked')).toBeVisible();

    // Fill Docker-specific fields
    await page.fill('input[id="dockerfilePath"]', './docker/Dockerfile');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for form to disappear (indicates success)
    await expect(page.locator('form')).not.toBeVisible();

    // Verify the workload card is displayed
    await expect(page.locator('.bg-surface:has-text("frontend")')).toBeVisible();
    await expect(page.locator('text=Frontend React application')).toBeVisible();
    await expect(page.locator('code:has-text("apps/frontend")')).toBeVisible();
    await expect(page.locator('.bg-primary-container:has-text("Docker")')).toBeVisible();
  });

  test('should create a new Helm workload', async ({ page }) => {
    // Navigate to workloads page
    await page.goto('/projects/proj-1/workloads/repo-uuid-1001');
    await page.waitForLoadState('networkidle');

    // Click "Add Workload" if workloads exist, or "Create First Workload" if none
    const addButton = page.locator('button:has-text("Add Workload")');
    const createFirstButton = page.locator('button:has-text("Create First Workload")');
    
    if (await addButton.isVisible()) {
      await addButton.click();
    } else {
      await createFirstButton.click();
    }

    // Fill out the form
    await page.fill('input[id="name"]', 'api');
    await page.fill('textarea[id="description"]', 'Backend API service');
    await page.fill('input[id="rootPath"]', 'services/api');

    // Select Helm deployment type
    await page.click('input[value="helm"]');
    await expect(page.locator('input[value="helm"]:checked')).toBeVisible();

    // Fill Helm-specific fields
    await page.fill('input[id="helmChartPath"]', './helm-chart');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for form to disappear
    await expect(page.locator('form')).not.toBeVisible();

    // Verify the workload card is displayed
    await expect(page.locator('.bg-surface:has-text("api")')).toBeVisible();
    await expect(page.locator('text=Backend API service')).toBeVisible();
    await expect(page.locator('code:has-text("services/api")')).toBeVisible();
    await expect(page.locator('.bg-secondary-container:has-text("Helm Chart")')).toBeVisible();
  });

  test('should edit an existing workload', async ({ page }) => {
    // Navigate to workloads page and create a workload first
    await page.goto('/projects/proj-1/workloads/repo-uuid-1001');
    await page.waitForLoadState('networkidle');

    // Create a workload if none exists
    if (await page.locator('text=No workloads defined').isVisible()) {
      await page.click('button:has-text("Create First Workload")');
      await page.fill('input[id="name"]', 'test-workload');
      await page.fill('textarea[id="description"]', 'Test workload');
      await page.click('button[type="submit"]');
      await expect(page.locator('form')).not.toBeVisible();
    }

    // Click edit button on the first workload
    await page.click('button:has-text("Edit")');

    // Update the name and description
    await page.fill('input[id="name"]', 'updated-workload');
    await page.fill('textarea[id="description"]', 'Updated test workload');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for form to disappear
    await expect(page.locator('form')).not.toBeVisible();

    // Verify the updated workload is displayed
    await expect(page.locator('.bg-surface:has-text("updated-workload")')).toBeVisible();
    await expect(page.locator('text=Updated test workload')).toBeVisible();
  });

  test('should delete a workload', async ({ page }) => {
    // Navigate to workloads page and create a workload first
    await page.goto('/projects/proj-1/workloads/repo-uuid-1001');
    await page.waitForLoadState('networkidle');

    // Create a workload if none exists
    if (await page.locator('text=No workloads defined').isVisible()) {
      await page.click('button:has-text("Create First Workload")');
      await page.fill('input[id="name"]', 'delete-me');
      await page.fill('textarea[id="description"]', 'Workload to delete');
      await page.click('button[type="submit"]');
      await expect(page.locator('form')).not.toBeVisible();
    }

    // Set up dialog handler to confirm deletion
    page.on('dialog', dialog => dialog.accept());

    // Click delete button
    await page.click('button:has-text("Delete")');

    // Verify the workload is removed
    await expect(page.locator('.bg-surface:has-text("delete-me")')).not.toBeVisible();
  });

  test('should show validation errors for invalid input', async ({ page }) => {
    // Navigate to workloads page
    await page.goto('/projects/proj-1/workloads/repo-uuid-1001');
    await page.waitForLoadState('networkidle');

    // Click to create a workload
    const addButton = page.locator('button:has-text("Add Workload")');
    const createFirstButton = page.locator('button:has-text("Create First Workload")');
    
    if (await addButton.isVisible()) {
      await addButton.click();
    } else {
      await createFirstButton.click();
    }

    // Try to submit without filling required fields
    await page.click('button[type="submit"]');

    // The form should still be visible (validation should prevent submission)
    await expect(page.locator('form')).toBeVisible();

    // Check that required field validation is working
    await expect(page.locator('input[id="name"]:invalid')).toBeVisible();
    await expect(page.locator('input[id="rootPath"]:invalid')).toBeVisible();
  });

  test('should navigate back to project page', async ({ page }) => {
    // Navigate to workloads page
    await page.goto('/projects/proj-1/workloads/repo-uuid-1001');
    await page.waitForLoadState('networkidle');

    // Click back link
    await page.click('text=← Back to');

    // Should be back on project page
    await expect(page.url()).toContain('/projects/proj-1');
    await expect(page.locator('h1')).toContainText('jdoe/foo');
  });

  test('should display repository information correctly', async ({ page }) => {
    // Navigate to workloads page
    await page.goto('/projects/proj-1/workloads/repo-uuid-1001');
    await page.waitForLoadState('networkidle');

    // Verify page displays correct repository information
    await expect(page.locator('h1')).toContainText('Workloads');
    await expect(page.locator('text=Project: jdoe/foo')).toBeVisible();
    await expect(page.locator('text=Repository:')).toBeVisible();
    await expect(page.locator('a:has-text("View on GitHub")')).toBeVisible();
  });
});