# Teams, Repos, Projects Database Tables

This document describes the database schema implementation for Teams, Repos, and Projects tables in the Catalyst application.

## Database Schema

### Tables Created

#### 1. `repos` Table

Stores repository information with GitHub metadata.

**Columns:**

- `id` (text, PK) - UUID primary key
- `github_id` (integer, unique) - GitHub repository ID
- `name` (text) - Repository name (e.g., "foo-frontend")
- `full_name` (text) - Full repository name (e.g., "jdoe/foo-frontend")
- `description` (text, nullable) - Repository description
- `url` (text) - Repository URL
- `is_private` (boolean, default false) - Private repository flag
- `language` (text, nullable) - Primary programming language
- `stargazers_count` (integer, default 0) - GitHub stars count
- `forks_count` (integer, default 0) - GitHub forks count
- `open_issues_count` (integer, default 0) - Open issues count
- `owner_login` (text) - Repository owner username/organization
- `owner_type` (text) - 'User' or 'Organization'
- `owner_avatar_url` (text, nullable) - Owner avatar URL
- `created_at` (timestamp) - Record creation time
- `updated_at` (timestamp) - Record last update time
- `pushed_at` (timestamp, nullable) - Last push to repository

#### 2. `projects` Table

Stores project information with owner details.

**Columns:**

- `id` (text, PK) - UUID primary key
- `name` (text) - Project name (e.g., "foo")
- `full_name` (text, unique) - Full project name (e.g., "jdoe/foo")
- `description` (text, nullable) - Project description
- `owner_login` (text) - Project owner username/organization
- `owner_type` (text) - 'User' or 'Organization'
- `owner_avatar_url` (text, nullable) - Owner avatar URL
- `preview_environments_count` (integer, default 0) - Number of preview environments
- `created_at` (timestamp) - Record creation time
- `updated_at` (timestamp) - Record last update time

#### 3. `projects_repos` Table

Junction table for many-to-many relationship between projects and repositories.

**Columns:**

- `project_id` (text, FK) - References projects.id
- `repo_id` (text, FK) - References repos.id
- `is_primary` (boolean, default false) - Primary repository flag
- `created_at` (timestamp) - Relationship creation time

**Primary Key:** Composite key on (project_id, repo_id)

## Relationships

- **Projects ↔ Repositories**: Many-to-many relationship through `projects_repos` table
- Each project can have multiple repositories
- Each repository can belong to multiple projects
- One repository per project can be designated as "primary"

## API Integration

### Projects Action (`/src/actions/projects.ts`)

The `fetchProjects()` function now:

1. **Database First**: Attempts to fetch projects from the database using JOIN queries
2. **Fallback**: Falls back to mock data if database is empty or errors occur
3. **Validation**: Validates data integrity and filters out invalid records
4. **Environments**: Currently uses mock environments (ready for future implementation)

**Query Structure:**

```sql
SELECT p.*, r.*, pr.*
FROM project p
LEFT JOIN projects_repos pr ON p.id = pr.project_id
LEFT JOIN repo r ON pr.repo_id = r.id
```

## Sample Data

The database is seeded with sample data including:

**Projects:**

- `jdoe/foo` - Sample project with 3 repositories, 7 preview environments
- `jdoe/bar` - Microservices project with 2 repositories, 3 preview environments
- `awesome-org/baz` - Enterprise project, 12 preview environments

**Repositories:**

- `jdoe/foo-frontend` (TypeScript, primary for foo project)
- `jdoe/foo-backend` (Python)
- `jdoe/foo-shared` (JavaScript)
- `jdoe/bar-api` (Go, primary for bar project)
- `jdoe/bar-web` (React)

## Testing

### Test Coverage

- **Unit Tests**: Existing projects tests continue to pass
- **Integration Tests**: New database integration tests validate:
  - Data fetching from database
  - Primary repository designation
  - Error handling and fallback
  - Data structure validation

### Running Tests

```bash
npm run test                                    # All tests
npm run test __tests__/actions/projects.test.ts # Original projects tests
npm run test __tests__/database/                # Database integration tests
```

## Development Workflow

### Setting Up Database

```bash
# Start PostgreSQL
docker compose up -d db

# Run migrations
npm run db:migrate

# Seed with sample data (manual SQL insert currently)
```

### Database Commands

```bash
npm run db:generate  # Generate new migrations
npm run db:migrate   # Apply migrations
npm run db:push      # Push schema changes (dev only)
npm run db:studio    # Open Drizzle Studio
```

## Future Enhancements

1. **Environments Table**: Create proper environments table to replace mock data
2. **Teams Table**: Add teams/organizations table for more complex ownership
3. **Permissions**: Add role-based access control
4. **Webhooks**: Integration with GitHub webhooks for automatic updates
5. **Seeding Script**: Improve the seeding mechanism for easier development setup

## Migration Files

- `drizzle/0001_amusing_diamondback.sql` - Initial creation of repos, projects, and projects_repos tables

## Performance Considerations

- Indexed on `github_id` for repos table
- Unique constraints on critical fields
- Efficient JOIN queries with proper foreign key relationships
- Fallback to mock data ensures reliability
