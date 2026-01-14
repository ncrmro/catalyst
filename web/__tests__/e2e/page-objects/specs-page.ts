import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./base-page";

/**
 * Page Object Model for the Specs page
 * Handles navigation and interaction with spec content
 */
export class SpecsPage extends BasePage {
  // Spec page elements
  readonly specContent: Locator;
  readonly specFileSidebar: Locator;
  readonly specTabs: Locator;
  readonly specTabNav: Locator;
  readonly errorMessage: Locator;
  readonly markdownContent: Locator;

  constructor(page: Page) {
    super(page);

    // Spec content area
    this.specContent = page.locator("main");
    this.specFileSidebar = page.locator("aside");
    this.specTabs = page.getByRole("tablist");
    this.specTabNav = page.locator('[role="tab"]');
    this.errorMessage = page.getByText(/error|failed|unable/i);
    this.markdownContent = page.locator(".prose");
  }

  /**
   * Navigate to a specific spec page
   * @param projectSlug The project slug (e.g., "catalyst")
   * @param specSlug The spec slug (e.g., "003-vcs-providers")
   * @param tab Optional tab to navigate to (spec, tasks, chat)
   */
  async goto(projectSlug: string, specSlug: string, tab?: string) {
    const url = tab
      ? `/specs/${projectSlug}/${specSlug}?tab=${tab}`
      : `/specs/${projectSlug}/${specSlug}`;
    await this.page.goto(url);
  }

  /**
   * Wait for the spec page to load (either content or error state)
   */
  async waitForPageLoad() {
    // Wait for either markdown content OR an error message to appear
    // This handles both success and error cases without branching in tests
    await this.page
      .locator(".prose, [data-testid='error-state'], main")
      .first()
      .waitFor({ timeout: 30000 });
  }

  /**
   * Check if the spec content rendered successfully (no MDX errors)
   * @returns true if content is visible and no error messages
   */
  async hasRenderedContent(): Promise<boolean> {
    const hasContent = await this.markdownContent.isVisible();
    return hasContent;
  }

  /**
   * Get the rendered markdown text content
   */
  async getMarkdownText(): Promise<string | null> {
    return this.markdownContent.textContent();
  }

  /**
   * Check for MDX/rendering errors in the page
   */
  async checkForMdxErrors(): Promise<string | null> {
    // Check for common MDX error patterns
    const pageContent = await this.page.content();
    const errorPatterns = [
      /Unexpected character.*before name/i,
      /error compiling MDX/i,
      /Could not parse expression/i,
    ];

    for (const pattern of errorPatterns) {
      const match = pageContent.match(pattern);
      if (match) {
        return match[0];
      }
    }
    return null;
  }

  /**
   * Click on a specific tab
   */
  async clickTab(tabName: string) {
    await this.page.getByRole("tab", { name: tabName }).click();
  }

  /**
   * Verify the spec tab is active
   */
  async verifySpecTabActive() {
    const specTab = this.page.getByRole("tab", { name: /spec/i });
    await expect(specTab).toHaveAttribute("aria-selected", "true");
  }
}
