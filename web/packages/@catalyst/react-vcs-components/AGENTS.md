# @catalyst/react-vcs-components - Agent Instructions

## Overview

This package contains reusable React components for VCS (Version Control System) integration. **All components use VCS-agnostic types from `@catalyst/vcs-provider`** to support multiple providers (GitHub, GitLab, Bitbucket, etc.) without coupling to any specific implementation.

## Components

### RepoSearch

A data-driven repository picker component that works with any VCS provider.

**Key Design Decisions:**
- **VCS-Agnostic**: Uses `Repository` type from `@catalyst/vcs-provider` instead of GitHub-specific types
- **Data-driven**: Takes `repos` data as a prop instead of fetching internally
- **Backward Compatible**: The wrapper in `web/src/components/repos/repo-search.tsx` adapts GitHub data to VCS format
- **Self-contained**: All UI logic is contained within the component
- **Type-safe**: Uses TypeScript interfaces that work with any VCS provider

**When Modifying:**
- Keep the component pure - it should only display data passed to it
- Don't add data fetching logic to the base component
- Use VCS-agnostic types from `@catalyst/vcs-provider` - never add provider-specific types
- The wrapper component handles conversion from provider-specific to VCS-agnostic format
- Update tests if changing behavior

### SpecViewer

A component for displaying specification documents with file navigation.

**Key Design Decisions:**
- **Flexible Renderer**: Accepts a custom MarkdownRenderer component as a prop
- **File Navigation**: Includes integrated sidebar for multi-file specs
- **State Management**: Manages active file selection internally but also accepts external control

**When Modifying:**
- Keep it presentational - data fetching should happen outside the component
- Maintain the SpecFile interface for consistency
- Support both controlled and uncontrolled usage patterns

### SpecFilesSidebar

A standalone sidebar component for spec file navigation.

**Key Design Decisions:**
- **Dual Mode**: Supports both Next.js Link-based navigation and callback-based navigation
- **Flexible**: Can be used standalone or as part of SpecViewer
- **Accessible**: Uses proper semantic HTML and ARIA attributes

## Package Structure

```
@catalyst/react-vcs-components/
├── index.ts                      # Main package entry point
├── package.json                  # Package configuration
├── tsconfig.json                 # TypeScript configuration
├── README.md                     # User documentation
├── AGENTS.md                     # This file - agent instructions
└── src/
    └── components/
        ├── index.ts              # Component exports
        ├── RepoSearch.tsx        # Repository picker component
        ├── SpecViewer.tsx        # Spec document viewer
        └── SpecFilesSidebar.tsx  # Spec file navigation sidebar
```

## Development Guidelines

### Adding New Components

1. Create component file in `src/components/`
2. Export component and types from `src/components/index.ts`
3. Add export path to `package.json` exports field
4. Update README.md with usage examples
5. Update this AGENTS.md with design decisions

### Testing

- Use the main web app to test components in real usage
- Run `npm run typecheck` from the web directory to verify types
- Components should be tested through their consumer applications

### Styling

- Components use Tailwind CSS with the Material Design 3 theme from the main app
- Keep styling consistent with existing Catalyst UI components
- Use semantic color names (e.g., `text-on-surface`, `bg-primary`)

## Common Tasks

### Updating RepoSearch

When updating RepoSearch:
1. Modify the base component in `packages/@catalyst/react-vcs-components/src/components/RepoSearch.tsx`
2. Update the wrapper in `web/src/components/repos/repo-search.tsx` if the API changes
3. Check all usages with: `grep -r "RepoSearch" web/src --include="*.tsx"`
4. Run tests: `cd web && npm run test:components`

### Updating SpecViewer

When updating SpecViewer:
1. Modify the component in `packages/@catalyst/react-vcs-components/src/components/SpecViewer.tsx`
2. Check spec page implementations in `web/src/app/(dashboard)/specs/` and `web/src/app/(dashboard)/projects/[slug]/spec/`
3. Verify markdown rendering works correctly

## Integration Points

### Main Application

The package is consumed by:
- `web/src/components/repos/repo-search.tsx` - Wrapper for backward compatibility
- `web/src/app/(dashboard)/specs/[...slug]/_components/SpecContentTab.tsx` - Spec viewing
- `web/src/app/(dashboard)/projects/[slug]/spec/[specId]/page.tsx` - Project spec viewing

### Dependencies

- **React**: Peer dependency (>=19)
- **Next.js**: Peer dependency (>=15) - for Link component in SpecFilesSidebar
- **@catalyst/vcs-provider**: Core VCS abstraction layer providing provider-agnostic types
- **Zod**: For type validation (used in wrapper components)

## VCS-Agnostic Architecture

The package follows these principles to remain provider-agnostic:

1. **Use Standard Types**: Import types from `@catalyst/vcs-provider` (e.g., `Repository`, not GitHub-specific types)
2. **Adapter Pattern**: Wrapper components (like `web/src/components/repos/repo-search.tsx`) convert provider-specific data to VCS-agnostic format
3. **Generic Terminology**: Use "repository" not "GitHub repo", "organization" not "GitHub org"
4. **Property Names**: Use camelCase VCS standard names (e.g., `fullName`, `htmlUrl`) not provider-specific snake_case

### Example Type Mapping

GitHub-specific → VCS-agnostic:
- `full_name` → `fullName`
- `html_url` → `htmlUrl`
- `updated_at` → `updatedAt` (Date object)
- `github_integration_enabled` → `vcs_integration_enabled`

## Best Practices

1. **Keep Components Presentational**: Data fetching should happen in server components or custom hooks
2. **Type Safety**: Always use TypeScript and export all public types
3. **Minimal Dependencies**: Avoid adding unnecessary dependencies to the package
4. **Documentation**: Update README.md and this file when making significant changes
5. **Backward Compatibility**: When updating APIs, maintain backward compatibility in wrapper components
