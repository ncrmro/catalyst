# VCS Provider - Agent Instructions

This document provides guidance for AI agents working with the `@catalyst/vcs-provider` package.

## Package Purpose

The VCS provider package abstracts version control system APIs (GitHub, GitLab, Bitbucket) behind a unified interface. It handles:

- Authentication and token management
- Repository content operations (read files, list directories)
- Pull request and issue management
- Deployment comments and status updates

## Key Patterns

### 1. Import from the Barrel File

Always import from `@/lib/vcs-providers` (the re-export barrel) rather than directly from the package:

```typescript
// CORRECT
import { getUserOctokit, GITHUB_CONFIG } from "@/lib/vcs-providers";

// AVOID - direct package import
import { getUserOctokit } from "@catalyst/vcs-provider";
```

### 2. Server Actions Pattern

When creating actions that read repository content, follow this pattern:

```typescript
"use server";

import { auth } from "@/auth";
import { getUserOctokit } from "@/lib/vcs-providers";

export async function myAction(repoFullName: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const [owner, repo] = repoFullName.split("/");
  const octokit = await getUserOctokit(session.user.id);

  // Use octokit...
}
```

### 3. Error Handling

Always handle 404 errors gracefully - they often mean "doesn't exist" rather than an error:

```typescript
try {
  const { data } = await octokit.rest.repos.getContent({ ... });
} catch (error) {
  if ((error as { status?: number })?.status === 404) {
    return { success: true, entries: [] }; // Not an error, just empty
  }
  return { success: false, error: error.message };
}
```

### 4. Reading Files

GitHub returns base64-encoded content. Always decode:

```typescript
const content = Buffer.from(data.content, "base64").toString("utf-8");
```

## Common Operations

### List Directory

```typescript
const { data } = await octokit.rest.repos.getContent({
  owner,
  repo,
  path: "specs",
  ref: "main",
});

// data is an array when path is a directory
if (Array.isArray(data)) {
  const dirs = data.filter((item) => item.type === "dir");
  const files = data.filter((item) => item.type === "file");
}
```

### Read File

```typescript
const { data } = await octokit.rest.repos.getContent({
  owner,
  repo,
  path: "specs/feature/spec.md",
  ref: "main",
});

// data is an object when path is a file
if (!Array.isArray(data) && data.type === "file") {
  const content = Buffer.from(data.content, "base64").toString("utf-8");
}
```

## File Locations

| File                                      | Purpose                     |
| ----------------------------------------- | --------------------------- |
| `src/actions/version-control-provider.ts` | Generic VCS server actions  |
| `src/lib/vcs-providers.ts`                | Re-export barrel file       |
| `packages/@catalyst/vcs-provider/`        | Core package implementation |

## When to Use This Package

Use the VCS provider for:

- Reading spec files from repositories
- Listing repository contents
- Managing PR comments
- Token-authenticated GitHub operations

Do NOT use for:

- Local file operations
- Non-authenticated public API calls
- Operations that don't need user context

## Example: Adding a New Action

To add a new VCS action:

1. Add the function to `src/actions/version-control-provider.ts`
2. Export the result types
3. Document in EXAMPLES.md
4. Use in UI components via server action calls

```typescript
// New action template
export async function myNewAction(
  repoFullName: string,
  path: string,
): Promise<MyResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  try {
    const [owner, repo] = repoFullName.split("/");
    const octokit = await getUserOctokit(session.user.id);

    // Implementation...

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```
