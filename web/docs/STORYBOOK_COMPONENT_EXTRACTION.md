# Storybook Component Extraction Guide

## Overview

This document provides guidance on which components should be extracted as presentational components for Storybook documentation. It includes an analysis of existing components, extraction priorities, and best practices.

## Current State

### Existing Storybook Configuration

- **Framework**: Storybook with Next.js and Vite
- **Story Pattern**: `src/**/*.stories.@(js|jsx|mjs|ts|tsx)`
- **Addons**: Chromatic, Vitest, A11y, Docs, Onboarding
- **Location**: Stories live alongside components

### Components Already with Stories (24 Components)

#### UI Components (`src/components/ui/`)
- ✅ `status-badge.tsx` → `status-badge.stories.tsx`
- ✅ `status-indicator.tsx` → `status-indicator.stories.tsx`
- ✅ `card.tsx` → `card.stories.tsx`
- ✅ `icon-button.tsx` → `icon-button.stories.tsx`
- ✅ `project-status-badge.tsx` → `project-status-badge.stories.tsx`
- ✅ `priority-score-display.tsx` → `priority-score-display.stories.tsx`

#### Component Features
- ✅ `agent-run-card.tsx` → `agent-run-card.stories.tsx`
- ✅ `container-row.tsx` → `container-row.stories.tsx`
- ✅ `environment-row.tsx` → `environment-row.stories.tsx`
- ✅ `environment-header.tsx` → `environment-header.stories.tsx`
- ✅ `log-viewer.tsx` → `log-viewer.stories.tsx`

#### Task Components (`src/components/tasks/`)
- ✅ `TaskDetail.tsx` → `TaskDetail.stories.tsx`
- ✅ `TasksList.tsx` → `TasksList.stories.tsx`
- ✅ `TaskDetailCard.tsx` → `TaskDetailCard.stories.tsx`

#### Platform Components (`src/components/platform/`)
- ✅ `SpecTaskList.tsx` → `SpecTaskList.stories.tsx`
- ✅ `PlatformTaskQueue.tsx` → `PlatformTaskQueue.stories.tsx`
- ✅ `ConventionStatus.tsx` → `ConventionStatus.stories.tsx`
- ✅ `AgentContextViewer.tsx` → `AgentContextViewer.stories.tsx`
- ✅ `SpecBrowser.tsx` → `SpecBrowser.stories.tsx`

#### Observability Components (`src/components/observability/`)
- ✅ `IncidentView.tsx` → `IncidentView.stories.tsx`
- ✅ `AlertList.tsx` → `AlertList.stories.tsx`
- ✅ `MetricExplorer.tsx` → `MetricExplorer.stories.tsx`
- ✅ `GoldenSignalDashboard.tsx` → `GoldenSignalDashboard.stories.tsx`

#### Chat Components (`src/components/chat/`)
- ✅ `AgentChat.tsx` → `AgentChat.stories.tsx`

## Components Missing Storybook Stories

### Phase 1: High Priority Pure Presentational Components

These components are purely presentational with no business logic or state management. They should be prioritized for Storybook extraction.

#### 1. **priority-badge.tsx** (`src/components/ui/`)
- **Type**: Pure Presentational Badge
- **Props**: `priority` (critical/high/medium/low), `className`, `size`
- **Complexity**: Low
- **Current State**: No stories
- **Recommendation**: Create stories showing all priority levels and sizes
- **Story Coverage Needed**:
  - All priority levels (critical, high, medium, low)
  - Both sizes (sm, md)
  - Custom className examples

#### 2. **assignee-badge.tsx** (`src/components/ui/`)
- **Type**: Pure Presentational Badge
- **Props**: `assignee` (with name, type, avatarUrl), `className`, `size`, `showType`
- **Complexity**: Low
- **Current State**: No stories
- **Recommendation**: Create stories for AI and human assignees with/without avatars
- **Story Coverage Needed**:
  - Human assignee with avatar
  - Human assignee without avatar
  - AI assignee with avatar
  - AI assignee without avatar
  - Both sizes (sm, md)
  - With and without type display

#### 3. **breadcrumbs.tsx** (`src/components/ui/`)
- **Type**: Pure Presentational Navigation
- **Props**: `items` (array of `{ label, href? }`)
- **Complexity**: Low
- **Current State**: No stories
- **Recommendation**: Create stories showing various breadcrumb depths and styles
- **Story Coverage Needed**:
  - Single breadcrumb (current page only)
  - Two-level breadcrumbs
  - Multi-level breadcrumbs (3-5 levels)
  - With and without links
  - Long text truncation

