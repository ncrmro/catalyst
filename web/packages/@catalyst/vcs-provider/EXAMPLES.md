# VCS Provider Examples

This document provides example code for common VCS operations using the `@catalyst/vcs-provider` package.

## Using VCSProviderSingleton (NEW & RECOMMENDED)

The VCSProviderSingleton provides the easiest and most powerful way to interact with VCS providers.

### Initialization in Next.js

```typescript
// src/lib/vcs-provider-init.ts
import { VCSProviderSingleton } from "@catalyst/vcs-provider";
import {
  getGitHubTokens,
  storeGitHubTokens,
  exchangeRefreshToken,
} from "@catalyst/vcs-provider";
import type { ProviderId } from "@catalyst/vcs-provider";

let initialized = false;

/**
 * Initialize VCS Provider Singleton
 * Call this once at application startup
 */
export function initializeVCSProvider() {
  if (initialized) {
    return;
  }

  VCSProviderSingleton.initialize({
    getTokenData: async (tokenSourceId: string, providerId: ProviderId) => {
      // tokenSourceId can be userId, teamId, projectId, etc.
      // Your application logic determines how to interpret it
      if (providerId === "github") {
        return await getGitHubTokens(tokenSourceId);
      }
      return null;
    },

    refreshToken: async (refreshToken: string, providerId: ProviderId) => {
      if (providerId === "github") {
        const tokens = await exchangeRefreshToken(refreshToken);
        return {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          scope: tokens.scope,
        };
      }
      throw new Error(`Unsupported provider: ${providerId}`);
    },

    storeTokenData: async (tokenSourceId: string, tokens, providerId: ProviderId) => {
      if (providerId === "github") {
        await storeGitHubTokens(tokenSourceId, {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || "",
          expiresAt: tokens.expiresAt || new Date(),
          scope: tokens.scope || "",
        });
      }
    },

    // Validate required environment variables on startup
    requiredEnvVars: [
      'GITHUB_APP_CLIENT_ID',
      'GITHUB_APP_CLIENT_SECRET',
      'TOKEN_ENCRYPTION_KEY',
    ],

    // Optional: Custom expiration buffer (default is 5 minutes)
    expirationBufferMs: 5 * 60 * 1000,
  });

  initialized = true;
}
```

### Call initialization in Next.js

```typescript
// src/middleware.ts or src/instrumentation.ts
import { initializeVCSProvider } from "@/lib/vcs-provider-init";

initializeVCSProvider();
```

### Using in Server Actions

```typescript
// src/actions/issues.ts
"use server";

import { auth } from "@/auth";
import { VCSProviderSingleton } from "@catalyst/vcs-provider";

export async function getIssue(owner: string, repo: string, issueNumber: number) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const vcs = VCSProviderSingleton.getInstance();
    
    // Automatic token management - no manual refresh needed!
    const issue = await vcs.issues.get(
      session.user.id, // tokenSourceId (userId, teamId, projectId, etc.)
      owner,
      repo,
      issueNumber
    );

    return { success: true, issue };
  } catch (error) {
    if (error.message.includes("No valid tokens")) {
      return { success: false, error: "Please reconnect your GitHub account" };
    }
    return { success: false, error: "Failed to fetch issue" };
  }
}

export async function listPullRequests(owner: string, repo: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const vcs = VCSProviderSingleton.getInstance();
    
    const pullRequests = await vcs.pullRequests.list(
      session.user.id,
      owner,
      repo,
      { state: 'open' }
    );

    return { success: true, pullRequests };
  } catch (error) {
    return { success: false, error: "Failed to fetch pull requests" };
  }
}

export async function createPullRequest(
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const vcs = VCSProviderSingleton.getInstance();
    
    const pr = await vcs.pullRequests.create(
      session.user.id,
      owner,
      repo,
      title,
      head,
      base,
      body
    );

    return { success: true, pr };
  } catch (error) {
    return { success: false, error: "Failed to create pull request" };
  }
}
```

### Using with Team or Project Context

```typescript
// src/actions/team-repos.ts
"use server";

import { auth } from "@/auth";
import { VCSProviderSingleton } from "@catalyst/vcs-provider";
import { getTeamFromProject } from "@/db/queries";

export async function listTeamRepositories(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Get team that owns this project
  const team = await getTeamFromProject(projectId);
  if (!team) {
    return { success: false, error: "Team not found" };
  }

  try {
    const vcs = VCSProviderSingleton.getInstance();
    
    // Use teamId as tokenSourceId
    // Your getTokenData callback determines how to fetch tokens for a team
    const repos = await vcs.repos.listOrg(
      team.id, // tokenSourceId is teamId
      team.githubOrg
    );

    return { success: true, repos };
  } catch (error) {
    return { success: false, error: "Failed to fetch repositories" };
  }
}
```

### File Operations

