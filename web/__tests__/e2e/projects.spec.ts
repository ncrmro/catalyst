import { test, expect } from '@playwright/test';
import { loginWithDevPassword } from './helpers';

test.describe('Projects Pages', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await loginWithDevPassword(page, testInfo);
  });

  test('should display projects list page', async ({ page }) => {
    // Go to the projects page
    await page.goto('/projects');

    // Check that the page title is correct
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

    // Check that the description is shown
    await expect(page.getByText('Manage your deployment projects and environments')).toBeVisible();

    // Should show project count (either 0 or more projects)
    await expect(page.locator('text=/\\d+ projects with environments/')).toBeVisible();

    // Check if projects are displayed or if "no projects" message is shown
    const projectCards = page.locator('[data-testid^="project-card-"]');
    const noProjectsMessage = page.getByText('No projects found');
    
    // Either should have project cards OR no projects message
    const hasProjects = await projectCards.count() > 0;
    const hasNoProjectsMessage = await noProjectsMessage.isVisible();
    
    expect(hasProjects || hasNoProjectsMessage).toBe(true);

    if (hasProjects) {
      // If projects exist, verify they have expected structure
      const firstProject = projectCards.first();
      await expect(firstProject).toBeVisible();
      
      // Check for project name, avatar, and basic info
      await expect(firstProject.locator('h3')).toBeVisible(); // Project name
      await expect(firstProject.locator('img')).toBeVisible(); // Avatar
      await expect(firstProject.locator('text=/\\d+ previews/')).toBeVisible(); // Preview count
    }
  });

  test('should navigate to individual project page when project card is clicked', async ({ page }) => {
    await page.goto('/projects');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check if there are any project cards
    const projectCards = page.locator('[data-testid^="project-card-"]');
    const projectCount = await projectCards.count();

    if (projectCount > 0) {
      // Click on the first project card
      const firstProject = projectCards.first();
      await firstProject.click();

      // Should navigate to the individual project page
      await expect(page).toHaveURL(/\/projects\/[^\/]+$/);

      // Should show the individual project page elements
      await expect(page.getByText('Back to Projects')).toBeVisible();
      
      // Should show sections for repositories, pull requests, issues, and environments
      await expect(page.locator('h2:has-text("Repositories")')).toBeVisible();
      await expect(page.locator('h2:has-text("Open Pull Requests")')).toBeVisible();
      await expect(page.locator('h2:has-text("Priority Issues")')).toBeVisible();
      await expect(page.locator('h2:has-text("Environments")')).toBeVisible();
    } else {
      console.log('No projects available for navigation test');
    }
  });

  test('should display project sections correctly', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectCards = page.locator('[data-testid^="project-card-"]');
    const projectCount = await projectCards.count();

    if (projectCount > 0) {
      // Navigate to first project
      await projectCards.first().click();
      await page.waitForLoadState('networkidle');

      // Verify basic sections are present
      await expect(page.locator('h2:has-text("Repositories")')).toBeVisible();
      await expect(page.locator('h2:has-text("Open Pull Requests")')).toBeVisible();
      await expect(page.locator('h2:has-text("Priority Issues")')).toBeVisible();
      await expect(page.locator('h2:has-text("Environments")')).toBeVisible();

      // Check that either content or empty state messages are shown
      const prSection = page.locator('h2:has-text("Open Pull Requests")').locator('..');
      const issuesSection = page.locator('h2:has-text("Priority Issues")').locator('..');
      
      // Should have some content in each section (either data or empty state)
      await expect(prSection).toBeVisible();
      await expect(issuesSection).toBeVisible();

      // Verify repositories section shows repository information
      const reposSection = page.locator('h2:has-text("Repositories")').locator('..');
      await expect(reposSection.locator('a[href*="github.com"]').first()).toBeVisible(); // Should have GitHub links

      // Verify environments section shows environment information
      const envsSection = page.locator('h2:has-text("Environments")').locator('..');
      await expect(envsSection.locator('text=/active|inactive|deploying/').first()).toBeVisible(); // Should have status badges
    } else {
      console.log('No projects available for section test');
    }
  });

  test('should navigate back to projects list from individual project page', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectCards = page.locator('[data-testid^="project-card-"]');
    const projectCount = await projectCards.count();

    if (projectCount > 0) {
      // Navigate to a project
      await projectCards.first().click();
      await page.waitForLoadState('networkidle');

      // Click back to projects
      await page.getByText('Back to Projects').click();

      // Should be back on the projects list page
      await expect(page).toHaveURL('/projects');
      await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
    } else {
      console.log('No projects available for back navigation test');
    }
  });

  test('should handle external links correctly', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectCards = page.locator('[data-testid^="project-card-"]');
    const projectCount = await projectCards.count();

    if (projectCount > 0) {
      // Navigate to a project
      await projectCards.first().click();
      await page.waitForLoadState('networkidle');

      // Check that GitHub repository links exist and have correct attributes
      const repoLinks = page.locator('a[href*="github.com"]');
      const linkCount = await repoLinks.count();

      if (linkCount > 0) {
        const firstRepoLink = repoLinks.first();
        
        // Should have target="_blank" for external links
        await expect(firstRepoLink).toHaveAttribute('target', '_blank');
        await expect(firstRepoLink).toHaveAttribute('rel', 'noopener noreferrer');
        
        // Should have valid GitHub URL
        const href = await firstRepoLink.getAttribute('href');
        expect(href).toMatch(/^https:\/\/github\.com\//);
      }
    } else {
      console.log('No projects available for external links test');
    }
  });

  test('should be responsive on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    // Page should still be accessible and readable on mobile
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

    const projectCards = page.locator('[data-testid^="project-card-"]');
    const projectCount = await projectCards.count();

    if (projectCount > 0) {
      // Project cards should be stacked vertically on mobile
      const firstProject = projectCards.first();
      await expect(firstProject).toBeVisible();
      
      // Navigate to individual project
      await firstProject.click();
      await page.waitForLoadState('networkidle');

      // Individual project page should be mobile-responsive
      await expect(page.getByText('Back to Projects')).toBeVisible();
      
      // Sections should still be visible and accessible
      await expect(page.locator('h2:has-text("Repositories")')).toBeVisible();
      await expect(page.locator('h2:has-text("Open Pull Requests")')).toBeVisible();
    }
  });
});