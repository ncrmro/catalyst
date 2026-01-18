# Research: GitHub App Re-authentication Failure

**Spec**: `003-vcs-providers`
**Date**: 2026-01-18

## Problem Statement

When coming back to Catalyst after a period of inactivity (e.g., overnight), the GitHub App consistently loses its authentication, resulting in 401 Unauthorized errors for API requests.

## Observed Behavior

The GitHub App fails to maintain or refresh its authorization state, causing VCS operations to fail silently or return empty results.

### Example Logs

```
[VCS] listDirectory: owner=ncrmro, repo=catalyst
GET /repos/ncrmro/catalyst/contents/specs?ref=main - 401 with id D154:2DBA2F:1E4B9F2:89932C2:696CE946 in 21ms
[VCS] listDirectory: Found 0 entries
```

## Current Database State

An inspection of the `github_user_tokens` table for the affected user shows:

-   **Records Exist**: Authentication records are present for the user.
-   **Fields Present**:
    -   `installation_id` is populated.
    -   `accessTokenEncrypted`, `iv`, and `tag` are present.
    -   `refreshTokenEncrypted`, `iv`, and `tag` are present.
-   **Expiration**: The token has an `expiresAt` value for today (2026-01-18).
-   **Missing Data**: `token_scope` is notably missing/empty.

## Previous Attempts

A review of the git log reveals several attempts to resolve token refresh and authentication persistence issues. Despite these efforts, the "overnight" 401 issue persists.

### 1. JWT Callback Refresh Logic
*   **Commit**: `4f43e143` (Add automatic GitHub token refresh in JWT callback)
*   **Approach**: Implemented logic within the NextAuth.js JWT callback to check for token expiration and attempt a refresh using the `refresh_token`.
*   **Outcome**: Likely insufficient if the session itself expires or if the refresh token rotation isn't synced back to the database/session correctly for long-lived usage.

### 2. Explicit Refresh Calls
*   **Commit**: `354be6f7` (Add explicit token refresh before fetching specs/issues/prs/tasks)
*   **Commit**: `b5452128` (Fix: Refresh tokens in checkConnection to prevent UI showing disconnected)
*   **Approach**: Added manual calls to refresh tokens immediately before specific high-value operations or connection checks.
*   **Outcome**: This fixes "active" usage scenarios but might fail if the initial check itself is 401ing before the refresh logic triggers, or if the stored refresh token is already stale.

### 3. Singleton & Centralization
*   **Commit**: `532fe4b5` (fix(vcs): create standardized vcs singleton in vcs package for token refresh)
*   **Commit**: `44b80423` (Consolidate VCS token management into vcs-providers singleton)
*   **Approach**: Moved token management from scattered logic into a centralized `VCSProviderSingleton` to better manage state and prevent race conditions.
*   **Outcome**: Improved architecture but didn't solve the underlying persistence/expiry issue.

### 4. Validation & Null Safety
*   **Commit**: `26140830` (Fix: Correct null check logic in token refresh)
*   **Commit**: `dde760db` (Fix: Add null check for token expiresAt to prevent TypeError)
*   **Approach**: Fixed runtime errors where `expiresAt` or tokens were null, preventing the refresh logic from executing.

## Root Cause Analysis

Based on code review of `web/src/lib/vcs-providers.ts` and `@catalyst/vcs-provider`, the following issues contribute to the authentication failure:

### 1. Lack of Reactive Refresh (401 Handling)
**Location:** `GitHubProvider` class & `getUserOctokit`
**Issue:** The system relies entirely on *proactive* refresh (checking `expiresAt` before a request). It does not handle 401 Unauthorized responses. If `expiresAt` is inaccurate or the token is revoked server-side, the API call fails immediately without attempting a refresh-and-retry strategy.

### 2. Hardcoded Expiration Logic
**Location:** `web/src/lib/vcs-providers.ts` -> `exchangeRefreshToken`
**Issue:** The code hardcodes expiration to 8 hours: `expiresAt.setHours(expiresAt.getHours() + 8)`.
**Impact:** It ignores the authoritative `expires_in` field from the GitHub API. Clock skew or changes in GitHub's policy can lead to the application believing a token is valid when it has already expired.

