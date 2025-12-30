import { test, expect } from "./fixtures/projects-fixture";

test.describe("Project Creation Wizard", () => {
  test("should create project with GitHub repo and auto-filled details", async ({
    page,
    projectsPage,
  }) => {
    // DEBUG: Capture browser console output
    page.on("console", (msg) => console.log(`[BROWSER] ${msg.text()}`));

    // Generate unique slug to avoid conflicts with existing projects
    const uniqueSuffix = Date.now().toString().slice(-6);
    const uniqueSlug = `catalyst-test-${uniqueSuffix}`;

    // Navigate to projects page
    await projectsPage.goto();

    // Click "Create Project" button
    const createProjectButton = page.getByRole("link", {
      name: "Create Project",
    });
    await expect(createProjectButton).toBeVisible();
    await createProjectButton.click();

    // Wait for navigation to create page to complete
    await page.waitForURL(/\/projects\/create$/);

    // Step 1: Verify we're on the repository selection step
    await expect(page.getByText("Select Repositories")).toBeVisible();

    // Continue button should be disabled (no repos selected)
    const continueButton = page.getByRole("button", { name: /continue/i });
    await expect(continueButton).toBeDisabled();

    // Open the repo dropdown
    const dropdown = page.getByTestId("repo-dropdown");
    await dropdown.click();

    // Search for catalyst repo
    const searchInput = page.getByTestId("repo-search");
    await searchInput.fill("catalyst");

    // Wait for search results and click on catalyst repo
    const catalystOption = page.getByText("ncrmro/catalyst");
    await expect(catalystOption).toBeVisible();
    await catalystOption.click();

    // Verify repo was added (shows "1 added")
    await expect(page.getByText("1 added")).toBeVisible();

    // Continue button should now be enabled
    await expect(continueButton).toBeEnabled();

    // Click Continue to go to Step 2
    await continueButton.click();

    // Step 2: Verify we're on the project details step
    await expect(page.getByText("Project Details")).toBeVisible();

    // Verify auto-fill from first repo
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toHaveValue("catalyst");

    const slugInput = page.locator('input[name="slug"]');
    await expect(slugInput).toHaveValue("catalyst");

    // Change slug to unique value to avoid conflicts
    await slugInput.clear();
    await slugInput.fill(uniqueSlug);

    // Submit the form
    const createButton = page.getByRole("button", { name: /create project/i });
    await expect(createButton).toBeEnabled();
    await createButton.click();

    // Verify redirect to project home page
    await expect(page).toHaveURL(new RegExp(`/projects/${uniqueSlug}$`));
  });

  test("should navigate back from step 2 to step 1", async ({
    page,
    projectsPage,
  }) => {
    // Navigate to projects page
    await projectsPage.goto();

    // Click "Create Project" button
    await page.getByRole("link", { name: "Create Project" }).click();

    // Wait for navigation to create page to complete
    await page.waitForURL(/\/projects\/create$/);

    // Step 1: Add a repo
    const dropdown = page.getByTestId("repo-dropdown");
    await dropdown.click();

    const searchInput = page.getByTestId("repo-search");
    await searchInput.fill("catalyst");

    await page.getByText("ncrmro/catalyst").click();

    // Go to step 2
    await page.getByRole("button", { name: /continue/i }).click();

    // Verify we're on step 2
    await expect(page.getByText("Project Details")).toBeVisible();

    // Click back button
    await page.getByRole("button", { name: /back/i }).click();

    // Verify we're back on step 1
    await expect(page.getByText("Select Repositories")).toBeVisible();

    // Verify the previously selected repo is still there
    await expect(page.getByText("ncrmro/catalyst")).toBeVisible();
  });

  test("should allow adding manual URL", async ({ page, projectsPage }) => {
    // Navigate to projects page
    await projectsPage.goto();

    // Click "Create Project" button
    await page.getByRole("link", { name: "Create Project" }).click();

    // Wait for navigation to create page to complete
    await page.waitForURL(/\/projects\/create$/);

    // Step 1: Open dropdown and select manual entry
    const dropdown = page.getByTestId("repo-dropdown");
    await dropdown.click();

    await page.getByText("Enter URL manually").click();

    // Enter a manual URL
    const urlInput = page.getByTestId("manual-url-input");
    await urlInput.fill("https://github.com/example/external-repo");

    // Click add button
    const addButton = page.getByTestId("add-manual-url");
    await addButton.click();

    // Verify repo was added
    await expect(page.getByText("1 added")).toBeVisible();
    await expect(
      page.getByText("https://github.com/example/external-repo"),
    ).toBeVisible();

    // Continue should be enabled
    const continueButton = page.getByRole("button", { name: /continue/i });
    await expect(continueButton).toBeEnabled();
  });

  test("should allow adding multiple repos", async ({ page, projectsPage }) => {
    // Navigate to projects page
    await projectsPage.goto();

    // Click "Create Project" button
    await page.getByRole("link", { name: "Create Project" }).click();

    // Wait for navigation to create page to complete
    await page.waitForURL(/\/projects\/create$/);

    // Add first repo - catalyst
    let dropdown = page.getByTestId("repo-dropdown");
    await dropdown.click();

    let searchInput = page.getByTestId("repo-search");
    await searchInput.fill("catalyst");
    await page.getByText("ncrmro/catalyst").click();

    await expect(page.getByText("1 added")).toBeVisible();

    // Add second repo - meze
    dropdown = page.getByTestId("repo-dropdown");
    await dropdown.click();

    searchInput = page.getByTestId("repo-search");
    await searchInput.fill("meze");
    await page.getByText("ncrmro/meze").click();

    await expect(page.getByText("2 added")).toBeVisible();

    // Go to step 2
    await page.getByRole("button", { name: /continue/i }).click();

    // Verify step 2 shows both repos
    await expect(page.getByText("Project Details")).toBeVisible();
    await expect(page.getByText("2 selected")).toBeVisible();

    // Verify auto-fill from FIRST repo (catalyst)
    const nameInput = page.locator('input[name="name"]');
    await expect(nameInput).toHaveValue("catalyst");
  });

  test("should cancel project creation and return to projects list", async ({
    page,
    projectsPage,
  }) => {
    // Navigate to projects page
    await projectsPage.goto();

    // Click "Create Project" button
    await page.getByRole("link", { name: "Create Project" }).click();

    // Wait for navigation to create page to complete
    await page.waitForURL(/\/projects\/create$/);

    // Verify we're on step 1
    await expect(page.getByText("Select Repositories")).toBeVisible();

    // Click cancel button
    await page.getByRole("button", { name: /cancel/i }).click();

    // Verify we're back on projects page
    await expect(page).toHaveURL(/\/projects$/);
  });
});