#### 4. **page-header.tsx** (`src/components/ui/`)
- **Type**: Pure Presentational Layout
- **Props**: `breadcrumbs`, `action`, `children`
- **Complexity**: Low-Medium
- **Current State**: No stories
- **Dependencies**: Uses `breadcrumbs.tsx` and `GlassCard`
- **Recommendation**: Create stories showing different breadcrumb/action combinations
- **Story Coverage Needed**:
  - With breadcrumbs only
  - With breadcrumbs and action button
  - With breadcrumbs and children
  - Multiple action buttons
  - Responsive behavior

#### 5. **entity-card.tsx** (`src/components/ui/`)
- **Type**: Generic Card Component
- **Props**: TBD (need to check implementation)
- **Complexity**: Low
- **Current State**: No stories
- **Recommendation**: Create stories for common entity card patterns
- **Story Coverage Needed**:
  - Default card
  - With header and footer
  - Different content types
  - Interactive states

### Phase 2: Business Logic Components

These components have business logic but can benefit from extracting their presentational layer.

#### 6. **ProjectCard** (`src/components/projects/project-card.tsx`)
- **Type**: Business Component (uses Next.js Link, Image)
- **Props**: `project` (ProjectWithRelations type)
- **Complexity**: Medium
- **Current State**: No stories, uses "use client"
- **Recommendation**: Extract presentational layer or create stories with mocked data
- **Story Coverage Needed**:
  - Default project card
  - With long description (truncation)
  - Without description
  - With/without avatar
  - Hover states
- **Extraction Opportunity**: 
  - Could extract pure presentational `ProjectCardView` component
  - Keep navigation logic in container component

#### 7. **EnvironmentBadge** (`src/components/projects/environment-badge.tsx`)
- **Type**: Business Component (with status color logic)
- **Props**: `environment` (Environment type)
- **Complexity**: Medium
- **Current State**: No stories
- **Recommendation**: Extract color/icon logic to pure helpers
- **Story Coverage Needed**:
  - All status types (active, deploying, inactive)
  - Both trigger types (branch_push, scheduled)
  - With/without cron schedule
  - With/without branch name
- **Extraction Opportunity**:
  - Extract `getStatusColor()` and `getTypeIcon()` to utilities
  - Create pure presentational component taking color/icon props

#### 8. **PullRequestCard** (`src/components/work-items/PullRequestCard.tsx`)
- **Type**: Business Component (uses Next.js Link, external links)
- **Props**: `pr` (PullRequest type), `projectSlug`
- **Complexity**: High
- **Current State**: No stories, uses "use client"
- **Recommendation**: Extract badge components and status display
- **Story Coverage Needed**:
  - All status combinations (draft, changes_requested, ready)
  - All priority levels (high, medium, low)
  - All preview statuses (running, deploying, failed, pending)
  - With/without preview URL
  - With/without author avatar
  - Multiple repositories
- **Extraction Opportunity**:
  - Extract status badge logic to reusable component
  - Extract priority badge logic (if not using existing priority-badge)
  - Extract preview status badge
  - Create pure presentational card component

#### 9. **IssueListItem** (`src/components/work-items/IssueListItem.tsx`)
- **Type**: Business Component (with type icon logic)
- **Props**: `issue` (Issue type)
- **Complexity**: Medium
- **Current State**: No stories
- **Recommendation**: Extract icon/type logic to helpers
- **Story Coverage Needed**:
  - All issue types (bug, feature, improvement, idea)
  - All states (open, closed)
  - All priority levels (high, medium, low)
  - Text truncation
  - Hover states
- **Extraction Opportunity**:
  - Extract `getIssueTypeIconProps()` to utility
  - Create pure presentational component
  - Consider extracting issue type badge component

### Phase 3: Complex Interactive Components

These components have significant state and interactivity but could still benefit from presentational layer extraction.

#### 10. **ClusterCard** (`src/components/ClusterCard.tsx`)
- **Type**: Complex Interactive Component
- **Props**: `cluster` (ExtendedClusterInfo), `onToggleOIDC`
- **Complexity**: High
- **Current State**: No stories, has state (useState, useTransition)
- **Recommendation**: Extract resource display components
- **Story Coverage Needed**:
  - Real cluster with all data
  - Mock cluster (limited data)
  - With/without GitHub OIDC enabled
  - Loading state (isPending)
  - Error state
  - Various utilization percentages
