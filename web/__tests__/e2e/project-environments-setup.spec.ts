import { test, expect } from './fixtures/projects-fixture';

test.describe('Project Environment Setup', () => {
  test('should navigate to environment setup page correctly', async ({ projectsPage, page }) => {
    await test.step('Navigate to projects page and select a project', async () => {
      // Go to the projects page
      await projectsPage.goto();
      
      // Verify projects exist
      await projectsPage.expectProjectsToExist();
      
      // Navigate to a project
      await projectsPage.clickProjectCard();
    });
    
    await test.step('Navigate to environment setup page', async () => {
      // Click environment setup link
      await projectsPage.navigateToEnvironmentSetup();
    });

    await test.step('Verify environment setup page', async () => {
      // Should navigate to environment setup page
      await expect(page).toHaveURL(new RegExp(`/environments/[^/]+$`));
      await expect(page.locator('h1:has-text("Configure Environments")')).toBeVisible();
      await expect(page.locator('text=Choose Your First Environment')).toBeVisible();
      
      // Should have radio buttons for environment types
      await expect(page.locator('input[name="environmentType"][value="preview"]')).toBeVisible();
      await expect(page.locator('input[name="environmentType"][value="production"]')).toBeVisible();
      await expect(page.locator('input[name="environmentType"][value="staging"]')).toBeVisible();
    });
  });

  test('should show environment setup banner when no environments exist', async ({ projectsPage, page }) => {
    await test.step('Find project with no environments', async () => {
      // Navigate to projects page
      await projectsPage.goto();
      
      // Verify projects exist
      await projectsPage.expectProjectsToExist();
      
      // Get the count of projects
      const projectCount = await projectsPage.projectCards.count();
      let foundProjectWithNoEnv = false;
      
      // Try each project until we find one with no environments
      for (let i = 0; i < projectCount; i++) {
        await projectsPage.clickProjectCard(i);
        
        if (await projectsPage.needsEnvironmentSetup()) {
          foundProjectWithNoEnv = true;
          break;
        }
        
        // Go back to projects list if this project has environments
        await projectsPage.goto();
      }
      
      // Skip the test if no project without environments was found
      if (!foundProjectWithNoEnv) {
        test.skip('No projects without environments found');
      }
    });
    
    await test.step('Verify environment setup banner', async () => {
      // Project has no environments - should show setup banner
      await expect(projectsPage.noEnvironmentsMessage).toBeVisible();
      await expect(page.locator('text=Set up your first deployment environment')).toBeVisible();
      
      // Should have "Set up Environment" link
      await expect(projectsPage.setupEnvironmentLink).toBeVisible();
      await expect(projectsPage.setupEnvironmentLink).toHaveAttribute('href', new RegExp(`/environments/[^/]+$`));
      
      // Should NOT have "Add Environment" button
      await expect(projectsPage.addEnvironmentLink).not.toBeVisible();
    });
  });

  test('should show add environment button when environments exist', async ({ projectsPage }) => {
    await test.step('Find project with existing environments', async () => {
      // Navigate to projects page
      await projectsPage.goto();
      
      // Verify projects exist
      await projectsPage.expectProjectsToExist();
      
      // Get the count of projects
      const projectCount = await projectsPage.projectCards.count();
      let foundProjectWithEnv = false;
      
      // Try each project until we find one with environments
      for (let i = 0; i < projectCount; i++) {
        await projectsPage.clickProjectCard(i);
        
        if (await projectsPage.hasEnvironments()) {
          foundProjectWithEnv = true;
          break;
        }
        
        // Go back to projects list if this project has no environments
        await projectsPage.goto();
      }
      
      // Skip the test if no project with environments was found
      if (!foundProjectWithEnv) {
        test.skip('No projects with environments found');
      }
    });
    
    await test.step('Verify add environment button', async () => {
      // Project has environments - should show add environment button
      await expect(projectsPage.addEnvironmentLink).toBeVisible();
      await expect(projectsPage.addEnvironmentLink).toHaveAttribute('href', new RegExp(`/environments/[^/]+$`));
      
      // Should NOT show the no-environments banner
      await expect(projectsPage.noEnvironmentsMessage).not.toBeVisible();
      await expect(projectsPage.setupEnvironmentLink).not.toBeVisible();
    });
  });
});