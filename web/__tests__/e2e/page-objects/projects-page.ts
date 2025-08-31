import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base-page';

/**
 * Page Object Model for the Projects page and Project details
 * Extends BasePage to inherit common navigation elements
 */
export class ProjectsPage extends BasePage {
  // Projects list page elements
  readonly pageTitle: Locator;
  readonly pageDescription: Locator;
  readonly projectCount: Locator;
  readonly projectCards: Locator;
  readonly noProjectsMessage: Locator;
  
  // Project details page elements
  readonly backToProjectsLink: Locator;
  readonly repositoriesSection: Locator;
  readonly pullRequestsSection: Locator;
  readonly issuesSection: Locator;
  readonly environmentsSection: Locator;
  readonly setupEnvironmentLink: Locator;
  readonly addEnvironmentLink: Locator;
  readonly noEnvironmentsMessage: Locator;
  readonly githubRepoLinks: Locator;
  
  constructor(page: Page) {
    super(page);
    
    // Initialize projects list page elements
    this.pageTitle = page.getByRole('heading', { name: 'Projects', level: 1 });
    this.pageDescription = page.getByText('Manage your deployment projects and environments');
    this.projectCount = page.locator('text=/\\d+ projects with environments/');
    this.projectCards = page.locator('[data-testid^="project-card-"]');
    this.noProjectsMessage = page.getByText('No projects found');
    
    // Initialize project details page elements
    this.backToProjectsLink = page.getByText('Back to Projects');
    this.repositoriesSection = page.locator('h2:has-text("Repositories")').locator('..');
    this.pullRequestsSection = page.locator('h2:has-text("Open Pull Requests")').locator('..');
    this.issuesSection = page.locator('h2:has-text("Priority Issues")').locator('..');
    this.environmentsSection = page.locator('h2:has-text("Environments")').locator('..');
    this.setupEnvironmentLink = page.locator('a:has-text("Set up Environment")');
    this.addEnvironmentLink = page.locator('a:has-text("Add Environment")');
    this.noEnvironmentsMessage = page.locator('text=No environments configured');
    this.githubRepoLinks = page.locator('a[href*="github.com"]');
  }

  /**
   * Navigate directly to the projects list page
   */
  async goto() {
    await this.page.goto('/projects');
    await this.verifyProjectsListPageLoaded();
  }

