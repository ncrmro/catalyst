# Component Extraction Patterns

Visual guide showing how to extract presentational components from business logic components.

## Pattern 1: Already Presentational

For components that are already pure presentational (Phase 1).

```
┌────────────────────────────────────────────┐
│ Component (Already Presentational)         │
│                                            │
│ ✅ No data fetching                        │
│ ✅ No side effects                         │
│ ✅ Props in, JSX out                       │
│                                            │
│ Just needs:                                │
│ → Create .stories.tsx file                 │
└────────────────────────────────────────────┘

Examples:
• priority-badge
• assignee-badge
• breadcrumbs
• page-header
• entity-card
```

## Pattern 2: Extract Utilities

For components with reusable logic (like color/icon mapping).

```
BEFORE:
┌────────────────────────────────────────────┐
│ Component                                  │
│                                            │
│ const getStatusColor = (status) => {       │
│   switch(status) { ... }                   │
│ }                                          │
│                                            │
│ const getIcon = (type) => {                │
│   switch(type) { ... }                     │
│ }                                          │
│                                            │
│ return <div className={getStatusColor()}   │
└────────────────────────────────────────────┘

AFTER:
┌────────────────────────────────────────────┐
│ utils/status-helpers.ts                    │
│                                            │
│ export const getStatusColor = ...          │
│ export const getIcon = ...                 │
└────────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────────┐
│ Component                                  │
│                                            │
│ import { getStatusColor, getIcon }         │
│                                            │
│ return <div className={getStatusColor()}   │
│                                            │
│ ✅ Now testable in isolation               │
│ ✅ Can be used in stories                  │
└────────────────────────────────────────────┘

Examples:
• EnvironmentBadge (status colors)
• IssueListItem (type icons)
```

## Pattern 3: Container-Presenter Split

For components with business logic and data fetching.

```
BEFORE:
┌────────────────────────────────────────────┐
│ ProjectCard                                │
│ "use client"                               │
│                                            │
│ ❌ Uses Next.js Link                       │
│ ❌ Uses Next.js Image                      │
│ ❌ Navigation logic                        │
│ ❌ Hard to test in Storybook              │
│                                            │
│ return <Link href={...}>                   │
│   <Image src={...} />                      │
│   <div>...</div>                           │
│ </Link>                                    │
└────────────────────────────────────────────┘

AFTER:
┌────────────────────────────────────────────┐
│ ProjectCard (Container)                    │
│ "use client"                               │
│                                            │
│ const handleClick = () => {                │
│   router.push(`/projects/${slug}`)         │
│ }                                          │
│                                            │
│ return <ProjectCardView                    │
│   project={project}                        │
│   onClick={handleClick}                    │
│   avatarUrl={project.avatarUrl}            │
│ />                                         │
└────────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────────┐
│ ProjectCardView (Presenter)                │
│                                            │
│ ✅ Pure props in, JSX out                  │
│ ✅ No Next.js dependencies                 │
│ ✅ Storybook-ready                         │
│                                            │
│ interface Props {                          │
│   project: Project;                        │
│   onClick: () => void;                     │
│   avatarUrl: string;                       │
│ }                                          │
│                                            │
│ return <div onClick={onClick}>             │
│   <img src={avatarUrl} />                  │
│   <div>...</div>                           │
│ </div>                                     │
└────────────────────────────────────────────┘

Examples:
• ProjectCard
• PullRequestCard
• ClusterCard
```

## Pattern 4: Extract Sub-Components

For complex components with reusable parts.

