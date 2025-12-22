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

## Related

- [EXAMPLES.md](./EXAMPLES.md) - Code examples and server actions
- [AGENTS.md](./AGENTS.md) - Instructions for AI agents
