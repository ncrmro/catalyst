import { test, expect } from '@playwright/test';

test.describe('GitHub Repositories Page', () => {
  test('should display mocked repositories when MOCKED=1', async ({ page }) => {
    // Go to the repos page
    await page.goto('/repos');

    // Check that the page title is correct
    await expect(page.getByRole('heading', { name: 'GitHub Repositories' })).toBeVisible();

    // Check that the description is shown
    await expect(page.getByText('Connected repositories from your account and organizations')).toBeVisible();

    // Check that user repositories section is shown
    await expect(page.locator('h2').filter({ hasText: 'Your Repositories' })).toBeVisible();

    // Check that specific mocked repositories are displayed
    await expect(page.locator('text=testuser/my-awesome-project')).toBeVisible();
    await expect(page.locator('text=testuser/personal-website')).toBeVisible();

    // Check that organization repositories section is shown
    await expect(page.locator('h2').filter({ hasText: 'Organization Repositories' })).toBeVisible();

    // Check organization names are displayed
    await expect(page.getByRole('heading', { name: 'awesome-org' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'open-source-collective' })).toBeVisible();

    // Check specific organization repositories
    await expect(page.locator('text=awesome-org/main-product')).toBeVisible();
    await expect(page.locator('text=awesome-org/infrastructure')).toBeVisible();
    await expect(page.locator('text=open-source-collective/community-tools')).toBeVisible();

    // Check that repository cards contain expected information
    const firstRepo = page.locator('[href="https://github.com/testuser/my-awesome-project"]').first();
    await expect(firstRepo).toBeVisible();
  });

  test('should display dashboard on home page in mocked mode', async ({ page }) => {
    // Start at the home page in mocked mode
    await page.goto('/');

    // Should stay on home page and show dashboard
    await expect(page).toHaveURL('/');
    await expect(page.getByText('Welcome back, Test User!')).toBeVisible();
    await expect(page.getByText('Here\'s your latest project overview and insights.')).toBeVisible();
    
    // Check that it's showing the dashboard layout
    await expect(page.locator('nav')).toBeVisible(); // Sidebar navigation
    await expect(page.locator('footer')).toBeVisible(); // Footer
  });

  test('should display repository cards with correct information', async ({ page }) => {
    await page.goto('/repos');

    // Find the first repository card and check its details
    const repoCard = page.locator('text=testuser/my-awesome-project').locator('..').locator('..');
    
    // Check for repository description
    await expect(repoCard.locator('text=An awesome project built with Next.js')).toBeVisible();
    
    // Check for stats
    await expect(repoCard.locator('text=⭐ 42')).toBeVisible();
    await expect(repoCard.locator('text=🍴 8')).toBeVisible();
    await expect(repoCard.locator('text=📋 3 issues')).toBeVisible();
    
    // Check for language
    await expect(repoCard.locator('text=TypeScript')).toBeVisible();
  });

  test('should handle organization repositories correctly', async ({ page }) => {
    await page.goto('/repos');

    // Check awesome-org section
    const awesomeOrgSection = page.getByRole('heading', { name: 'awesome-org' }).locator('..').locator('..');
    await expect(awesomeOrgSection.locator('text=An awesome organization building great software')).toBeVisible();
  });

  test('should show links to GitHub repositories', async ({ page }) => {
    await page.goto('/repos');

    // Check that repository links point to GitHub
    const repoLink = page.locator('[href="https://github.com/testuser/my-awesome-project"]').first();
    await expect(repoLink).toBeVisible();
    await expect(repoLink).toHaveAttribute('target', '_blank');
    await expect(repoLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('should display Connect buttons on all repository cards', async ({ page }) => {
    await page.goto('/repos');

    // Check that Connect buttons are present on user repositories
    const userRepoConnectButtons = page.locator('h2:has-text("Your Repositories") + div').locator('a:has-text("Connect")');
    await expect(userRepoConnectButtons).toHaveCount(2); // 2 user repos

    // Check that Connect buttons are present on organization repositories
    const orgRepoConnectButtons = page.locator('h2:has-text("Organization Repositories") ~ div').locator('a:has-text("Connect")');
    await expect(orgRepoConnectButtons).toHaveCount(3); // 3 org repos

    // Verify Connect button links to correct path
    const firstConnectButton = userRepoConnectButtons.first();
    await expect(firstConnectButton).toHaveAttribute('href', '/repos/1/connect');
  });

  test('should navigate to connect form when Connect button is clicked', async ({ page }) => {
    await page.goto('/repos');

    // Click the first Connect button
    await page.getByRole('link', { name: 'Connect' }).first().click();

    // Verify we're on the connect page
    await expect(page).toHaveURL('/repos/1/connect');
    await expect(page.getByRole('heading', { name: 'Connect Repository' })).toBeVisible();
    await expect(page.getByText('Connect testuser/my-awesome-project to a project')).toBeVisible();
  });

  test('should show repository information on connect page', async ({ page }) => {
    await page.goto('/repos/1/connect');

    // Check repository display card - use more specific selectors
    await expect(page.getByRole('heading', { name: 'testuser/my-awesome-project' })).toBeVisible();
    
    // Check repository description specifically in the paragraph (not textarea)
    await expect(page.locator('p.text-gray-600').getByText('An awesome project built with Next.js')).toBeVisible();
    await expect(page.getByText('TypeScript')).toBeVisible();
    await expect(page.getByText('⭐ 42')).toBeVisible();
    await expect(page.getByText('🍴 8')).toBeVisible();
  });

  test('should display connect form with correct options', async ({ page }) => {
    await page.goto('/repos/1/connect');

    // Check connection type options
    await expect(page.getByText('How would you like to connect this repository?')).toBeVisible();
    await expect(page.getByRole('radio', { name: /Create a new project/ })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Add to existing project/ })).toBeVisible();

    // Check that "Create new project" is selected by default
    await expect(page.getByRole('radio', { name: /Create a new project/ })).toBeChecked();

    // Check new project form is visible
    await expect(page.getByText('New Project Details')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Project Name' })).toHaveValue('my-awesome-project');
    await expect(page.getByRole('textbox', { name: 'Description (optional)' })).toHaveValue('An awesome project built with Next.js');

    // Check primary repository checkbox
    await expect(page.getByRole('checkbox', { name: 'Set as primary repository' })).toBeChecked();
  });

  test('should switch between new project and existing project options', async ({ page }) => {
    await page.goto('/repos/1/connect');

    // Switch to existing project option
    await page.getByRole('radio', { name: /Add to existing project/ }).click();

    // Check that existing project form is shown
    await expect(page.getByText('Select Project')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Choose an existing project' })).toBeVisible();

    // Check that existing projects are in the dropdown
    const projectDropdown = page.getByRole('combobox', { name: 'Choose an existing project' });
    await expect(projectDropdown.locator('option[value="proj-1"]')).toContainText('jdoe/foo');
    await expect(projectDropdown.locator('option[value="proj-2"]')).toContainText('jdoe/bar');
    await expect(projectDropdown.locator('option[value="proj-3"]')).toContainText('jdoe/analytics-dashboard');

    // Check that Connect button is disabled when no project is selected
    await expect(page.getByRole('button', { name: 'Connect Repository' })).toBeDisabled();

    // Switch back to new project
    await page.getByRole('radio', { name: /Create a new project/ }).click();
    await expect(page.getByText('New Project Details')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Connect Repository' })).toBeEnabled();
  });

  test('should successfully connect repository to new project and redirect to projects page', async ({ page }) => {
    await page.goto('/repos/1/connect');

    // Verify the default form state
    await expect(page.getByRole('radio', { name: /Create a new project/ })).toBeChecked();
    await expect(page.getByRole('textbox', { name: 'Project Name' })).toHaveValue('my-awesome-project');

    // Submit the form
    await page.getByRole('button', { name: 'Connect Repository' }).click();

    // Should redirect to projects page
    await expect(page).toHaveURL('/projects');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();

    // Verify projects page shows the existing projects
    await expect(page.getByText('3 projects with environments and preview deployments')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'jdoe/foo' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'jdoe/bar' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'jdoe/analytics-dashboard' })).toBeVisible();
  });

  test('should handle connecting repository to existing project', async ({ page }) => {
    await page.goto('/repos/2/connect'); // Connect the second repository

    // Switch to existing project option
    await page.getByRole('radio', { name: /Add to existing project/ }).click();

    // Select an existing project
    await page.getByRole('combobox', { name: 'Choose an existing project' }).selectOption('proj-1');

    // Verify Connect button is now enabled
    await expect(page.getByRole('button', { name: 'Connect Repository' })).toBeEnabled();

    // Submit the form
    await page.getByRole('button', { name: 'Connect Repository' }).click();

    // Should redirect to projects page
    await expect(page).toHaveURL('/projects');
    await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible();
  });

  test('should handle Cancel button on connect form', async ({ page }) => {
    await page.goto('/repos/1/connect');

    // Click Cancel button
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Should go back to repos page
    await expect(page).toHaveURL('/repos');
    await expect(page.getByRole('heading', { name: 'GitHub Repositories' })).toBeVisible();
  });

  test('should validate required fields on new project form', async ({ page }) => {
    await page.goto('/repos/1/connect');

    // Clear the project name
    await page.getByRole('textbox', { name: 'Project Name' }).clear();

    // Try to submit - form should prevent submission due to required field
    await page.getByRole('button', { name: 'Connect Repository' }).click();

    // Should still be on the connect page (form validation prevents submission)
    await expect(page).toHaveURL('/repos/1/connect');
  });
});
