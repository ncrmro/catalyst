# Integration Tests Review

This document reviews the integration tests in the `web/__tests__` directory to identify tests that are using mocked data and tests that contain if-else statements that don't test a single branch of logic.

## Summary

- **Total test files reviewed**: 23 (16 unit/integration + 5 e2e + 2 component)
- **Unit test files with extensive mocking**: 8
- **Files with problematic if-else branching**: 3
- **True integration tests (minimal mocking)**: 2
- **E2E tests (Playwright)**: 5
- **Component tests**: 2

## Tests Using Mocked Data

### 1. `actions/repos.github.test.ts` ⚠️ HEAVILY MOCKED

**Issues:**

- Mocks `@octokit/rest` and `auth` functions extensively
- Uses environment variables to switch between mocked and real data (`MOCKED=1`, `GITHUB_REPOS_MODE=mocked`)
- Not a true integration test

**Mocking Details:**

```typescript
jest.mock("../../src/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@octokit/rest", () => ({
  Octokit: jest.fn(),
}));
```

**Recommendation:** Split into unit tests (for mocked scenarios) and true integration tests (for real GitHub API calls).

### 2. `clusters.test.ts` ⚠️ HEAVILY MOCKED

**Issues:**

- Mocks the entire `@kubernetes/client-node` module
- All Kubernetes client interactions are mocked

**Mocking Details:**

```typescript
jest.mock("@kubernetes/client-node", () => ({
  KubeConfig: jest.fn().mockImplementation(() => ({
    loadFromString: jest.fn(),
    loadFromDefault: jest.fn(),
    getCurrentContext: jest.fn(() => "test-context"),
    getCurrentCluster: jest.fn(() => ({ server: "https://test-server:6443" })),
    makeApiClient: jest.fn(),
  })),
}));
```

**Recommendation:** Create separate unit tests for mocked scenarios and integration tests with real kubeconfig.

### 3. `actions/kubernetes.test.ts` ⚠️ HEAVILY MOCKED

**Issues:**

- Mocks the `k8s-namespaces` module completely
- Tests mocked responses rather than real Kubernetes operations

**Mocking Details:**

```typescript
jest.mock("../../src/lib/k8s-namespaces", () => ({
  createProjectNamespace: jest.fn(),
  deleteNamespace: jest.fn(),
  generateNamespaceName: jest.fn(),
}));
```

**Recommendation:** Move to unit test category and create true integration tests for Kubernetes operations.

### 4. `api/github/webhook.test.ts` ⚠️ MOCKED

**Issues:**

- Mocks Kubernetes actions
- Uses `node-mocks-http` for HTTP request simulation

**Mocking Details:**

```typescript
jest.mock("../../../src/actions/kubernetes", () => ({
  createKubernetesNamespace: jest.fn(),
  deleteKubernetesNamespace: jest.fn(),
}));
```

### 5. Other Files with Mocking

- `api/github/register.test.ts` - Uses mocking
- `api/github/callback.test.ts` - Uses mocking
- `auth.test.ts` - Uses mocking
- `teams.test.ts` - Uses mocking
- `agents/periodic-report.test.ts` - Uses mocking
- `admin-auth.test.ts` - Uses mocking
- `lib/feature-flags.test.ts` - Uses mocking
- `actions/reports.test.ts` - Uses mocking

## E2E Tests (Playwright) ✅ TRUE INTEGRATION TESTS

The repository includes proper E2E tests using Playwright that represent true integration testing:

### Files:

- `e2e/clusters.spec.ts` - Tests cluster page functionality with real browser
- `e2e/github-webhook-namespace.spec.ts` - Tests GitHub webhook integration
- `e2e/kubernetes.spec.ts` - Tests Kubernetes functionality end-to-end
- `e2e/repos.spec.ts` - Tests repository management
- `e2e/teams.spec.ts` - Tests team management

These E2E tests are **properly designed integration tests** because they:

- Use real browsers via Playwright
- Test actual user workflows
- Don't mock external dependencies
- Test the full application stack

## Component Tests

### Files:

- `clusters-page.test.tsx` - Component testing for clusters page
- `kubeconfigs/page.test.tsx` - Component testing for kubeconfig page

These are appropriate component-level tests that focus on UI behavior.

## Tests with Problematic If-Else Branching

### 1. `kubernetes-deploy-nginx.integration.test.ts` ⚠️ MULTIPLE BRANCHES

**Issues:**

- Contains extensive if-else logic that tests both success and error paths in the same test
- Violates single responsibility principle for tests

**Problematic Code:**

