# Storybook Component Extraction - Documentation Index

## Overview

This directory contains comprehensive documentation for extracting presentational components for Storybook. The goal is to create a living component library with visual documentation, testing, and reusable patterns.

## 📚 Documentation Files

### 1. [STORYBOOK_COMPONENT_EXTRACTION.md](./STORYBOOK_COMPONENT_EXTRACTION.md)
**17KB | Comprehensive Guide**

The complete extraction guide covering:
- Analysis of 24 existing components with stories
- Identification of 13+ components missing stories
- Three-phase extraction plan
- Extraction principles and best practices
- Story coverage requirements
- Documentation standards
- Timeline and roadmap

**Use this for**: Understanding the full scope and methodology

### 2. [COMPONENT_EXTRACTION_SUMMARY.md](./COMPONENT_EXTRACTION_SUMMARY.md)
**4.6KB | Quick Reference**

One-page quick reference with:
- Priority matrix (3 phases)
- Quick start templates
- Component checklist
- Commands and timeline
- Quick wins section

**Use this for**: Day-to-day implementation reference

### 3. [COMPONENT_EXTRACTION_PATTERNS.md](./COMPONENT_EXTRACTION_PATTERNS.md)
**14KB | Visual Patterns Guide**

Pattern library showing:
- Pattern 1: Already Presentational
- Pattern 2: Extract Utilities
- Pattern 3: Container-Presenter Split
- Pattern 4: Extract Sub-Components
- Decision tree with examples
- Anti-patterns to avoid

**Use this for**: Choosing the right extraction approach

### 4. [STORYBOOK_IMPLEMENTATION_NOTES.md](./STORYBOOK_IMPLEMENTATION_NOTES.md)
**15KB | Practical Findings**

Real-world implementation notes:
- Next.js dependency handling
- Component analysis discoveries
- Mock infrastructure details
- Testing strategies
- Common pitfalls
- Success metrics

**Use this for**: Practical implementation guidance

## 🎯 Quick Start

### For Beginners

1. Read [COMPONENT_EXTRACTION_SUMMARY.md](./COMPONENT_EXTRACTION_SUMMARY.md)
2. Look at existing examples: `src/components/ui/status-badge.stories.tsx`
3. Start with Phase 1 Quick Wins (1 hour, 3 components)

### For Implementation

1. Check [STORYBOOK_IMPLEMENTATION_NOTES.md](./STORYBOOK_IMPLEMENTATION_NOTES.md) for latest findings
2. Use [COMPONENT_EXTRACTION_PATTERNS.md](./COMPONENT_EXTRACTION_PATTERNS.md) decision tree
3. Follow templates from [COMPONENT_EXTRACTION_SUMMARY.md](./COMPONENT_EXTRACTION_SUMMARY.md)

### For Planning

1. Review [STORYBOOK_COMPONENT_EXTRACTION.md](./STORYBOOK_COMPONENT_EXTRACTION.md)
2. Check priority matrix and timelines
3. Understand extraction principles

## 📊 Current Status

### Components Status

- ✅ **24 components** with Storybook stories
- 🔴 **13+ components** without stories
- 🎯 **6 components** ready for Phase 1 (Pure Presentational)
- 📦 **4 components** ready for Phase 2 (Extract & Story)
- 🔧 **4 components** in Phase 3 (Complex Components)

### Phase Breakdown

#### Phase 1: Pure Presentational (~2.5 hours)
1. ⭐ EnvironmentStatusBadge (20 min) - Perfect example!
2. priority-badge (15 min)
3. assignee-badge (20 min)
4. entity-card (30 min)
5. page-header (30 min)
6. breadcrumbs (45 min) - Needs Link mocking

**Quick Wins**: Items 1-3 = ~1 hour

#### Phase 2: Business Components (~4-6 hours)
- ProjectCard
- EnvironmentBadge
- PullRequestCard
- IssueListItem

#### Phase 3: Complex Components (~6-8 hours)
- ClusterCard
- GitHubAppBanner
- Additional environment components

## 🚀 Implementation Plan

### Week 1: Quick Wins
```bash
# 1. EnvironmentStatusBadge (20 min)
# 2. priority-badge (15 min)
# 3. assignee-badge (20 min)
```
**Goal**: 3 components, establish pattern

### Week 2-3: Complete Phase 1
```bash
# 4. entity-card (30 min)
# 5. page-header (30 min)
# 6. breadcrumbs (45 min)
```
**Goal**: 6 components total, pattern established

### Month 1-2: Phase 2
```bash
# Extract and create stories for business components
# Document extraction patterns
```
**Goal**: 4 more components, reusable patterns

### Month 2-3: Phase 3
```bash
# Complex components and sub-component extraction
# Visual regression testing
# Component library consideration
```
**Goal**: Complete coverage, production-ready

## 🛠 Tools & Commands

### Storybook Commands
```bash
# Development
npm run storybook

# Production build
npm run build-storybook

# Visit
http://localhost:6006
```

### Infrastructure
- **Version**: Storybook 10.1.10
- **Framework**: Next.js with Vite
- **Config**: `.storybook/main.ts`
- **Mocks**: `.storybook/mocks/`

### Addons Available
- @chromatic-com/storybook (Visual regression)
- @storybook/addon-vitest (Testing)
- @storybook/addon-a11y (Accessibility)
- @storybook/addon-docs (Documentation)

## 📖 Learning Path

