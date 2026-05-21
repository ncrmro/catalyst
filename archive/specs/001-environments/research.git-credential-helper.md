# Research: Git Credential Helper for Environment Git Operations

**Date**: 2026-01-18
**Status**: Adopted
**Related**: FR-ENV-023

## Summary

Use a git credential helper for **all git operations** (clone, fetch, push). The helper fetches fresh tokens on-demand from the web server, eliminating token expiration issues entirely.

## Problem

GitHub App installation tokens expire after 1 hour. Storing tokens in Kubernetes Secrets creates complexity:

- Secrets need to be created before Environment CR
- Operator must copy secrets between namespaces
- Tokens expire, breaking operations after 1 hour
- No push support for workspace mode

## Solution: Credential Helper for Everything

Since the web server should always be available (it's a core platform component), use a credential helper for all git operations:

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

## Benefits

| Aspect              | Secret-Based (Old)                 | Credential Helper (New) |
| ------------------- | ---------------------------------- | ----------------------- |
| Token expiration    | ❌ Expires after 1 hour            | ✅ Always fresh         |
| Clone support       | ✅ Yes                             | ✅ Yes                  |
| Push support        | ❌ No (token expired)              | ✅ Yes                  |
| Secret management   | ❌ Complex (create, copy, cleanup) | ✅ None                 |
| Operator complexity | ❌ Must copy secrets               | ✅ Just configure git   |

## Implementation

### Credential Helper Script

```bash
#!/bin/sh
# /usr/local/bin/git-credential-catalyst

# Read pod's ServiceAccount token for authentication
SA_TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)

# Fetch fresh GitHub token from web server
TOKEN=$(curl -sf \
  -H "Authorization: Bearer $SA_TOKEN" \
  "http://catalyst-web.catalyst-system.svc.cluster.local/api/git-token/$INSTALLATION_ID")

if [ $? -ne 0 ] || [ -z "$TOKEN" ]; then
    echo "Failed to get git credentials from catalyst-web" >&2
    exit 1
fi

echo "username=x-access-token"
echo "password=$TOKEN"
```

### Git Configuration (in init container)

```bash
git config --global credential.helper /usr/local/bin/git-credential-catalyst
```

### Web Server Endpoint

```typescript
// web/src/app/api/git-token/[installationId]/route.ts

import { generateInstallationToken } from "@/lib/github-installation-token";
import { validatePodRequest } from "@/lib/k8s-auth";

export async function GET(
  request: Request,
  { params }: { params: { installationId: string } },
) {
  // 1. Validate request comes from a valid environment pod
  const validation = await validatePodRequest(request);
  if (!validation.valid) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Verify pod belongs to this installation
  const installationId = parseInt(params.installationId);
  if (validation.installationId !== installationId) {
    return new Response("Forbidden", { status: 403 });
  }

  // 3. Generate fresh token
  const { token } = await generateInstallationToken(installationId);

  // 4. Return plain text token
  return new Response(token, {
    headers: { "Content-Type": "text/plain" },
  });
}
```

### Request Validation (ServiceAccount Token)

```typescript
async function validatePodRequest(request: Request): Promise<ValidationResult> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false };
  }

  const token = authHeader.slice(7);

  // Validate with Kubernetes TokenReview API
  const review = await k8sApi.createTokenReview({
    spec: { token },
  });

  if (!review.status?.authenticated) {
    return { valid: false };
  }

  // Extract namespace from ServiceAccount
  // Format: system:serviceaccount:<namespace>:<name>
  const parts = review.status.user?.username?.split(":") || [];
  const namespace = parts[2];

  // Look up Environment CR to get installationId
  const env = await getEnvironmentByNamespace(namespace);

  return {
    valid: true,
    namespace,
    installationId: env?.installationId,
  };
}
```

### Operator Changes

Replace secret-based auth with credential helper setup:

```yaml
initContainers:
  - name: setup-git
    image: alpine/git:latest
    command:
      - /bin/sh
      - -c
      - |
        # Install credential helper
        cat > /usr/local/bin/git-credential-catalyst <<'SCRIPT'
        #!/bin/sh
        SA_TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token)
        curl -sf -H "Authorization: Bearer $SA_TOKEN" \
          "http://catalyst-web.catalyst-system.svc.cluster.local/api/git-token/$INSTALLATION_ID"
        SCRIPT
        chmod +x /usr/local/bin/git-credential-catalyst

        # Configure git
        git config --global credential.helper /usr/local/bin/git-credential-catalyst

        # Clone repository
        git clone $GIT_REPO_URL /code
        cd /code && git checkout $GIT_COMMIT_SHA
    env:
      - name: INSTALLATION_ID
        valueFrom:
          fieldRef:
            fieldPath: metadata.labels['catalyst.dev/installation-id']
      - name: GIT_REPO_URL
        value: "https://github.com/owner/repo.git"
      - name: GIT_COMMIT_SHA
        value: "abc123..."
    volumeMounts:
      - name: code
        mountPath: /code
```

## What This Replaces

The credential helper approach **replaces** the following from FR-ENV-023:

| Removed                              | Reason               |
| ------------------------------------ | -------------------- |
| `createGitCredentialsSecret()`       | No secrets needed    |
| `ensureGitCredentials()` in operator | No secret copying    |
| `AuthSecretRef` in SourceConfig      | No secret references |
| git-credentials volume mount         | No secrets to mount  |

## Implementation Tasks

- [ ] Create `/api/git-token/[installationId]` endpoint in web server
- [ ] Implement `validatePodRequest()` with TokenReview API
- [ ] Update operator to use credential helper instead of secrets
- [ ] Remove secret creation from `createPreviewDeployment()`
- [ ] Remove `ensureGitCredentials()` from operator
- [ ] Add `installation-id` label to Environment pods
- [ ] Integration tests for clone and push operations

## Security Considerations

1. **Authentication**: Pods authenticate using their ServiceAccount token
2. **Authorization**: Web server validates pod belongs to the installation
3. **Token scope**: GitHub tokens only access repos the app is installed on
4. **No persistence**: Tokens fetched on-demand, never stored
5. **Audit logging**: Log all token requests for security review
6. **Rate limiting**: Prevent token request abuse (optional)

## References

- [Git Credential Helpers](https://git-scm.com/docs/gitcredentials)
- [Kubernetes TokenReview API](https://kubernetes.io/docs/reference/kubernetes-api/authentication-resources/token-review-v1/)
- [GitHub App Installation Tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)
