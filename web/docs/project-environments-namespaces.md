# Project Environments Namespaces

This document describes the project environments namespaces feature implemented for the Catalyst web application.

## Overview

The feature allows creating Kubernetes namespaces for different project environments using a standardized naming convention and labeling system.

## Namespace Format

Namespaces are created with the format: `{team}-{project}-{environment}`

### Supported Environments
- `production`
- `staging` 
- `pr-1`

### Example Namespace Names
- `myteam-myproject-production`
- `myteam-myproject-staging`
- `myteam-myproject-pr-1`

## Required Labels

All created namespaces include the following labels:
```yaml
catalyst/team: "{team}"
catalyst/project: "{project}"
catalyst/environment: "{environment}"
```

## API Usage

### Create Namespace

**Endpoint:** `POST /api/kubernetes/namespaces`

**Request Body:**
```json
{
  "team": "myteam",
  "project": "myproject", 
  "environment": "production"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Namespace created successfully",
  "namespace": {
    "name": "myteam-myproject-production",
    "labels": {
      "catalyst/team": "myteam",
      "catalyst/project": "myproject",
      "catalyst/environment": "production"
    },
    "created": true
  }
}
```

**Existing Namespace Response:**
```json
{
  "success": true,
  "message": "Namespace already exists",
  "namespace": {
    "name": "myteam-myproject-production",
    "labels": {
      "catalyst/team": "myteam",
      "catalyst/project": "myproject", 
      "catalyst/environment": "production"
    },
    "created": false
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Environment must be one of: production, staging, pr-1"
}
```

## Function Usage

You can also use the namespace creation function directly in code:

```typescript
import { createProjectNamespace } from '@/lib/k8s-namespaces';

const result = await createProjectNamespace({
  team: 'myteam',
  project: 'myproject',
  environment: 'production'
});
```

## Testing

The feature includes comprehensive testing:

### Unit Tests
- API endpoint validation and error handling
- Mocked Kubernetes client interactions
- Input validation testing

### Integration Tests  
- E2E tests that create real namespaces in Kind cluster
- Verification that namespaces exist in Kubernetes
- Proper label application testing
- Automatic cleanup of test resources

### Running Tests

```bash
# Run unit tests
npm run test

# Run E2E tests  
npm run test:e2e

# Run specific namespace tests
npm run test:e2e -- --grep "should create project namespaces"
```

## Implementation Details

### Files Created
- `src/lib/k8s-namespaces.ts` - Core namespace creation functionality
- `src/app/api/kubernetes/namespaces/route.ts` - API endpoint
- `__tests__/api/kubernetes/namespaces.test.ts` - Unit tests
- `__tests__/e2e/kubernetes.spec.ts` - E2E integration test (updated)

### Key Functions
- `createProjectNamespace()` - Creates namespace with proper labels
- `generateNamespaceName()` - Generates valid namespace names
- `namespaceExists()` - Checks if namespace exists
- `deleteNamespace()` - Removes namespace (for cleanup)

## Prerequisites

- Kubernetes cluster access (Kind cluster is configured for development)
- `kubectl` configured with appropriate permissions
- Valid kubeconfig for accessing the cluster

## Security

- Validates environment values against allowed list
- Sanitizes input to create valid Kubernetes names
- Proper error handling for cluster connectivity issues
- Graceful handling of permission errors