import { test, expect } from './fixtures/projects-fixture';

test.describe('Projects Pages', () => {
  test('should display projects list page and navigate to project details', async ({ projectsPage }) => {
    await test.step('Navigate to projects page', async () => {
      // Go to the projects page
      await projectsPage.goto();
      
      // Verify the page has loaded correctly
      await projectsPage.verifyProjectsListPageLoaded();
    });

    await test.step('Verify project cards display correctly', async () => {
      // Verify projects exist and check their structure
      await projectsPage.expectProjectsToExist();
      await projectsPage.verifyProjectCard();
    });

    await test.step('Navigate to individual project page', async () => {
      // Click on the first project card
      await projectsPage.clickProjectCard();
      
      // Verify project details page has loaded
      await projectsPage.verifyProjectDetailsPageLoaded();
    });

    await test.step('Verify project sections display correctly', async () => {
      // Verify all sections are visible
      await expect(projectsPage.repositoriesSection).toBeVisible();
      await expect(projectsPage.pullRequestsSection).toBeVisible();
      await expect(projectsPage.issuesSection).toBeVisible();
      await expect(projectsPage.environmentsSection).toBeVisible();
      
      // Verify repositories section shows repository information
      await expect(projectsPage.repositoriesSection.locator('a[href*="github.com"]').first()).toBeVisible();
      
      // Verify environments section - should have either environments or setup UI
      const hasEnvironments = await projectsPage.hasEnvironments();
      const needsSetup = await projectsPage.needsEnvironmentSetup();
      
      // Project should have either environments OR setup UI
      expect(hasEnvironments || needsSetup).toBe(true);
    });

    await test.step('Navigate back to projects list', async () => {
      // Click back to projects
      await projectsPage.navigateBackToProjects();
    });
  });

  test('should handle external links correctly and be responsive', async ({ projectsPage, page }) => {
    // Navigate to projects page
    await projectsPage.goto();
    
    // Verify projects exist
    await projectsPage.expectProjectsToExist();

    await test.step('Verify external GitHub links', async () => {
      // Navigate to a project
      await projectsPage.clickProjectCard();
      
      // Verify GitHub links
      await projectsPage.verifyGitHubLinks();
    });

    await test.step('Test responsive layout on mobile viewport', async () => {
      // Navigate back to projects page
      await projectsPage.goto();
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 812 });
      
      // Page should still be accessible and readable on mobile
      await expect(projectsPage.pageTitle).toBeVisible();
      await projectsPage.expectProjectsToExist();
      
      // Navigate to individual project
      await projectsPage.clickProjectCard();
      
      // Individual project page should be mobile-responsive
      await expect(projectsPage.backToProjectsLink).toBeVisible();
      await expect(projectsPage.repositoriesSection).toBeVisible();
      await expect(projectsPage.pullRequestsSection).toBeVisible();
    });
  });
});