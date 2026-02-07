import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./base-page";

/**
 * Page Object Model for the Secrets management page
 */
export class SecretsPage extends BasePage {
  readonly pageHeading: Locator;
  readonly addSecretButton: Locator;
  readonly secretList: Locator;
  readonly secretForm: Locator;
  readonly nameInput: Locator;
  readonly valueInput: Locator;
  readonly descriptionInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = page.getByRole("heading", {
      name: "Project Secrets",
      level: 2,
    });
    this.addSecretButton = page.getByRole("button", { name: "+ Add Secret" });
    this.secretList = page.locator("table");
    this.secretForm = page.locator("form");
    this.nameInput = page.getByLabel("Secret Name");
    this.valueInput = page.getByLabel("Secret Value");
    this.descriptionInput = page.getByLabel("Description (Optional)");
    this.saveButton = page.getByTestId("secret-form-submit");
    this.cancelButton = page.getByRole("button", { name: "Cancel" });
    this.errorAlert = page.locator(".bg-error-container");
  }

  async goto(projectSlug: string) {
    await this.page.goto(`/projects/${projectSlug}/platform`);
    await expect(this.pageHeading).toBeVisible();
  }

  /**
   * Add a new secret if it doesn't already exist
   */
  async addSecretIfMissing(name: string, value: string, description?: string) {
    // Wait for "Loading..." to disappear if present
    await expect(this.page.getByText("Loading")).not.toBeVisible({
      timeout: 30000,
    });

    // Find the Project Secrets card container
    const card = this.page
      .locator("div")
      .filter({ has: this.pageHeading })
      .first();

    // Scroll card into view before interacting
    await card.scrollIntoViewIfNeeded();

    // Check if the table is visible. If not, click the chevron button to expand.
    if (!(await this.secretList.isVisible())) {
      const chevronButton = card.getByTestId("project-secrets-expand");
      await chevronButton.click();
      await expect(this.secretList).toBeVisible();
    }

    // Check if secret already exists in the table (targeting body rows)
    const secretRow = this.secretList
      .locator("tbody tr")
      .filter({ hasText: name });
    if (await secretRow.isVisible()) {
      console.log(`✓ Secret '${name}' already exists, skipping creation`);
      return;
    }

    console.log(`⏳ Adding secret '${name}'...`);
    // Use the add button specific to the Project Secrets card if multiple exist on page
    const addBtn = card.getByRole("button", { name: "+ Add Secret" });
    await addBtn.click();
    await expect(this.secretForm).toBeVisible();

    await this.nameInput.fill(name);
    await this.valueInput.fill(value);
    if (description) {
      await this.descriptionInput.fill(description);
    }

    await this.saveButton.click();

    // Wait for form to disappear and secret to appear in list
    await expect(this.secretForm).not.toBeVisible();
    await expect(
      this.secretList.locator("tbody tr").filter({ hasText: name }),
    ).toBeVisible();
    console.log(`✓ Secret '${name}' added successfully`);
  }
}
