# Storybook Implementation Notes

## Overview

This document contains practical implementation notes, findings, and lessons learned during the Storybook component extraction review. It complements the main extraction guide with real-world considerations.

## Key Findings

### 1. Next.js Dependencies in "Presentational" Components

Not all components are as simple as they first appear. Some use Next.js features requiring special handling:

#### breadcrumbs.tsx
- **Status**: ✅ Well-structured but ⚠️ uses Next.js `Link`
- **Location**: `src/components/ui/breadcrumbs.tsx`
- **Challenge**: Storybook needs mock handling for Next.js Link
- **Solution**: Storybook has mock infrastructure in `.storybook/main.ts`
- **Implementation**: Can create stories with Next.js parameters or custom render

```typescript
// Option 1: Using Storybook Next.js parameters
const meta = {
  parameters: {
    nextjs: {
      router: {
        pathname: '/projects',
      }
    }
  }
}

// Option 2: Custom render without navigation
export const Default: Story = {
  render: () => (
    <Breadcrumbs items={[
      { label: 'Projects', href: '/projects' },
      { label: 'Current' }
    ]} />
  )
}
```

### 2. Hidden Gems - Already Perfect Components

#### EnvironmentStatusBadge.tsx
- **Status**: ✅ Perfect presentational component
- **Location**: `src/components/environments/EnvironmentStatusBadge.tsx`
- **Why it's perfect**:
  - Well-typed with `EnvironmentStatus` type union
  - Self-contained status configuration object
  - Supports animation (pulse effect)
  - Size variants (sm, md)
  - Optional dot indicator
  - No dependencies on Next.js or external state

**Recommendation**: Move this from Phase 3 to Phase 1 - it's the easiest component to start with!

```typescript
// Example usage showing all features
<EnvironmentStatusBadge 
  status="deploying"  // pending | deploying | running | failed | deleting
  size="md"           // sm | md
  showDot={true}      // boolean
  className="..."     // custom classes
/>
```

### 3. Re-Export Pattern

#### entity-card.tsx
- **Status**: ✅ Re-exports from package
- **Location**: `src/components/ui/entity-card.tsx`
- **Pattern**: Re-exports `GlassEntityCard` from `@tetrastack/react-glass-components`
- **Source**: `packages/@tetrastack/react-glass-components/src/lib/glass-components/GlassEntityCard.tsx`

**Consideration**: Should we:
1. Document the re-export pattern in Storybook?
2. Create stories that show how to use the imported version?
3. Extract stories from the source package?

### 4. Existing Storybook Infrastructure

**Version**: Storybook 10.1.10  
**Framework**: Next.js with Vite  
**Configuration**: `.storybook/main.ts`

**Available Mocks** (already configured):
```typescript
{
  'next/server': './mocks/next-server.js',
  'next-auth': './mocks/next-auth.js',
  '@/auth': './mocks/next-auth.js',
  '@/actions/environments': './mocks/actions-environments.js'
}
```

**Addons Installed**:
- `@chromatic-com/storybook` - Visual regression testing
- `@storybook/addon-vitest` - Component testing
- `@storybook/addon-a11y` - Accessibility testing
- `@storybook/addon-docs` - Documentation
- `@storybook/addon-onboarding` - Onboarding guide

## Updated Priority Matrix

### Phase 1: Pure Presentational (Updated Order)

Based on actual implementation review:

| # | Component | Estimated Time | Complexity | Notes |
|---|-----------|---------------|------------|-------|
| 1 | EnvironmentStatusBadge | 20 min | ⭐ Low | Perfect example! Has animation, types, config |
| 2 | priority-badge | 15 min | ⭐ Low | Simple dots based on priority |
| 3 | assignee-badge | 20 min | ⭐ Low | Avatar handling, type indicators |
| 4 | entity-card | 30 min | ⭐⭐ Medium | Re-export pattern, needs documentation |
| 5 | page-header | 30 min | ⭐⭐ Medium | Combines breadcrumbs + GlassCard |
| 6 | breadcrumbs | 45 min | ⭐⭐⭐ Medium-High | Requires Link mock handling |

**Total Phase 1 Effort**: ~2.5 hours

### Quick Wins (Start Here!)

For immediate momentum and to establish patterns:

1. **EnvironmentStatusBadge** (20 min)
   - Perfect presentational component
   - Shows best practices
   - Has animation states
   - Well-documented types

2. **priority-badge** (15 min)
   - Simple implementation
   - Good for establishing pattern
   - Frequently used

3. **assignee-badge** (20 min)
   - Shows avatar handling
   - Multiple states (AI vs Human)
   - Good edge cases

**Quick Win Total**: ~1 hour, 3 components with stories

## Implementation Patterns

### Pattern: Pure Presentational Component

**Best Example**: `EnvironmentStatusBadge.tsx`