```
BEFORE:
┌────────────────────────────────────────────┐
│ PullRequestCard                            │
│                                            │
│ 500+ lines with:                           │
│ • Status badge logic (20 lines)            │
│ • Priority badge logic (25 lines)          │
│ • Preview badge logic (40 lines)           │
│ • Layout and styling                       │
│                                            │
│ ❌ Hard to maintain                        │
│ ❌ Logic repeated elsewhere                │
│ ❌ Can't reuse parts                       │
└────────────────────────────────────────────┘

AFTER:
┌────────────────────────────────────────────┐
│ PRStatusBadge (New Component)              │
│ → status-badge.stories.tsx                 │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ PRPriorityBadge (New Component)            │
│ → priority-badge.stories.tsx               │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ PRPreviewBadge (New Component)             │
│ → preview-badge.stories.tsx                │
└────────────────────────────────────────────┘
                  ↓
┌────────────────────────────────────────────┐
│ PullRequestCard                            │
│                                            │
│ import { PRStatusBadge }                   │
│ import { PRPriorityBadge }                 │
│ import { PRPreviewBadge }                  │
│                                            │
│ return <Card>                              │
│   <PRStatusBadge status={pr.status} />     │
│   <PRPriorityBadge priority={pr.priority}/>│
│   <PRPreviewBadge preview={pr.preview} />  │
│ </Card>                                    │
│                                            │
│ ✅ Reusable sub-components                 │
│ ✅ Each tested independently               │
│ ✅ Cleaner main component                  │
└────────────────────────────────────────────┘

Examples:
• PullRequestCard badges
• ClusterCard resource displays
• GitHubAppBanner pattern
```

## Decision Tree

```
                     Component needs stories?
                              │
                ┌─────────────┴─────────────┐
                │                           │
              YES                          NO
                │                           │
                ▼                           │
    Is it already presentational?           │
    (No hooks, no Next.js, pure props)      │
                │                           │
        ┌───────┴───────┐                   │
       YES              NO                  │
        │               │                   │
        ▼               ▼                   │
   Pattern 1:     Has reusable logic?       │
   Just add       (colors, icons)           │
   stories        │                         │
                  ├────────┬────────┐       │
                 YES      NO        NO      │
                  │        │         │      │
                  ▼        ▼         ▼      │
              Pattern 2: Pattern 3:  │      │
              Extract  Container-    │      │
              utilities Presenter    │      │
                         split       │      │
                                     │      │
                  Has reusable       │      │
                  sub-components?    │      │
                          │          │      │
                      ┌───┴───┐      │      │
                     YES     NO      │      │
                      │       │      │      │
                      ▼       │      │      │
                  Pattern 4:  │      │      │
                  Extract     │      │      │
                  sub-comps   │      │      │
                              │      │      │
                              └──────┴──────┘
                                     │
                                     ▼
                              Skip for now
```

## File Naming Conventions

```
Component File Structure:

src/components/ui/
├── component-name.tsx           ← Main component
├── component-name.stories.tsx   ← Storybook stories
├── component-name.test.tsx      ← Unit tests (optional)
└── component-name-utils.ts      ← Helper utilities (if needed)

For Container-Presenter:

src/components/feature/
├── ComponentName.tsx            ← Container (default export)
├── ComponentNameView.tsx        ← Presenter
├── ComponentNameView.stories.tsx ← Stories for presenter
└── component-name-utils.ts      ← Shared utilities
```

## Real-World Examples

### Example 1: priority-badge (Pattern 1)

```typescript
// ✅ Already presentational - just add stories

// priority-badge.tsx (unchanged)
export function PriorityBadge({ priority, size }: Props) {
  return <span className={...}>{dots}</span>
}

// priority-badge.stories.tsx (new)
export const High: Story = {
  args: { priority: "high" }
}
```

### Example 2: EnvironmentBadge (Pattern 2)

```typescript
// BEFORE:
export function EnvironmentBadge({ environment }) {
  const getStatusColor = (status) => { ... } // inline
  return <span className={getStatusColor()} />
}

// AFTER:
// status-utils.ts (new)
export const getStatusColor = (status: string) => { ... }

// environment-badge.tsx (refactored)
import { getStatusColor } from './status-utils'
export function EnvironmentBadge({ environment }) {
  return <span className={getStatusColor(environment.status)} />
}

// environment-badge.stories.tsx (new)
export const Active: Story = {
  args: { environment: { status: 'active', ... } }
}
```

### Example 3: ProjectCard (Pattern 3)

