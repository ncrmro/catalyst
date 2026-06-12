# E2E Testing with Playwright

## Overview

End-to-end tests verify complete user workflows using Playwright. Tests are organized using the **Page Object Model** pattern with reusable **fixtures** for authentication and onboarding.

## Core Principles

### 1. **Never use `networkidle`**

Use specific element visibility checks instead:

```typescript
// ❌ BAD - Don't use networkidle
await page.waitForLoadState("networkidle");

// ✅ GOOD - Wait for specific elements
await page.getByRole("heading", { name: "Dashboard" }).waitFor();
```

### 2. **No Branching Logic**

**CRITICAL**: Never add conditional logic (if/else, switch, ternary) in:

- Test files (`*.spec.ts`)
- Fixtures (`fixtures/*.ts`)
- Page objects (`page-objects/*.ts`)

```typescript
// ❌ BAD - No branching logic
if (isMobile) {
  await page.click(".mobile-menu");
} else {
  await page.click(".desktop-menu");
}

// ✅ GOOD - Handle both cases in page object
await basePage.navigateToProjects(); // Handles mobile/desktop internally
```

**Real-world anti-pattern to NEVER use:**

```typescript
// ❌ TERRIBLE - NEVER DO THIS - Conditional navigation logic in tests
await test.step("Navigate to meal plan nutrition page", async () => {
  const nutritionLink = page.getByRole("link", { name: /nutrition/i }).first();

  if (await nutritionLink.isVisible()) {
    await nutritionLink.click();
    await page.waitForLoadState("networkidle");
  } else {
    // Fallback: navigate directly
    await page.goto("/meal-plan");
    await page.waitForLoadState("networkidle");

    const currentUrl = page.url();
    await page.goto("/meal-plans/1");
    await page.waitForLoadState("networkidle");
  }
});

// ✅ GOOD - Deterministic navigation in page object
await projectsPage.gotoEnvironmentPage(projectId);
```

**Why this is bad:**

- Creates non-deterministic tests (different paths on each run)
- Hides bugs (code works in one path but not the other)
- Makes tests flaky and hard to debug
- Violates the E2E principle of testing what users actually do

**The fix:**

- Tests should be deterministic - same path every time
- Put any conditional logic in page objects if absolutely necessary
- Better yet: eliminate conditions by ensuring test state is predictable

### 3. **Use Page Object Models**

All navigation and interaction should go through page objects in `page-objects/`:

- `BasePage.ts`: Common navigation (navbar, account dropdown, sign out)
- `ProjectsPage.ts`: Project management and operations
- And more...

### 4. **Use Base Fixtures**

Import from `./fixtures/base-fixtures` for pre-configured user contexts:

```typescript
import { test, expect } from "./fixtures/base-fixtures";

test("my test", async ({ page }) => {
  // User is already authenticated
  await page.goto("/projects");
});
```

## Available Fixtures

### Authentication States

- **`page`**: Authenticated user context (cookie-based, fast)
- **`authenticatedAdmin`**: Admin user context (cookie-based, fast)
- **`unauthenticatedPage`**: Clean slate for testing auth flows

### Domain-Specific Fixtures

- **`projects-fixture.ts`**: Project setup with repos
- **`environments-fixture.ts`**: Environment creation
- **`k8s-fixture.ts`**: Kubernetes cluster setup

### Example Usage

```typescript
import { test, expect } from "./fixtures/base-fixtures";
import { ProjectsPage } from "./page-objects/ProjectsPage";

test("create project", async ({ page }) => {
  const projectsPage = new ProjectsPage(page);

  await projectsPage.goto();
  await projectsPage.createProject("My Project");
  await expect(page.getByText("My Project")).toBeVisible();
});
```

## Page Object Pattern

### Structure

All page objects should extend or follow the `BasePage` pattern:

```typescript
import { Page, Locator } from "@playwright/test";

export class MyPage {
  readonly page: Page;
  readonly someElement: Locator;

  constructor(page: Page) {
    this.page = page;
    this.someElement = page.getByRole("button", { name: "Click Me" });
  }

  async performAction() {
    await this.someElement.click();
  }
}
```

### Common Patterns

- **Navigation**: Use `BasePage` methods (`navigateToMealPlan()`, `navigateToAccount()`)
- **Forms**: Define locators for inputs and submit buttons
- **Assertions**: Keep assertions in test files, not page objects
- **Mobile/Desktop**: Handle both in page object methods (no branching in tests)

## Fixtures

### Base Fixtures (`fixtures/base-fixtures.ts`)

Provides fast cookie-based authentication:

- Creates test users with deterministic credentials
- Sets authentication cookies (faster than UI login)
- Cleans up contexts automatically after tests

### Domain-Specific Fixtures

- **`projects-fixture.ts`**: Project setup with repos
- **`environments-fixture.ts`**: Environment creation
- **`k8s-fixture.ts`**: Kubernetes cluster setup

### Creating Custom Fixtures

```typescript
import { test as base } from "./base-fixtures";

export const test = base.extend<{ myFixture: MyType }>({
  myFixture: async ({ page }, use) => {
    // Setup code
    const myData = await setupMyData(page);

    await use(myData);

    // Cleanup code (optional)
  },
});
```

