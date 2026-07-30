# @catalyst/vcs-provider

Version Control System provider abstraction for multi-provider support (GitHub, GitLab, Bitbucket, etc.).

## Overview

This package provides a unified interface for interacting with version control systems. It abstracts provider-specific APIs behind a common interface, making it easy to:

- Authenticate users with VCS providers
- **Automatically manage and refresh tokens** (NEW!)
- **Access all VCS operations through a single facade** (NEW!)
- Read files and directories from repositories
- Manage pull requests and issues
- Handle webhooks

## Key Features

### 🚀 VCSProviderSingleton - Comprehensive VCS Facade (NEW & RECOMMENDED)

The **VCSProviderSingleton** is the new recommended way to interact with VCS providers. It provides:

- **Automatic token management**: Tokens refreshed transparently before expiration
- **Namespaced operations**: Clean API with `issues`, `pullRequests`, `repos`, `branches`, `files`
- **Generic token sources**: Works with user/team/project IDs
- **Environment validation**: Checks required env vars on initialization
- **Provider-agnostic**: Unified interface across all VCS providers

```typescript
import { VCSProviderSingleton } from "@catalyst/vcs-provider";

// 1. Initialize once at application startup
VCSProviderSingleton.initialize({
  getTokenData: async (tokenSourceId, providerId) => {
    // tokenSourceId can be userId, teamId, projectId, etc.
    return await db.getTokens(tokenSourceId, providerId);
  },
  refreshToken: async (refreshToken, providerId) => {
    return await oauth.exchangeRefreshToken(refreshToken);
  },
  storeTokenData: async (tokenSourceId, tokens, providerId) => {
    await db.storeTokens(tokenSourceId, tokens, providerId);
  },
  requiredEnvVars: ["GITHUB_APP_CLIENT_ID", "GITHUB_APP_CLIENT_SECRET"],
});

// 2. Use anywhere - automatic token management!
const vcs = VCSProviderSingleton.getInstance();

// Get an issue (tokenSourceId can be userId, teamId, projectId)
// providerId is required - supports github, gitlab, bitbucket, azure
// TODO: Future support for self-hosted instances (e.g., gitlab.company.com)
const issue = await vcs.issues.get(
  tokenSourceId,
  "github",
  owner,
  repo,
  issueNumber,
);

// List pull requests from GitLab
const prs = await vcs.pullRequests.list(tokenSourceId, "gitlab", owner, repo, {
  state: "open",
});

// Get repository from GitHub
const repo = await vcs.repos.get(tokenSourceId, "github", owner, repo);

// Create a PR
const newPR = await vcs.pullRequests.create(
  tokenSourceId,
  "github",
  owner,
  repo,
  title,
  head,
  base,
  body,
);
```

**Benefits:**

- ✅ One-line API calls with automatic token management
- ✅ No manual token refresh logic needed
- ✅ Clean, namespaced operations (issues, pullRequests, repos, etc.)
- ✅ Generic token source (user/team/project agnostic)
- ✅ Environment validation on startup
- ✅ Provider-agnostic design

## Installation

```bash
npm install @catalyst/vcs-provider
```

## Database Schema

This package requires a database table to store authentication tokens. The schema definition is provided by `@tetrastack/backend`.

**PostgreSQL:**

```typescript
import { postgres } from "@tetrastack/backend/database";
const { connectionTokens } = postgres;
```

**SQLite:**

```typescript
import { sqlite } from "@tetrastack/backend/database";
const { connectionTokens } = sqlite;
```

## Security

Token encryption and decryption is handled by `@tetrastack/backend/utils`. Ensure `TOKEN_ENCRYPTION_KEY` is set in your environment.

## Usage

Initialize the provider singleton with your storage callbacks:

```typescript
import { VCSProviderSingleton } from "@catalyst/vcs-provider";
import { encrypt, decrypt } from "@tetrastack/backend/utils";
// ... imports from your db ...

VCSProviderSingleton.initialize({
  getTokenData: async (tokenSourceId, providerId) => {
    // ... fetch and decrypt ...
  },
  storeTokenData: async (tokenSourceId, tokens, providerId) => {
    // ... encrypt and store ...
  },
  // ...
});
```

## Exports

### GitHub Provider

