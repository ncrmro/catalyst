# @catalyst/vcs-provider

Version Control System provider abstraction for multi-provider support (GitHub, GitLab, Bitbucket, etc.).

## Overview

This package provides a unified interface for interacting with version control systems. It abstracts provider-specific APIs behind a common interface, making it easy to:

- Authenticate users with VCS providers
- **Automatically refresh tokens without manual logic** (NEW!)
- Read files and directories from repositories
- Manage pull requests and issues
- Handle webhooks

## Key Features

### 🔄 Automatic Token Refresh (NEW)

The **VCSTokenManager** singleton automatically handles token refresh for you. No more manually checking expiration or writing refresh logic in every action!

```typescript
import { VCSTokenManager } from "@catalyst/vcs-provider";

// 1. Initialize once at application startup
VCSTokenManager.initialize({
  getTokenData: async (userId, providerId) => {
    return await getGitHubTokens(userId);
  },
  refreshToken: async (refreshToken, providerId) => {
    return await exchangeRefreshToken(refreshToken);
  },
  storeTokenData: async (userId, tokens, providerId) => {
    await storeGitHubTokens(userId, tokens);
  },
});

// 2. Use anywhere - automatic refresh before expiration!
const manager = VCSTokenManager.getInstance();
const tokens = await manager.getValidToken(userId, 'github');

if (!tokens) {
  return { error: 'Please reconnect your GitHub account' };
}

// Use tokens.accessToken for API calls
const octokit = new Octokit({ auth: tokens.accessToken });
```

**Benefits:**
- ✅ No manual token refresh logic in actions/routes
- ✅ Automatic refresh 5 minutes before expiration
- ✅ Provider-agnostic design (works with GitHub, GitLab, etc.)
- ✅ Handles refresh failures gracefully
- ✅ Prevents concurrent refresh calls for the same user

## Installation

```bash
npm install @catalyst/vcs-provider
```

## Usage

### Authentication

```typescript
import { getUserOctokit, GITHUB_CONFIG } from "@catalyst/vcs-provider";

// Get an authenticated Octokit client for a user
const octokit = await getUserOctokit(userId);
```

### Reading Repository Content

The package exports utilities for reading files and directories. See [EXAMPLES.md](./EXAMPLES.md) for server action examples.

```typescript
import { getUserOctokit } from "@catalyst/vcs-provider";

const octokit = await getUserOctokit(userId);

// List directory contents
const { data } = await octokit.rest.repos.getContent({
  owner: "owner",
  repo: "repo",
  path: "specs",
  ref: "main",
});

// Read file content
const { data: file } = await octokit.rest.repos.getContent({
  owner: "owner",
  repo: "repo",
  path: "specs/feature/spec.md",
  ref: "main",
});

// Decode base64 content
const content = Buffer.from(file.content, "base64").toString("utf-8");
```

### Token Management

```typescript
import {
  storeGitHubTokens,
  getGitHubTokens,
  refreshTokenIfNeeded,
} from "@catalyst/vcs-provider";

// Store tokens securely (encrypted)
await storeGitHubTokens(userId, {
  accessToken: "...",
  refreshToken: "...",
  expiresAt: new Date(),
});

// Get tokens (decrypted)
const tokens = await getGitHubTokens(userId);

// Refresh if needed
const refreshed = await refreshTokenIfNeeded(userId);
```

## Exports

### Token Manager (Provider-Agnostic)

- `VCSTokenManager` - Singleton for automatic token refresh
- `VCSTokenManagerConfig` - Configuration interface
- `VCS_PROVIDER_TOKEN_SCHEMA` - Database schema reference
- `VCSProviderTokenRecord` - TypeScript type for token records
- `POSTGRES_MIGRATION_SQL` - SQL for creating token table

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

## Auth.js Integration

This package works with Auth.js (NextAuth.js) to provide GitHub authentication using GitHub App credentials instead of a separate OAuth App.

### Why GitHub App Credentials?

GitHub App credentials provide several advantages over OAuth App credentials:

- **Short-lived tokens**: 8-hour access tokens with 6-month refresh tokens
- **Higher rate limits**: Additional API quota from installation-level limits
- **Fine-grained permissions**: Control access at the resource level
- **Installation tracking**: Know exactly which repos/orgs are accessible

### Two Callback URLs

The authentication system uses two separate callback routes. **Both must be configured in your GitHub App settings** (one per line):

```
https://your-domain.com/api/auth/callback/github
https://your-domain.com/api/github/callback
```

| Callback URL                | Purpose                 | Handler            |
| --------------------------- | ----------------------- | ------------------ |
| `/api/auth/callback/github` | OAuth sign-in flow      | Auth.js (built-in) |
| `/api/github/callback`      | GitHub App installation | Custom route       |

**Sign-in Flow**: When users click "Sign in with GitHub", Auth.js handles the OAuth flow using the GitHub App's client ID and secret. Tokens are stored encrypted in the `github_user_tokens` table.

**Installation Flow**: When users install the GitHub App on their repos, GitHub redirects to `/api/github/callback` with an `installation_id`. This ID is saved to link the user with their app installation.

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

For programmatic session creation (used in the callback above), see the [Programmatic Session Creation](../../../packages/@tetrastack/backend/README.md#programmatic-session-creation) section in the `@tetrastack/backend` README.

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

## Related

- [EXAMPLES.md](./EXAMPLES.md) - Code examples and server actions
- [AGENTS.md](./AGENTS.md) - Instructions for AI agents
- [specs/003-vcs-providers/research.github-app.md](../../../specs/003-vcs-providers/research.github-app.md) - GitHub App research
- [specs/003-vcs-providers/plan.github-app.md](../../../specs/003-vcs-providers/plan.github-app.md) - Implementation plan
