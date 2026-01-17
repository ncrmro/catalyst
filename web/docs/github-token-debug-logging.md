# GitHub Token Debug Logging

## Overview

This document explains the new debug logging and error classification features that help distinguish between GitHub authentication issues and actual resource not-found errors.

## Problem

Previously, when GitHub API calls failed, it was unclear whether the failure was due to:
- Missing or expired authentication tokens
- Insufficient permissions
- Resources that don't exist
- Network issues

This made it difficult to debug issues where projects weren't returning files or issues/PRs were returning 404s.

## Solution

We've added comprehensive logging throughout the GitHub authentication and API call flow, along with intelligent error classification.

## Features

### 1. Token Lifecycle Logging

Every step of the token management process now logs detailed information:

#### Token Retrieval (`getGitHubTokens`)
```
[GitHub Token] Fetching tokens for user: abc123
[GitHub Token] Retrieved tokens for user: abc123, expires: 2024-01-17T10:00:00.000Z, expired: false
```

Or if tokens are missing:
```
[GitHub Token] No token record found for user: abc123
[GitHub Token] Incomplete encrypted token data for user: abc123
[GitHub Token] Empty decrypted tokens for user: abc123 (tokens may have been invalidated)
```

#### Token Refresh (`refreshTokenIfNeeded`)
```
[GitHub Token] Token for user abc123 is still valid (expires: 2024-01-17T10:00:00.000Z)
```

Or if refresh is needed:
```
[GitHub Token] Refreshing token for user abc123 that expires at 2024-01-17T02:00:00.000Z
[GitHub Token] Successfully refreshed token for user abc123, new expiration: 2024-01-17T10:00:00.000Z
```

Or if refresh fails:
```
[GitHub Token] Failed to refresh token for user abc123: Invalid refresh token
[GitHub Token] Invalidating tokens for user abc123 - re-authentication will be required
```

### 2. Authentication Method Logging

When creating GitHub API clients, the system logs which authentication method is being used:

```
[GitHub Client] Getting Octokit for user: abc123
[GitHub Client] Using PAT authentication for user: abc123 (development mode)
```

Or for OAuth:
```
[GitHub Client] Attempting OAuth token retrieval for user: abc123
[GitHub Client] Successfully authenticated user: abc123 with OAuth token
```

Or if authentication fails:
```
[GitHub Client] Token retrieval returned null for user: abc123 - token may be expired or missing
[GitHub Client] No GitHub authentication available for user abc123. Please set GITHUB_PAT or authorize GitHub App.
```

### 3. Error Classification

The new `classifyGitHubError()` function categorizes errors into specific types:

#### Error Types

| Type | HTTP Status | Description |
|------|-------------|-------------|
| `auth` | 401 | Token is missing, expired, or invalid. User needs to re-authenticate. |
| `permission` | 403 | User doesn't have permission or token needs additional scopes. |
| `rate_limit` | 403 | GitHub API rate limit has been exceeded. |
| `not_found` | 404 | Resource doesn't exist or user doesn't have access to it. |
| `network` | - | Connection issues (ECONNREFUSED, timeout, etc.). |
| `unknown` | Other | Any other error. |

#### Usage Example

```typescript
import { classifyGitHubError } from "@/lib/vcs-providers";

try {
  await vcs.pullRequests.list(owner, repo);
} catch (error) {
  const errorInfo = classifyGitHubError(error);
  
  if (errorInfo.type === "auth") {
    console.error(`Authentication error: ${errorInfo.message}`);
    console.error(`User needs to re-authenticate with GitHub`);
  } else if (errorInfo.type === "permission") {
    console.warn(`Permission error: ${errorInfo.message}`);
  } else if (errorInfo.type === "not_found") {
    console.warn(`Not found: ${errorInfo.message}`);
  }
}
```

### 4. Project Data Fetching Logs

When fetching project data (PRs and issues), detailed logs show progress and any errors:

```
[fetchProjectPullRequests] Fetching PRs for project MyProject (3 repositories)
[fetchProjectPullRequests] Fetching PRs from owner/repo1
[fetchProjectPullRequests] Found 5 PRs in owner/repo1
[fetchProjectPullRequests] Fetching PRs from owner/repo2
[fetchProjectPullRequests] Found 3 PRs in owner/repo2
[fetchProjectPullRequests] Fetching PRs from owner/repo3
[fetchProjectPullRequests] Found 0 PRs in owner/repo3
[fetchProjectPullRequests] Total PRs fetched: 8 across 3 repositories
```

If there's an error:
```
[fetchProjectPullRequests] Authentication error for owner/repo: GitHub authentication failed - token may be missing or expired. Please sign in again.
[fetchProjectPullRequests] User abc123 needs to re-authenticate with GitHub
```

Or for other errors:
```
[fetchProjectPullRequests] Permission denied for owner/private-repo: Access denied - you may not have permission to access this resource, or your GitHub token needs additional scopes.
[fetchProjectPullRequests] Repository not found or inaccessible: owner/deleted-repo
```

## Debugging Guide

### Problem: Projects not returning files

**Check the logs for:**

1. **Authentication issues:**
   ```
   [GitHub Token] No token record found for user: abc123
   ```
   **Solution:** User needs to sign in with GitHub

2. **Expired tokens:**
   ```
   [GitHub Token] Retrieved tokens for user: abc123, expires: 2024-01-17T02:00:00.000Z, expired: true
   [GitHub Token] Failed to refresh token for user abc123
   ```
   **Solution:** User needs to re-authenticate with GitHub

3. **Permission issues:**
   ```
   [fetchProjectPullRequests] Permission denied for owner/repo
   ```
   **Solution:** Check if GitHub App has required scopes or if user has access to the repository

### Problem: Issues/PRs returning 404s

**Check if it's really a 404 or an auth issue:**

1. **If you see authentication errors first:**
   ```
   [GitHub Client] Token retrieval returned null for user: abc123
   [fetchProjectPullRequests] Authentication error for owner/repo
   ```
   **This is NOT a 404** - it's an authentication problem that might appear as 404

2. **If you see not_found without auth errors:**
   ```
   [fetchProjectPullRequests] Repository not found or inaccessible: owner/repo
   ```
   **This IS a 404** - repository doesn't exist or user doesn't have access

## Environment Variables

The logging respects these environment variables:

- `NODE_ENV=production` - Disables PAT fallback in production
- `GITHUB_ALLOW_PAT_FALLBACK=true` - Allows PAT fallback even in production
- `GITHUB_PAT` or `GITHUB_TOKEN` - Personal Access Token for development

## Best Practices

1. **Monitor token expiration patterns**
   - If you see frequent token refreshes, investigate why tokens are expiring quickly
   
2. **Track authentication failures**
   - Group logs by user to identify which users need to re-authenticate
   
3. **Distinguish permission vs not-found errors**
   - Permission errors (403) suggest the resource exists but user can't access it
   - Not found errors (404) suggest the resource doesn't exist OR user can't access it
   - Always check for auth errors first before assuming a 404

4. **Use structured logging**
   - All logs have consistent prefixes like `[GitHub Token]`, `[GitHub Client]`
   - Makes it easy to grep/filter logs

## Testing

The error classification logic is thoroughly tested. See `src/__tests__/unit/github-error-logging.test.ts` for examples of how different error types are classified and handled.

Run tests with:
```bash
npm test -- github-error-logging.test.ts
```

## Future Improvements

Potential enhancements:
- Add metrics/telemetry for error rates by type
- Create user-facing error messages (not just console logs)
- Add retry logic for transient network errors
- Implement token refresh proactively before expiration
