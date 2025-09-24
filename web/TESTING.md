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
npm run test:integration:prpod # PR pod integration tests only
npm run test:components    # Component tests only
npm run test:e2e          # E2E tests only

# Run with watch mode
npm run test:watch

# Run comprehensive CI tests
make ci
```

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

## Docker Build Integration Tests

### Overview

The Docker build integration tests (`__tests__/integration/k8s-pull-request-pod-docker-build.test.ts`) provide comprehensive testing of the PR pod Docker image building functionality. These tests verify the complete workflow from webhook trigger to Docker image building.

### Test Coverage

**Service Account & RBAC Testing:**
- Service account creation with buildx permissions
- Comprehensive RBAC rules for Kubernetes resource management
- Role and RoleBinding verification

**Docker Build Workflow Testing:**
- Buildx Kubernetes driver setup and configuration
- Git repository cloning (shallow and full clone modes)
- Docker build context validation and execution
- Environment variable integration and configuration
- Real Docker image building with Next.js application

**Error Handling & Edge Cases:**
- Missing Dockerfile detection and graceful failure
- Invalid build context handling
- Resource cleanup and management
- Extended timeout handling for Docker operations

**Environment Variable Testing:**
- `SHALLOW_CLONE` configuration (true/false)
- `NEEDS_BUILD` flag behavior
- `MANIFEST_DOCKERFILE` path handling
- Repository URL and branch configuration

### Test Environment Requirements

**Prerequisites:**
- Kubernetes cluster with Docker buildx support
- Valid `KUBECONFIG_PRIMARY` environment variable
- Kubernetes cluster permissions for:
  - Creating/deleting Jobs, ServiceAccounts, Roles, RoleBindings
  - Managing pods and monitoring logs
  - Building Docker images with buildx

**Extended Timeouts:**
- Docker build operations: 5 minutes (300,000ms)
- Pod readiness: 2 minutes (120,000ms)
- Repository cloning: 2 minutes (120,000ms)

### Running Docker Build Tests

```bash
# Run only PR pod integration tests
npm run test:integration:prpod

# Run with verbose output for debugging
VERBOSE=1 npm run test:integration:prpod

# Run all integration tests (includes PR pod tests)
npm run test:integration
```

### Test Scenarios

**1. Complete Docker Build Workflow**
- Tests end-to-end Docker image building
- Verifies buildx Kubernetes driver setup
- Validates repository cloning and build context
- Monitors actual Docker build execution

**2. Environment Variable Configuration**
- Tests shallow vs full repository cloning
- Validates build skipping with `NEEDS_BUILD=false`
- Verifies Dockerfile path configuration

**3. Error Handling**
- Tests missing Dockerfile scenarios
- Validates graceful failure modes
- Verifies comprehensive resource cleanup

### Interpreting Test Results

**Successful Test Output:**
```
✅ Service account created with buildx permissions
✅ Docker build workflow completed successfully
✅ Build logs show proper progression through all stages
✅ Resource cleanup completed without errors
```

**Common Failure Scenarios:**
- **Kubernetes Access**: Verify `KUBECONFIG_PRIMARY` is set correctly
- **Docker Build Timeout**: Slow builds may exceed timeout (expected behavior)
- **Resource Permissions**: Ensure cluster has sufficient RBAC permissions
- **Image Registry**: Some tests may require Docker registry access

**Pod Status Interpretation:**
- `Succeeded`: Complete successful Docker build
- `Failed`: Build failed (logs will show specific error)
- `Running`: Build in progress (may exceed test timeout for large images)

### Debugging Failed Tests

**Check Pod Logs:**
```bash
kubectl logs -l job-name=test-docker-build-<timestamp> -n default
```

**Verify Cluster Resources:**
```bash
kubectl get pods,jobs,serviceaccounts,roles -n default
```

**Monitor Build Progress:**
```bash
kubectl logs -f <pod-name> -n default
```

The Docker build integration tests provide comprehensive validation that the PR pod system can successfully build real Docker images in a Kubernetes environment, ensuring the webhook-to-deployment pipeline works correctly.