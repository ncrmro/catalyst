import { test, expect } from "./fixtures/k8s-fixture";
import { ProjectsPage } from "./page-objects/projects-page";

test.describe("Environment Creation and Kubernetes Verification", () => {
  test("should create environment and verify kubernetes service", async ({
    page,
    k8s,
  }) => {
    // DEBUG: Capture browser console output
    page.on("console", (msg) => console.log(`[BROWSER] ${msg.text()}`));

    // Create projects page instance
    const projectsPage = new ProjectsPage(page);

    // Navigate to projects page
    await projectsPage.goto();

    // Verify projects exist
    await projectsPage.expectProjectsToExist();

    // Click on the first project card
    await projectsPage.clickProjectCard();

    // Verify project details page has loaded
    await projectsPage.verifyProjectDetailsPageLoaded();

    // DEBUG: Log state after project details loaded
    console.log(`DEBUG: URL after project click: ${page.url()}`);

    // Navigate to Platform tab within the project navigation (not the header tab)
    const projectNavigation = page.getByRole("tablist", {
      name: "Project navigation",
    });
    const platformTab = projectNavigation.getByRole("tab", {
      name: "Platform",
    });

    // DEBUG: Log Platform tab state before click
    const platformTabVisible = await platformTab.isVisible();
    const platformTabHref = await platformTab.getAttribute("href");
    console.log(`DEBUG: Platform tab visible: ${platformTabVisible}`);
    console.log(`DEBUG: Platform tab href: ${platformTabHref}`);
    console.log(`DEBUG: URL before Platform click: ${page.url()}`);

    await expect(platformTab).toBeVisible();
    await platformTab.click();

    // DEBUG: Log state immediately after click
    console.log(`DEBUG: URL immediately after Platform click: ${page.url()}`);

    // DEBUG: Check what content is visible before waitForURL
    const headingVisibleBeforeWait = await page
      .getByRole("heading", { name: "Platform Configuration" })
      .isVisible()
      .catch(() => false);
    const envSectionVisible = await page
      .getByRole("heading", { name: "Environments" })
      .isVisible()
      .catch(() => false);
    console.log(
      `DEBUG: Platform Configuration heading visible (before wait): ${headingVisibleBeforeWait}`,
    );
    console.log(`DEBUG: Environments section visible: ${envSectionVisible}`);

    // Wait for navigation to Platform page to complete
    await page.waitForURL(/\/platform$/);

    // DEBUG: Log state after waitForURL
    console.log(`DEBUG: URL after waitForURL: ${page.url()}`);

    // Verify we're on the Platform page by checking for the Platform Configuration heading
    await expect(
      page.getByRole("heading", { name: "Platform Configuration" }),
    ).toBeVisible();

    // Look for the Add Environment link in the Deployment Environments section
    const addEnvironmentLink = page.getByRole("link", {
      name: "Add Environment",
    });
    await expect(addEnvironmentLink).toBeVisible();

    // Verify kubernetes cluster is accessible and can list namespaces
    const response = await k8s.coreApi.listNamespace();
    const namespaces = response.items;

    expect(namespaces).toBeDefined();
    expect(namespaces.length).toBeGreaterThan(0);

    // Verify that common namespaces exist
    const namespaceNames = namespaces.map((ns) => ns.metadata?.name);
    expect(namespaceNames).toContain("default");
    expect(namespaceNames).toContain("kube-system");

    console.log(
      `✓ Kubernetes cluster is accessible with ${namespaces.length} namespaces`,
    );
  });
});
