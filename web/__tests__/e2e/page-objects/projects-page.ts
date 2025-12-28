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
  readonly projectCards: Locator;
  readonly noProjectsMessage: Locator;
  
  // Project details page elements
  readonly environmentsSection: Locator;
  readonly specsSection: Locator;
  readonly addEnvironmentLink: Locator;
  readonly noEnvironmentsMessage: Locator;
  
  constructor(page: Page) {
    super(page);
    
    // Initialize projects list page elements
    this.pageTitle = page.getByRole('heading', { name: 'Projects', level: 1 });
    this.pageDescription = page.getByText('Manage your deployment projects and environments');
    this.projectCards = page.locator('[data-testid^="project-card-"]');
    this.noProjectsMessage = page.getByText('No projects found');
    
    // Initialize project details page elements
    this.environmentsSection = page.locator('h2:has-text("Environments")').locator('..');
    this.specsSection = page.locator('h2:has-text("Specs")').locator('..');
    this.addEnvironmentLink = page.getByRole('link', { name: 'Add Environment' });
    this.noEnvironmentsMessage = page.locator('text=No deployment environments'); // matches part of the text
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
   */
  async expectProjectsToExist() {
    const count = await this.projectCards.count();
    const noProjectsVisible = await this.noProjectsMessage.isVisible();
    
    expect(count, 'At least one project should be available for testing').toBeGreaterThan(0);
    expect(noProjectsVisible, '"No projects found" message should not be visible').toBe(false);
    
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
    await expect(this.environmentsSection).toBeVisible();
    await expect(this.specsSection).toBeVisible();
  }

  /**
   * Navigate back to the projects list page from a project details page
   */
  async navigateBackToProjects() {
    await this.page.getByRole('link', { name: 'Projects' }).click();
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
   * Checks if the current state is the empty projects state
   * @returns {Promise<boolean>} True if we're in the empty projects state
   */
  async isEmptyState(): Promise<boolean> {
    const noProjectsVisible = await this.noProjectsMessage.isVisible();
    const projectCount = await this.projectCards.count();
    return noProjectsVisible && projectCount === 0;
  }
}
