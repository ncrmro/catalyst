import { test, expect } from '@playwright/test';
import { loginWithDevPassword } from './helpers';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await loginWithDevPassword(page, testInfo);
  });

  test('should navigate to teams page from home page', async ({ page }) => {
    // Go to the home page
    await page.goto('/');
    
    // Check if there's already a report generated or if we need to generate one
    const reportTitle = page.getByText('Catalyst Platform Status Report');
    const generateButton = page.getByText('📊 Generate Report');
    
    // If no report exists, generate one first
    if (await generateButton.isVisible()) {
      await generateButton.click();
      // Wait for the report to be generated (with longer timeout for server action)
      await expect(reportTitle).toBeVisible({ timeout: 15000 });
    } else {
      // Report already exists, just wait for it to be visible
      await expect(reportTitle).toBeVisible();
    }
    
    // Click the "View Teams" link in the Quick Actions section
    await page.click('text=View Teams');

    // Should navigate to teams page
    await expect(page).toHaveURL('/teams');
    await expect(page.locator('h1')).toContainText('My Teams');
  });
});