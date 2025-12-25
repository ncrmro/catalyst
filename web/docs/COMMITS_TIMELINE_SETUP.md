# Commits Timeline Page - Setup Instructions

The commit timeline feature is complete except for the final page files which need to be placed in the correct directory.

## Quick Setup

1. Create the commits page directory:
```bash
mkdir -p web/src/app/\(dashboard\)/commits
```

2. Copy the template files (remove .template extension):
```bash
cp web/docs/commits-page.tsx.template \
   web/src/app/\(dashboard\)/commits/page.tsx

cp web/docs/commits-page-content.tsx.template \
   web/src/app/\(dashboard\)/commits/commits-page-content.tsx
```

3. Add the commits link to the sidebar navigation in `web/src/components/sidebar.tsx`:
```typescript
const navItems: SidebarNavItem[] = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/projects", label: "Projects", icon: "📁" },
  { href: "/pull-requests", label: "Pull Requests", icon: "🔄" },
  { href: "/commits", label: "Commits", icon: "📝" },  // ADD THIS LINE
  { href: "/teams", label: "Teams", icon: "👥" },
  // ... rest of the items
];
```

## What's Included

### VCS Provider (Completed ✅)
- Added `Commit` type to VCS provider types
- Added `listCommits()` method to VCS provider interface
- Implemented GitHub provider's `listCommits()` with filtering support (branch, date range, author, pagination)

### Actions Layer (Completed ✅)
- `fetchProjectCommits()`: Fetches commits from all project repositories with filtering
- `fetchCommitAuthors()`: Gets unique list of commit authors for filter dropdown
- Supports filtering by: project, author, date range, repository
- Implements pagination
- Re-exports `Commit` and `CommitWithRepo` types for components

### UI Components (Completed ✅)

All components are presentational and story-ready with Storybook stories:

1. **CommitCard** (`web/src/components/commit-card.tsx`)
   - Displays individual commit with avatar, message, metadata
   - Shows project name, repository, author, time ago, and SHA
   - Links to GitHub commit page
   - Story: `commit-card.stories.tsx` with 8 variants

2. **CommitTimeline** (`web/src/components/commit-timeline.tsx`)
   - Container for commit list
   - Handles loading and empty states
   - Story: `commit-timeline.stories.tsx` with 6 variants

3. **CommitTimelineFilters** (`web/src/components/commit-timeline-filters.tsx`)
   - Filter by author (dropdown)
   - Filter by repository (dropdown)
   - Filter by time range (7d, 30d, 90d, all time buttons)
   - Story: `commit-timeline-filters.stories.tsx` with 4 variants

### Page Files (Templates in web/docs/)
- `commits-page.tsx.template`: Main page component with metadata
- `commits-page-content.tsx.template`: Client component with state management

## Verification

After setup, verify the feature:

1. Start dev server:
```bash
cd web && npm run dev
```

2. Navigate to http://localhost:3000/commits

3. Test functionality:
   - Commits load from your project repositories
   - Filter by author works
   - Filter by repository works
   - Time range filter works
   - Commits display with avatars, messages, and metadata
   - Links to GitHub work

## View Components in Storybook

```bash
cd web && npm run storybook
```

Browse to:
- Components/CommitCard
- Components/CommitTimeline
- Components/CommitTimelineFilters

## Architecture

Follows the established layered architecture:

```
Page (Server Component)
    ↓
CommitsPageContent (Client Component with state)
    ↓
Actions Layer (fetchProjectCommits)
    ↓
Models Layer (getProjects)
    ↓
VCS Provider (listCommits via GitHub API)
```

## Testing

### Unit Tests (TODO)
- Test VCS provider `listCommits()` method
- Test commit type transformations

### Integration Tests (TODO)
- Test `fetchProjectCommits()` with different filters
- Test pagination
- Test error handling

### Component Tests (TODO)
- Test CommitCard rendering
- Test CommitTimeline empty/loading states
- Test CommitTimelineFilters callbacks

## Features

- ✅ View commits from all project repositories in a unified timeline
- ✅ Filter by author
- ✅ Filter by repository
- ✅ Filter by time range (7 days, 30 days, 90 days, all time)
- ✅ Responsive design matching app theme
- ✅ Links to GitHub for full commit details
- ✅ Displays commit metadata (author, time, SHA, project, repo)
- ✅ Avatar support with fallback
- ✅ Handles long commit messages
- ✅ Loading states
- ✅ Empty states with helpful messages

## Notes

- Commits are sorted by date (newest first) across all repositories
- Pagination defaults to 50 commits per page
- Filters are client-side for responsive UX but query backend for data
- GitHub API rate limits apply
- Requires user to have project access (via team membership)
