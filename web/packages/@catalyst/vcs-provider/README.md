# @catalyst/vcs-provider

Version Control System provider abstraction for multi-provider support (GitHub, GitLab, Bitbucket, etc.).

## Overview

This package provides a unified interface for interacting with version control systems. It abstracts provider-specific APIs behind a common interface, making it easy to:

- Authenticate users with VCS providers
- Read files and directories from repositories
- Manage pull requests and issues
- Handle webhooks

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

The authentication system uses two separate callback routes:

| Callback URL                | Purpose                 | Handler            |
| --------------------------- | ----------------------- | ------------------ |
| `/api/auth/callback/github` | OAuth sign-in flow      | Auth.js (built-in) |
| `/api/github/callback`      | GitHub App installation | Custom route       |

**Sign-in Flow**: When users click "Sign in with GitHub", Auth.js handles the OAuth flow using the GitHub App's client ID and secret. Tokens are stored encrypted in the `github_user_tokens` table.

**Installation Flow**: When users install the GitHub App on their repos, GitHub redirects to `/api/github/callback` with an `installation_id`. This ID is saved to link the user with their app installation.

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
