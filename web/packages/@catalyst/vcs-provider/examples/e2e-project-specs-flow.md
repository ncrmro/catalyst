# E2E Example: Project Creation and Specs Viewing with MockVCSProvider

This example demonstrates a complete end-to-end flow using `MockVCSProvider` that matches the real GitHub PAT experience. The flow includes:
1. Creating a project with a repository
2. Viewing specs on the project page
3. Clicking on a spec to view its content

## Setup

### 1. Configure MockVCSProvider with Spec Data

```typescript
// Test setup or initialization file
import { MockVCSProvider } from "@catalyst/vcs-provider";

// Create a mock provider with realistic repository and spec data
const mockProvider = new MockVCSProvider({
  // Repository data - matches what's returned by VCS provider
  repositories: [
    {
      id: "12345",
      name: "catalyst",
      fullName: "ncrmro/catalyst",
      owner: "ncrmro",
      defaultBranch: "main",
      private: false,
      htmlUrl: "https://github.com/ncrmro/catalyst",
      description: "Catalyst development platform",
      language: "TypeScript",
      updatedAt: new Date("2024-01-15T00:00:00Z"),
    },
  ],

  // Directory structure - includes specs/ directory with numbered spec folders
  directories: {
    // Root directory listing
    "": [
      { type: "file", name: "package.json", path: "package.json", sha: "sha-pkg", htmlUrl: "https://github.com/ncrmro/catalyst/blob/main/package.json" },
      { type: "file", name: "Dockerfile", path: "Dockerfile", sha: "sha-docker", htmlUrl: "https://github.com/ncrmro/catalyst/blob/main/Dockerfile" },
      { type: "file", name: "README.md", path: "README.md", sha: "sha-readme", htmlUrl: "https://github.com/ncrmro/catalyst/blob/main/README.md" },
      { type: "dir", name: "src", path: "src", sha: "sha-src", htmlUrl: "https://github.com/ncrmro/catalyst/tree/main/src" },
      { type: "dir", name: "specs", path: "specs", sha: "sha-specs", htmlUrl: "https://github.com/ncrmro/catalyst/tree/main/specs" },
    ],

    // specs/ directory - list of spec folders
    "specs": [
      { type: "dir", name: "001-environments", path: "specs/001-environments", sha: "sha-001", htmlUrl: "https://github.com/ncrmro/catalyst/tree/main/specs/001-environments" },
      { type: "dir", name: "003-vcs-providers", path: "specs/003-vcs-providers", sha: "sha-003", htmlUrl: "https://github.com/ncrmro/catalyst/tree/main/specs/003-vcs-providers" },
      { type: "dir", name: "009-projects", path: "specs/009-projects", sha: "sha-009", htmlUrl: "https://github.com/ncrmro/catalyst/tree/main/specs/009-projects" },
    ],

    // Individual spec directories with their files
    "specs/001-environments": [
      { type: "file", name: "spec.md", path: "specs/001-environments/spec.md", sha: "sha-001-spec", htmlUrl: "https://github.com/ncrmro/catalyst/blob/main/specs/001-environments/spec.md" },
      { type: "file", name: "plan.md", path: "specs/001-environments/plan.md", sha: "sha-001-plan", htmlUrl: "https://github.com/ncrmro/catalyst/blob/main/specs/001-environments/plan.md" },
      { type: "file", name: "tasks.md", path: "specs/001-environments/tasks.md", sha: "sha-001-tasks", htmlUrl: "https://github.com/ncrmro/catalyst/blob/main/specs/001-environments/tasks.md" },
    ],

    "specs/003-vcs-providers": [
      { type: "file", name: "spec.md", path: "specs/003-vcs-providers/spec.md", sha: "sha-003-spec", htmlUrl: "https://github.com/ncrmro/catalyst/blob/main/specs/003-vcs-providers/spec.md" },
      { type: "file", name: "plan.md", path: "specs/003-vcs-providers/plan.md", sha: "sha-003-plan", htmlUrl: "https://github.com/ncrmro/catalyst/blob/main/specs/003-vcs-providers/plan.md" },
    ],

    "specs/009-projects": [
      { type: "file", name: "spec.md", path: "specs/009-projects/spec.md", sha: "sha-009-spec", htmlUrl: "https://github.com/ncrmro/catalyst/blob/main/specs/009-projects/spec.md" },
    ],
  },

  // File contents - the actual spec content users will see
  files: {
    // Root files for project detection
    "package.json": JSON.stringify({
      name: "catalyst",
      version: "1.0.0",
      dependencies: {}
    }, null, 2),

    "Dockerfile": `FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]`,

    "README.md": "# Catalyst\n\nA development platform for faster shipping.",

    // Spec files - these are displayed in the UI
    "specs/001-environments/spec.md": `# 001: Deployment Environments