- **Extraction Opportunity**:
  - Extract `ClusterResourceDisplay` (CPU, Memory, Storage)
  - Extract `ClusterUtilizationBar` 
  - Extract `GitHubOIDCToggle` component
  - Keep state management in container

#### 11. **GitHubAppBanner** (`src/components/github-app-banner.tsx`)
- **Type**: Interactive Component (dismissible)
- **Props**: None (reads env vars)
- **Complexity**: Medium
- **Current State**: No stories, has state (useState, useEffect)
- **Recommendation**: Extract dismissible banner pattern
- **Story Coverage Needed**:
  - Visible state
  - Dismissed state
  - With/without GitHub App URL
- **Extraction Opportunity**:
  - Extract `DismissibleBanner` presentational component
  - Keep dismissal logic in container
  - Make generic for reuse

#### 12. **EnvironmentStatusBadge** (`src/components/environments/EnvironmentStatusBadge.tsx`)
- **Type**: Status Badge Component
- **Props**: TBD (need to check implementation)
- **Complexity**: Low-Medium
- **Current State**: No stories
- **Recommendation**: Create stories for all environment statuses
- **Extraction Opportunity**: Likely already presentational

#### 13. **EnvironmentCardSkeleton** (`src/components/environments/EnvironmentCardSkeleton.tsx`)
- **Type**: Loading Skeleton Component
- **Props**: None or minimal
- **Complexity**: Low
- **Current State**: No stories
- **Recommendation**: Create story showing skeleton state
- **Extraction Opportunity**: Likely already presentational

### Lower Priority Components

These components are less likely to need Storybook stories but should be evaluated:

- **Form Components** (`src/components/repos/connect-repo-form.tsx`, `deployment-config-form.tsx`)
  - Complex forms with state management
  - Consider extracting form field components
  
- **Layout Components** (`app-shell-nav.tsx`, `dashboard-layout.tsx`, `sidebar.tsx`)
  - Application shell components
  - May benefit from layout pattern documentation

- **Auth Components** (`sign-in.tsx`, `sign-out.tsx`)
  - Authentication-specific components
  - Lower priority for Storybook

## Extraction Principles

### 1. Separation of Concerns

**Container-Presenter Pattern:**
```typescript
// Container Component (handles data/actions)
export function ProjectCardContainer({ projectId }: { projectId: string }) {
  const project = useProject(projectId);
  const navigate = useNavigate();
  
  return (
    <ProjectCardView 
      project={project}
      onClick={() => navigate(`/projects/${project.slug}`)}
    />
  );
}

// Presentational Component (pure UI, Storybook-ready)
export function ProjectCardView({ 
  project, 
  onClick 
}: { 
  project: Project;
  onClick: () => void;
}) {
  return (
    <div onClick={onClick} className="...">
      {/* Pure UI rendering */}
    </div>
  );
}
```

### 2. Component Hierarchy

```
┌─────────────────────────────────────┐
│ Container Component                 │
│ (Server/Client with data/actions)   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Presentational Component            │
│ (Pure UI, Storybook-ready)          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Atomic UI Components                │
│ (Badges, Icons, Buttons, etc.)      │
└─────────────────────────────────────┘
```

### 3. Story Coverage

Every Storybook story should include:

1. **Default State** - The most common use case
2. **All Variants** - Different states, types, statuses
3. **Size Variants** - If component supports sizing
4. **Edge Cases** - Empty state, long text, missing data
5. **Interactive States** - Hover, active, disabled, loading
6. **Context Examples** - Component in realistic usage contexts

**Example Story Structure:**
```typescript
export default {
  title: "UI/ComponentName",
  component: ComponentName,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: { /* ... */ },
} satisfies Meta<typeof ComponentName>;

// 1. Default
export const Default: Story = { args: { /* ... */ } };

// 2. Variants
export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = { args: { variant: "secondary" } };

// 3. Sizes
export const Small: Story = { args: { size: "sm" } };
export const Large: Story = { args: { size: "lg" } };

// 4. Edge Cases
export const LongText: Story = { args: { title: "Very long..." } };
export const EmptyState: Story = { args: { items: [] } };

// 5. Interactive
export const Interactive: Story = {
  render: () => {
    const [state, setState] = useState();
    return <Component state={state} onChange={setState} />;
  },
};

// 6. In Context
export const InContext: Story = {
  render: () => (
    <div className="...">
      <Component {...props} />
    </div>
  ),
};
```