```typescript
// src/actions/files.ts
"use server";

import { auth } from "@/auth";
import { VCSProviderSingleton } from "@catalyst/vcs-provider";

export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  ref?: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const vcs = VCSProviderSingleton.getInstance();
    
    const file = await vcs.files.getContent(
      session.user.id,
      owner,
      repo,
      path,
      ref
    );

    if (!file) {
      return { success: false, error: "File not found" };
    }

    return { success: true, file };
  } catch (error) {
    return { success: false, error: "Failed to fetch file" };
  }
}

export async function updateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const vcs = VCSProviderSingleton.getInstance();
    
    const updatedFile = await vcs.files.update(
      session.user.id,
      owner,
      repo,
      path,
      content,
      message,
      branch
    );

    return { success: true, file: updatedFile };
  } catch (error) {
    return { success: false, error: "Failed to update file" };
  }
}
```

## Legacy: Using VCSTokenManager (Lower-Level)

```typescript
// src/lib/vcs-token-manager-init.ts
import { VCSTokenManager } from "@catalyst/vcs-provider";
import {
  getGitHubTokens,
  storeGitHubTokens,
  exchangeRefreshToken,
} from "@catalyst/vcs-provider";
import type { ProviderId } from "@catalyst/vcs-provider";

let initialized = false;

/**
 * Initialize VCS Token Manager
 * Call this once at application startup
 */
export function initializeVCSTokenManager() {
  if (initialized) {
    return;
  }

  VCSTokenManager.initialize({
    getTokenData: async (userId: string, providerId: ProviderId) => {
      // Currently only GitHub is supported, but this pattern
      // allows for future multi-provider support
      if (providerId === "github") {
        return await getGitHubTokens(userId);
      }
      return null;
    },

    refreshToken: async (refreshToken: string, providerId: ProviderId) => {
      // Provider-specific token refresh logic
      if (providerId === "github") {
        const tokens = await exchangeRefreshToken(refreshToken);
        return {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
          scope: tokens.scope,
        };
      }
      throw new Error(`Unsupported provider: ${providerId}`);
    },

    storeTokenData: async (userId: string, tokens, providerId: ProviderId) => {
      // Provider-specific token storage
      if (providerId === "github") {
        await storeGitHubTokens(userId, {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken || "",
          expiresAt: tokens.expiresAt || new Date(),
          scope: tokens.scope || "",
        });
      }
    },

    // Optional: Custom expiration buffer (default is 5 minutes)
    expirationBufferMs: 5 * 60 * 1000, // 5 minutes
  });

  initialized = true;
}
```

### Calling Initialization in Next.js

```typescript
// src/middleware.ts
import { initializeVCSTokenManager } from "@/lib/vcs-token-manager-init";

// Initialize on first middleware execution
initializeVCSTokenManager();

export function middleware(request: NextRequest) {
  // Your middleware logic...
}
```

Or in an instrumentation file:

```typescript
// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initializeVCSTokenManager } = await import(
      "@/lib/vcs-token-manager-init"
    );
    initializeVCSTokenManager();
  }
}
```

### Using VCSTokenManager in Server Actions

```typescript
// src/actions/version-control-provider.ts
"use server";

import { auth } from "@/auth";
import { VCSTokenManager } from "@catalyst/vcs-provider";
import { Octokit } from "@octokit/rest";

export async function getRepositoryData(repoFullName: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Get valid token (automatically refreshed if needed!)
  const manager = VCSTokenManager.getInstance();
  const tokens = await manager.getValidToken(session.user.id, "github");

  if (!tokens) {
    return { success: false, error: "Please reconnect your GitHub account" };
  }

  // Use the token with Octokit
  const octokit = new Octokit({ auth: tokens.accessToken });
  const [owner, repo] = repoFullName.split("/");

  try {
    const { data } = await octokit.rest.repos.get({ owner, repo });
    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Failed to fetch repository" };
  }
}
```

## Server Actions for Repository Content

These server actions provide a generic interface for reading files and directories from repositories. They can be used by UI components to display repository content like specs, documentation, or configuration files.

### List Directory Contents

```typescript
// src/actions/version-control-provider.ts
"use server";

import { auth } from "@/auth";
import { getUserOctokit } from "@/lib/vcs-providers";

export interface VCSEntry {
  name: string;
  path: string;
  type: "file" | "dir";
}

export interface VCSDirectoryResult {
  success: boolean;
  entries: VCSEntry[];
  error?: string;
}

/**
 * List directory contents from a repository
 */
export async function listDirectory(
  repoFullName: string,
  path: string,
  ref: string = "main",
): Promise<VCSDirectoryResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, entries: [], error: "Not authenticated" };
  }

  try {
    const [owner, repo] = repoFullName.split("/");
    const octokit = await getUserOctokit(session.user.id);

    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if (!Array.isArray(data)) {
      return { success: false, entries: [], error: "Path is not a directory" };
    }

    const entries: VCSEntry[] = data.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type as "file" | "dir",
    }));

    return { success: true, entries };
  } catch (error) {
    if ((error as { status?: number })?.status === 404) {
      return { success: true, entries: [] }; // Directory doesn't exist
    }
    return {
      success: false,
      entries: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

### Read File Contents

```typescript
export interface VCSFile {
  name: string;
  path: string;
  content: string;
  sha: string;
  htmlUrl: string;
}

