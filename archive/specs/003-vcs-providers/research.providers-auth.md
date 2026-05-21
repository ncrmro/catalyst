# VCS Providers Authentication Research

This document outlines the authentication mechanisms, token structures, and relevant documentation for the supported and planned VCS providers.

## 1. GitHub

GitHub supports multiple authentication methods, but for a "VCS Provider" integration acting on behalf of a user, **GitHub Apps** (user-to-server) or **OAuth Apps** are the standard. GitHub Apps are preferred for finer-grained permissions.

*   **Auth Type:** OAuth 2.0 (Authorization Code Grant)
*   **Token Structure:**
    *   `access_token`: String (e.g., `ghu_...` or `gho_...`).
    *   `refresh_token`: String (e.g., `ghr_...`). Only provided if configured in the App settings ("Expire user authorization tokens").
    *   `expires_in`: Integer (seconds). typically 8 hours for access tokens.
    *   `refresh_token_expires_in`: Integer (seconds). typically 6 months.
    *   `scope`: Space-separated string of scopes.
    *   `token_type`: "bearer".
*   **Unique Aspects:**
    *   **Installation ID:** GitHub Apps have an "Installation" concept. While User Access Tokens act *as* the user, some operations might interact with a specific App Installation.
    *   **Token Expiration:** Optional for OAuth Apps, but standard/enforced for GitHub Apps.
*   **Documentation:**
    *   [Authenticating with GitHub Apps](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-with-a-github-app)
    *   [Generating a user access token for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app)
    *   [Refreshing user access tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens)

## 2. GitLab (SaaS & Self-Hosted)

GitLab uses standard OAuth 2.0.

*   **Auth Type:** OAuth 2.0 (Authorization Code Grant + PKCE recommended).
*   **Token Structure:**
    *   `access_token`: String.
    *   `refresh_token`: String.
    *   `expires_in`: Integer (seconds). Typically 2 hours (7200 seconds).
    *   `created_at`: Integer (timestamp).
    *   `scope`: Space-separated string.
    *   `token_type`: "bearer".
*   **Unique Aspects:**
    *   **Self-Hosted:** The authorization endpoint URL changes based on the instance (e.g., `https://gitlab.example.com/oauth/authorize`).
    *   **Expiration:** Access tokens expire after 2 hours. Refresh tokens are valid for 2 hours if "Expire access tokens" is checked, but can be rotated.
*   **Documentation:**
    *   [GitLab OAuth 2.0 provider documentation](https://docs.gitlab.com/ee/api/oauth2.html)
    *   [Authorization Code Flow](https://docs.gitlab.com/ee/api/oauth2.html#authorization-code-flow)

## 3. Gitea / Forgejo

Gitea aims to be API-compatible with GitHub but implements standard OAuth 2.0.

*   **Auth Type:** OAuth 2.0.
*   **Token Structure:**
    *   `access_token`: String.
    *   `refresh_token`: String.
    *   `expires_in`: Integer (seconds).
    *   `scope`: String.
    *   `token_type`: "bearer".
*   **Unique Aspects:**
    *   **Self-Hosted:** Base URL is dynamic.
    *   **Compatibility:** While API compatible with GitHub, the Auth flow is standard OAuth like GitLab.
*   **Documentation:**
    *   [Gitea API Usage](https://docs.gitea.com/development/api-usage#oauth2-provider)

## 4. Bitbucket (Cloud)

Bitbucket Cloud uses OAuth 2.0.

*   **Auth Type:** OAuth 2.0 (Authorization Code Grant).
*   **Token Structure:**
    *   `access_token`: String.
    *   `refresh_token`: String.
    *   `expires_in`: Integer (seconds). Typically 1 hour (3600 seconds).
    *   `scopes`: Space-separated string (Note: JSON key is `scopes` plural).
    *   `token_type`: "bearer".
*   **Unique Aspects:**
    *   **Workspaces:** Permissions are often scoped to workspaces.
*   **Documentation:**
    *   [Bitbucket Cloud OAuth 2.0](https://developer.atlassian.com/cloud/bitbucket/oauth-2/)
    *   [Refeshing an access token](https://developer.atlassian.com/cloud/bitbucket/oauth-2/#refreshing-an-access-token)

## 5. Azure DevOps

Azure DevOps uses OAuth 2.0.

*   **Auth Type:** OAuth 2.0 (Authorization Code Grant).
*   **Token Structure:**
    *   `access_token`: String (JWT).
    *   `refresh_token`: String.
    *   `expires_in`: Integer (seconds). Typically 1 hour.
    *   `scope`: String.
    *   `token_type`: "jwt-bearer".
*   **Unique Aspects:**
    *   **Client Secret:** Requires client secret for refresh.
*   **Documentation:**
    *   [Authorize access to REST APIs with OAuth 2.0](https://learn.microsoft.com/en-us/azure/devops/integrate/get-started/authentication/oauth?view=azure-devops)

## Summary of Data Requirements for Storage

To support all above providers, our storage schema requires:

1.  **User Identity:** `userId` (Internal app user)
2.  **Provider Identity:** `providerId` (github, gitlab, etc.)
3.  **Auth Tokens:**
    *   `accessToken` (Encrypted)
    *   `refreshToken` (Encrypted) - Critical for all except non-expiring PATs.
4.  **Metadata:**
    *   `expiresAt` (Calculated from `expires_in` + `created_at` or `now`).
    *   `scope` (To verify permission levels).
    *   `installationId` (Specific to GitHub, but generic enough to be "provider_resource_id" if needed).
    *   `createdAt` / `updatedAt` (Audit).

The `vcs-provider` package implements a provider-agnostic schema covering these fields.