### 4. Documentation Standards

Every component should have:

1. **TypeScript Interface** - Clear prop types
```typescript
export interface ComponentProps {
  /** Brief description of prop */
  propName: PropType;
  /** Optional prop with default */
  size?: "sm" | "md" | "lg";
}
```

2. **JSDoc Comment** - Component description
```typescript
/**
 * ComponentName - Brief description
 * 
 * Longer description explaining use cases, behavior, etc.
 * 
 * @example
 * ```tsx
 * <ComponentName prop="value" />
 * ```
 */
export function ComponentName(props: ComponentProps) {
  // ...
}
```

3. **Story Documentation** - Usage examples in Storybook

4. **Accessibility** - ARIA labels, keyboard navigation

## Patterns to Follow

### Excellent Examples from Current Codebase

#### 1. **status-badge.stories.tsx**
- ✅ Comprehensive status variants
- ✅ Multiple size examples
- ✅ Custom className usage
- ✅ In-context examples (environment list, agent header, deployment pipeline)
- ✅ Shows real-world usage patterns

**Key Takeaways:**
- Include "All Variants" story for comparison
- Show component in realistic contexts
- Demonstrate responsive behavior

#### 2. **agent-run-card.stories.tsx**
- ✅ Interactive examples with state
- ✅ Multiple status variants (running, pending, failed, completed)
- ✅ Edge cases (long text, empty logs)
- ✅ Factory pattern for data
- ✅ Comparison story (All Statuses)

**Key Takeaways:**
- Use React hooks for interactive examples
- Show edge cases explicitly
- Use descriptive story names

#### 3. **icon-button.stories.tsx** (assumed from naming)
- Expected to have comprehensive variant coverage
- Expected to show different states (hover, active, disabled)

## Implementation Checklist

For each component being extracted:

- [ ] Review component for separation opportunities
- [ ] Extract utilities/helpers if needed
- [ ] Create pure presentational component (if needed)
- [ ] Create `.stories.tsx` file
- [ ] Add default story
- [ ] Add variant stories (all states/types)
- [ ] Add size stories (if applicable)
- [ ] Add edge case stories
- [ ] Add interactive story (if stateful)
- [ ] Add in-context stories
- [ ] Add TypeScript prop documentation
- [ ] Add JSDoc comments
- [ ] Test in Storybook UI
- [ ] Run `npm run build-storybook` to verify build
- [ ] Update this documentation

## Running Storybook

```bash
# Development mode
npm run storybook

# Build static Storybook
npm run build-storybook
```

## Benefits of Storybook Extraction

1. **Component Documentation** - Living documentation of all UI components
2. **Visual Regression Testing** - Can add visual testing with Chromatic
3. **Development Speed** - Develop components in isolation
4. **Design System** - Foundation for component library
5. **Onboarding** - New developers can browse component catalog
6. **QA/Testing** - Test components in all states
7. **Accessibility** - A11y addon helps catch issues

## Next Steps

### Immediate (Week 1)
1. Create stories for Phase 1 components:
   - [ ] priority-badge
   - [ ] assignee-badge
   - [ ] breadcrumbs
   - [ ] page-header
   - [ ] entity-card

### Short Term (Week 2-3)
2. Create stories for Phase 2 components:
   - [ ] ProjectCard
   - [ ] EnvironmentBadge
   - [ ] PullRequestCard
   - [ ] IssueListItem

### Medium Term (Month 1-2)
3. Extract and create stories for Phase 3 components:
   - [ ] ClusterCard resource displays
   - [ ] GitHubAppBanner pattern
   - [ ] EnvironmentStatusBadge
   - [ ] EnvironmentCardSkeleton

### Long Term (Month 2-3)
4. Component Library Packaging
   - [ ] Extract reusable components to shared package
   - [ ] Publish Storybook to static hosting
   - [ ] Set up visual regression testing
   - [ ] Create component usage guidelines

## Resources

- [Storybook Documentation](https://storybook.js.org/docs)
- [Component Story Format (CSF)](https://storybook.js.org/docs/api/csf)
- [Next.js Integration](https://storybook.js.org/docs/get-started/frameworks/nextjs)
- [Accessibility Addon](https://storybook.js.org/addons/@storybook/addon-a11y)

## Questions & Discussion

For questions about component extraction or Storybook implementation:
1. Review this document
2. Check existing story examples
3. Discuss in team chat or PR reviews
4. Update this document with learnings