### 3. Distributed Concurrency & Token Rotation
**Location:** `VCSProviderSingleton` & `storeGitHubTokens`
**Issue:** GitHub App User-to-Server tokens use **Rotating Refresh Tokens**. Every refresh invalidates the old refresh token.
**Impact:** While `VCSProviderSingleton` has an in-memory lock, it does not protect against multiple processes (e.g., separate server actions, multiple pods). If two processes refresh simultaneously, they will race. One succeeds, the other fails or overwrites the valid new token with old data, permanently breaking the auth chain.

### 4. Data Persistence & Missing Scopes
**Location:** `web/src/lib/vcs-providers.ts` -> `storeGitHubTokens`
**Issue:** The database shows empty `token_scope`. The refresh logic (`exchangeRefreshToken`) assigns `scope: data.scope`.
**Impact:** If GitHub does not return the scope in the refresh response (often implied to be unchanged), the code saves `undefined` or `""` back to the database, potentially losing permission context or causing validation issues downstream.

## Initial Analysis

1.  **Token Expiration**: GitHub App User-to-Server tokens expire after 8 hours.
2.  **Refresh Mechanism**: The system should be using the `refresh_token` to obtain a new `access_token` when the old one expires.
3.  **Potential Causes**:
    - The refresh token logic is not being triggered automatically.
    - The refresh token itself has expired or been invalidated.
    - The session management (Auth.js/NextAuth.js) is not correctly persisting or retrieving the refreshed tokens.
    - Missing or incorrect handling of 401 responses to trigger a retry with a refreshed token.

## Remediation Plan



To address the identified root causes (specifically #1 and #2), we will implement the following fixes, prioritizing logic within the reusable `@catalyst/vcs-provider` package.



### Checklist







- [x] **Fix Hardcoded Expiration Logic**



    - [x] Update `web/src/lib/vcs-providers.ts` (and any package equivalents) to use `expires_in` from the GitHub API response instead of hardcoding `+8 hours`.



    - [x] Ensure `refresh_token_expires_in` is also captured if available/relevant.



    - [x] Fallback to a safe default (e.g., 8 hours) only if `expires_in` is missing.







- [x] **Implement Reactive Token Refresh (Interceptor)**



    - [x] Modify `GitHubProvider` (in `@catalyst/vcs-provider`) or `VCSProviderSingleton` to intercept 401 errors.



    - [x] Implement a retry mechanism that:



        1.  Catches 401 Unauthorized errors.



        2.  Triggers a forced token refresh (ignoring `expiresAt` check).



        3.  Retries the original request with the new token.



        4.  Fails gracefully if the second attempt also returns 401.







- [x] **Refine Scope Handling**



    - [x] Ensure `exchangeRefreshToken` preserves the existing scope if the API response returns `null` or empty scope.







- [x] **Verify Changes**







    - [x] Write a test case that mocks an expired token (but valid `expiresAt`) to force a 401 and verify the retry logic.







    - [x] Verify that `expiresAt` is correctly calculated based on API response headers/body.

## Documentation Verification

A review of [GitHub's "Refreshing user access tokens" documentation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens) confirms:

1.  **Token Rotation:** GitHub invalidates the old refresh token upon use. Our logic correctly saves the *new* refresh token returned by the API.
2.  **Scope Behavior:** The documentation notes that `scope` in the refresh response might be empty or unchanged. Our fix to preserve `currentScope` if `data.scope` is empty is critical and aligns with this behavior to prevent permission loss.
3.  **Expiration:** Using `expires_in` (seconds) from the response is the authoritative way to calculate expiry, replacing our previous hardcoded assumption.
4.  **Concurrency:** GitHub enforces strict single-use refresh tokens. Our `VCSProviderSingleton` handles local concurrency. Distributed concurrency remains a known constraint but is mitigated by the reactive retry logic.












