# Git Credential Helper for Catalyst Environments

This directory contains the git credential helper script that enables fresh GitHub token authentication for git operations in environment pods.

## Overview

The git credential helper replaces the secret-based authentication approach with on-demand token fetching from the Catalyst web server. This eliminates token expiration issues and simplifies secret management.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Environment Pod                                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ git clone / git push / git fetch                 │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
│                         ▼                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Git Credential Helper                            │   │
│  │ → Fetches fresh token from web server            │   │
│  └──────────────────────┬──────────────────────────┘   │
│                         │                               │
└─────────────────────────┼───────────────────────────────┘
                          │ HTTP (in-cluster)
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Catalyst Web Server                                     │
│                                                         │
│  GET /api/git-token/:installationId                     │
│  1. Validate request (ServiceAccount token)             │
│  2. Generate fresh 1-hour GitHub token                  │
│  3. Return token                                        │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## Files

- **git-credential-catalyst.sh**: The credential helper script that runs in pods
- **../src/lib/git-credential-helper.ts**: Library for integrating the helper into pods
- **../src/app/api/git-token/[installationId]/route.ts**: API endpoint for token generation

## Usage

### In Kubernetes Pods

To use the credential helper in a pod:

1. **Add Installation ID label**:

   ```yaml
   metadata:
     labels:
       catalyst.dev/installation-id: "12345"
   ```

2. **Set Environment Variable**:

   ```yaml
   env:
     - name: INSTALLATION_ID
       value: "12345"
   ```

3. **Install and Configure Git** (in init container or main container):

   ```bash
   # Copy helper script
   cat > /usr/local/bin/git-credential-catalyst <<'EOF'
   [content of git-credential-catalyst.sh]
   EOF
   chmod +x /usr/local/bin/git-credential-catalyst

   # Configure git
   git config --global credential.helper /usr/local/bin/git-credential-catalyst
   ```

### In TypeScript Code

```typescript
import { createPullRequestPodJob } from "@/lib/k8s-pull-request-pod";

// Enable credential helper by providing installationId
await createPullRequestPodJob({
  name: "my-pr-job",
  namespace: "default",
  installationId: 12345, // GitHub App installation ID
  env: {
    REPO_URL: "https://github.com/owner/repo.git",
    PR_BRANCH: "feature-branch",
    PR_NUMBER: "123",
    GITHUB_USER: "username",
  },
});
```

## Security

### Authentication Flow

1. Pod authenticates using its ServiceAccount token
2. Web server validates token via Kubernetes TokenReview API
3. Web server verifies pod belongs to the requested installation
4. Fresh GitHub App installation token is generated (1-hour validity)
5. Token is returned to pod as plain text

### Security Considerations

- ✅ Pods authenticate via ServiceAccount tokens
- ✅ TokenReview API validates pod identity
- ✅ Installation ID is verified against pod's namespace/environment
- ✅ Tokens are never persisted, generated on-demand
- ✅ Tokens have 1-hour expiration (GitHub App limitation)
- ✅ Audit logging of all token requests

## Benefits

| Aspect              | Secret-Based (Old)                 | Credential Helper (New) |
| ------------------- | ---------------------------------- | ----------------------- |
| Token expiration    | ❌ Expires after 1 hour            | ✅ Always fresh         |
| Clone support       | ✅ Yes                             | ✅ Yes                  |
| Push support        | ❌ No (token expired)              | ✅ Yes                  |
| Secret management   | ❌ Complex (create, copy, cleanup) | ✅ None                 |
| Operator complexity | ❌ Must copy secrets               | ✅ Just configure git   |

## Testing

Run unit tests:

```bash
npm run test:unit -- __tests__/unit/git-credential-helper.test.ts
```

## Related Documentation

- [Research Document](../../../specs/001-environments/research.git-credential-helper.md)
- [Git Credential Helpers](https://git-scm.com/docs/gitcredentials)
- [Kubernetes TokenReview API](https://kubernetes.io/docs/reference/kubernetes-api/authentication-resources/token-review-v1/)
- [GitHub App Installation Tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)
