# E2E Testing Guidelines

This document outlines the standards and patterns used in the Catalyst E2E test suite.

## Table of Contents

- [Architecture](#architecture)
- [Page Object Model (POM)](#page-object-model-pom)
- [Test Fixtures](#test-fixtures)
- [Best Practices](#best-practices)
- [Testing Patterns](#testing-patterns)
- [Troubleshooting](#troubleshooting)

## Architecture

Our E2E tests are built with Playwright and organized with the following structure:

```
__tests__/e2e/
├── fixtures/          # Custom test fixtures
├── page-objects/      # Page Object Models
├── *.spec.ts          # Test files
├── helpers.ts         # Shared testing utilities
└── README.md          # This documentation
```

## Page Object Model (POM)

The Page Object Model is a design pattern that creates an object repository for web UI elements. It helps reduce code duplication and improves test maintenance.

### Structure

1. **BasePage**: Defines common elements and actions across all pages
   - Navigation elements
   - Header/footer elements
   - Common utility methods

2. **Feature-specific Pages**: Extend BasePage with page-specific elements and methods
   - Page-specific locators
   - Page-specific actions
   - Page state verification methods

### Example Usage

```typescript
// In a test file
test('should navigate through project workflow', async ({ projectsPage }) => {
  await test.step('Navigate to projects page', async () => {
    await projectsPage.goto();
    await projectsPage.verifyProjectsListPageLoaded();
  });

  await test.step('Create new project', async () => {
    await projectsPage.clickCreateProject();
    // ... more test steps
  });
});
```

### Benefits

- **Separation of concerns**: Test logic is separated from page interaction details
- **Reusability**: Page objects can be used across multiple tests
- **Maintainability**: When the UI changes, you only need to update the POM, not every test
- **Readability**: Tests become more concise and easier to understand

## Test Fixtures

Fixtures in Playwright allow you to set up test environment, share objects between tests, and encapsulate common setup logic.

### Custom Fixtures

We've created custom fixtures to:
- Automatically handle authentication
- Initialize Page Object Models
- Set up test data

### Example

```typescript
// In fixtures/projects-fixture.ts
export const test = base.extend<{
  projectsPage: ProjectsPage;
}>({
  projectsPage: async ({ page }, use, testInfo) => {
    // Perform login and seed data automatically
    await loginAndSeedForE2E(page, testInfo);
    
    // Create and initialize the ProjectsPage POM
    const projectsPage = new ProjectsPage(page);
    
    // Provide the initialized ProjectsPage to the test
    await use(projectsPage);
  },
});
```

## Best Practices

### DO

✅ Use the Page Object Model pattern  
✅ Use test.step() for clear test organization  
✅ Add explicit assertions to verify page state  
✅ Break tests into logical steps  
✅ Use descriptive test and function names  
✅ Prefer higher-level actions in POMs (e.g., `loginUser()` instead of `fillUsername()`, `fillPassword()`, `clickLogin()`)  
✅ Keep test files focused on one feature area  

### DON'T

❌ Use `waitForTimeout()` - it leads to flaky tests  
❌ Use `page.waitForLoadState('networkidle')` - it's unreliable in modern web apps  
❌ Put assertions in Page Object Models (POMs should return state, tests should assert)  
❌ Create long, monolithic tests that test many things  
❌ Use hard-coded waits or sleeps  

### Waiting Patterns

Instead of arbitrary timeouts or `networkidle`, use these more reliable patterns:

```typescript
// Good: Wait for specific elements or state
await expect(page.getByRole('heading')).toBeVisible();
await expect(page).toHaveURL('/expected-url');

// Good: Wait for network request to complete
await page.waitForResponse(response => 
  response.url().includes('/api/data') && response.status() === 200
);

// Bad: Arbitrary timeouts
await page.waitForTimeout(1000);

// Bad: Waiting for networkidle
await page.waitForLoadState('networkidle');
```

## Testing Patterns

### Test Organization with test.step()

Use `test.step()` to organize tests into logical sections:

```typescript
test('should complete checkout process', async ({ page }) => {
  await test.step('Add item to cart', async () => {
    // Test steps for adding item
  });
  
  await test.step('Proceed to checkout', async () => {
    // Test steps for checkout
  });
  
  await test.step('Complete payment', async () => {
    // Test steps for payment
  });
});
```

### Single-line Operations

For single-line operations, use comments instead of test.step():

```typescript
// Navigate to home page
await page.goto('/');

// Click login button
await page.getByRole('button', { name: 'Login' }).click();
```

### Handling No Data Scenarios

Always make tests fail explicitly when expected data is not found:

```typescript
// Bad: Silently skipping with console.log
if (projectCount === 0) {
  console.log('No projects found, skipping test');
  return;
}

// Good: Explicitly fail or skip with message
expect(projectCount, 'At least one project is required').toBeGreaterThan(0);

// Alternative: Use test.skip() with clear message
if (projectCount === 0) {
  test.skip('No projects available for testing');
}
```

## Troubleshooting

### Common Issues

1. **Flaky tests**: Usually caused by timing issues or race conditions
   - Replace arbitrary waits with explicit waits for specific elements or states
   - Use `await expect().toBeVisible()` instead of checking if element exists

2. **Selector issues**: Elements not found or ambiguous selectors
   - Use Playwright's built-in selectors like `getByRole()`, `getByText()`
   - Add test IDs to important elements with `data-testid` attributes

3. **Authentication issues**:
   - Ensure the `loginAndSeedForE2E()` function is working correctly
   - Check that session cookies are being properly set

### Debugging Tips

1. **Visual debugging**:
   ```bash
   npx playwright test --debug
   ```

2. **Take screenshots on failure**:
   ```typescript
   // This is configured in playwright.config.ts
   use: {
     screenshot: 'only-on-failure',
   }
   ```

3. **Trace viewing**:
   ```bash
   npx playwright show-trace trace.zip
   ```