```typescript
// Step 1: Component is already presentational
export function EnvironmentStatusBadge({
  status,
  size = "md",
  showDot = true,
  className,
}: EnvironmentStatusBadgeProps) {
  // Configuration object (pure)
  const statusConfig: Record<EnvironmentStatus, Config> = {
    deploying: {
      label: "Deploying",
      color: "bg-primary/10 text-primary",
      dotColor: "bg-primary",
      animate: true,
    },
    // ... more statuses
  };
  
  // Pure rendering
  return <span className={...}>{config.label}</span>
}

// Step 2: Create stories file
// environment-status-badge.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { EnvironmentStatusBadge } from "./EnvironmentStatusBadge";

const meta = {
  title: "Environments/EnvironmentStatusBadge",
  component: EnvironmentStatusBadge,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  argTypes: {
    status: {
      control: { type: "select" },
      options: ["pending", "deploying", "running", "failed", "deleting"],
    },
    size: {
      control: { type: "select" },
      options: ["sm", "md"],
    },
    showDot: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof EnvironmentStatusBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

// Step 3: Add stories
export const Deploying: Story = {
  args: { status: "deploying" },
};

export const Running: Story = {
  args: { status: "running" },
};

// ... more variants

export const AllStatuses: Story = {
  render: () => (
    <div className="flex gap-3">
      <EnvironmentStatusBadge status="pending" />
      <EnvironmentStatusBadge status="deploying" />
      <EnvironmentStatusBadge status="running" />
      <EnvironmentStatusBadge status="failed" />
      <EnvironmentStatusBadge status="deleting" />
    </div>
  ),
};
```

### Pattern: Component with Next.js Dependencies

**Example**: `breadcrumbs.tsx`

```typescript
// Component uses Next.js Link
import Link from "next/link";

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav>
      {items.map((item) => (
        item.href ? (
          <Link href={item.href}>{item.label}</Link>
        ) : (
          <span>{item.label}</span>
        )
      ))}
    </nav>
  );
}

// Story with Next.js mocking
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Breadcrumbs } from "./breadcrumbs";

const meta = {
  title: "UI/Breadcrumbs",
  component: Breadcrumbs,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    // Next.js router mock
    nextjs: {
      router: {
        pathname: "/projects/catalyst",
        query: {},
      },
    },
  },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwoLevel: Story = {
  args: {
    items: [
      { label: "Projects", href: "/projects" },
      { label: "Catalyst" },
    ],
  },
};

// Alternative: Custom render without navigation
export const WithoutNavigation: Story = {
  render: () => (
    <Breadcrumbs
      items={[
        { label: "Projects" },
        { label: "Catalyst" },
        { label: "Configure" },
      ]}
    />
  ),
};
```

## Testing Strategy

### Before Submitting Stories

1. **Visual Check**
   ```bash
   npm run storybook
   # Open http://localhost:6006
   # Check all stories render correctly
   ```

2. **Build Verification**
   ```bash
   npm run build-storybook
   # Verify static build works
   ```

3. **Accessibility**
   - Check a11y addon tab in Storybook
   - Ensure no violations
   - Verify keyboard navigation

4. **Responsive Behavior**
   - Test at different viewport sizes
   - Check mobile, tablet, desktop
   - Verify text truncation/wrapping

5. **Props Validation**
   - Test all prop combinations
   - Verify TypeScript types
   - Check edge cases (null, undefined, long strings)

### Story Coverage Checklist

For each component:

- [ ] **Default story** - Most common use case
- [ ] **All variants** - Each status/type/state
- [ ] **All sizes** - If component has size prop
- [ ] **Edge cases**
  - [ ] Long text (truncation)
  - [ ] Empty/null values
  - [ ] Missing optional props
- [ ] **Interactive states** (if applicable)
  - [ ] Hover
  - [ ] Active
  - [ ] Disabled
  - [ ] Loading
- [ ] **In-context example** - Realistic usage
- [ ] **Comparison story** - All variants together

## File Reference

### Excellent Examples to Copy From

1. **status-badge.stories.tsx** (`src/components/ui/`)
   - ✅ Comprehensive variant coverage
   - ✅ Multiple in-context examples
   - ✅ Shows all sizes
   - ✅ Comparison stories

2. **agent-run-card.stories.tsx** (`src/components/`)
   - ✅ Interactive examples with state
   - ✅ Edge cases (long text, empty logs)
   - ✅ Factory pattern for data
   - ✅ Comprehensive documentation

3. **icon-button.stories.tsx** (`src/components/ui/`)
   - Expected to have good coverage of states

### Mock Infrastructure

- **Configuration**: `.storybook/main.ts`
- **Mocks Directory**: `.storybook/mocks/`
- **Next.js Server Mock**: `.storybook/mocks/next-server.js`
- **Auth Mock**: `.storybook/mocks/next-auth.js`

## Common Pitfalls

### 1. Over-Mocking

❌ **Don't**:
```typescript
// Mocking everything in Storybook
decorators: [
  (Story) => (
    <MockNextRouter>
      <MockNextImage>
        <MockAuthProvider>
          <Story />
        </MockAuthProvider>
      </MockNextImage>
    </MockNextRouter>
  )
]
```