  /**
   * Verify that the projects list page has loaded correctly
   */
  async verifyProjectsListPageLoaded() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.pageDescription).toBeVisible();
    await expect(this.projectCount).toBeVisible();
  }

  /**
   * Check if any projects are available
   * @returns {Promise<boolean>} True if projects exist, false otherwise
   */
  async hasProjects(): Promise<boolean> {
    const count = await this.projectCards.count();
    return count > 0;
  }

  /**
   * Assert that projects exist and are visible
   * @param {boolean} requireProjects - If true, fails the test when no projects are found. 
   *                                   If false, allows empty projects state.
   */
  async expectProjectsToExist(requireProjects = true) {
    const count = await this.projectCards.count();
    const noProjectsVisible = await this.noProjectsMessage.isVisible();
    
    if (requireProjects) {
      expect(count, 'At least one project should be available for testing').toBeGreaterThan(0);
      expect(noProjectsVisible, '"No projects found" message should not be visible').toBe(false);
    } else {
      // Just log the state without failing
      console.log(`Projects found: ${count}, "No projects" message visible: ${noProjectsVisible}`);
    }
    
    return count > 0;
  }

  /**
   * Verify project card structure and content
   * @param index Index of the project card to check (default: 0)
   */
  async verifyProjectCard(index = 0) {
    const projectCard = this.projectCards.nth(index);
    
    await expect(projectCard).toBeVisible();
    await expect(projectCard.locator('h3')).toBeVisible(); // Project name
    await expect(projectCard.locator('img')).toBeVisible(); // Avatar
    await expect(projectCard.locator('text=/\\d+ previews/')).toBeVisible(); // Preview count
  }

  /**
   * Click on a project card to navigate to its details page
   * @param index Index of the project card to click (default: 0)
   */
  async clickProjectCard(index = 0) {
    await this.projectCards.nth(index).click();
    await this.verifyProjectDetailsPageLoaded();
  }

  /**
   * Verify that the project details page has loaded correctly
   */
  async verifyProjectDetailsPageLoaded() {
    await expect(this.backToProjectsLink).toBeVisible();
    await expect(this.repositoriesSection).toBeVisible();
    await expect(this.pullRequestsSection).toBeVisible();
    await expect(this.issuesSection).toBeVisible();
    await expect(this.environmentsSection).toBeVisible();
  }

  /**
   * Navigate back to the projects list page from a project details page
   */
  async navigateBackToProjects() {
    await this.backToProjectsLink.click();
    await this.verifyProjectsListPageLoaded();
  }

  /**
   * Check if the project has environments configured
   * @returns {Promise<boolean>} True if environments exist, false otherwise
   */
  async hasEnvironments(): Promise<boolean> {
    return await this.addEnvironmentLink.isVisible();
  }

  /**
   * Check if the project needs environment setup
   * @returns {Promise<boolean>} True if environment setup is needed, false otherwise
   */
  async needsEnvironmentSetup(): Promise<boolean> {
    return await this.noEnvironmentsMessage.isVisible() && 
           await this.setupEnvironmentLink.isVisible();
  }

  /**
   * Navigate to the environment setup page
   * Will click the appropriate link based on whether environments already exist
   */
  async navigateToEnvironmentSetup() {
    if (await this.setupEnvironmentLink.isVisible()) {
      await this.setupEnvironmentLink.click();
    } else if (await this.addEnvironmentLink.isVisible()) {
      await this.addEnvironmentLink.click();
    } else {
      throw new Error('No environment setup or add link found');
    }
    
    // Verify navigation to environment setup page
    await expect(this.page.locator('h1:has-text("Configure Environments")')).toBeVisible();
  }

  /**
   * Verify GitHub repository links exist and have correct attributes
   */
  async verifyGitHubLinks() {
    const linkCount = await this.githubRepoLinks.count();
    expect(linkCount, 'At least one GitHub repository link should be available').toBeGreaterThan(0);
    
    const firstRepoLink = this.githubRepoLinks.first();
    await expect(firstRepoLink).toHaveAttribute('target', '_blank');
    await expect(firstRepoLink).toHaveAttribute('rel', 'noopener noreferrer');
    
    const href = await firstRepoLink.getAttribute('href');
    expect(href).toMatch(/^https:\/\/github\.com\//);
  }
  
  /**
   * Checks if the current state is the empty projects state
   * @returns {Promise<boolean>} True if we're in the empty projects state
   */
  async isEmptyState(): Promise<boolean> {
    const noProjectsVisible = await this.noProjectsMessage.isVisible();
    const projectCount = await this.projectCards.count();
    return noProjectsVisible && projectCount === 0;
  }
  
  /**
   * Creates a project from the empty state UI
   * Note: This is a placeholder method for when the create project UI is implemented
   * @param projectName Name of the project to create
   */
  async createProjectFromEmptyState(projectName: string): Promise<void> {
    // Check that we're in the empty state
    if (!await this.isEmptyState()) {
      throw new Error('Not in empty state - projects already exist');
    }
    
    // Note: The UI for creating a project from empty state is not yet implemented
    // This method will be updated once that UI is available
    const createProjectButton = this.page.getByRole('button', { name: /create/i }) || 
                                this.page.getByRole('link', { name: /create/i });
    
    if (await createProjectButton.count() > 0) {
      await createProjectButton.click();
      
      // Here we'd fill out the project creation form when it's implemented
      // await this.page.locator('input[name="projectName"]').fill(projectName);
      // await this.page.locator('button[type="submit"]').click();
      
      // For now, just log that we'd create a project
      console.log(`Would create project: ${projectName}`);
    } else {
      throw new Error('Create project button not found in the UI');
    }
  }
}
