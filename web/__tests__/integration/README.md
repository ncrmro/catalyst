# Integration Tests

This directory contains integration tests that verify the functionality of complex, multi-component operations in a real environment. These tests require actual Kubernetes clusters and interact with external services.

## Prerequisites

- **Kubernetes Configuration**: Tests require `KUBECONFIG_PRIMARY` environment variable pointing to a valid kubeconfig file
- **Docker Support**: Tests that build Docker images require buildx and registry access
- **Extended Timeouts**: Integration tests may take several minutes to complete

## GitHub PAT Mocking

### Current Approach

Integration tests mock the `GITHUB_PAT` environment variable because:

1. **CI Environment**: GitHub Actions and other CI systems don't have real PATs configured by default
2. **Public Repository Testing**: Tests use public repos (like `ncrmro/catalyst`) that don't require authentication for cloning
3. **Code Path Testing**: Allows testing the full PR pod creation flow without external dependencies
4. **Consistency**: Ensures tests work reliably across different environments

### Implementation Details

The following integration test files mock `GITHUB_PAT`:

- `k8s-pull-request-pod.test.ts` - Basic PR pod functionality
- `k8s-pull-request-pod-docker-build.test.ts` - Docker build integration

**Example Setup:**
```typescript
beforeAll(async () => {
  // Mock GITHUB_PAT for CI environments where no real PAT is available
  // Note: PR pods need this token for git repository cloning
  process.env.GITHUB_PAT = 'mock-github-pat-for-integration-tests';
  
  // ... rest of setup
});

afterAll(async () => {
  // Clean up mocked environment
  delete process.env.GITHUB_PAT;
  
  // ... rest of cleanup
});
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

### Migration Path

When moving from static PATs to GitHub App tokens:

1. Update `createGitHubPATSecret()` to accept token parameters
2. Modify webhook handlers to pass installation tokens
3. Update integration tests to mock the token service layer
4. Add tests for token refresh and error scenarios

## Test Structure

### k8s-pull-request-pod.test.ts
Tests basic Kubernetes job creation and execution:
- Service account creation with RBAC permissions
- Job manifest generation and deployment
- Pod creation and status monitoring
- Resource cleanup

### k8s-pull-request-pod-docker-build.test.ts
Tests complete Docker build workflow:
- Real repository cloning from GitHub
- Docker buildx setup and configuration
- Image building with proper build context
- Environment variable handling
- Error scenarios (missing Dockerfile, etc.)

### webhook-database.test.ts
Tests webhook integration with database operations:
- Pull request record creation/updates
- Repository lookup and validation
- Database transaction handling

## Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npm run test:integration -- k8s-pull-request-pod.test.ts

# Run with verbose output
npm run test:integration -- --reporter=verbose
```

## Troubleshooting

### Common Issues

1. **KUBECONFIG_PRIMARY not set**: Ensure you have a valid Kubernetes configuration
2. **Permission denied**: Check that your kubeconfig has sufficient cluster permissions
3. **Timeout errors**: Docker builds can be slow; consider increasing test timeouts
4. **Resource conflicts**: Previous test runs may leave resources; check cleanup logic

### Debug Tips

- Check pod logs: `kubectl logs -l app=catalyst-pr-job`
- Verify service accounts: `kubectl get serviceaccounts`
- Monitor job status: `kubectl get jobs`
- Check secret creation: `kubectl get secrets github-pat-secret`