import { expect, type Locator, type Page } from "@playwright/test";
import { BasePage } from "./base-page";

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
	readonly featureTasksSection: Locator;
	readonly platformTasksSection: Locator;
	readonly agentChatSection: Locator;
	readonly projectBreadcrumb: Locator;

	constructor(page: Page) {
		super(page);

		// Initialize projects list page elements
		// The page uses breadcrumbs in a nav element (displays uppercase via CSS)
		this.pageTitle = page.getByRole("navigation").getByText("Projects");
		// Use the Create Project link as secondary verification
		this.pageDescription = page.getByRole("link", { name: "Create Project" });
		// Project cards are links to individual projects
		this.projectCards = page.locator(
			'a[href^="/projects/"]:not([href="/projects/create"])',
		);
		this.noProjectsMessage = page.getByText("No projects found");

		// Initialize project details page elements
		// Feature Tasks section is always present on project details page
		this.featureTasksSection = page.getByRole("heading", {
			name: "Feature Tasks",
			level: 2,
		});
		this.platformTasksSection = page.getByRole("heading", {
			name: "Platform Tasks",
			level: 2,
		});
		this.agentChatSection = page.getByRole("heading", {
			name: "Agent Chat",
			level: 2,
		});
		// Breadcrumb link back to Projects in the project details navigation
		this.projectBreadcrumb = page
			.getByRole("navigation")
			.getByRole("link", { name: "Projects" });
	}

	/**
	 * Navigate directly to the projects list page
	 */
	async goto() {
		await this.page.goto("/projects");
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

		expect(
			count,
			"At least one project should be available for testing",
		).toBeGreaterThan(0);
		expect(
			noProjectsVisible,
			'"No projects found" message should not be visible',
		).toBe(false);

		return count > 0;
	}

	/**
	 * Verify project card structure and content
	 * @param index Index of the project card to check (default: 0)
	 */
	async verifyProjectCard(index = 0) {
		const projectCard = this.projectCards.nth(index);

		await expect(projectCard).toBeVisible();
		await expect(projectCard.locator("h3")).toBeVisible(); // Project name
		await expect(projectCard.locator("img")).toBeVisible(); // Avatar
	}

	/**
	 * Click on a project card to navigate to its details page
	 * @param index Index of the project card to click (default: 0)
	 */
	async clickProjectCard(index = 0) {
		const card = this.projectCards.nth(index);
		const href = await card.getAttribute("href");

		// Click and wait for navigation to complete
		await Promise.all([this.page.waitForURL(`**${href}`), card.click()]);

		await this.verifyProjectDetailsPageLoaded();
	}

	/**
	 * Verify that the project details page has loaded correctly
	 */
	async verifyProjectDetailsPageLoaded() {
		// Feature Tasks section is always present on project details
		await expect(this.featureTasksSection).toBeVisible({ timeout: 10000 });
	}

	/**
	 * Navigate back to the projects list page from a project details page
	 */
	async navigateBackToProjects() {
		await this.projectBreadcrumb.click();
		await this.verifyProjectsListPageLoaded();
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
