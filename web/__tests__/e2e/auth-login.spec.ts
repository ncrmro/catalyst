import { test, expect } from "@playwright/test";
import { loginWithDevPassword } from "./helpers";

test.describe("Authentication", () => {
  test("should login with admin password", async ({ page }, testInfo) => {
    // Use the helper which handles dynamic credentials and correct button text
    await loginWithDevPassword(page, testInfo, "admin");

    // Verify we're logged in by checking for the Projects breadcrumb in navigation
    await expect(
      page.getByRole("navigation").getByText("Projects"),
    ).toBeVisible();
  });
});
