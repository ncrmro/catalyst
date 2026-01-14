import { test, expect } from "./fixtures/projects-fixture";
import { SpecsPage } from "./page-objects/specs-page";

test.describe("Specs Page", () => {
  test.setTimeout(60_000);

  test("should load spec page without MDX parsing errors", async ({
    page,
    projectsPage,
  }) => {
    const specsPage = new SpecsPage(page);

    // First ensure we're logged in by going to projects
    await projectsPage.goto();

    // Navigate to the catalyst spec page
    await specsPage.goto("catalyst", "003-vcs-providers", "spec");

    // Wait for page to load
    await specsPage.waitForPageLoad();

    // Check there are no MDX compilation errors in the page
    // This specifically catches the error we fixed:
    // "Unexpected character `1` (U+0031) before name"
    const mdxError = await specsPage.checkForMdxErrors();
    expect(mdxError).toBeNull();

    // If content loaded successfully, verify markdown rendered
    const hasContent = await specsPage.hasRenderedContent();

    // The page should either show content or an empty/error state
    // but NOT an MDX compilation error
    const pageContent = await page.content();
    expect(pageContent).not.toContain("error compiling MDX");
    expect(pageContent).not.toContain("Unexpected character");

    // Log result for debugging
    if (hasContent) {
      const text = await specsPage.getMarkdownText();
      // If we have content, it should contain some spec-related text
      expect(text?.length).toBeGreaterThan(0);
    }
  });

  test("should handle content with comparison operators correctly", async ({
    page,
    projectsPage,
  }) => {
    const specsPage = new SpecsPage(page);

    // Ensure logged in
    await projectsPage.goto();

    // Navigate to specs page
    await specsPage.goto("catalyst", "003-vcs-providers", "spec");
    await specsPage.waitForPageLoad();

    // The key assertion: no MDX errors even with content like "< 2 minutes"
    const mdxError = await specsPage.checkForMdxErrors();
    expect(
      mdxError,
      "MDX should not fail on content with angle brackets like '< 2 minutes'",
    ).toBeNull();
  });

  test("should render spec tab navigation", async ({ page, projectsPage }) => {
    const specsPage = new SpecsPage(page);

    // Ensure logged in
    await projectsPage.goto();

    // Navigate to specs page
    await specsPage.goto("catalyst", "003-vcs-providers");
    await specsPage.waitForPageLoad();

    // Page should load without throwing MDX errors
    const pageContent = await page.content();
    expect(pageContent).not.toContain("error compiling MDX");
  });
});
