# GitHub Webhook Kubernetes Workloads

This document describes the GitHub webhook integration for automatically deploying Kubernetes workloads based on GitHub repository events.

## Overview

The system automatically deploys Kubernetes workloads when:
- Push events occur on specific branches (main, master, develop, staging, release/*)
- Pull requests are opened, updated, or closed

## Features

### Automatic Deployments
- **Release branches**: Deploys to production/staging environments
- **Pull requests**: Creates temporary preview environments
- **Testing**: Automatically runs tests after deployment
- **Cleanup**: Removes PR environments when pull requests are closed

### Configuration-Driven
- Repository and branch mapping to workloads
- Configurable Helm chart paths and values
- Environment-specific settings (production, staging, development)
- Resource limits and ingress configuration

## Architecture

### Core Components

1. **Workload Configuration** (`src/lib/workload-config.ts`)
   - Maps repositories and branches to Kubernetes workloads
   - Defines deployment settings and test commands
   - Supports wildcard repository matching

2. **Kubernetes Service** (`src/lib/kubernetes-service.ts`)
   - Handles deployment operations using Helm
   - Manages workload lifecycle (deploy, delete, status)
   - Runs automated tests against deployed workloads
   - Provides mock mode for testing

3. **Webhook Handler** (`src/app/api/github/webhook/route.ts`)
   - Enhanced to trigger workload deployments
   - Handles push and pull request events
   - Manages PR environment creation and cleanup

## Configuration

### Default Workload Configurations

The system includes default configurations for common branching patterns:

```typescript
{
  repository: '*',  // Matches any repository
  branch: 'main',
  chartPath: 'charts/nextjs',
  namespace: 'production',
  releaseName: 'main-release',
  environment: 'production',
  enableTests: true,
  testCommand: 'npm run test:e2e'
}
```

### Pull Request Environments

PR environments are automatically created with:
- Unique namespace: `pr-{number}`
- Release name: `pr-{repo-name}-{number}`
- Subdomain: `pr-{number}.preview.example.com`
- Resource limits for cost control

## Usage

### Push Events

When code is pushed to a monitored branch:
1. Webhook receives push event
2. System checks if branch should trigger deployment
3. Finds matching workload configuration
4. Deploys using Helm with specified values
5. Runs tests if enabled
6. Returns deployment status and test results

### Pull Request Events

When a PR is opened or updated:
1. Creates temporary namespace and deployment
2. Deploys with PR-specific image tag
3. Runs tests against the preview environment
4. Provides unique URL for testing

When a PR is closed:
1. Cleans up the PR namespace
2. Removes all associated resources

## Testing

### Comprehensive Test Coverage

- **Unit tests** for workload configuration logic
- **Integration tests** for Kubernetes service operations
- **Webhook tests** with mocked dependencies
- **End-to-end scenarios** for complete workflows

### Mock Mode

The system supports mock mode for testing:
```typescript
const mockKubernetesService = createKubernetesService(true);
```

## API Response Examples

### Successful Push Deployment

```json
{
  "success": true,
  "message": "Push event processed with deployment and tests",
  "commits_processed": 2,
  "deployment": {
    "success": true,
    "releaseName": "main-release",
    "namespace": "production",
    "url": "https://app.example.com"
  },
  "tests": {
    "success": true,
    "testsPassed": 5,
    "testsFailed": 0,
    "output": "All tests passed successfully",
    "duration": 2000
  }
}
```

### PR Environment Creation

```json
{
  "success": true,
  "message": "Pull request opened processed with PR environment and tests",
  "pr_number": 42,
  "deployment": {
    "success": true,
    "releaseName": "pr-repo-42",
    "namespace": "pr-42",
    "url": "https://pr-42.preview.example.com"
  },
  "tests": {
    "success": true,
    "testsPassed": 3,
    "testsFailed": 0,
    "output": "PR tests passed",
    "duration": 1500
  }
}
```

## Environment Variables

Configure the system with these environment variables:

```bash
# Enable mock mode for testing
MOCK_KUBERNETES=true

# GitHub App credentials (existing)
GITHUB_APP_ID=your_app_id
GITHUB_WEBHOOK_SECRET=your_webhook_secret
```

## Future Enhancements

- Database-backed configuration storage
- Real Kubernetes API integration
- Advanced test result reporting
- Deployment status webhooks
- Resource usage monitoring
- Multi-cluster support

## Security Considerations

- Webhook signature verification
- Namespace isolation for PR environments
- Resource limits to prevent abuse
- Secure handling of deployment credentials
- Audit logging for all operations