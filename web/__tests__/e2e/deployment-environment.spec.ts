import { test, expect, waitForEnvironmentReady } from "./fixtures/k8s-fixture";
import { ProjectsPage } from "./page-objects/projects-page";
import { SecretsPage } from "./page-objects/secrets-page";

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

  test("should create development environment through UI and verify deployment", async ({
    page,
    k8s,
  }) => {
    // Clean up before the test, not after. Leaving resources in place after
    // a failure lets us inspect pods, logs, and CRs for debugging. The next
    // run cleans up stale state here so we always start from a known baseline.
    if (createdEnvironmentName && createdEnvironmentNamespace) {
      await k8s.customApi
        .deleteNamespacedCustomObject({
          group: API_GROUP,
          version: API_VERSION,
          namespace: createdEnvironmentNamespace,
          plural: "environments",
          name: createdEnvironmentName,
        })
        .catch(() => null);
      console.log(
        `✓ Cleaned up previous environment: ${createdEnvironmentName} from namespace: ${createdEnvironmentNamespace}`,
      );
      createdEnvironmentName = null;
      createdEnvironmentNamespace = null;
    }

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

    const currentUrl = page.url();
    const projectSlug = currentUrl.split("/").pop() || "";
    console.log(`✓ Navigated to project details page for: ${projectSlug}`);

    // --- SECRET SETUP STEP ---
    // Ensure required secrets exist for the environment to deploy successfully
    // (FR-ENV-034 through FR-ENV-041)
    const secretsPage = new SecretsPage(page);
    await secretsPage.goto(projectSlug);

    // Add stub secrets for E2E test if they don't exist
    // These match what the operator expects to find for git operations
    await secretsPage.addSecretIfMissing(
      "GITHUB_APP_ID",
      "123456",
      "Stub App ID for E2E",
    );
    await secretsPage.addSecretIfMissing(
      "GITHUB_APP_PRIVATE_KEY",
      "-----BEGIN RSA PRIVATE KEY-----\nstub\n-----END RSA PRIVATE KEY-----",
      "Stub Private Key for E2E",
    );

    console.log("✓ Verified required secrets are present");
    // -------------------------

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
    // Use current git branch (from GITHUB_HEAD_REF for PRs, GITHUB_REF_NAME for others, or fallback to 'main')
    const testBranch =
      process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || "main";
    const branchInput = page.getByLabel("Branch");
    await expect(branchInput).toBeVisible();
    await branchInput.clear();
    await branchInput.fill(testBranch);

    console.log(`✓ Filled branch field with '${testBranch}'`);

    // Click Create Environment button
    const createButton = page.getByRole("button", {
      name: "Create Environment",
    });
    await expect(createButton).toBeVisible();
    await createButton.click();

    console.log("✓ Clicked Create Environment button");

    // Wait for success message to appear and extract the environment name
    // The message format is "Successfully created development environment: dev-xxx-yyy"
    const successMessage = page.getByText(
      /Successfully created development environment:/i,
    );
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

    // Read the namespace from the data-namespace attribute on the environment link
    // rather than iterating all cluster namespaces.
    const environmentNamespace = await environmentLinks
      .first()
      .getAttribute("data-namespace");
    expect(environmentNamespace).toBeTruthy();
    createdEnvironmentNamespace = environmentNamespace;
    console.log(`✓ Environment namespace from UI: ${environmentNamespace}`);

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

    // Retry health check with backoff (pod startup + ingress propagation delay)
    // The Environment CR reaches Ready before the web container is serving traffic.
    // Init containers (git-clone, npm-install, db-migrate) + Next.js dev startup
    // can take 90+ seconds, so we allow up to ~5 minutes of retries.
    let healthResponse:
      | Awaited<ReturnType<typeof page.request.get>>
      | undefined;
    const maxAttempts = 30;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        healthResponse = await page.request.get(healthUrl, { timeout: 10000 });
        if (healthResponse.ok()) break;
        console.log(
          `⏳ Health check attempt ${attempt + 1}/${maxAttempts} returned HTTP ${healthResponse.status()}, retrying...`,
        );
      } catch (err) {
        console.log(
          `⏳ Health check attempt ${attempt + 1}/${maxAttempts} error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      await page.waitForTimeout(5000);
    }
    expect(healthResponse).toBeDefined();
    expect(healthResponse!.ok()).toBe(true);
    console.log(
      `✓ Preview URL health check returned HTTP ${healthResponse!.status()}`,
    );

    console.log("✓ Test completed successfully — environment is Ready");

    // ── Navigate to environment detail page via the UI link ──

    // Reload platform page to pick up the Ready status in the UI
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Platform Configuration" }),
    ).toBeVisible();

    // Switch to Development Environments Status tab
    const statusTabsFinal = page.getByRole("tab", { name: "Status" });
    await statusTabsFinal.nth(1).click();

    // Click the environment link to navigate to the detail page
    const envLink = page
      .locator('a[href*="/projects/"][href*="/env/"]')
      .filter({ hasText: new RegExp(environmentName) });
    await expect(envLink.first()).toBeVisible({ timeout: 10000 });
    await envLink.first().click();

    // Wait for the environment detail page to load
    await page.waitForURL(new RegExp(`/env/${environmentName}$`), {
      timeout: 30000,
    });
    console.log("✓ Navigated to environment detail page");

    // Verify the "Preview Environment" heading is visible
    await expect(
      page.getByRole("heading", { name: "Preview Environment" }),
    ).toBeVisible();
    console.log("✓ Preview Environment heading visible");

    // Verify the branch name heading is displayed
    const expectedBranch =
      process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || "main";
    await expect(
      page.getByRole("heading", { name: expectedBranch }),
    ).toBeVisible();
    console.log(`✓ Branch name '${expectedBranch}' heading visible`);

    // Verify the preview URL is displayed on the detail page
    const previewLink = page.getByRole("link", { name: result.url! });
    await expect(previewLink).toBeVisible();
    console.log(`✓ Preview URL displayed: ${result.url}`);

    // Verify the namespace text is shown (target namespace contains the env name)
    await expect(
      page.getByText(new RegExp(`Namespace:.*${environmentName}`)),
    ).toBeVisible();
    console.log("✓ Target namespace displayed");

    // Verify the status badge shows Ready
    await expect(page.getByText("Ready")).toBeVisible();
    console.log("✓ Status badge shows Ready");

    // Verify the Pods & Containers section is present
    await expect(
      page.getByRole("heading", { name: "Pods & Containers" }),
    ).toBeVisible();
    console.log("✓ Pods & Containers section visible");

    // Verify the "Open Preview" button/link is present
    const openPreviewLink = page.getByRole("link", { name: "Open Preview" });
    await expect(openPreviewLink).toBeVisible();
    expect(await openPreviewLink.getAttribute("href")).toBe(result.url!);
    console.log("✓ Open Preview link visible and points to correct URL");

    console.log("✓ Environment detail page validation complete");
  });
});