## Running Tests

```bash
npm run test:e2e         # All E2E tests
npm run test:e2e:ui      # With Playwright UI
make ci                  # Full CI pipeline (includes E2E)
```

### Debugging

```bash
npm run test:e2e:ui                    # Interactive UI mode
npx playwright test --debug            # Debug mode
npx playwright test --headed           # Show browser
npx playwright test <file> --headed    # Run specific file
```

## Test Organization

### File Naming

- `<feature>.spec.ts`: Feature-specific tests
- `<feature>-<specific>.spec.ts`: More specific tests

### Test Structure

```typescript
import { test, expect } from "./fixtures/base-fixtures";
import { MyPage } from "./page-objects/MyPage";

test.describe("Feature Name", () => {
  test("should do something", async ({ page }) => {
    const myPage = new MyPage(page);

    // Arrange
    await myPage.goto();

    // Act
    await myPage.performAction();

    // Assert
    await expect(page.getByText("Expected Result")).toBeVisible();
  });
});
```

## Best Practices

1. **Fast Authentication**: Use fixtures (cookie-based) instead of UI login
2. **Specific Waits**: Wait for specific elements, never `networkidle`
3. **Page Objects**: Encapsulate page interactions and navigation
4. **No Branching**: Handle mobile/desktop in page objects, not tests
5. **Clean Tests**: Keep tests readable and focused on user actions
6. **Assertions in Tests**: Page objects should not contain assertions
7. **Reusable Fixtures**: Extract common setup into fixtures

## Common Patterns

### Navigation

```typescript
// Use BasePage for common navigation
const basePage = new BasePage(page);
await basePage.navigateToProjects(); // Handles mobile/desktop
await basePage.navigateToAccount();
await basePage.signOut();
```

### Form Submission

```typescript
// Define form locators in page object
export class MyFormPage {
  readonly nameInput: Locator;
  readonly submitButton: Locator;

  async fillForm(name: string) {
    await this.nameInput.fill(name);
    await this.submitButton.click();
  }
}
```

### Waiting for Results

```typescript
// Wait for specific elements after actions
await submitButton.click();
await page.getByText("Success").waitFor();
await expect(page.getByText("Success")).toBeVisible();
```

## Troubleshooting

### Tests Timing Out

- Ensure specific element waits instead of `networkidle`
- Check if development server is running
- Verify database migrations are applied

### Authentication Issues

- Check `AUTH_SECRET` environment variable
- Verify cookie domain matches test URL
- Use `authenticatedUser` fixture for debugging

### Flaky Tests

- Add explicit waits for dynamic content
- Use `waitFor()` before assertions
- Avoid time-based waits (use element visibility)

## File Structure

```
tests/e2e/
├── fixtures/
│   ├── base-fixtures.ts         # Authentication fixtures
│   ├── projects-fixture.ts      # Project-specific fixtures
│   ├── environments-fixture.ts  # Environment fixtures
│   └── k8s-fixture.ts           # Kubernetes fixtures
├── page-objects/
│   ├── BasePage.ts              # Common navigation
│   ├── ProjectsPage.ts          # Project operations
│   └── ...                      # Other page objects
├── helpers.ts                   # Shared helper functions
├── global-setup.ts              # Global test setup
└── *.spec.ts                    # Test files
```

## Local vs CI Environment

### Local: K3s VM + Helm

- Started via `bin/e2e-cluster up` (see project root `CLAUDE.md`)
- Uses K3s with **Flannel** CNI
- Flannel **does not enforce** NetworkPolicies, so policy misconfigurations are invisible locally
- Port forwarding: K3s API on `localhost:6443`, web on NodePort 30000

### CI: Kind + Helm

- Configured in `.github/workflows/web.test.yml`
- Uses Kind with **kindnet** CNI
- kindnet **does enforce** NetworkPolicies, so policy bugs surface here first
- Images are built and loaded into the Kind cluster before Helm install

### Key Difference: NetworkPolicy Enforcement

NetworkPolicy bugs only appear in CI. If a deny-all policy is missing an intra-namespace allow rule, pods in the same namespace cannot communicate. Locally on K3s/Flannel this works fine; in CI on Kind/kindnet the `db-migrate` init container fails with `ETIMEDOUT` trying to connect to the postgres service.

### Common CI Failures

- **OOMKill (502/503 from ingress)**: The web container was OOMKilled (exit code 137). Check memory limits — `next dev --turbopack` requires 2Gi.
- **ETIMEDOUT in db-migrate**: NetworkPolicy is blocking intra-namespace traffic. Verify the policy includes a `podSelector: {}` ingress rule.
- **Timeout waiting for Ready**: Slow `npm install` on CI runners, or init container sequence stalled. Check pod events and init container logs.

### Deployment Environment Test

The deployment-environment E2E test creates a real Environment CR. The operator must reconcile the full init container sequence (`git-clone` -> `npm-install` -> `db-migrate`) before the pod becomes Ready. This test exercises the complete Kubernetes deployment pipeline and is sensitive to NetworkPolicy, resource limits, and operator reconciliation timing.
