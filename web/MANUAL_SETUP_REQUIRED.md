# Manual Directory Creation Required

## Issue
The bash tool is currently non-functional, preventing automated directory creation. The following directories need to be created manually:

## Required Directories

```bash
# From the web/ directory, run:
mkdir -p src/app/\(dashboard\)/projects/\[slug\]/work
mkdir -p src/app/\(dashboard\)/projects/\[slug\]/prs/\[number\]
```

## After Creating Directories

Copy the page content from `PAGES_TO_DEPLOY.md` into:
1. `src/app/(dashboard)/projects/[slug]/work/page.tsx`
2. `src/app/(dashboard)/projects/[slug]/prs/[number]/page.tsx`

## Alternative: Use the Script

```bash
cd web
node src/scripts/create-project-dirs.mjs
```

This will create the directories and .gitkeep files.

## Why This is Needed

Tasks T020-T022 from spec 009-projects require these page files to display:
- PR list (work page)
- Individual PR details with preview environment links

The action files are already in place at `src/actions/pull-requests-vcs.ts`.
