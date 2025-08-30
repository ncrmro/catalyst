# Test Organization

This project follows a clear separation of test types to ensure proper testing practices and avoid common anti-patterns.

## Directory Structure

```
__tests__/
├── unit/           # Unit tests with mocking
├── integration/    # Integration tests without mocking
├── components/     # React component tests
└── e2e/           # End-to-end tests (Playwright)
```

## Test Types

### Unit Tests (`__tests__/unit/`)
- **Purpose**: Test individual functions/modules in isolation
- **Mocking**: Extensive mocking of external dependencies is allowed and expected
- **Scope**: Single function, class, or module
- **Speed**: Fast execution
- **Example**: Testing a function with mocked database calls

**Principles**:
- Mock external dependencies (APIs, databases, file system)
- Test one specific behavior per test
- No conditional logic (if/else) testing multiple paths in same test

### Integration Tests (`__tests__/integration/`)
- **Purpose**: Test how different parts of the system work together
- **Mocking**: NO mocking of external services - tests real integrations
- **Scope**: Multiple modules working together
- **Speed**: Slower than unit tests
- **Example**: Testing actual database operations, real API calls

**Principles**:
- Use real external services when possible
- Test actual integration points
- Each test focuses on one integration scenario
- Split success/error cases into separate tests

### Component Tests (`__tests__/components/`)
- **Purpose**: Test React component behavior and rendering
- **Mocking**: Mock external data sources, keep component logic real
- **Scope**: Individual React components
- **Speed**: Medium
- **Example**: Testing component props, state, and user interactions

### E2E Tests (`__tests__/e2e/`)
- **Purpose**: Test complete user workflows
- **Mocking**: No mocking - tests real application in browser
- **Scope**: Full application stack
- **Speed**: Slowest
- **Example**: Testing user login flow through actual UI

## Running Tests

```bash
# Run all tests
npm test

# Run specific test types
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only  
npm run test:components    # Component tests only
npm run test:e2e          # E2E tests only

# Run with watch mode
npm run test:watch

# Run comprehensive CI tests
make ci

# Run with coverage
npm run test:coverage                # All Jest tests with coverage
npm run test:coverage:unit          # Unit tests with coverage
npm run test:coverage:integration   # Integration tests with coverage
npm run test:coverage:components    # Component tests with coverage
npm run test:e2e:coverage          # E2E tests with coverage
npm run coverage:report             # Complete coverage report
npm run coverage:merge              # Merge coverage from all sources

# CI with coverage
make ci-coverage
```

## Test Coverage

The project uses Istanbul with Jest and Playwright for comprehensive code coverage:

- **Coverage Tools**: Istanbul (built into Jest) + Playwright V8 coverage
- **Reports**: HTML, LCOV, JSON, and text formats
- **Thresholds**: 25% statements, 20% branches, 25% functions/lines
- **Merge**: Combines coverage from all test types
- **CI Integration**: Automatic coverage collection and reporting

See [Test Coverage Guide](docs/test-coverage.md) for complete documentation.

## Testing Principles

### Single Responsibility
Each test should verify **one specific behavior** or outcome:

❌ **Bad - Tests multiple paths**:
```typescript
test('API endpoint', () => {
  const response = callAPI();
  if (response.success) {
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
  } else {
    expect(response.status).toBeGreaterThan(400);
    expect(response.error).toBeDefined();
  }
});
```

✅ **Good - Separate focused tests**:
```typescript
test('API endpoint returns success for valid input', () => {
  const response = callAPI(validInput);
  expect(response.status).toBe(200);
  expect(response.data).toBeDefined();
});

test('API endpoint returns error for invalid input', () => {
  const response = callAPI(invalidInput);
  expect(response.status).toBe(400);
  expect(response.error).toBeDefined();
});
```

### Integration vs Unit Test Classification

❌ **Bad - "Integration" test with heavy mocking**:
```typescript
// This is actually a unit test, not integration
jest.mock('@octokit/rest');
jest.mock('../../src/auth');
test('GitHub integration', () => {
  // Tests mocked responses, not real integration
});
```

✅ **Good - True integration test**:
```typescript
// No mocking - tests real GitHub API
test('GitHub integration', () => {
  // Uses real GitHub API calls
  // Tests actual integration behavior
});
```

✅ **Good - Properly labeled unit test**:
```typescript
jest.mock('@octokit/rest');
jest.mock('../../src/auth');
test('GitHub service unit test', () => {
  // Tests function logic with mocked dependencies
});
```

## Migration Notes

Previous test files have been reorganized:
- Heavily mocked tests moved to `unit/`
- Tests with conditional logic split into focused tests
- True integration tests moved to `integration/`
- Component tests moved to `components/`

This ensures each test has a clear purpose and follows single responsibility principles.