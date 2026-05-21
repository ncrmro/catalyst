# Testing Architecture

This project uses a three-tier testing approach to ensure code quality and reliability across all levels of the application.

## Directory Structure

```
tests/
├── unit/           # Unit tests (Vitest)
├── integration/    # Integration tests (Vitest)
├── e2e/            # End-to-end tests (Playwright)
│   └── README.md   # E2E testing guidelines and fixtures
├── agents/         # Agent integration tests (OpenAI)
└── factories/      # Test data factories (fishery + faker)
    └── README.md   # Factory pattern documentation
```

## Test Types

### Unit Tests (`tests/unit/`)

- **Purpose**: Test individual functions, utilities, and pure logic
- **Framework**: Vitest
- **Run**: `npm run test:unit`
- **Examples**:
  - Pure functions like unit conversion utilities
  - Helper functions and calculations
  - Component logic (without rendering)

### Integration Tests (`tests/integration/`)

- **Purpose**: Test interactions between components, actions, and data layers
- **Framework**: Vitest with mocking
- **Run**: `npm run test:integration`
- **Examples**:
  - Server actions with database operations
  - Component + data transformation workflows
  - Form validation with business logic
  - API route handlers

### End-to-End Tests (`tests/e2e/`)

- **Purpose**: Test complete user workflows through the browser
- **Framework**: Playwright
- **Run**: `npm run test:e2e` or `npm run test:e2e:ui`
- **Guidelines**: See `tests/e2e/README.md` for detailed guidelines, fixtures, and page object patterns
- **Examples**:
  - User authentication flows
  - CRUD operations through the UI
  - Navigation and page interactions
  - Form submissions and validations

### Agent Tests (`tests/agents/`)

- **Purpose**: Test AI agent integrations
- **Framework**: Vitest with OpenAI API
- **Run**: `npm run test:agents` (requires `OPENAI_API_KEY`)
- **Examples**:
  - Recipe generation agents
  - Food generation agents
  - Meal generation agents

## Running Tests

### All Tests

```bash
npm test                 # Run all test types sequentially
make ci                  # Run linting + all tests (CI pipeline)
```

### Individual Test Types

```bash
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
npm run test:e2e         # E2E tests only
npm run test:e2e:ui      # E2E tests with Playwright UI
```

## Configuration Files

- `vitest.config.ts` - Vitest configuration for unit and integration tests
- `playwright.config.ts` - Playwright configuration for E2E tests
- `tests/e2e/global-setup.ts` - Global setup for E2E tests

## Writing Tests

### Test Data Factories

**IMPORTANT**: Use test data factories instead of manual object construction for cleaner, more maintainable tests.

See `tests/factories/README.md` for comprehensive documentation.

Benefits:

- **less test code**: Meals test reduced from 165 lines to 20 lines
- **Realistic data**: Faker generates realistic names, emails, dates
- **Type-safe**: Full TypeScript inference
- **Reusable**: Define once, use everywhere
- **Flexible**: Override any field, chain traits for variations

### Unit Tests

```typescript
// tests/unit/my-function.test.ts
import { myFunction } from "../../src/lib/my-function";

describe("myFunction", () => {
  it("should return expected result", () => {
    expect(myFunction(input)).toBe(expectedOutput);
  });
});
```

### Integration Tests

```typescript
// tests/integration/my-feature.test.ts
import { myAction } from '../../src/actions/my-action';
import { userFactory } from '../factories';

// Mock external dependencies
jest.mock('../../src/lib/db', () => ({...}));

describe('My Feature Integration', () => {
  it('should integrate components correctly', async () => {
    // Use factories for test data
    const user = await userFactory.create();

    // Test interactions between layers
    const result = await myAction(user);
    expect(result.success).toBe(true);
  });
});
```

### E2E Tests

```typescript
// tests/e2e/my-workflow.spec.ts
import { test, expect } from "./fixtures/base-fixtures";

test("complete user workflow", async ({ page }) => {
  await page.goto("/projects");
  // Test user interactions
});
```

See `tests/e2e/README.md` for comprehensive E2E testing patterns, fixtures, and page object models.

## Best Practices

1. **Use Factories**: Always use test data factories instead of manual object construction (see `tests/factories/README.md`)
2. **Isolation**: Each test should be independent and not rely on other tests
3. **Mocking**: Use mocks for external dependencies in unit and integration tests
4. **Descriptive**: Use clear, descriptive test names and descriptions
5. **Coverage**: Aim for high coverage but focus on critical paths
6. **Speed**: Keep unit tests fast, integration tests moderate, E2E tests comprehensive
7. **Data Cleanup**: Use test-specific data and clean up after tests (factories help with this)
