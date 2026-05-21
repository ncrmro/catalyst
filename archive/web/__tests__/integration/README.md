# Integration Tests

This directory contains integration tests that verify the functionality of complex, multi-component operations in a real environment. These tests require actual Kubernetes clusters and interact with external services.

## Prerequisites

- **Kubernetes Configuration**: Tests require `KUBECONFIG_PRIMARY` environment variable pointing to a valid kubeconfig file
- **Extended Timeouts**: Integration tests may take several minutes to complete

## GitHub PAT Mocking

### Current Approach

Integration tests mock the `GITHUB_PAT` environment variable because:

1. **CI Environment**: GitHub Actions and other CI systems don't have real PATs configured by default
2. **Public Repository Testing**: Tests use public repos (like `ncrmro/catalyst`) that don't require authentication for cloning
3. **Code Path Testing**: Allows testing the full preview deployment flow without external dependencies
4. **Consistency**: Ensures tests work reliably across different environments

### Implementation Details

The following integration test files mock `GITHUB_CONFIG` to provide a mock PAT:

- `webhook-database.test.ts` - Webhook processing with preview deployments

**Example Setup:**

```typescript
import { vi } from "vitest";

// Mock the VCS providers configuration
vi.mock("@/lib/vcs-providers", () => ({
  GITHUB_CONFIG: {
    PAT: "mock-github-pat-for-integration-tests",
    GHCR_PAT: "mock-ghcr-pat-for-integration-tests",
  },
}));
```

### When Real PATs Are Needed

The mocked PAT approach works for current integration tests, but a **real PAT would be required** if testing:

- **Private repositories**: Repositories that require authentication for cloning
- **GitHub Container Registry operations**: Pushing/pulling images from GHCR
- **Rate limit scenarios**: Testing GitHub API rate limiting behavior
- **Token refresh/rotation logic**: Testing token expiration and renewal
- **Permission-specific operations**: Testing operations that require specific token scopes

### Future Considerations

As the system evolves to use GitHub App installation tokens, these tests should be updated to:

1. **Mock the GitHub App token service** instead of environment variables
2. **Test token refresh scenarios** and expiration handling
3. **Validate proper scope and permission handling** for different operations
4. **Support user-specific tokens** for multi-tenant scenarios

## Preview Deployment Flow

The platform uses a Kubernetes operator to manage preview environments via Custom Resources (CRDs):

1. **Webhook Trigger**: GitHub webhook receives PR events (opened, synchronize, reopened, closed)
2. **Database Update**: PR record is created/updated in the database
3. **Preview Orchestration**: `createPreviewDeployment()` is called, which:
   - Creates an Environment CR in the Kubernetes cluster
   - The operator reconciles the CR and creates necessary resources (pods, services, ingress)
   - Namespace creation and lifecycle management is handled by the operator
4. **Status Tracking**: Deployment status is tracked in the `pullRequestPods` table

## Test Structure

### webhook-database.test.ts

Tests webhook integration with database operations:

- Pull request record creation/updates
- Repository lookup and validation
- Database transaction handling
- Preview deployment orchestration

## Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm run test:integration -- webhook-database.test.ts

# Run with verbose output
npm run test:integration -- --reporter=verbose
```

## Troubleshooting

### Common Issues

1. **KUBECONFIG_PRIMARY not set**: Ensure you have a valid Kubernetes configuration
2. **Permission denied**: Check that your kubeconfig has sufficient cluster permissions
3. **Timeout errors**: Deployments can take time; consider increasing test timeouts
4. **Resource conflicts**: Previous test runs may leave resources; check cleanup logic

### Debug Tips

- Check Environment CRs: `kubectl get environments -A`
- View operator logs: `kubectl logs -n catalyst-system deployment/catalyst-operator`
- Check preview deployment pods: `kubectl get pods -l app=preview-environment`
- Monitor deployment status: `kubectl get deployments -A`
