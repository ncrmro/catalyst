import { Page, Locator, expect } from "@playwright/test";

/**
 * Base Page Object Model that contains common functionality and UI elements
 * across all pages in the application
 */
export class BasePage {
  readonly page: Page;

  // Navigation elements
  readonly logo: Locator;
  readonly sidebar: Locator;
  readonly projectsNavLink: Locator;
  readonly clustersNavLink: Locator;
  readonly reposNavLink: Locator;
  readonly teamsNavLink: Locator;
  readonly reportNavLink: Locator;
  readonly userMenu: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize navigation elements
    this.logo = page.getByRole("link", { name: "Catalyst" });
    this.sidebar = page.locator('[data-testid="sidebar"]');
    this.projectsNavLink = page.getByRole("link", { name: "Projects" });
    this.clustersNavLink = page.getByRole("link", { name: "Clusters" });
    this.reposNavLink = page.getByRole("link", { name: "Repositories" });
    this.teamsNavLink = page.getByRole("link", { name: "Teams" });
    this.reportNavLink = page.getByRole("link", { name: "Reports" });
    this.userMenu = page.locator('[data-testid="user-menu"]');
  }

  /**
   * Navigate to the home page of the application
   */
  async goHome() {
    await this.page.goto("/");
  }

  /**
   * Navigate to the projects page
   */
  async gotoProjects() {
    await this.projectsNavLink.click();
    await expect(this.page).toHaveURL("/projects");
  }

  /**
   * Navigate to the clusters page
   */
  async gotoClusters() {
    await this.clustersNavLink.click();
    await expect(this.page).toHaveURL("/clusters");
  }

  /**
   * Navigate to the repositories page
   */
  async gotoRepositories() {
    await this.reposNavLink.click();
    await expect(this.page).toHaveURL("/repos");
  }

  /**
   * Navigate to the teams page
   */
  async gotoTeams() {
    await this.teamsNavLink.click();
    await expect(this.page).toHaveURL("/teams");
  }

  /**
   * Navigate to the reports page
   */
  async gotoReports() {
    await this.reportNavLink.click();
    await expect(this.page).toHaveURL("/reports");
  }

  /**
   * Verify that the page has loaded and navigation is accessible
   */
  async verifyPageLoaded() {
    await expect(this.sidebar).toBeVisible();
    await expect(this.logo).toBeVisible();
  }

  /**
   * Log out from the application
   */
  async logout() {
    await this.userMenu.click();
    await this.page.getByRole("button", { name: "Sign out" }).click();
    await expect(this.page).toHaveURL("/login");
  }
}
