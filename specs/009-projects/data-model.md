# Data Model: Projects Management

## Design Principle: VCS-First

This feature follows a **VCS-first approach**: data that lives in the VCS provider (GitHub) is NOT duplicated in the database. Instead, it's fetched on demand via API.

**In Database**:

- Project entity and relationships (team, repo)
- Project configuration and settings

**NOT in Database** (fetched from VCS):

- Pull requests, issues
- CI check status
- Spec files
- Commit history

## Database Entities

### 1. Project (Extended)

_Existing table `projects` - minimal extensions only._

| Field          | Type      | Notes                         |
| -------------- | --------- | ----------------------------- |
| `id`           | UUID      | PK                            |
| `name`         | Text      | Display name                  |
| `slug`         | Text      | Unique per team, URL-friendly |
| `teamId`       | UUID      | FK to teams                   |
| `repositoryId` | UUID      | FK to repos                   |
| `createdAt`    | Timestamp |                               |
| `updatedAt`    | Timestamp |                               |

**Notes**:

- `slug` format: DNS-1123 label (lowercase alphanumeric and hyphens, starting with letter)
- Status field (active/archived/suspended) deferred to v2

### Existing Related Entities (No Changes)

These entities already exist and are used by the Projects feature:

- **teams**: Team ownership of projects
- **repos**: Git repository links (via VCS providers)
- **pullRequestPods**: Preview environment deployments (existing)
- **pullRequests**: Basic PR tracking for preview environments (existing)

## API Types (Not in Database)

These types represent data fetched from VCS providers:

### StatusCheck

Normalized CI check status from GitHub Checks API and Commit Statuses API.

```typescript
interface StatusCheck {
  id: string;
  name: string;
  state: "pending" | "passing" | "failing" | "cancelled" | "skipped";
  url?: string; // Link to CI logs
  description?: string;
  context: string;
  startedAt?: Date;
  completedAt?: Date;
  source: "github-actions" | "cloudflare" | "vercel" | "catalyst" | "external";
}
```

### SpecFile

Representation of a spec file/folder from the repository.

```typescript
interface SpecFile {
  path: string; // e.g., 'specs/001-feature'
  name: string; // Folder name, e.g., '001-feature'
  files: string[]; // Files in folder: ['spec.md', 'plan.md', 'tasks.md']
  lastModified?: Date;
}

interface SpecContent {
  path: string;
  content: string; // Raw markdown content
  sha: string; // Git SHA for updates
}
```

### PullRequest (from VCS)

Pull request data fetched from GitHub API.

```typescript
interface VCSPullRequest {
  number: number;
  title: string;
  description?: string;
  state: "open" | "closed" | "merged";
  author: string;
  headBranch: string;
  baseBranch: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
  // Enriched with Catalyst data
  previewEnvironmentId?: string;
  previewUrl?: string;
}
```

## Relationships

```
teams 1:N projects
repos 1:N projects
projects 1:N pullRequestPods (existing - preview environments)
```

## Deferred Entities (v2)

The following entities are NOT implemented in this phase:

- **WorkItem**: Unified issue/PR representation (using VCS API directly instead)
- **PrioritizationRule**: Custom prioritization rules
- **ProjectSpec**: Indexed spec files (reading on demand instead)
- **ProjectAgent**: AI agent configuration
- **ProjectAgentTask**: Agent-generated tasks
- **ProjectAgentApprovalPolicy**: Agent approval rules
- **Project.status**: Active/Archived/Suspended lifecycle

## Migration Notes

### Existing Schema

The `projects` table already exists with:

- `id`, `name`, `teamId`, `repositoryId`, `createdAt`, `updatedAt`

### Required Changes

1. **Add `slug` column** to projects table (nullable initially for migration)
2. **Backfill slugs** from project names (kebab-case transformation)
3. **Add unique constraint** on (teamId, slug)

No new tables required for this phase.
