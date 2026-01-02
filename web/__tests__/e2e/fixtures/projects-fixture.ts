import { test as base } from "@playwright/test";
import { loginAndSeedForE2E } from "../helpers";
import { ProjectsPage } from "../page-objects/projects-page";

/**
 * Extended test fixture that includes:
 * - Auto login and seed data for E2E tests
 * - A ProjectsPage Page Object Model instance
 */
export const test = base.extend<{
	projectsPage: ProjectsPage;
}>({
	// Auto-initialize the ProjectsPage POM for each test

	projectsPage: async ({ page }, use, testInfo) => {
		// Perform login and seed data automatically
		await loginAndSeedForE2E(page, testInfo);

		// Create and initialize the ProjectsPage POM
		const projectsPage = new ProjectsPage(page);

		// Provide the initialized ProjectsPage to the test

		await use(projectsPage);
	},
});

// Re-export expect so tests have it available
export { expect } from "@playwright/test";
