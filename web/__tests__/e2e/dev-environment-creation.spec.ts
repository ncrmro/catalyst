import { test, expect } from "./fixtures/k8s-fixture";
import { ProjectsPage } from "./page-objects/projects-page";

test.describe("Development Environment Creation", () => {
  test.slow(); // Kubernetes operations can be slow in CI

  test("should create a development environment and verify namespace creation", async ({
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

    // Navigate to Platform tab
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

    // Locate the Development Environments section
    // The section should be expanded by default
    const devEnvironmentsHeading = page.getByText("Development Environments");
    await expect(devEnvironmentsHeading).toBeVisible();

    // Click on the "New" tab to create a new development environment
    // Use last() to get the Development Environments "New" tab (appears after Deployment Environments)
    const newDevEnvironmentTab = page
      .getByRole("tab", {
        name: "New",
      })
      .last();
    await expect(newDevEnvironmentTab).toBeVisible();
    await newDevEnvironmentTab.click();

    // Wait for the form to be visible by checking for the description text
    await expect(
      page.getByText("Create a new development environment from a specific branch"),
    ).toBeVisible();

    // Fill in the branch field (optional, defaults to "main")
    const branchInput = page.getByLabel("Branch");
    await expect(branchInput).toBeVisible();
    await branchInput.fill("main");

    // Click the "Create Environment" button
    const createButton = page.getByRole("button", {
      name: "Create Environment",
    });
    await expect(createButton).toBeVisible();
    await createButton.click();

    // Wait for the success message
    await expect(
      page.getByText(/Successfully created development environment/),
    ).toBeVisible({ timeout: 30000 });

    // Extract the environment name from the success message
    const successMessage = await page
      .getByText(/Successfully created development environment/)
      .textContent();
    const envNameMatch = successMessage?.match(/environment:\s*(\S+)/);
    expect(envNameMatch).toBeTruthy();
    const environmentName = envNameMatch![1];

    console.log(`✓ Created development environment: ${environmentName}`);

    // Switch to Status tab to verify environment appears
    const statusTab = page
      .getByRole("tab", {
        name: "Status",
      })
      .last();
    await statusTab.click();

    // Verify the environment appears in the status list
    await expect(page.getByText(environmentName)).toBeVisible({
      timeout: 30000,
    });

    // Verify in Kubernetes that the necessary namespaces were created
    // Check that team namespace exists
    const teamNamespaces = await k8s.coreApi.listNamespace({
      labelSelector: 'catalyst.dev/namespace-type=team',
    });
    expect(teamNamespaces.items.length).toBeGreaterThan(0);
    console.log(`✓ Found ${teamNamespaces.items.length} team namespace(s)`);

    // Check that project namespace exists
    const projectNamespaces = await k8s.coreApi.listNamespace({
      labelSelector: 'catalyst.dev/namespace-type=project',
    });
    expect(projectNamespaces.items.length).toBeGreaterThan(0);
    console.log(`✓ Found ${projectNamespaces.items.length} project namespace(s)`);

    // Verify the Environment CR was created
    const environments = await k8s.customApi.listNamespacedCustomObject({
      group: "catalyst.catalyst.dev",
      version: "v1alpha1",
      namespace: "default",
      plural: "environments",
    });

    const envList = environments as { items: Array<{ metadata?: { name?: string } }> };
    const createdEnv = envList.items.find(
      (env) => env.metadata?.name === environmentName,
    );

    expect(createdEnv).toBeDefined();
    console.log(`✓ Verified Environment CR exists in Kubernetes: ${environmentName}`);

    // Cleanup: Delete the environment
    try {
      await k8s.customApi.deleteNamespacedCustomObject({
        group: "catalyst.catalyst.dev",
        version: "v1alpha1",
        namespace: "default",
        plural: "environments",
        name: environmentName,
      });
      console.log(`✓ Cleaned up environment: ${environmentName}`);
    } catch (error) {
      console.log(`⚠ Failed to clean up environment ${environmentName}`);
    }
  });

  test("should handle namespace creation gracefully when namespaces already exist", async ({
    page,
    k8s,
  }) => {
    // This test ensures that creating multiple development environments
    // doesn't fail due to namespace already existing errors

    const projectsPage = new ProjectsPage(page);
    await projectsPage.goto();
    await projectsPage.expectProjectsToExist();
    await projectsPage.clickProjectCard();
    await projectsPage.verifyProjectDetailsPageLoaded();

    // Navigate to Platform tab
    const projectNavigation = page.getByRole("tablist", {
      name: "Project navigation",
    });
    const platformTab = projectNavigation.getByRole("tab", {
      name: "Platform",
    });
    await platformTab.scrollIntoViewIfNeeded();
    await platformTab.click();
    await page.waitForURL(/\/platform$/, { timeout: 60000 });

    // Locate Development Environments section
    const devEnvironmentsHeading = page.getByText("Development Environments");
    await expect(devEnvironmentsHeading).toBeVisible();

    // Create first environment
    const newDevEnvironmentTab = page.getByRole("tab", { name: "New" }).last();
    await newDevEnvironmentTab.click();
    const createButton = page.getByRole("button", {
      name: "Create Environment",
    });
    await createButton.click();

    // Wait for success
    await expect(
      page.getByText(/Successfully created development environment/),
    ).toBeVisible({ timeout: 30000 });

    const firstSuccessMessage = await page
      .getByText(/Successfully created development environment/)
      .textContent();
    const firstEnvName = firstSuccessMessage?.match(/environment:\s*(\S+)/)?.[1];

    console.log(`✓ Created first environment: ${firstEnvName}`);

    // Wait a bit for the first environment to be processed
    await page.waitForTimeout(2000);

    // Create second environment (should reuse existing namespaces)
    await newDevEnvironmentTab.click();
    await createButton.click();

    // Wait for success - this should succeed even though namespaces already exist
    await expect(
      page.getByText(/Successfully created development environment/),
    ).toBeVisible({ timeout: 30000 });

    const secondSuccessMessage = await page
      .getByText(/Successfully created development environment/)
      .textContent();
    const secondEnvName = secondSuccessMessage?.match(/environment:\s*(\S+)/)?.[1];

    console.log(`✓ Created second environment: ${secondEnvName}`);

    // Verify both environments are different
    expect(firstEnvName).not.toBe(secondEnvName);

    // Verify both Environment CRs exist in Kubernetes
    const environments = await k8s.customApi.listNamespacedCustomObject({
      group: "catalyst.catalyst.dev",
      version: "v1alpha1",
      namespace: "default",
      plural: "environments",
    });

    const envList = environments as { items: Array<{ metadata?: { name?: string } }> };
    const env1 = envList.items.find((env) => env.metadata?.name === firstEnvName);
    const env2 = envList.items.find((env) => env.metadata?.name === secondEnvName);

    expect(env1).toBeDefined();
    expect(env2).toBeDefined();
    console.log(`✓ Verified both environments exist in Kubernetes`);

    // Cleanup
    for (const envName of [firstEnvName, secondEnvName]) {
      if (envName) {
        try {
          await k8s.customApi.deleteNamespacedCustomObject({
            group: "catalyst.catalyst.dev",
            version: "v1alpha1",
            namespace: "default",
            plural: "environments",
            name: envName,
          });
          console.log(`✓ Cleaned up environment: ${envName}`);
        } catch (error) {
          console.log(`⚠ Failed to clean up environment ${envName}`);
        }
      }
    }
  });
});
