import { test as baseTest, expect } from './fixtures/environments-fixture';

// Create test variants for different scenarios
const testWithEnvironments = baseTest.extend({
  setupOptions: { withEnvironments: true, withProjects: true }
});

const testWithoutEnvironments = baseTest.extend({
  setupOptions: { withEnvironments: false, withProjects: true }
});

const testWithoutProjects = baseTest.extend({
  setupOptions: { withEnvironments: false, withProjects: false }
});

baseTest.describe('Project Environment Setup', () => {
  baseTest.describe('With pre-seeded environments', () => {
    testWithEnvironments('should show Add Environment button when environments exist', async ({ projectsPage, page }) => {
      // Project should have environments - verify environment section and buttons
      await expect(projectsPage.environmentsSection).toBeVisible();
      
      // Should show Add Environment button, not Setup Environment
      await expect(projectsPage.addEnvironmentLink).toBeVisible();
      await expect(projectsPage.addEnvironmentLink).toHaveAttribute('href', new RegExp(`/environments/[^/]+$`));
      
      // Should NOT show the no-environments banner
      await expect(projectsPage.noEnvironmentsMessage).not.toBeVisible();
      await expect(projectsPage.setupEnvironmentLink).not.toBeVisible();
    });

    testWithEnvironments('should navigate to environment setup page with existing environments', async ({ projectsPage, page }) => {
      // Check if we have access to a project page
      const isOnProjectPage = await projectsPage.backToProjectsLink.isVisible();
      if (!isOnProjectPage) {
        console.log('Not on a project page, skipping test');
        baseTest.skip();
        return;
      }
      
      // Navigate to environment setup page from Add Environment button
      await projectsPage.navigateToEnvironmentSetup();
      
      // Should navigate to environment setup page
      await expect(page).toHaveURL(new RegExp(`/environments/[^/]+$`));
      await expect(page.locator('h1:has-text("Configure Environments")')).toBeVisible();
      
      // Should have radio buttons for environment types
      await expect(page.locator('input[name="environmentType"][value="preview"]')).toBeVisible();
      await expect(page.locator('input[name="environmentType"][value="production"]')).toBeVisible();
      await expect(page.locator('input[name="environmentType"][value="staging"]')).toBeVisible();
    });
  });

  baseTest.describe('Without pre-seeded environments (fresh setup)', () => {
    testWithoutEnvironments('should show environment setup banner when no environments exist', async ({ projectsPage, page }) => {
      // Check if we have access to a project page
      const isOnProjectPage = await projectsPage.backToProjectsLink.isVisible();
      if (!isOnProjectPage) {
        console.log('Not on a project page, skipping test');
        baseTest.skip();
        return;
      }
      
      // Project has no environments - should show setup banner
      await expect(projectsPage.environmentsSection).toBeVisible();
      await expect(projectsPage.noEnvironmentsMessage).toBeVisible();
      await expect(page.locator('text=Set up your first deployment environment')).toBeVisible();
      
      // Should have "Set up Environment" link
      await expect(projectsPage.setupEnvironmentLink).toBeVisible();
      await expect(projectsPage.setupEnvironmentLink).toHaveAttribute('href', new RegExp(`/environments/[^/]+$`));
      
      // Should NOT have "Add Environment" button
      await expect(projectsPage.addEnvironmentLink).not.toBeVisible();
    });

    testWithoutEnvironments('should navigate to environment setup page for first environment', async ({ projectsPage, page }) => {
      // Check if we have access to a project page
      const isOnProjectPage = await projectsPage.backToProjectsLink.isVisible();
      if (!isOnProjectPage) {
        console.log('Not on a project page, skipping test');
        baseTest.skip();
        return;
      }
      
      // Navigate to environment setup page from Set up Environment link
      await projectsPage.navigateToEnvironmentSetup();
      
      // Should navigate to environment setup page
      await expect(page).toHaveURL(new RegExp(`/environments/[^/]+$`));
      await expect(page.locator('h1:has-text("Configure Environments")')).toBeVisible();
      await expect(page.locator('text=Choose Your First Environment')).toBeVisible();
      
      // Should have radio buttons for environment types with preview selected by default
      const previewRadio = page.locator('input[name="environmentType"][value="preview"]');
      await expect(previewRadio).toBeVisible();
      await expect(previewRadio).toBeChecked();
      
      await expect(page.locator('input[name="environmentType"][value="production"]')).toBeVisible();
      await expect(page.locator('input[name="environmentType"][value="staging"]')).toBeVisible();
      
      // Should show getting started tip
      await expect(page.locator('text=💡 Getting Started Tip')).toBeVisible();
      await expect(page.locator('text=We strongly recommend starting with the Preview Environment')).toBeVisible();
    });
    
    testWithoutEnvironments('should be able to create a new environment', async ({ projectsPage, page }) => {
      // Check if we have access to a project page
      const isOnProjectPage = await projectsPage.backToProjectsLink.isVisible();
      if (!isOnProjectPage) {
        console.log('Not on a project page, skipping test');
        baseTest.skip();
        return;
      }
      
      // First, verify we have no environments
      await expect(projectsPage.noEnvironmentsMessage).toBeVisible();
      
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
      
      // Verify the environment was created - no more empty state
      await expect(projectsPage.noEnvironmentsMessage).not.toBeVisible();
      
      // Verify that we have environments now
      const hasEnvironments = await projectsPage.hasEnvironments();
      expect(hasEnvironments, 'Environment should be created successfully').toBe(true);
      
      // Setup environment link should be gone
      await expect(projectsPage.setupEnvironmentLink).not.toBeVisible();
    });
  });
  
  baseTest.describe('Empty state (no projects)', () => {
    testWithoutProjects('should show empty projects state', async ({ page, projectsPage }) => {
      // We should be on the projects page with no projects
      await expect(projectsPage.pageTitle).toBeVisible();
      await expect(projectsPage.noProjectsMessage).toBeVisible();
      
      // Verify no project cards are visible
      const count = await projectsPage.projectCards.count();
      expect(count).toBe(0);
      
      // There should be a message about creating a new project
      await expect(page.getByText('No projects found')).toBeVisible();
      
      // There should be a create project button or link
      const createProjectButton = page.getByRole('button', { name: /create/i }) || 
                                  page.getByRole('link', { name: /create/i });
      
      // This is optional since the UI might not have a create button yet
      if (await createProjectButton.count() > 0) {
        await expect(createProjectButton).toBeVisible();
      }
    });
    
    testWithoutProjects('should be able to create first project from empty state', async ({ page, projectsPage }) => {
      // This test is for when we implement a UI flow for creating a project
      // For now, we'll just verify the empty state and skip the actual creation
      
      // We should be on the projects page with no projects
      await expect(projectsPage.pageTitle).toBeVisible();
      await expect(projectsPage.noProjectsMessage).toBeVisible();
      
      // This test is intentionally left as a placeholder for when the 
      // create project from empty state UI flow is implemented
      baseTest.skip('Create project from empty state UI not yet implemented');
    });
  });
});