✅ **Do**: Extract presentational layer instead

### 2. Incomplete Coverage

❌ **Don't**:
```typescript
// Only one story
export const Default: Story = {
  args: { status: "running" }
};
```

✅ **Do**: Cover all variants
```typescript
export const Running: Story = { args: { status: "running" } };
export const Failed: Story = { args: { status: "failed" } };
export const Pending: Story = { args: { status: "pending" } };
// ... etc
```

### 3. Missing Edge Cases

❌ **Don't**: Forget to test edge cases

✅ **Do**: Test realistic scenarios
```typescript
export const LongTitle: Story = {
  args: {
    title: "This is a very long title that should truncate..."
  }
};

export const EmptyState: Story = {
  args: {
    items: []
  }
};
```

## Questions to Address

### Architecture Questions

1. **Should breadcrumbs be refactored?**
   - Option A: Keep as-is, use Storybook mocks
   - Option B: Extract Link-agnostic version
   - Option C: Create separate stories showing both patterns
   - **Recommendation**: Option A for now (Storybook handles it)

2. **How to handle re-exports?**
   - Should entity-card have its own stories?
   - Or reference the package component stories?
   - **Recommendation**: Create stories showing usage patterns

3. **Storybook organization?**
   - Separate "Next.js Components" section?
   - Or keep framework-agnostic UI separate?
   - **Recommendation**: Keep organized by feature area

### Process Questions

4. **When to extract vs. when to story?**
   - Guideline: If component is 80% presentational, create stories
   - If component is 80% business logic, extract first
   - **Recommendation**: Start with easy wins (Phase 1)

5. **Story naming conventions?**
   - Component.stories.tsx or component.stories.tsx?
   - **Current pattern**: lowercase with hyphens
   - **Recommendation**: Follow existing pattern

## Next Actions

### This Week (Priority 1)

1. **Create EnvironmentStatusBadge story** (20 min)
   - Perfect starting point
   - Establishes pattern
   - Shows best practices

2. **Create priority-badge story** (15 min)
   - Build on pattern
   - Simple implementation
   - Quick win

3. **Create assignee-badge story** (20 min)
   - More complex than priority-badge
   - Shows avatar handling
   - Good edge cases

**Total**: ~1 hour for 3 components

### This Sprint (Priority 2)

4. **Create entity-card story** (30 min)
   - Document re-export pattern
   - Show usage examples

5. **Create page-header story** (30 min)
   - Combines multiple components
   - Shows composition

6. **Create breadcrumbs story** (45 min)
   - Handle Next.js Link
   - Test mock infrastructure

**Total**: ~2 hours for 3 more components

### Next Sprint (Priority 3)

7. **Start Phase 2 components**
   - ProjectCard extraction
   - PullRequestCard badge extraction
   - Document extraction patterns

8. **Set up visual regression**
   - Configure Chromatic
   - Establish baseline
   - Add to CI/CD

## Success Metrics

### Definition of Done (Per Component)

- [ ] Stories file created
- [ ] Default story implemented
- [ ] All variants covered
- [ ] Edge cases tested
- [ ] Runs in Storybook locally
- [ ] Builds successfully
- [ ] No a11y violations
- [ ] Documentation complete
- [ ] TypeScript types exported
- [ ] Examples show realistic usage

### Phase Completion Goals

**Phase 1 Complete**:
- 6 components with stories
- Pattern established
- Documentation updated
- Team trained on process

**Phase 2 Complete**:
- 4 business components extracted
- Extraction patterns documented
- Reusable components identified

**Phase 3 Complete**:
- Complex components addressed
- Visual regression setup
- Component library considered

## Resources

### Documentation
- Main Guide: `web/docs/STORYBOOK_COMPONENT_EXTRACTION.md`
- Patterns: `web/docs/COMPONENT_EXTRACTION_PATTERNS.md`
- Summary: `web/docs/COMPONENT_EXTRACTION_SUMMARY.md`
- This File: `web/docs/STORYBOOK_IMPLEMENTATION_NOTES.md`

### External
- [Storybook Documentation](https://storybook.js.org/docs)
- [Next.js Integration](https://storybook.js.org/docs/get-started/frameworks/nextjs)
- [Component Story Format](https://storybook.js.org/docs/api/csf)
- [Accessibility Addon](https://storybook.js.org/addons/@storybook/addon-a11y)

### Internal Examples
- `src/components/ui/status-badge.stories.tsx`
- `src/components/agent-run-card.stories.tsx`
- `.storybook/main.ts` (configuration)
- `.storybook/mocks/` (mock implementations)

## Updates and Maintenance

This document should be updated as:
- New patterns emerge
- Questions are answered
- Components are completed
- Team learns best practices

**Last Updated**: 2024-01-04  
**Next Review**: After Phase 1 completion
