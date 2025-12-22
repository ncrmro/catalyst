# Projects Specification

## Why

Projects need a human-readable, URL-friendly identifier (slug) that is unique within a team context. Currently, projects use `fullName` for identification, but a dedicated slug field provides cleaner URLs, better user experience, and explicit uniqueness constraints scoped to teams.

## What

Add a `slug` field to projects that:

- Is unique per team (not globally unique)
- Is used in URLs for project navigation (e.g., `/projects/my-project` instead of `/projects/uuid`)
- Follows URL-safe naming conventions (lowercase, alphanumeric, hyphens)

## Functional Requirements

### FR-1: Project Slug Uniqueness Per Team

**Requirement**: Each project must have a `slug` field that is unique within its owning team.

**Acceptance Criteria**:

- The `slug` column is added to the `project` table
- A unique index exists on `(slug, team_id)` ensuring slugs are unique per team
- Different teams can have projects with the same slug
- Slugs are required (not nullable)
- Slugs follow DNS-1123 label format: lowercase alphanumeric and hyphens, starting with a letter

**URL Pattern**: `/projects/{slug}` where slug resolution includes team context from the authenticated user's session.

## Non-Functional Requirements

- Migration must handle existing projects by generating slugs from `name` field
- Slug validation should occur at both database and application layers