```typescript
if (data.success) {
  // If successful (with working kind cluster)
  expect(response.status).toBe(200);
  expect(data.message).toBe("Nginx deployment created successfully");
  // ... more success assertions
} else {
  // Expected behavior when Kubernetes client fails
  expect(response.status).toBeGreaterThanOrEqual(500);
  expect(data.error).toBeDefined();
  // ... more error assertions
}
```

**Recommendation:** Split into separate tests:

- One test for successful deployment scenarios
- Another test for error/failure scenarios
- Use proper test setup to force specific conditions

### 2. `health/readiness.test.ts` ⚠️ DUAL BRANCH TESTING

**Issues:**

- Single test handles both success and failure cases
- Makes it unclear which branch is actually being tested

**Problematic Code:**

```typescript
if (data.success) {
  expect(data.message).toBe("Database connection successful");
  expect(data).toHaveProperty("result");
} else {
  expect(data.message).toBe("Database connection failed");
  expect(data).toHaveProperty("error");
}
```

**Recommendation:** Create separate tests for database connectivity scenarios.

### 3. `database/projects.integration.test.ts` ⚠️ CONDITIONAL LOGIC

**Issues:**

- Contains multiple conditional checks that may skip assertions
- Tests become unpredictable based on data availability

**Problematic Code:**

```typescript
if (result.projects.length > 0) {
  const project = result.projects[0];
  // ... assertions only run if data exists
}

if (projectWithRepos) {
  // ... assertions only run if repos exist
}
```

**Recommendation:** Use proper test fixtures and setup to ensure consistent data state.

## True Integration Tests (Recommended Examples)

### 1. E2E Tests ✅ EXCELLENT EXAMPLES

**Why they're excellent:**

- Use Playwright for real browser testing
- Test actual user workflows and integration points
- No mocking of external services
- Test the full application stack from UI to backend

### 2. `actions/projects.test.ts` ✅ GOOD EXAMPLE

**Why it's good:**

- Tests actual function behavior without extensive mocking
- Uses consistent mock data structure
- Each test focuses on a single aspect

### 3. `database/projects.integration.test.ts` ⚠️ NEEDS IMPROVEMENT

**Why it's partially good:**

- Tests real database interactions
- Has proper error handling tests
- **Needs improvement:** Remove conditional branching logic

## Recommendations

### For Tests Using Mocks:

1. **Rename appropriately**: Change from "integration" to "unit" tests for heavily mocked tests
2. **Create true integration tests**: Build separate integration tests that use real services
3. **Use test containers**: Consider using Docker containers for real service dependencies

### For Tests with If-Else Branching:

1. **Split tests**: Create separate test cases for each logical branch
2. **Use proper setup**: Implement beforeEach/beforeAll to set up specific test conditions
3. **Mock strategically**: Use mocks to force specific conditions (success/failure) per test
4. **Test one thing**: Each test should verify one specific behavior or outcome

### General Integration Test Guidelines:

1. **Real dependencies**: Integration tests should use real external services when possible
2. **Isolated assertions**: Each test should focus on one integration point
3. **Predictable state**: Tests should not depend on conditional data availability
4. **Clear naming**: Test names should clearly indicate what integration is being tested

## Conclusion

The testing strategy in this repository is actually quite comprehensive when viewed holistically:

**Strengths:**

- **Excellent E2E test coverage** using Playwright for true integration testing
- Good separation between unit tests and E2E tests
- Comprehensive test coverage across different layers

**Areas for Improvement:**

- Many files labeled as "integration" tests are actually unit tests due to extensive mocking
- Some tests have problematic if-else branching that violates single responsibility principle
- Need better distinction between unit tests (with mocks) and integration tests (with real services)

**Specific Issues Identified:**

1. **8 test files** are heavily mocked but may be misnamed as integration tests
2. **3 test files** contain if-else branching that tests multiple scenarios in single tests
3. **2 test files** could benefit from better test setup to avoid conditional assertions

**The Good News:**
The repository already has proper integration testing via the E2E test suite. The main issue is classification and naming of the other test files.

## Refactoring Recommendations

### Priority 1: Fix Branching Logic

1. **Split conditional tests**: Files with if-else logic should be split into focused tests
2. **Use proper test setup**: Implement beforeEach/beforeAll to set up specific test conditions
3. **Test one thing**: Each test should verify one specific behavior or outcome

### Priority 2: Reclassify Test Types

1. **Rename heavily mocked tests**: Change from "integration" to "unit" tests
2. **Create true service integration tests**: For testing actual service integrations without UI
3. **Maintain E2E tests**: Continue using Playwright for full-stack integration testing

### Priority 3: Improve Test Design

1. **Predictable state**: Tests should not depend on conditional data availability
2. **Clear naming**: Test names should clearly indicate what is being tested
3. **Strategic mocking**: Use mocks to force specific conditions (success/failure) per test
