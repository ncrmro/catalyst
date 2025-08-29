import { test, expect } from '@playwright/test';
import { loginAndSeedForE2E } from './helpers';

test.describe('Projects Pages', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await loginAndSeedForE2E(page, testInfo);
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
      
      // The environments section should always be visible
      await expect(envsSection).toBeVisible();
      
      // Check if project has environments - should either have status badges OR "No environments configured"
      const hasStatusBadges = await envsSection.locator('text=/active|inactive|deploying/').count() > 0;
      const hasNoEnvMessage = await envsSection.locator('text=No environments configured').count() > 0;
      const hasAddEnvButton = await envsSection.locator('a:has-text("Add Environment")').count() > 0;
      const hasSetupEnvButton = await envsSection.locator('a:has-text("Set up Environment")').count() > 0;
      
      // Project should have either environments (status badges + add button) OR no-environment setup
      expect(hasStatusBadges || hasNoEnvMessage || hasAddEnvButton || hasSetupEnvButton).toBe(true);
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

  test('should show environment setup banner when no environments exist', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectCards = page.locator('[data-testid^="project-card-"]');
    const projectCount = await projectCards.count();

    if (projectCount > 0) {
      // Navigate to a project
      await projectCards.first().click();
      await page.waitForLoadState('networkidle');

      // Check if the project has environments or not by looking for the banner
      const noEnvBanner = page.locator('text=No environments configured');
      const hasNoEnvBanner = await noEnvBanner.count() > 0;

      if (hasNoEnvBanner) {
        // Project has no environments - should show setup banner
        await expect(page.locator('text=No environments configured')).toBeVisible();
        await expect(page.locator('text=Set up your first deployment environment')).toBeVisible();
        
        // Should have "Set up Environment" link
        const setupLink = page.locator('a:has-text("Set up Environment")');
        await expect(setupLink).toBeVisible();
        await expect(setupLink).toHaveAttribute('href', new RegExp(`/environments/[^/]+$`));
        
        // Should NOT have "Add Environment" button
        await expect(page.locator('button:has-text("Add Environment"), a:has-text("Add Environment")')).not.toBeVisible();
      } else {
        console.log('Project has environments - skipping no-environment test');
      }
    } else {
      console.log('No projects available for environment setup test');
    }
  });

  test('should show add environment button when environments exist', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectCards = page.locator('[data-testid^="project-card-"]');
    const projectCount = await projectCards.count();

    if (projectCount > 0) {
      // Navigate to a project
      await projectCards.first().click();
      await page.waitForLoadState('networkidle');

      // Check if the project has environments by looking for the Add Environment button
      const addEnvButton = page.locator('a:has-text("Add Environment")');
      const hasAddEnvButton = await addEnvButton.count() > 0;

      if (hasAddEnvButton) {
        // Project has environments - should show add environment button
        await expect(addEnvButton).toBeVisible();
        await expect(addEnvButton).toHaveAttribute('href', new RegExp(`/environments/[^/]+$`));
        
        // Should NOT show the no-environments banner
        await expect(page.locator('text=No environments configured')).not.toBeVisible();
        await expect(page.locator('text=Set up Environment')).not.toBeVisible();
      } else {
        console.log('Project has no environments - skipping existing-environment test');
      }
    } else {
      console.log('No projects available for environment add test');
    }
  });

  test('should navigate to environment setup page correctly', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const projectCards = page.locator('[data-testid^="project-card-"]');
    const projectCount = await projectCards.count();

    if (projectCount > 0) {
      // Navigate to a project
      await projectCards.first().click();
      await page.waitForLoadState('networkidle');

      // Find either "Set up Environment" or "Add Environment" link
      const setupLink = page.locator('a:has-text("Set up Environment")');
      const addLink = page.locator('a:has-text("Add Environment")');
      
      let linkToClick = null;
      if (await setupLink.isVisible()) {
        linkToClick = setupLink;
      } else if (await addLink.isVisible()) {
        linkToClick = addLink;
      }

      if (linkToClick) {
        // Click the environment setup/add link
        await linkToClick.click();
        await page.waitForLoadState('networkidle');

        // Should navigate to environment setup page
        await expect(page).toHaveURL(new RegExp(`/environments/[^/]+$`));
        await expect(page.locator('h1:has-text("Configure Environments")')).toBeVisible();
        await expect(page.locator('text=Choose Your First Environment')).toBeVisible();
        
        // Should have radio buttons for environment types
        await expect(page.locator('input[name="environmentType"][value="preview"]')).toBeVisible();
        await expect(page.locator('input[name="environmentType"][value="production"]')).toBeVisible();
        await expect(page.locator('input[name="environmentType"][value="staging"]')).toBeVisible();
      } else {
        console.log('No environment setup links found');
      }
    } else {
      console.log('No projects available for environment navigation test');
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