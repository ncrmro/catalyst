# Project Environments Table

This document describes the `project_environments` table that tracks deployment environments for project-repository combinations.

## Table Structure

### `project_environments` Table

The `project_environments` table stores information about different deployment environments for each project-repository combination.

**Columns:**

- `id` (text, PK) - UUID primary key
- `project_id` (text, FK) - References projects.id with cascade delete
- `repo_id` (text, FK) - References repos.id with cascade delete
- `environment` (text) - Environment name (e.g., 'production', 'staging', 'pr-1')
- `latest_deployment` (text, nullable) - Latest deployment information/ID
- `created_at` (timestamp) - Record creation time
- `updated_at` (timestamp) - Record last update time

**Constraints:**

- Primary Key: `id` (UUID)
- Unique Constraint: `(project_id, repo_id, environment)` - Ensures no duplicate environments per project-repo combination
- Foreign Keys:
  - `project_id` → `projects.id` (CASCADE DELETE)
  - `repo_id` → `repos.id` (CASCADE DELETE)

## Usage Examples

### Common Environment Types

- `production` - Live production environment
- `staging` - Pre-production staging environment
- `pr-1`, `pr-2`, etc. - Pull request preview environments

### Relationships

This table enables tracking of:

- Multiple environments per project-repository combination
- Latest deployment status for each environment
- Environment lifecycle through creation and update timestamps

**Example Data:**

```sql
-- Production environment for project-repo combination
INSERT INTO project_environments (id, project_id, repo_id, environment, latest_deployment)
VALUES ('env-uuid-1', 'proj-1', 'repo-1', 'production', 'deploy-12345');

-- Staging environment for same project-repo
INSERT INTO project_environments (id, project_id, repo_id, environment, latest_deployment)
VALUES ('env-uuid-2', 'proj-1', 'repo-1', 'staging', 'deploy-12346');

-- PR preview environment
INSERT INTO project_environments (id, project_id, repo_id, environment, latest_deployment)
VALUES ('env-uuid-3', 'proj-1', 'repo-1', 'pr-42', 'deploy-12347');
```

## Schema Migration

The table was created via migration `0006_chubby_hercules.sql` which includes:

- Table creation
- Foreign key constraints
- Unique constraint on the composite key

## Future Enhancements

This table provides the foundation for:

1. **Environment Management UI** - Dashboard for managing project environments
2. **Deployment Tracking** - Enhanced deployment history and status tracking
3. **Environment Configuration** - Storing environment-specific configuration
4. **Automated Deployments** - Integration with CI/CD pipelines
5. **Environment Lifecycle** - Automatic cleanup of PR environments

## API Integration

The table structure supports the existing Kubernetes namespace creation API:

- Environment names align with supported environments (production, staging, pr-X)
- Project and repository references enable proper namespace labeling
- Latest deployment tracking supports deployment status reporting
