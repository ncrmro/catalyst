# Implementation Plan: [FEATURE NAME]

**Spec**: `###-feature-slug`
**Branch**: `###-feature-slug`
**Created**: [DATE]

<!--
  This document defines HOW to implement the feature.
  WHAT the feature does is defined in spec.md.
  Research on libraries/approaches goes in research*.md files.
-->

## Summary

[1-2 sentence summary: primary requirement + chosen technical approach]

## Technical Context

**Language/Framework**: [e.g., TypeScript, Next.js 15]
**Primary Dependencies**: [e.g., Drizzle ORM, React 19]
**Storage**: [e.g., PostgreSQL, N/A]
**Testing**: [e.g., Vitest, Playwright]

## Data Model

<!--
  Schema definitions for key entities from spec.md.
  Use actual code that will be implemented.
-->

```typescript
// Example: Drizzle schema
export const exampleTable = pgTable('examples', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

## API/Actions

<!--
  Server actions or API endpoints required.
  Include input/output types.
-->

```typescript
// Example: Server action signature
export async function createExample(
  input: CreateExampleInput,
): Promise<Result<Example, CreateExampleError>> {
  // Implementation details...
}
```

## UI Components

<!--
  Key components needed. Reference existing components to reuse.
-->

- `ExampleList` - Displays list of examples
- `ExampleForm` - Create/edit form (extends existing `Form` component)

## Spike Work

<!--
  Small proof-of-concepts for risky/new functionality.
  Document what needs validation before full implementation.
  Remove this section if no spikes needed.
-->

### Spike: [Name]

**Goal**: Validate [specific uncertainty]

**Approach**: [Brief description of PoC]

**Success Criteria**: [How to know spike succeeded]

**Findings**: [Fill in after spike is complete]

## Metrics

<!--
  How success criteria from spec.md will be measured.
-->

| Metric          | Target         | Measurement Method |
| --------------- | -------------- | ------------------ |
| [SC-001 metric] | [target value] | [how to measure]   |
| [SC-002 metric] | [target value] | [how to measure]   |

## Risks & Mitigations

<!--
  Technical risks and how to address them.
-->

| Risk               | Impact         | Mitigation            |
| ------------------ | -------------- | --------------------- |
| [Risk description] | [High/Med/Low] | [Mitigation approach] |

## File Structure

<!--
  Where new code will live. Use actual paths.
-->

```
src/
├── models/example.ts        # Data model
├── actions/example.ts       # Server actions
├── app/examples/
│   ├── page.tsx            # List page
│   └── [id]/page.tsx       # Detail page
└── components/
    └── examples/
        ├── ExampleList.tsx
        └── ExampleForm.tsx
```

## Dependencies

<!--
  New packages needed. Reference research.md for selection rationale.
-->

- `package-name` - [Purpose, see research.md for alternatives considered]
