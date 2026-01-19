# Research: Multi-Provider Git Credential Helper Support

**Date**: 2026-01-19
**Status**: Draft
**Related**: specs/001-environments/research.git-credential-helper.md (GitHub-first implementation)

## Summary

This document extends the git credential helper approach from the environments spec to support multiple VCS providers. The current implementation is GitHub-focused; this research evaluates how to abstract authentication for GitLab, Gitea/Forgejo, Bitbucket, and Azure DevOps.

## VCS Provider Authentication Comparison

| Provider          | App-Based Auth | Token Type         | Expiration   | Refresh Mechanism                |
| ----------------- | -------------- | ------------------ | ------------ | -------------------------------- |
| **GitHub**        | GitHub Apps    | Installation Token | 1 hour       | Generate new via App private key |
| **GitLab**        | OAuth Apps     | OAuth Token        | 2 hours      | Refresh token flow               |
| **Gitea/Forgejo** | OAuth2 Apps    | OAuth Token        | Configurable | Refresh token flow               |
| **Bitbucket**     | OAuth Apps     | OAuth Token        | 2 hours      | Refresh token flow               |
| **Azure DevOps**  | AAD Apps       | OAuth Token        | 1 hour       | Refresh token flow               |

## Provider-Specific Requirements

### GitHub

- **Username**: `x-access-token`
- **Token source**: GitHub App installation token
- **Identifier needed**: `installationId` (numeric ID from app installation)
- **Token generation**: Via App private key signing JWT, then exchanging for installation token
- **Current implementation**: `/api/git-token/[installationId]` endpoint exists

### GitLab

- **Username**: `oauth2`
- **Token source**: OAuth2 token or Project/Group Access Token
- **Identifier needed**: `projectId` or `groupId`
- **Token generation**: OAuth2 flow with refresh tokens
- **Notes**: Project Access Tokens don't expire; OAuth tokens do (2 hours)

### Gitea/Forgejo

- **Username**: `oauth2` (or token owner username)
- **Token source**: OAuth2 app token
- **Identifier needed**: `applicationId`
- **Token generation**: OAuth2 flow similar to GitHub OAuth
- **Notes**: Personal access tokens don't expire by default

### Bitbucket

- **Username**: `x-token-auth`
- **Token source**: Repository Access Token or App Password
- **Identifier needed**: `workspaceId`
- **Token generation**: OAuth2 flow
- **Notes**: OAuth tokens expire (2 hours), app passwords don't

### Azure DevOps

- **Username**: Empty string (uses Bearer auth)
- **Token source**: Azure AD OAuth token
- **Identifier needed**: `organizationId`
- **Token generation**: AAD OAuth2 flow with refresh tokens
- **Notes**: Requires Azure AD integration

## Abstraction Design

### Project CR Extension

```yaml
apiVersion: catalyst.catalyst.dev/v1alpha1
kind: Project
metadata:
  name: my-project
spec:
  # Provider-agnostic authentication config
  gitAuth:
    # Provider type determines token fetch behavior
    provider: github | gitlab | gitea | bitbucket | azure

    # Provider-specific identifier for token generation
    # - GitHub: installationId (numeric, from GitHub App installation)
    # - GitLab: projectId or groupId
    # - Gitea: applicationId
    # - Bitbucket: workspaceId
    # - Azure: organizationId
    tokenSourceId: "12345678"

  sources:
    - name: primary
      repositoryUrl: https://github.com/owner/repo.git
      branch: main
```

### Initial Implementation (GitHub Only)

For the initial implementation, we simplify to GitHub-only:

```yaml
spec:
  # GitHub App installation ID for this project
  # Used by credential helper to fetch fresh tokens for git operations
  githubInstallationId: "12345678"

  sources:
    - name: primary
      repositoryUrl: https://github.com/owner/repo.git
      branch: main
```

### Credential Helper Provider Support

The credential helper script becomes provider-aware:

