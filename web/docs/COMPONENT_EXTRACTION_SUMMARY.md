# Component Extraction Summary

Quick reference guide for components that should be extracted to presentational components for Storybook.

## Quick Stats

- ✅ **24 components** already have Storybook stories
- 🔴 **13+ components** missing stories
- 🎯 **5 high-priority** pure presentational components ready for stories
- 📦 **4 business components** that could benefit from extraction

## Priority Matrix

### 🟢 Phase 1: Pure Presentational (Ready Now)

| Component | Location | Complexity | Status |
|-----------|----------|------------|--------|
| priority-badge | `src/components/ui/` | Low | No stories |
| assignee-badge | `src/components/ui/` | Low | No stories |
| breadcrumbs | `src/components/ui/` | Low | No stories |
| page-header | `src/components/ui/` | Low-Medium | No stories |
| entity-card | `src/components/ui/` | Low | No stories |

**Action**: Create stories directly - no extraction needed

### 🟡 Phase 2: Business Components (Extract & Story)

| Component | Location | Complexity | Extraction Needed |
|-----------|----------|------------|-------------------|
| ProjectCard | `src/components/projects/` | Medium | Presentational layer |
| EnvironmentBadge | `src/components/projects/` | Medium | Color/icon logic |
| PullRequestCard | `src/components/work-items/` | High | Badge components |
| IssueListItem | `src/components/work-items/` | Medium | Icon/type logic |

**Action**: Extract presentational components, then create stories

### 🔵 Phase 3: Complex Interactive (Lower Priority)

| Component | Location | Complexity | Notes |
|-----------|----------|------------|-------|
| ClusterCard | `src/components/` | High | Extract resource displays |
| GitHubAppBanner | `src/components/` | Medium | Extract banner pattern |
| EnvironmentStatusBadge | `src/components/environments/` | Low-Medium | Likely ready |
| EnvironmentCardSkeleton | `src/components/environments/` | Low | Likely ready |

**Action**: Extract patterns for reusability

## Quick Start Guide

### For Phase 1 Components

1. Create `component-name.stories.tsx` file
2. Follow this template:
```typescript
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ComponentName } from "./component-name";

const meta = {
  title: "UI/ComponentName",
  component: ComponentName,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { /* ... */ },
};
```
3. Add variant stories
4. Add edge case stories
5. Add in-context stories

### For Phase 2 Components

1. Extract utilities/helpers
2. Create presentational component
3. Follow Phase 1 steps for the presentational component
4. Update container to use presentational component

## Story Coverage Checklist

Every story file should include:

- [ ] Default state story
- [ ] All variant/state stories
- [ ] Size variant stories (if applicable)
- [ ] Edge cases (long text, empty data)
- [ ] Interactive examples (if stateful)
- [ ] In-context usage examples
- [ ] TypeScript prop types
- [ ] JSDoc documentation

## Example Patterns

### Good: status-badge.stories.tsx
✅ Shows all status variants  
✅ Shows all sizes  
✅ In-context examples (env list, agent header, pipeline)  
✅ Interactive examples  

### Good: agent-run-card.stories.tsx
✅ Interactive state management  
✅ All status variants  
✅ Edge cases (long text, empty logs)  
✅ Comparison story (all statuses together)  

## Commands

```bash
# Run Storybook locally
npm run storybook

# Build static Storybook
npm run build-storybook
```

## Full Documentation

See [STORYBOOK_COMPONENT_EXTRACTION.md](./STORYBOOK_COMPONENT_EXTRACTION.md) for:
- Detailed analysis of each component
- Extraction principles and patterns
- Component hierarchy examples
- Implementation checklists
- Best practices and resources

## Timeline

- **Week 1**: Phase 1 components (5 components)
- **Week 2-3**: Phase 2 components (4 components)
- **Month 1-2**: Phase 3 components (4 components)
- **Month 2-3**: Component library packaging

## Quick Wins

Start here for immediate value:

1. **priority-badge** - 15 min, shows priority dots
2. **assignee-badge** - 20 min, shows assignee info
3. **breadcrumbs** - 20 min, navigation breadcrumbs

These three components are:
- Already presentational
- Frequently used
- Easy to document
- High visibility

## Questions?

1. Check [STORYBOOK_COMPONENT_EXTRACTION.md](./STORYBOOK_COMPONENT_EXTRACTION.md)
2. Look at existing stories: `src/components/ui/status-badge.stories.tsx`
3. Ask in team chat
4. Update docs with learnings
