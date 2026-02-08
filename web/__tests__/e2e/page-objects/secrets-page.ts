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
   * Add a new secret
   */
  async addSecretIfMissing(name: string, value: string, description?: string) {
    await expect(this.pageHeading).toBeVisible({ timeout: 30000 });

    const card = this.page
      .locator("div")
      .filter({ has: this.pageHeading })
      .first();

    await card.scrollIntoViewIfNeeded();

    // Use the add button specific to the Project Secrets card
    const addBtn = card.getByRole("button", { name: "+ Add Secret" });
    await expect(addBtn).toBeVisible();

    console.log(`⏳ Adding secret '${name}'...`);
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
