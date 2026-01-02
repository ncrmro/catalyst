# Project Manifests Table

This document describes the `project_manifests` table that tracks manifest files within repositories to provide hints about project type and deployment configuration.

## Table Structure

### `project_manifests` Table

The `project_manifests` table stores information about manifest files found in repositories that indicate how projects should be set up for development and deployment environments.

**Columns:**

- `project_id` (text, FK) - References projects.id with cascade delete
- `repo_id` (text, FK) - References repos.id with cascade delete
- `path` (text) - File path within the repository pointing to a manifest file
- `created_at` (timestamp) - Record creation time
- `updated_at` (timestamp) - Record last update time

**Constraints:**

- Primary Key: Composite key on `(project_id, repo_id, path)` - Ensures unique manifest file paths per project-repository combination
- Foreign Keys:
  - `project_id` → `projects.id` (CASCADE DELETE)
  - `repo_id` → `repos.id` (CASCADE DELETE)

## Purpose and Usage

The `path` field points to a specific file somewhere in the repository that indicates a manifest file used in setting up development and deployment environments. Projects can have multiple manifests, and these manifest files give the system hints about the type of project and how it might be deployed when users haven't explicitly declared how configurations should happen.

### Common Manifest Types

Examples of manifest files and their purposes:

- **Dockerfile**: Indicates containerization capabilities
- **Chart.yaml**: Kubernetes Helm package configuration
- **package.json**: JavaScript/Node.js package configuration
- **Cargo.toml**: Rust package configuration
- **Project.toml**: Python/Julia package configuration
- **Gemfile**: Ruby/Rails package configuration

### Multiple Manifests Support

Projects can have multiple manifest files in different locations within the repository:

- Root-level manifests: `Dockerfile`, `package.json`, `Chart.yaml`
- Nested manifests: `apps/frontend/package.json`, `services/api/Dockerfile`
- Monorepo support: Multiple manifests across different directories

## Example Data

```sql
-- JavaScript project with containerization
INSERT INTO project_manifests (project_id, repo_id, path)
VALUES ('proj-1', 'repo-1', 'package.json');

INSERT INTO project_manifests (project_id, repo_id, path)
VALUES ('proj-1', 'repo-1', 'Dockerfile');

-- Kubernetes Helm chart
INSERT INTO project_manifests (project_id, repo_id, path)
VALUES ('proj-1', 'repo-1', 'Chart.yaml');

-- Nested microservice manifests
INSERT INTO project_manifests (project_id, repo_id, path)
VALUES ('proj-2', 'repo-2', 'services/api/Dockerfile');

INSERT INTO project_manifests (project_id, repo_id, path)
VALUES ('proj-2', 'repo-2', 'services/frontend/package.json');
```

## Relationships

This table enables:

- Automatic project type detection based on manifest files
- Deployment strategy suggestions based on available manifests
- Support for complex project structures with multiple deployment targets
- Integration with automated deployment pipelines

## Schema Migration

The table was created via migration `0007_ambitious_iron_man.sql` which includes:

- Table creation with composite primary key
- Foreign key constraints with cascade delete
- Proper indexes for efficient queries

## Future Enhancements

This table provides the foundation for:

1. **Automatic Project Detection** - Scan repositories to populate manifest data
2. **Deployment Strategy Suggestions** - Recommend deployment approaches based on manifests
3. **Build Pipeline Configuration** - Auto-configure CI/CD based on manifest types
4. **Technology Stack Analysis** - Generate project technology profiles
5. **Dependency Management** - Track and analyze project dependencies across manifests

## API Integration

The table structure supports:

- Repository scanning workflows to detect and catalog manifest files
- Project setup wizards that suggest deployment options
- Automated deployment configuration based on available manifests
- Technology stack reporting and analytics