- `GITHUB_CONFIG` - GitHub App configuration
- `getUserOctokit` - Get authenticated Octokit for user
- `getInstallationOctokit` - Get Octokit for GitHub App installation
- `getAllInstallations` - List all app installations
- `fetchPullRequestsFromRepos` - Fetch PRs from multiple repos
- `fetchIssuesFromRepos` - Fetch issues from multiple repos

### Token Management

- `storeGitHubTokens` - Store encrypted tokens
- `getGitHubTokens` - Retrieve and decrypt tokens
- `refreshTokenIfNeeded` - Refresh expired tokens
- `invalidateTokens` - Invalidate user tokens

### PR Comments

- `formatDeploymentComment` - Format deployment status comment
- `upsertDeploymentComment` - Create/update deployment comment
- `deleteDeploymentComment` - Remove deployment comment

### Provider Registry

- `providerRegistry` - Registry of available providers
- `getVCSClient` - Get authenticated client for any provider
- `getProvider` - Get provider by ID
- `getAllProviders` - List all registered providers

## Architecture

```
@catalyst/vcs-provider/
├── src/
│   ├── index.ts           # Main exports
│   ├── types.ts           # TypeScript types
│   ├── provider-registry.ts
│   ├── token-crypto.ts    # Encryption utilities
│   └── providers/
│       └── github/        # GitHub provider implementation
│           ├── index.ts
│           ├── client.ts
│           ├── token-refresh.ts
│           ├── token-service.ts
│           ├── auth.ts
│           └── comments.ts
```

## Setup and Integration

For a **complete setup guide** including:
- GitHub App configuration
- Required API endpoints implementation
- Auth.js integration with JWT/session callbacks
- OAuth flows and token management
- Database schema setup
- Security best practices

See **[SETUP.md](./SETUP.md)** for comprehensive instructions.

## Auth.js Integration

This package works with Auth.js (NextAuth.js) to provide GitHub authentication using GitHub App credentials instead of a separate OAuth App.

### Why GitHub App Credentials?

GitHub App credentials provide several advantages over OAuth App credentials:

- **Short-lived tokens**: 8-hour access tokens with 6-month refresh tokens
- **Higher rate limits**: Additional API quota from installation-level limits
- **Fine-grained permissions**: Control access at the resource level
- **Installation tracking**: Know exactly which repos/orgs are accessible

### Required API Endpoints

The authentication system requires three API endpoints to be implemented in your application:

| Endpoint                    | Purpose                              | Handler Type       | Documentation Link                        |
| --------------------------- | ------------------------------------ | ------------------ | ----------------------------------------- |
| `/api/auth/callback/github` | OAuth sign-in flow                   | Auth.js (built-in) | [SETUP.md](./SETUP.md#authjs-oauth-callback) |
| `/api/github/callback`      | GitHub App installation              | Custom route       | [SETUP.md](./SETUP.md#github-app-installation-callback) |
| `/api/github/webhook`       | GitHub webhook events (PR, push, etc.) | Custom route       | [SETUP.md](./SETUP.md#github-webhook-handler) |

**Both callback URLs must be configured in your GitHub App settings** (one per line):

```
https://your-domain.com/api/auth/callback/github
https://your-domain.com/api/github/callback
```

**Sign-in Flow**: When users click "Sign in with GitHub", Auth.js handles the OAuth flow using the GitHub App's client ID and secret. Tokens are stored encrypted in the `github_user_tokens` table via the JWT callback.

**Installation Flow**: When users install the GitHub App on their repos, GitHub redirects to `/api/github/callback` with an `installation_id`. This ID is saved to link the user with their app installation.

**Webhook Flow**: GitHub sends real-time events to `/api/github/webhook` for installation changes, pull requests, pushes, etc. The endpoint validates the signature and processes events.

> **Note**: If the first callback URL is missing from your GitHub App settings, users will see "The redirect_uri is not associated with this application" when signing in.

### OAuth During Installation

When "Request user authorization (OAuth) during installation" is enabled in your GitHub App settings, the installation callback receives both OAuth credentials and the installation ID in one flow:

```typescript
// GitHub sends: ?code=xxx&installation_id=yyy&setup_action=install
import {
  exchangeAuthorizationCode,
  fetchGitHubUser,
  storeGitHubTokens,
} from "@catalyst/vcs-provider";
import { createAndSetSession } from "@/auth"; // From @tetrastack/backend/auth

export async function GET(request: NextRequest) {
  const code = searchParams.get("code");
  const installationId = searchParams.get("installation_id");

  // Exchange code for tokens
  const tokens = await exchangeAuthorizationCode(code);

  // Get user profile
  const githubUser = await fetchGitHubUser(tokens.accessToken);

  // Find or create user in your database
  const user = await findOrCreateUser(githubUser);

  // Store tokens with installation_id
  await storeGitHubTokens(user.id, {
    ...tokens,
    installationId,
  });

  // Create session using helpers from @tetrastack/backend/auth
  await createAndSetSession(user);

  return NextResponse.redirect("/dashboard");
}
```

### Auth.js JWT Callback Integration

The JWT callback is where tokens are stored in the database and kept fresh. This is a critical integration point:

```typescript
// src/auth.ts
import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";
import { refreshTokenIfNeeded, storeGitHubTokens } from "@/lib/vcs-providers";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  callbacks: {
    async jwt({ token, account }) {
      // On initial sign-in, account object contains GitHub OAuth tokens
      if (account?.provider === "github") {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.tokenExpiresAt = account.expires_at;
        token.tokenScope = account.scope;
      }

      // Find or create user by email
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, token.email))
        .limit(1);

      if (existingUser) {
        token.id = existingUser.id;

        // Store tokens in database on initial sign-in
        if (account?.provider === "github" && token.accessToken) {
          await storeGitHubTokens(existingUser.id, {
            accessToken: token.accessToken as string,
            refreshToken: token.refreshToken as string,
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
            scope: token.tokenScope as string || "",
          });
        } else if (!account) {
          // Not a fresh signin - auto-refresh tokens if needed
          const refreshedTokens = await refreshTokenIfNeeded(existingUser.id);
          if (refreshedTokens) {
            token.accessToken = refreshedTokens.accessToken;
            token.refreshToken = refreshedTokens.refreshToken;
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (token?.id && session.user) {
        session.user.id = token.id as string;
        session.accessToken = token.accessToken as string;
      }
      return session;
    },
  },
});
```

**Key Points:**

- **Initial Sign-In**: Tokens from `account` object are stored in database with encryption
- **Subsequent Requests**: `refreshTokenIfNeeded()` automatically refreshes tokens 5 minutes before expiry
- **Session Access**: Access token is made available in session for direct API calls

For complete implementation details, see [SETUP.md](./SETUP.md#authjs-main-file-with-jwt-callback).

### GitHub App Permissions

GitHub Apps use **permissions** instead of OAuth scopes. The following permissions must be configured in your GitHub App settings:

| Permission        | Level        | Purpose                                    |
| ----------------- | ------------ | ------------------------------------------ |
| **Emails**        | Read-only    | Required to access private email addresses |
| **Contents**      | Read-only    | Read repository files and content          |
| **Pull requests** | Read & write | Create/update PR comments                  |
| **Metadata**      | Read-only    | Required (always enabled)                  |

> **Important**: The **Emails** permission is critical. Without it, `fetchGitHubUser()` cannot retrieve the user's email when they have their email set to private. This results in the "no_email" error during OAuth. Configure this at **Settings → Permissions & events → User permissions → Emails → Read-only**.

### Environment Variables

```bash
# GitHub App OAuth credentials (for Auth.js sign-in)
GITHUB_APP_CLIENT_ID=Iv1.xxxxx
GITHUB_APP_CLIENT_SECRET=xxxxx

# GitHub App credentials (for API operations)
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."

# GitHub App installation URL (for install buttons)
NEXT_PUBLIC_GITHUB_APP_URL=https://github.com/apps/your-app-name/installations/new

# Token encryption key (64-char hex, generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
TOKEN_ENCRYPTION_KEY=xxxxx
```

### Token Storage Schema

Tokens are stored encrypted in the `github_user_tokens` table:

```typescript
{
  userId: string,              // Primary key, references users table
  installationId: string,      // GitHub App installation ID
  accessTokenEncrypted: string,
  accessTokenIv: string,
  accessTokenAuthTag: string,
  refreshTokenEncrypted: string,
  refreshTokenIv: string,
  refreshTokenAuthTag: string,
  tokenExpiresAt: Date,
  tokenScope: string,
  createdAt: Date,
  updatedAt: Date,
}
```

### Token Lifecycle

| Token         | Lifetime | Refresh Strategy                     |
| ------------- | -------- | ------------------------------------ |
| Access Token  | 8 hours  | Auto-refresh 5 minutes before expiry |
| Refresh Token | 6 months | Replaced on each refresh             |

### Retrieving Access Tokens

When fetching GitHub data, tokens can come from multiple sources depending on how the user authenticated. Implement a helper function in your application to handle this:

```typescript
// src/lib/vcs-providers.ts (or similar)
import { GITHUB_CONFIG, getGitHubTokens } from "@catalyst/vcs-provider";

interface Session {
  accessToken?: string;
  user: { id: string };
}

/**
 * Get a GitHub access token for the current user.
 *
 * Token priority:
 * 1. PAT - for local development when GITHUB_PAT env var is set
 * 2. Session token - populated by Auth.js JWT callback when user signs in via GitHub OAuth
 *    (see src/auth.ts jwt callback: token.accessToken = account.access_token)
 * 3. Database - for programmatic sessions (e.g., GitHub App OAuth installation flow)
 *    where tokens are stored in github_user_tokens but not in the JWT
 */
export async function getGitHubAccessToken(
  session: Session,
): Promise<string | undefined> {
  // 1. PAT for local development, 2. Session token from Auth.js
  const token = GITHUB_CONFIG.PAT || session.accessToken;
  if (token) return token;

  // 3. Database lookup for programmatic sessions
  const dbTokens = await getGitHubTokens(session.user.id);
  return dbTokens?.accessToken;
}
```

**Why is this needed?**

- **Auth.js OAuth flow**: Token is stored in the JWT session (`session.accessToken`)
- **GitHub App installation with OAuth**: Token is stored in the database (`github_user_tokens` table) but NOT in the JWT, because the session is created programmatically via `createSessionToken()`
- **Local development**: PAT takes priority to avoid OAuth complexity

Each application should implement this pattern with their own Auth.js session type and database setup.

### Cookie Configuration

In development, custom cookie names prevent conflicts when multiple Next.js apps run on localhost:

```typescript
// web/src/lib/auth.config.ts
const devCookies = {
  sessionToken: { name: "catalyst.session-token" },
  pkceCodeVerifier: { name: "catalyst.pkce.code_verifier" },
  // ... other cookies
};

// Production uses Auth.js defaults with proper sameSite/secure settings
cookies: process.env.NODE_ENV === "development" ? devCookies : undefined,
```

## Related Documentation

- **[SETUP.md](./SETUP.md)** - **Complete setup guide** with step-by-step instructions for:
  - GitHub App configuration
  - API endpoint implementation (OAuth callbacks, webhooks)
  - Auth.js integration with JWT/session callbacks
  - Database schema and migrations
  - VCSProviderSingleton initialization
  - Environment variables
  - Security best practices
  - OAuth flow diagrams
  - Troubleshooting common issues
- [EXAMPLES.md](./EXAMPLES.md) - Code examples and server actions
- [AGENTS.md](./AGENTS.md) - Instructions for AI agents
- [specs/003-vcs-providers/spec.md](../../../specs/003-vcs-providers/spec.md) - Integration specification
- [specs/003-vcs-providers/research.github-app.md](../../../specs/003-vcs-providers/research.github-app.md) - GitHub App research and comparison
- [specs/003-vcs-providers/plan.github-app.md](../../../specs/003-vcs-providers/plan.github-app.md) - Implementation plan and architecture
- [specs/003-vcs-providers/research.providers-auth.md](../../../specs/003-vcs-providers/research.providers-auth.md) - Multi-provider authentication research

## External Resources

- [GitHub Docs: Authenticating with a GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app)
- [GitHub Docs: Refreshing user access tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens)
- [Auth.js GitHub Provider](https://authjs.dev/getting-started/providers/github)
- [Auth.js JWT Callback](https://authjs.dev/guides/basics/callbacks#jwt-callback)
- [Auth.js Session Callback](https://authjs.dev/guides/basics/callbacks#session-callback)
