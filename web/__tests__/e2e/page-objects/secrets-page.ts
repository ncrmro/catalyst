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
      level: 1,
    });
    this.addSecretButton = page.getByRole("button", { name: "+ Add Secret" });
    this.secretList = page.locator("table");
    this.secretForm = page.locator("form");
    this.nameInput = page.getByLabel("Secret Name");
    this.valueInput = page.getByLabel("Secret Value");
    this.descriptionInput = page.getByLabel("Description (Optional)");
    this.saveButton = page.getByRole("button", { name: "Create Secret" });
    this.cancelButton = page.getByRole("button", { name: "Cancel" });
    this.errorAlert = page.locator(".bg-error-container");
  }

  async goto(projectSlug: string) {
    await this.page.goto(`/projects/${projectSlug}/secrets`);
    await expect(this.pageHeading).toBeVisible();
  }

  /**
   * Add a new secret if it doesn't already exist
   */
  async addSecretIfMissing(name: string, value: string, description?: string) {
    // Check if secret already exists in the table (targeting body rows)
    const secretRow = this.secretList
      .locator("tbody tr")
      .filter({ hasText: name });
    if (await secretRow.isVisible()) {
      console.log(`✓ Secret '${name}' already exists, skipping creation`);
      return;
    }

    console.log(`⏳ Adding secret '${name}'...`);
    await this.addSecretButton.click();
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