export interface VCSFileResult {
  success: boolean;
  file: VCSFile | null;
  error?: string;
}

/**
 * Read file contents from a repository
 */
export async function readFile(
  repoFullName: string,
  path: string,
  ref: string = "main",
): Promise<VCSFileResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, file: null, error: "Not authenticated" };
  }

  try {
    const [owner, repo] = repoFullName.split("/");
    const octokit = await getUserOctokit(session.user.id);

    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if (Array.isArray(data) || data.type !== "file") {
      return { success: false, file: null, error: "Path is not a file" };
    }

    const content = Buffer.from(data.content, "base64").toString("utf-8");

    return {
      success: true,
      file: {
        name: data.name,
        path: data.path,
        content,
        sha: data.sha,
        htmlUrl: data.html_url || "",
      },
    };
  } catch (error) {
    if ((error as { status?: number })?.status === 404) {
      return { success: true, file: null }; // File doesn't exist
    }
    return {
      success: false,
      file: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

### Check Directory Exists

```typescript
/**
 * Check if a directory exists in a repository
 */
export async function directoryExists(
  repoFullName: string,
  path: string,
  ref: string = "main",
): Promise<boolean> {
  const result = await listDirectory(repoFullName, path, ref);
  return result.success && !result.error;
}
```

## Usage in UI Components

### Listing Specs from a Repository

```typescript
// In a Next.js page component
import { listDirectory, VCSEntry } from "@/actions/version-control-provider";
import { fetchProjectById } from "@/actions/projects";

interface SpecDirectory {
  name: string;
  path: string;
  files: VCSEntry[];
}

export default async function ProjectPage({ params }) {
  const project = await fetchProjectById(params.projectId);
  const repo = project.repositories[0]?.repo;

  let specs: SpecDirectory[] = [];

  if (repo) {
    // List the specs/ directory
    const specsResult = await listDirectory(repo.fullName, "specs");

    if (specsResult.success && specsResult.entries.length > 0) {
      // Each subdirectory is a spec
      const specDirs = specsResult.entries.filter((e) => e.type === "dir");

      // Fetch files for each spec directory
      specs = await Promise.all(
        specDirs.map(async (dir) => {
          const filesResult = await listDirectory(repo.fullName, dir.path);
          return {
            name: dir.name,
            path: dir.path,
            files: filesResult.success ? filesResult.entries : [],
          };
        }),
      );
    }
  }

  return (
    <ul>
      {specs.map((spec) => (
        <li key={spec.path}>
          {spec.name} ({spec.files.length} files)
        </li>
      ))}
    </ul>
  );
}
```

### Reading Spec Content

```typescript
import { readFile } from "@/actions/version-control-provider";

export default async function SpecPage({ params }) {
  const { projectId, specId } = params;
  const project = await fetchProjectById(projectId);
  const repo = project.repositories[0]?.repo;

  const fileResult = await readFile(
    repo.fullName,
    `specs/${specId}/spec.md`,
  );

  if (!fileResult.success || !fileResult.file) {
    return <div>Spec not found</div>;
  }

  return <MarkdownRenderer content={fileResult.file.content} />;
}
```

## Token Refresh Example

```typescript
import {
  getUserOctokit,
  refreshTokenIfNeeded,
  isGitHubTokenError,
} from "@catalyst/vcs-provider";

async function fetchWithTokenRefresh(userId: string) {
  try {
    const octokit = await getUserOctokit(userId);
    return await octokit.rest.repos.listForAuthenticatedUser();
  } catch (error) {
    if (isGitHubTokenError(error)) {
      // Try refreshing the token
      const refreshed = await refreshTokenIfNeeded(userId);
      if (refreshed) {
        // Retry with new token
        const octokit = await getUserOctokit(userId);
        return await octokit.rest.repos.listForAuthenticatedUser();
      }
    }
    throw error;
  }
}
```

## Pull Request Comments

```typescript
import {
  formatDeploymentComment,
  upsertDeploymentComment,
} from "@catalyst/vcs-provider";

// Format a deployment status comment
const comment = formatDeploymentComment({
  status: "success",
  url: "https://preview-123.example.com",
  environment: "preview",
  commitSha: "abc123",
});

// Create or update the comment on a PR
await upsertDeploymentComment({
  owner: "owner",
  repo: "repo",
  prNumber: 123,
  comment,
  userId: "user-id",
});
```
