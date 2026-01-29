import { test, expect, waitForEnvironmentReady } from "./fixtures/k8s-fixture";
import { ProjectsPage } from "./page-objects/projects-page";

// Constants for Catalyst CRDs
const API_GROUP = "catalyst.catalyst.dev";
const API_VERSION = "v1alpha1";

/**
 * E2E test for creating deployment environments through the UI.
 * 
 * This test uses test.describe.serial() to ensure it doesn't run in parallel
 * with other Kubernetes-heavy tests to avoid resource conflicts and flaky behavior in CI.
 */
test.describe.serial("Deployment Environment E2E", () => {
  test.slow(); // This test involves Kubernetes operations which can be slow in CI
  test.setTimeout(600000); // 10 minutes timeout for the full test including operator reconciliation

  let createdEnvironmentName: string | null = null;
  let createdEnvironmentNamespace: string | null = null;

  // Cleanup hook to ensure test resources are always removed
  test.afterEach(async ({ k8s }) => {
    if (createdEnvironmentName && createdEnvironmentNamespace) {
      await k8s.customApi.deleteNamespacedCustomObject({
        group: API_GROUP,
        version: API_VERSION,
        namespace: createdEnvironmentNamespace,
        plural: "environments",
        name: createdEnvironmentName,
      });
      console.log(`✓ Cleaned up test environment: ${createdEnvironmentName} from namespace: ${createdEnvironmentNamespace}`);
    }
  });

  test("should create development environment through UI and verify deployment", async ({
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

    console.log("✓ Navigated to project details page");

    // Navigate to Platform tab within the project navigation
    const projectNavigation = page.getByRole("tablist", {
      name: "Project navigation",
    });
    const platformTab = projectNavigation.getByRole("tab", {
      name: "Platform",
    });

    await expect(platformTab).toBeVisible();
    await platformTab.scrollIntoViewIfNeeded();
    await platformTab.click();

    // Wait for navigation to Platform page
    await page.waitForURL(/\/platform$/, { timeout: 60000 });

    // Verify we're on the Platform page
    await expect(
      page.getByRole("heading", { name: "Platform Configuration" }),
    ).toBeVisible();

    console.log("✓ Navigated to Platform page");

    // Find Development Environments card and click "New" tab
    // The "New" tab is the second occurrence (Development Environments, after Deployment Environments)
    const newTabs = page.getByRole("tab", { name: "New" });
    const devEnvironmentNewTab = newTabs.nth(1); // 0 = Deployment Environments, 1 = Development Environments

    await expect(devEnvironmentNewTab).toBeVisible();
    await devEnvironmentNewTab.click();

    console.log("✓ Clicked New tab in Development Environments card");

    // Fill in the branch field
    const branchInput = page.getByLabel("Branch");
    await expect(branchInput).toBeVisible();
    await branchInput.clear();
    await branchInput.fill("main");

    console.log("✓ Filled branch field with 'main'");

    // Click Create Environment button
    const createButton = page.getByRole("button", { name: "Create Environment" });
    await expect(createButton).toBeVisible();
    await createButton.click();

    console.log("✓ Clicked Create Environment button");

    // Wait for success message to appear and extract the environment name
    // The message format is "Successfully created development environment: dev-xxx-yyy"
    const successMessage = page.getByText(/Successfully created development environment:/i);
    await expect(successMessage).toBeVisible({ timeout: 30000 });
    
    const successText = await successMessage.textContent();
    const environmentNameMatch = successText?.match(/dev-[a-z]+-[a-z]+-\d+/);
    expect(environmentNameMatch).toBeTruthy();
    
    const environmentName = environmentNameMatch![0];
    createdEnvironmentName = environmentName;
    
    console.log(`✓ Success message appeared: ${successText}`);
    console.log(`✓ Created environment: ${environmentName}`);

    // Switch to Status tab to see the new environment  
    const statusTabs = page.getByRole("tab", { name: "Status" });
    const devEnvironmentStatusTab = statusTabs.nth(1); // Second Status tab (Development Environments)
    await devEnvironmentStatusTab.click();

    console.log("✓ Switched to Status tab");

    // Reload the page to fetch environments from Kubernetes with the corrected namespace query
    await page.reload({ waitUntil: "networkidle" });
    console.log("✓ Page reloaded");

    // Wait for Platform Configuration heading to ensure page is fully loaded
    await expect(
      page.getByRole("heading", { name: "Platform Configuration" }),
    ).toBeVisible();

    // Make sure we're still on the Development Environments Status tab after reload
    const statusTabsAfterReload = page.getByRole("tab", { name: "Status" });
    const devEnvironmentStatusTabAfterReload = statusTabsAfterReload.nth(1);
    await devEnvironmentStatusTabAfterReload.click();

    console.log("✓ Navigated back to Status tab after reload");

    // The environment should now be visible in the UI since we fixed the namespace query
    // The link text format is "{environmentName}{type}{status}", e.g. "dev-rustic-bear-94developmentPending"
    const environmentLinks = page
      .locator('a[href*="/projects/"][href*="/env/"]')
      .filter({ hasText: new RegExp(`${environmentName}`) });

    await expect(environmentLinks.first()).toBeVisible({ timeout: 30000 });
    console.log(`✓ Environment ${environmentName} is visible in the UI`);

    // Find the environment in Kubernetes to get its namespace
    const namespaces = await k8s.coreApi.listNamespace();
    let environmentNamespace: string | null = null;
    
    for (const ns of namespaces.items) {
      const response = await k8s.customApi.getNamespacedCustomObject({
        group: API_GROUP,
        version: API_VERSION,
        namespace: ns.metadata?.name || "",
        plural: "environments",
        name: environmentName,
      }).catch(() => null);
      
      if (response) {
        environmentNamespace = ns.metadata?.name || null;
        createdEnvironmentNamespace = environmentNamespace;
        console.log(`✓ Found environment in namespace: ${environmentNamespace}`);
        break;
      }
    }

    expect(environmentNamespace).toBeTruthy();
    console.log(`✓ Verified Environment CR exists in namespace: ${environmentNamespace}`);

    // Wait for environment to reach Ready status
    console.log("⏳ Waiting for environment to become Ready...");
    const result = await waitForEnvironmentReady(
      k8s.customApi,
      environmentNamespace!,
      environmentName,
      { timeoutMs: 540000 }, // 9 minutes
    );

    expect(result.phase).toBe("Ready");
    console.log("✓ Environment reached Ready state");

    // Verify the preview URL is accessible
    expect(result.url).toBeDefined();
    console.log(`✓ Environment URL: ${result.url}`);

    const healthUrl = new URL("/api/health/readiness", result.url!).toString();
    const response = await page.request.get(healthUrl, { timeout: 30000 });
    expect(response.ok()).toBe(true);
    console.log(`✓ Preview URL health check returned HTTP ${response.status()}`);

    console.log("✓ Test completed successfully");
  });
});