### Step 1: Understand Current State
- Review `src/components/ui/status-badge.stories.tsx` (good example)
- Review `src/components/agent-run-card.stories.tsx` (interactive example)
- Run Storybook locally: `npm run storybook`

### Step 2: Choose Your First Component
- Start with Quick Wins (EnvironmentStatusBadge, priority-badge, assignee-badge)
- Use [COMPONENT_EXTRACTION_PATTERNS.md](./COMPONENT_EXTRACTION_PATTERNS.md) decision tree
- Follow template from [COMPONENT_EXTRACTION_SUMMARY.md](./COMPONENT_EXTRACTION_SUMMARY.md)

### Step 3: Implement Stories
```typescript
// 1. Create component-name.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ComponentName } from "./component-name";

const meta = {
  title: "Category/ComponentName",
  component: ComponentName,
  tags: ["autodocs"],
} satisfies Meta<typeof ComponentName>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { /* ... */ },
};
```

### Step 4: Verify & Test
```bash
# Check locally
npm run storybook

# Build test
npm run build-storybook

# Check a11y in Storybook UI
```

## 🎓 Best Practices

### Story Coverage
Every component should have:
- ✅ Default state
- ✅ All variants (status, type, etc.)
- ✅ All sizes (if applicable)
- ✅ Edge cases (long text, empty data)
- ✅ Interactive example (if stateful)
- ✅ In-context example (realistic usage)

### Documentation
Every component should have:
- ✅ TypeScript prop types
- ✅ JSDoc comments
- ✅ Usage examples
- ✅ Accessibility considerations

### Testing
Before completing:
- ✅ Runs in Storybook locally
- ✅ Builds successfully
- ✅ No a11y violations
- ✅ Responsive at all sizes
- ✅ All props validated

## 🔍 Examples to Reference

### Excellent Patterns
- `src/components/ui/status-badge.stories.tsx` - Comprehensive variants, in-context
- `src/components/agent-run-card.stories.tsx` - Interactive, state management
- `src/components/ui/icon-button.stories.tsx` - Multiple states

### Component Categories
- **UI Components**: `src/components/ui/*.stories.tsx`
- **Task Components**: `src/components/tasks/*.stories.tsx`
- **Platform Components**: `src/components/platform/*.stories.tsx`
- **Observability**: `src/components/observability/*.stories.tsx`

## ❓ FAQ

### Which pattern should I use?
Use the decision tree in [COMPONENT_EXTRACTION_PATTERNS.md](./COMPONENT_EXTRACTION_PATTERNS.md)

### How do I handle Next.js dependencies?
See [STORYBOOK_IMPLEMENTATION_NOTES.md](./STORYBOOK_IMPLEMENTATION_NOTES.md) - Mock infrastructure section

### What if my component is complex?
See Pattern 3 (Container-Presenter) or Pattern 4 (Extract Sub-Components) in [COMPONENT_EXTRACTION_PATTERNS.md](./COMPONENT_EXTRACTION_PATTERNS.md)

### How do I know when I'm done?
Check the "Success Metrics" section in [STORYBOOK_IMPLEMENTATION_NOTES.md](./STORYBOOK_IMPLEMENTATION_NOTES.md)

## 📈 Progress Tracking

### Completed
- ✅ Analysis of existing components
- ✅ Documentation creation (4 files)
- ✅ Pattern definition
- ✅ Priority identification
- ✅ Timeline creation

### In Progress
- 🔄 Phase 1 implementation
- 🔄 Pattern validation
- 🔄 Team training

### Upcoming
- ⏳ Phase 2 extraction
- ⏳ Visual regression setup
- ⏳ Component library consideration

## 🤝 Contributing

### Adding a New Story

1. Choose component from priority list
2. Check which pattern applies
3. Create `.stories.tsx` file
4. Follow existing examples
5. Test in Storybook
6. Update documentation

### Questions?

1. Check this index
2. Review relevant documentation file
3. Look at existing examples
4. Ask in team chat
5. Update docs with learnings

## 📝 Maintenance

This documentation should be updated when:
- New patterns emerge
- Components are completed
- Questions are answered
- Best practices change

**Last Updated**: 2024-01-04  
**Next Review**: After Phase 1 completion

## 🔗 External Resources

- [Storybook Documentation](https://storybook.js.org/docs)
- [Next.js Integration](https://storybook.js.org/docs/get-started/frameworks/nextjs)
- [Component Story Format](https://storybook.js.org/docs/api/csf)
- [Accessibility Addon](https://storybook.js.org/addons/@storybook/addon-a11y)

## 📂 File Structure

```
web/docs/
├── README_STORYBOOK.md                      ← You are here
├── STORYBOOK_COMPONENT_EXTRACTION.md        ← Complete guide
├── COMPONENT_EXTRACTION_SUMMARY.md          ← Quick reference
├── COMPONENT_EXTRACTION_PATTERNS.md         ← Pattern library
└── STORYBOOK_IMPLEMENTATION_NOTES.md        ← Implementation findings

web/.storybook/
├── main.ts                                  ← Storybook config
├── preview.ts                               ← Global config
└── mocks/                                   ← Mock implementations

web/src/components/
├── ui/*.stories.tsx                         ← UI component stories
├── tasks/*.stories.tsx                      ← Task component stories
├── platform/*.stories.tsx                   ← Platform component stories
└── [feature]/*.stories.tsx                  ← Feature-specific stories
```

---

**Ready to start?** Begin with [COMPONENT_EXTRACTION_SUMMARY.md](./COMPONENT_EXTRACTION_SUMMARY.md) for quick start guide!