```bash
#!/bin/sh
# /usr/local/bin/git-credential-catalyst

operation="$1"
[ "$operation" != "get" ] && exit 0

# Read input until empty line
while IFS= read -r line; do [ -z "$line" ] && break; done

# Get authentication from environment
SA_TOKEN=$(cat /var/run/secrets/kubernetes.io/serviceaccount/token 2>/dev/null)
[ -z "$SA_TOKEN" ] && { echo "Error: No ServiceAccount token" >&2; exit 1; }

# Provider and identifier from environment (set by operator)
VCS_PROVIDER="${VCS_PROVIDER:-github}"
TOKEN_SOURCE_ID="${TOKEN_SOURCE_ID:-$INSTALLATION_ID}"
WEB_URL="${CATALYST_WEB_URL:-http://catalyst-web.catalyst-system.svc.cluster.local:3000}"

[ -z "$TOKEN_SOURCE_ID" ] && { echo "Error: No TOKEN_SOURCE_ID" >&2; exit 1; }

# Fetch token from provider-aware endpoint
TOKEN=$(curl -sf \
  -H "Authorization: Bearer $SA_TOKEN" \
  "$WEB_URL/api/git-token/$VCS_PROVIDER/$TOKEN_SOURCE_ID")

[ $? -ne 0 ] || [ -z "$TOKEN" ] && { echo "Error: Failed to get token" >&2; exit 1; }

# Output credentials - username varies by provider
case "$VCS_PROVIDER" in
  github)
    echo "username=x-access-token"
    ;;
  gitlab|gitea)
    echo "username=oauth2"
    ;;
  bitbucket)
    echo "username=x-token-auth"
    ;;
  azure)
    echo "username="
    ;;
  *)
    echo "username=x-access-token"
    ;;
esac

echo "password=$TOKEN"
```

### Web API Extension (Future)

```
GET /api/git-token/:provider/:tokenSourceId

Parameters:
- provider: github | gitlab | gitea | bitbucket | azure
- tokenSourceId: Provider-specific identifier

Response: Plain text token

Examples:
- GET /api/git-token/github/12345678
- GET /api/git-token/gitlab/456
- GET /api/git-token/gitea/app-789
```

## Implementation Phases

### Phase 1: GitHub (Current Focus)

1. Add `githubInstallationId` field to Project CR
2. Update operator `build_kaniko.go` to use credential helper
3. Remove secret-based authentication
4. Web endpoint already exists: `/api/git-token/[installationId]`

### Phase 2: Multi-Provider (Future)

1. Extend Project CR with `gitAuth` block
2. Create provider-specific token endpoints
3. Update credential helper for provider awareness
4. Add provider-specific authentication flows in web app

## Security Considerations

1. **Token Isolation**: Each provider's tokens are scoped to their installation/project
2. **ServiceAccount Validation**: TokenReview API validates pod identity
3. **No Storage**: Tokens generated on-demand, never persisted in K8s Secrets
4. **Audit Logging**: All token requests logged for compliance
5. **Namespace Binding**: Pods can only request tokens for their environment's installation

## Current Implementation Status

- [x] GitHub credential helper script exists (`web/scripts/git-credential-catalyst.sh`)
- [x] GitHub token endpoint exists (`/api/git-token/[installationId]`)
- [x] TokenReview validation implemented
- [ ] Project CR `githubInstallationId` field (this implementation)
- [ ] Operator credential helper integration (this implementation)
- [ ] Multi-provider support (future)

## References

- [Git Credential Helpers](https://git-scm.com/docs/gitcredentials)
- [Kubernetes TokenReview API](https://kubernetes.io/docs/reference/kubernetes-api/authentication-resources/token-review-v1/)
- [GitHub App Installation Tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)
- [GitLab OAuth2 Tokens](https://docs.gitlab.com/ee/api/oauth2.html)
- [Gitea OAuth2 Provider](https://docs.gitea.io/en-us/oauth2-provider/)
- [Bitbucket OAuth](https://developer.atlassian.com/cloud/bitbucket/oauth-2/)
- [Azure DevOps OAuth](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/oauth)
