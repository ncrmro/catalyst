# Pull Requests Database Integration

This document describes the pull requests table and database operations that enable storing pull request data from GitHub webhooks.

## Table Structure

### `pull_requests` Table

The `pull_requests` table stores pull request information from various git providers (GitHub, GitLab, etc.) with a provider-agnostic design.

**Key Features:**

- Provider-agnostic design (supports GitHub, GitLab, etc.)
- Belongs to a repository via foreign key relationship
- Comprehensive pull request metadata storage
- Proper indexing for performance
- Automatic timestamps for creation and updates

**Columns:**

- `id` (text, PK) - UUID primary key
- `repo_id` (text, FK) - References repos.id with cascade delete
- `provider` (text) - Git provider ('github', 'gitlab', 'gitea', etc.)
- `provider_pr_id` (text) - Pull request ID from the provider
- `number` (integer) - Pull request number
- `title` (text) - Pull request title
- `description` (text, nullable) - Pull request body/description
- `state` (text) - Pull request state ('open', 'closed', 'merged')
- `status` (text) - Pull request status ('draft', 'ready', 'changes_requested')
- `url` (text) - Pull request URL
- `author_login` (text) - Author username
- `author_avatar_url` (text, nullable) - Author avatar URL
- `head_branch` (text) - Source branch name
- `base_branch` (text) - Target branch name
- `comments_count` (integer, default 0) - Number of comments
- `reviews_count` (integer, default 0) - Number of reviews
- `changed_files_count` (integer, default 0) - Number of changed files
- `additions_count` (integer, default 0) - Lines added
- `deletions_count` (integer, default 0) - Lines deleted
- `priority` (text, default 'medium') - Priority level ('high', 'medium', 'low')
- `labels` (text, nullable) - JSON array of labels
- `assignees` (text, nullable) - JSON array of assignees
- `reviewers` (text, nullable) - JSON array of reviewers
- `merged_at` (timestamp, nullable) - When the PR was merged
- `closed_at` (timestamp, nullable) - When the PR was closed
- `created_at` (timestamp) - Record creation time
- `updated_at` (timestamp) - Record last update time

**Constraints:**

- Unique constraint on `(repo_id, provider, provider_pr_id)` ensures no duplicate PRs per provider per repo

**Indexes:**

- `idx_pull_requests_repo_id` - For efficient queries by repository
- `idx_pull_requests_state` - For filtering by state (open/closed/merged)
- `idx_pull_requests_status` - For filtering by status (draft/ready/changes_requested)
- `idx_pull_requests_updated_at` - For sorting by last update
- `idx_pull_requests_author_login` - For queries by author
- `idx_pull_requests_provider_pr_id` - For lookups by provider and PR ID

## Database Operations

### Core Functions

Located in `src/actions/pull-requests-db.ts`:

#### `upsertPullRequest(data: CreatePullRequestData)`

Creates or updates a pull request record. Uses the unique constraint to handle both create and update operations automatically.

#### `findPullRequestByProviderData(repoId, provider, providerPrId)`

Finds a pull request by repository, provider, and provider-specific PR ID.

#### `getPullRequestsByRepo(repoId, limit?)`

Gets all pull requests for a specific repository, ordered by last update.

#### `getOpenPullRequests(limit?)`

Gets open pull requests across all repositories with repository information.

#### `findRepoByGitHubData(githubId)`

Helper function to find a repository by GitHub ID for webhook operations.

## Webhook Integration

### GitHub Webhook Handler

The GitHub webhook handler (`src/app/api/github/webhook/route.ts`) has been enhanced to:

1. **Find Repository**: Look up the repository in the database using the GitHub repository ID
2. **Extract PR Data**: Parse the full webhook payload to extract pull request information
3. **Upsert PR Record**: Create or update the pull request record in the database
4. **Handle Missing Repos**: Gracefully skip database operations if the repository is not in our database
5. **Preserve Existing Functionality**: All existing namespace and pod job creation continues to work

### Webhook Data Mapping

The webhook handler maps GitHub webhook data to our provider-agnostic schema:

```typescript
{
  repoId: foundRepo.id,
  provider: 'github',
  providerPrId: pull_request.id.toString(),
  number: pull_request.number,
  title: pull_request.title,
  description: pull_request.body,
  state: determineState(pull_request),
  status: determineStatus(pull_request),
  url: pull_request.html_url,
  authorLogin: pull_request.user.login,
  // ... more fields
}
```

## Migration

The table was created via migration `0009_sleepy_pet_avengers.sql` which includes:

- Table creation with all columns and constraints
- Foreign key relationship to repos table
- Performance indexes
- Unique constraint for preventing duplicates

## Usage Examples

### Creating a Pull Request Record

```typescript
import { upsertPullRequest } from "@/actions/pull-requests-db";

const result = await upsertPullRequest({
  repoId: "repo-uuid-1",
  provider: "github",
  providerPrId: "123",
  number: 42,
  title: "Feature: Add new functionality",
  state: "open",
  status: "ready",
  url: "https://github.com/owner/repo/pull/42",
  authorLogin: "developer",
  headBranch: "feature/new-functionality",
  baseBranch: "main",
  // ... other fields
});
```

### Querying Pull Requests

```typescript
import {
  getPullRequestsByRepo,
  getOpenPullRequests,
} from "@/actions/pull-requests-db";

// Get all PRs for a specific repo
const repoPRs = await getPullRequestsByRepo("repo-uuid-1");

// Get all open PRs across repositories
const openPRs = await getOpenPullRequests(50);
```

## Provider Agnostic Design

The table is designed to support multiple git providers:

- **`provider` field**: Distinguishes between 'github', 'gitlab', 'gitea', etc.
- **`provider_pr_id` field**: Stores the provider-specific ID (GitHub uses integers, others may use different formats)
- **Generic field names**: Use provider-neutral terminology (e.g., `author_login` instead of `github_user`)
- **Flexible JSON fields**: Store provider-specific data like labels, assignees, reviewers as JSON

## Future Enhancements

1. **GitLab Integration**: Add webhook handlers for GitLab pull/merge requests
2. **PR Analytics**: Add functions for analyzing PR metrics and trends
3. **Review Integration**: Expand to store individual review records
4. **Automated Status Updates**: Sync status changes back to providers
5. **PR Templates**: Store and validate against PR template requirements

## Testing

Comprehensive test coverage includes:

- Unit tests for database operations (`__tests__/unit/actions/pull-requests-db.test.ts`)
- Webhook integration tests (`__tests__/unit/api/github/webhook.test.ts`)
- Mock implementations for all external dependencies
- Error handling and edge case validation

## Performance Considerations

- Indexed on frequently queried columns (repo_id, state, updated_at)
- Unique constraints prevent duplicate records
- Efficient JOIN queries with proper foreign key relationships
- JSON fields for flexible provider-specific data without schema changes
- Cascading deletes ensure data consistency when repositories are removed
