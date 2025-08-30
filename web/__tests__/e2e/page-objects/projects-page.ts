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
  readonly environmentStatusBadges: Locator;
  readonly githubRepoLinks: Locator;
  
  constructor(page: Page) {
    super(page);
    
    // Initialize projects list page elements
    this.pageTitle = page.getByRole('heading', { name: 'Projects' });
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
    this.environmentStatusBadges = page.locator('text=/active|inactive|deploying/');
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
   * Will fail the test if no projects are found
   */
  async expectProjectsToExist() {
    const count = await this.projectCards.count();
    const noProjectsVisible = await this.noProjectsMessage.isVisible();
    
    expect(count, 'At least one project should be available for testing').toBeGreaterThan(0);
    expect(noProjectsVisible, '"No projects found" message should not be visible').toBe(false);
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
    const hasStatusBadges = await this.environmentStatusBadges.count() > 0;
    const hasAddEnvButton = await this.addEnvironmentLink.isVisible();
    
    return hasStatusBadges || hasAddEnvButton;
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
}