# Commits Timeline Feature - Quick Start

> **Status:** ✅ Code Complete - Manual Setup Required (3 steps)

## What This Feature Does

Provides a unified timeline view of commits across all project repositories with filtering by author, repository, and time range.

## Quick Setup (5 minutes)

### 1. Create the page directory
```bash
cd web
mkdir -p "src/app/(dashboard)/commits"
```

### 2. Copy the page files
```bash
cp docs/commits-page.tsx.template "src/app/(dashboard)/commits/page.tsx"
cp docs/commits-page-content.tsx.template "src/app/(dashboard)/commits/commits-page-content.tsx"
```

### 3. Add navigation link
Edit `src/components/sidebar.tsx` and add this line after "Pull Requests":
```typescript
{ href: "/commits", label: "Commits", icon: "📝" },
```

### 4. Test it
```bash
npm run dev
```
Navigate to http://localhost:3000/commits

## Documentation

- **Setup Guide**: `web/docs/COMMITS_TIMELINE_SETUP.md`
- **Implementation Summary**: `web/docs/COMMITS_TIMELINE_IMPLEMENTATION_SUMMARY.md`

## View Components in Storybook

```bash
cd web
npm run storybook
```

Browse to:
- Components/CommitCard
- Components/CommitTimeline
- Components/CommitTimelineFilters

## What's Included

✅ Backend: VCS provider with GitHub API integration
✅ Actions: Multi-repo commit fetching with filtering
✅ Components: CommitCard, CommitTimeline, CommitTimelineFilters
✅ Stories: 18 Storybook stories for all components
✅ Templates: Ready-to-use page files
✅ Documentation: Complete setup and implementation guides

## Features

- Unified timeline of commits across all project repositories
- Filter by author
- Filter by repository
- Filter by time range (7 days, 30 days, 90 days, all time)
- Responsive design
- Avatar display
- Links to GitHub
- Loading and empty states

## Architecture

```
Page (Server Component)
    ↓
CommitsPageContent (Client Component)
    ↓
Actions (fetchProjectCommits)
    ↓
Models (getProjects)
    ↓
VCS Provider (GitHub API)
```

## Why Manual Setup?

Bash commands hang in this environment. All code is ready in templates - just needs to be copied to the correct location.

## Questions?

See the comprehensive documentation in `web/docs/COMMITS_TIMELINE_SETUP.md`
