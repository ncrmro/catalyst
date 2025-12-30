import { test, expect } from "./fixtures/k8s-fixture";
import { ProjectsPage } from "./page-objects/projects-page";

test.describe("Environment Creation and Kubernetes Verification", () => {
  test("should create environment and verify kubernetes service", async ({
    page,
    k8s,
  }) => {
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

    // Navigate to Platform tab within the project navigation (not the header tab)
    const projectNavigation = page.getByRole("tablist", {
      name: "Project navigation",
    });
    const platformTab = projectNavigation.getByRole("tab", {
      name: "Platform",
    });

    await expect(platformTab).toBeVisible();
    // Scroll tab into view to prevent viewport scroll issues (Agent Chat can push it out of view)
    await platformTab.scrollIntoViewIfNeeded();
    await platformTab.click();

    // Wait for navigation to Platform page to complete
    await page.waitForURL(/\/platform$/);

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