```typescript
// project-card.tsx (container)
"use client"
export function ProjectCard({ project }) {
  return <Link href={...}>
    <ProjectCardView project={project} />
  </Link>
}

// project-card-view.tsx (new presenter)
export function ProjectCardView({ 
  project, 
  onClick 
}: {
  project: Project;
  onClick?: () => void;
}) {
  return <div onClick={onClick}>
    <img src={project.avatarUrl} />
    <h3>{project.name}</h3>
  </div>
}

// project-card-view.stories.tsx (new)
export const Default: Story = {
  args: {
    project: { name: "My Project", ... },
    onClick: fn()
  }
}
```

### Example 4: PullRequestCard (Pattern 4)

```typescript
// Extract sub-components first
// pr-status-badge.tsx (new)
export function PRStatusBadge({ status }: { status: string }) {
  return <span className={...}>{status}</span>
}

// pr-priority-badge.tsx (new)
export function PRPriorityBadge({ priority }: { priority: string }) {
  return <span className={...}>{priority}</span>
}

// pull-request-card.tsx (refactored)
import { PRStatusBadge } from './pr-status-badge'
import { PRPriorityBadge } from './pr-priority-badge'

export function PullRequestCard({ pr }) {
  return <Card>
    <PRStatusBadge status={pr.status} />
    <PRPriorityBadge priority={pr.priority} />
  </Card>
}

// Each sub-component gets its own stories
// pr-status-badge.stories.tsx
// pr-priority-badge.stories.tsx
```

## Anti-Patterns to Avoid

### ❌ Don't: Mock Everything

```typescript
// BAD: Mocking complex Next.js behavior in Storybook
export default {
  decorators: [(Story) => (
    <MockNextRouter>
      <MockNextImage>
        <Story />
      </MockNextImage>
    </MockNextRouter>
  )]
}
```

**Instead**: Extract the presentational layer

### ❌ Don't: Duplicate Logic

```typescript
// BAD: Same logic in multiple places
function ComponentA() {
  const getColor = (status) => { ... } // duplicated
}

function ComponentB() {
  const getColor = (status) => { ... } // duplicated
}
```

**Instead**: Extract to shared utility

### ❌ Don't: Over-Extract

```typescript
// BAD: Too granular
<DivWrapper>
  <SpanContainer>
    <TextContent>Hello</TextContent>
  </SpanContainer>
</DivWrapper>
```

**Instead**: Keep reasonable component boundaries

## Testing Strategy

```
Component Testing Pyramid:

        ┌─────────────┐
        │   E2E Tests │  ← Full user flows
        │    (Few)    │
        └─────────────┘
       ┌───────────────┐
       │ Integration   │  ← Component interactions
       │     Tests     │
       │   (Some)      │
       └───────────────┘
      ┌─────────────────┐
      │  Storybook      │  ← Visual testing
      │  Stories +      │  ← Props combinations
      │  Unit Tests     │  ← Utility functions
      │    (Many)       │
      └─────────────────┘
```

Storybook provides:
1. **Visual Testing** - See all states at once
2. **Props Testing** - Test all prop combinations
3. **Interaction Testing** - Test user interactions
4. **Accessibility Testing** - A11y addon catches issues
5. **Documentation** - Living component catalog

## Checklist for Each Pattern

### Pattern 1: Already Presentational
- [ ] Verify no hooks or side effects
- [ ] Verify no Next.js dependencies
- [ ] Create stories file
- [ ] Add default story
- [ ] Add all variants
- [ ] Add edge cases

### Pattern 2: Extract Utilities
- [ ] Identify reusable logic
- [ ] Create utility file
- [ ] Extract functions with tests
- [ ] Update component to use utilities
- [ ] Create stories file
- [ ] Test with various inputs

### Pattern 3: Container-Presenter
- [ ] Identify business logic
- [ ] Create presenter component
- [ ] Move JSX to presenter
- [ ] Pass props from container
- [ ] Create stories for presenter
- [ ] Test container with presenter

### Pattern 4: Extract Sub-Components
- [ ] Identify reusable parts
- [ ] Create sub-components
- [ ] Create stories for each
- [ ] Refactor main component
- [ ] Verify composition works
- [ ] Test each piece independently