## Summary
Manages deployment (production/staging) and isolated development environments with preview URLs.

## Goals
- **Deployment Environments**: Create and manage production and staging environments
- **Development Environments**: Isolated cloud-based workspaces for developers
- **Preview URLs**: Automatic URL generation for each environment

## User Stories

### As a Developer
- I want to create a new development environment so I can test features in isolation
- I want to access my environment via a unique URL
- I want to see environment status (running, stopped, etc.)

### As a DevOps Engineer
- I want to configure production and staging environments
- I want to promote changes from staging to production
- I want to monitor environment health

## Technical Requirements

### Environment Types
1. **Production**: Live application serving real users
2. **Staging**: Pre-production testing environment
3. **Development**: Individual developer environments

### Features
- Kubernetes namespace isolation
- Ingress-based routing
- Environment variables management
- Resource limits and quotas

## Implementation Notes
- Uses Kubernetes CRDs for declarative management
- Operator reconciles environment specifications
- Web UI for environment creation and monitoring
`,

    "specs/001-environments/plan.md": `# Implementation Plan

## Phase 1: Core Infrastructure
- [ ] Create Environment CRD
- [ ] Implement Kubernetes operator
- [ ] Setup ingress controller

## Phase 2: Web Integration
- [ ] Environment creation UI
- [ ] Status monitoring dashboard
- [ ] Environment management actions

## Phase 3: Advanced Features
- [ ] Preview environment automation
- [ ] Resource optimization
- [ ] Auto-scaling support
`,

    "specs/001-environments/tasks.md": `# Tasks

## In Progress
- [x] Define Environment CRD schema
- [x] Implement operator reconciliation loop
- [ ] Add environment status updates

## Planned
- [ ] Create web UI for environment management
- [ ] Add resource quota enforcement
- [ ] Implement auto-cleanup for stale environments

## Completed
- [x] Research Kubernetes operators
- [x] Design environment architecture
`,

    "specs/003-vcs-providers/spec.md": `# 003: VCS Providers

## Summary
Integrates version control systems (GitHub) for authentication, team sync, and PR orchestration.

## Goals
- Multi-provider VCS support (GitHub, GitLab, Bitbucket)
- Unified authentication flow
- Repository access and management
- Pull request integration

## User Stories

### As a User
- I want to connect my GitHub account
- I want to see my repositories in the UI
- I want to view pull requests and issues

### As an Administrator
- I want to configure GitHub App integration
- I want to manage team access to repositories

## Technical Design

### VCS Provider Interface
\`\`\`typescript
interface VCSProvider {
  authenticate(userId: string): Promise<AuthenticatedClient>;
  listRepositories(): Promise<Repository[]>;
  getFileContent(path: string): Promise<FileContent>;
  listPullRequests(): Promise<PullRequest[]>;
}
\`\`\`

### Supported Providers
- GitHub (via GitHub App)
- GitLab (planned)
- Bitbucket (planned)
`,

    "specs/003-vcs-providers/plan.md": `# VCS Providers Implementation Plan

## Completed
- [x] GitHub provider implementation
- [x] Token management system
- [x] Repository listing

## In Progress
- [ ] MockVCSProvider for testing
- [ ] Improve error handling
- [ ] Add rate limiting

## Future
- [ ] GitLab provider
- [ ] Bitbucket provider
- [ ] Self-hosted Git support
`,

    "specs/009-projects/spec.md": `# 009: Projects

## Summary
Groups repositories into projects to enable centralized CI, release management, and spec-driven workflows.

## Goals
- **Project Management**: Group related repositories
- **Centralized CI/CD**: Unified build and deployment pipeline
- **Spec Integration**: Link specifications to projects
- **Team Collaboration**: Shared project access

## User Stories

### As a Team Lead
- I want to create a project that groups multiple repositories
- I want to see all specs across project repositories
- I want to track progress via pull requests and issues

### As a Developer
- I want to view specs for my project
- I want to see related PRs and issues
- I want to contribute to project documentation

## Features

### Project Configuration
- Name and description
- Repository associations
- Build configuration
- Deployment settings

### Spec Management
- Auto-discovery of specs/ directories
- Spec listing and navigation
- Markdown rendering
- Task tracking

### Dashboard
- Project overview
- Recent activity
- Spec status
- PR/Issue tracking

## Implementation

### Project Model
\`\`\`typescript
interface Project {
  id: string;
  slug: string;
  name: string;
  description: string;
  repositories: Repository[];
  configuration: ProjectConfig;
}
\`\`\`

### Spec Discovery
- Scan repos for \`specs/\` directory
- Filter directories matching \`NNN-name\` pattern
- Read spec.md, plan.md, tasks.md files
- Display in project dashboard
`,
  },
});

export { mockProvider };
```

### 2. Initialize VCS with Mock Provider

```typescript
// src/lib/vcs.ts or test setup
import { VCSProviderSingleton } from "@catalyst/vcs-provider";
import { mockProvider } from "./mock-setup";

// Initialize the singleton with mock provider
VCSProviderSingleton.reset(); // Clear any previous initialization
VCSProviderSingleton.initialize({
  providers: [mockProvider],
  
  // Mock token management - no real DB writes
  getTokenData: async (userId, providerId) => ({
    accessToken: "mock-token-" + userId,
    refreshToken: "mock-refresh-token",
    expiresAt: new Date(Date.now() + 3600000),
    scope: "repo",
  }),
  
  refreshToken: async () => ({
    accessToken: "mock-token-refreshed",
    refreshToken: "mock-refresh-token-refreshed",
    expiresAt: new Date(Date.now() + 3600000),
    scope: "repo",
  }),
  
  storeTokenData: async () => {
    // No-op for mock
  },
  
  defaultProvider: "github",
});
```

### 3. Environment Configuration

```bash
# .env or .env.test
VCS_MOCK=true
```

## E2E Test Flow

### Test: Complete Project and Specs Flow

```typescript
import { test, expect } from "@playwright/test";

test.describe("Project Creation and Specs Viewing E2E", () => {
  test("should create project, view specs, and read spec content", async ({ page }) => {
    // STEP 1: Create Project with Repository
    // Navigate to projects page
    await page.goto("/projects");
    await expect(page.getByRole("heading", { name: "Projects" })).toBeVisible();
    
    // Click "Create Project"
    await page.getByRole("link", { name: "Create Project" }).click();
    await page.waitForURL(/\/projects\/create$/);
    
    // Select Repository
    await expect(page.getByText("Select Repositories")).toBeVisible();
    const searchInput = page.getByTestId("repo-search");
    await searchInput.fill("catalyst");
    
    const catalystRow = page.locator(".group").filter({ hasText: "ncrmro/catalyst" });
    await expect(catalystRow).toBeVisible();
    await catalystRow.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText("1 added")).toBeVisible();
    
    // Continue to project details
    await page.getByRole("button", { name: /continue/i }).click();
    await expect(page.getByText("Project Details")).toBeVisible();
    
    // Configure project
    const uniqueSlug = `catalyst-test-${Date.now().toString().slice(-6)}`;
    const slugInput = page.locator('input[name="slug"]');
    await slugInput.clear();
    await slugInput.fill(uniqueSlug);
    
    // Create project
    await page.getByRole("button", { name: /create project/i }).click();
    await expect(page).toHaveURL(new RegExp(`/projects/${uniqueSlug}$`));
    
    // STEP 2: View Specs on Project Page
    await expect(page.getByRole("heading", { name: /catalyst/i })).toBeVisible();
    await expect(page.getByText("001-environments")).toBeVisible();
    await expect(page.getByText("003-vcs-providers")).toBeVisible();
    await expect(page.getByText("009-projects")).toBeVisible();
    
    // STEP 3: View Spec Content
    await page.getByText("001-environments").click();
    await expect(page).toHaveURL(new RegExp(`/specs/.*/001-environments`));
    await expect(page.getByRole("heading", { name: "001: Deployment Environments" })).toBeVisible();
    await expect(page.getByText("Manages deployment (production/staging)")).toBeVisible();
  });
});
```

## Key Points

### Mock Data Structure Matches Real GitHub API

The mock data structure exactly matches what the real GitHub provider returns for seamless integration.

### VCS Integration Points

```typescript
// Repository listing (project creation)
await vcs.repos.listUser(userId, "github");

// Directory listing (specs discovery)
await vcs.files.getDirectory(owner, repo, "specs", "main");

// File content reading (spec.md display)
await vcs.files.getContent(owner, repo, "specs/001-environments/spec.md", "main");
```

### Environment Configuration

```bash
# Enable mock provider
VCS_MOCK=true
```

## Comparison with PAT Mode

| Aspect | MockVCSProvider | PAT Mode |
|--------|----------------|----------|
| **GitHub Credentials** | Not required | Requires valid PAT |
| **Network Calls** | None | Real API calls |
| **Speed** | Instant | Network dependent |
| **CI/CD** | Works everywhere | Needs secrets |
| **Data Control** | Fully customizable | Limited to real data |

## See Also

- [MockVCSProvider Documentation](../README.md#testing-with-mockvcs provider)
- [Additional Examples](../EXAMPLES.md)
