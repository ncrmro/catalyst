"use server";

import { auth } from "@/auth";
import { fetchProjectById } from "@/actions/projects";
import { readFile, listDirectory } from "@/actions/version-control-provider";
import { updateFile, createPullRequest } from "@/actions/vcs";
import { revalidatePath } from "next/cache";

export interface SpecAnalysisProposal {
  projectId: string;
  projectSlug: string;
  existingSpecs: boolean;
  proposedFiles: {
    path: string;
    description: string;
  }[];
  projectType: string;
}

// Hardcoded templates (read from specs/.templates/ in this repo)
const TEMPLATES = {
  "AGENTS.md": `# Specification Process

Specs define features through user stories, keeping development focused on user value. Each spec lives in a numbered directory and serves as documentation for agents and developers.

## Directory Structure

\`\`\`
specs/
├── AGENTS.md              # This file
├── .templates/            # Template files
│   ├── spec.md
│   ├── plan.md
│   ├── quickstart.md
│   ├── tasks.md
│   └── research.md
└── ###-spec-slug/         # Individual specs
    ├── spec.md
    ├── plan.md
    ├── quickstart.md
    ├── tasks.md
    └── research*.md
\`\`\`

## Spec Folder Contents

| File            | Purpose                                                                                 |
| --------------- | --------------------------------------------------------------------------------------- |
| 
spec.md
       | User stories, functional requirements, success criteria. **No implementation details.** |
| 
plan.md
       | Technical approach, code examples, data models, spike work.                             |
| 
quickstart.md
       | How to start developing the spec.                                                       |
| 
tasks.md
      | Phased task breakdown. UI mocks before backend.                                         |
| 
research*.md
  | Library comparisons, method evaluations. Keeps other docs terse.                        |

## Workflow

1. **spec.md** - Define user stories (P1/P2/P3), requirements (FR-###), success criteria (SC-###)
2. **plan.md** - Design implementation: schema, actions, components, spikes
3. **quickstart.md** - Document how to start developing
4. **tasks.md** - Break down into phases, UI-first approach

## Conventional Commits

Use the spec slug as the commit scope:

\`\`\`
spec(user-auth): initial commit
spec(user-auth): add password reset user story
feat(user-auth): implement login form
fix(user-auth): handle session timeout
\`\`\`

## Success Metrics

Every spec should define measurable success criteria:

\`\`\`markdown
## Success Criteria

- **SC-001**: Users complete signup in < 2 minutes
- **SC-002**: Page load time < 500ms on 3G
- **SC-003**: Error rate < 0.1%
\`\`\`

Metrics are measured as defined in 
plan.md
.

## Quick Reference

### User Story Format

\`\`\`markdown
### US-1: [Title] (P1)

[User journey description]

**Acceptance Criteria**:

1. **Given** [state], **When** [action], **Then** [outcome]
\`\`\`

### Task Format

\`\`\`markdown
- [ ] T001 [P] [US-1] Description with file path
\`\`\`

- 
[P]
 = parallelizable (no dependencies)
- 
[US-1]
 = links to user story

### Creating a New Spec

\`\`\`bash
mkdir specs/001-feature-name
cp specs/.templates/* specs/001-feature-name/
\`\`\`

## Registering Specs

Specs must be referenced in the root 
AGENTS.md
 so agents are aware of active features without users needing to explain context.

Add to the "Active Specs" section in root AGENTS.md:

\`\`\`markdown
### Active Specs

- [001-user-auth](specs/001-user-auth/) - User authentication and sessions
- [002-team-invites](specs/002-team-invites/) - Team invitation system
\`\`\`

## Templates

Full templates with detailed guidance:

- [spec.md](.templates/spec.md) - User stories & requirements
- [plan.md](.templates/plan.md) - Implementation details
- [quickstart.md](.templates/quickstart.md) - Developer onboarding
- [tasks.md](.templates/tasks.md) - Phased task breakdown
- [research.md](.templates/research.md) - Library/method research

Based on [GitHub spec-kit](https://github.com/github/spec-kit/tree/main/templates).
`,
  "spec.md": `# Feature Specification: [FEATURE NAME]

**Spec**: 
###-feature-slug
**Created**: [DATE]
**Status**: Draft | In Review | Approved

<!--
  This specification defines WHAT the feature does, not HOW it's implemented.
  Keep implementation details in plan.md.
  Keep research/library comparisons in research*.md files.
-->

## User Stories

<!--
  Start with user stories to maintain focus on user value.
  Each story should be independently testable and deliver standalone MVP value.
  Prioritize: P1 = critical/MVP, P2 = important, P3 = nice-to-have
-->

### US-1: [Brief Title] (P1)

[Describe this user journey in plain language]

**Why P1**: [Value delivered and why it's critical for MVP]

**Acceptance Criteria**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]
2. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### US-2: [Brief Title] (P2)

[Describe this user journey in plain language]

**Why P2**: [Value delivered and priority justification]

**Acceptance Criteria**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

### US-3: [Brief Title] (P3)

[Describe this user journey in plain language]

**Why P3**: [Value delivered and priority justification]

**Acceptance Criteria**:

1. **Given** [initial state], **When** [action], **Then** [expected outcome]

---

## Functional Requirements

<!--
  Specific capabilities the system MUST provide.
  Use unique IDs for traceability in tasks.md.
  Mark unclear items: [NEEDS CLARIFICATION: reason]
-->

- **FR-001**: System MUST [specific capability]
- **FR-002**: System MUST [specific capability]
- **FR-003**: Users MUST be able to [key interaction]
- **FR-004**: System MUST [data requirement]

## Key Entities

<!--
  Define core data entities without implementation details.
  Schema/types go in plan.md.
-->

- **[Entity1]**: [What it represents, key attributes]
- **[Entity2]**: [What it represents, relationships]

## Edge Cases

<!--
  Boundary conditions and error scenarios to handle.
-->

- What happens when [boundary condition]?
- How does system handle [error scenario]?
- What if [unusual user behavior]?

## Success Criteria

<!--
  Measurable outcomes to validate the spec is complete.
  These drive the metrics defined in plan.md.
-->

- **SC-001**: [Measurable metric, e.g., "Users can complete task in < 2 minutes"]
- **SC-002**: [Performance metric, e.g., "Page loads in < 500ms"]
- **SC-003**: [Business metric, e.g., "Reduce support tickets by 50%"]

## Out of Scope

<!--
  Explicitly list what this spec does NOT cover to prevent scope creep.
-->

- [Feature/behavior explicitly excluded]
- [Related functionality for future specs]

## Open Questions

<!--
  Unresolved decisions that need stakeholder input.
  Remove this section once all questions are resolved.
-->

- [ ] [Question needing resolution]
- [ ] [Question needing resolution]
`,
  "plan.md": `# Implementation Plan: [FEATURE NAME]

**Spec**: 
###-feature-slug
**Branch**: 
###-feature-slug
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

\`\`\`typescript
// Example: Drizzle schema
export const exampleTable = pgTable('examples', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
\`\`\`

## API/Actions

<!--
  Server actions or API endpoints required.
  Include input/output types.
-->

\`\`\`typescript
// Example: Server action signature
export async function createExample(
  input: CreateExampleInput,
): Promise<Result<Example, CreateExampleError>> {
  // Implementation details...
}
\`\`\`

## UI Components

<!--
  Key components needed. Reference existing components to reuse.
-->

- 
`ExampleList`
 - Displays list of examples
- 
`ExampleForm`
 - Create/edit form (extends existing 
Form
 component)

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

\`\`\`
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
\`\`\`

## Dependencies

<!--
  New packages needed. Reference research.md for selection rationale.
-->

- 
`package-name`
 - [Purpose, see research.md for alternatives considered]
`,
  "tasks.md": `# Tasks: [FEATURE NAME]

**Spec**: 
###-feature-slug
**Prerequisites**: spec.md, plan.md

<!--
  Phased task breakdown for implementation.

  FORMAT: [ID] [P?] [US#] Description
  - [P] = Can run in parallel (different files, no dependencies)
  - [US#] = User story reference from spec.md

  UI-FIRST APPROACH: Mock UI components in Storybook with fixture data
  before implementing backend. This validates UX early.
-->

## Phase 0: Spike (if needed)

<!--
  Proof-of-concept work to validate risky/unknown functionality.
  Skip this phase if no spikes defined in plan.md.
-->

- [ ] T001 [Spike] Validate [specific uncertainty] per plan.md

---

## Phase 1: Setup

**Goal**: Project structure and dependencies ready

- [ ] T002 Add new dependencies to package.json
- [ ] T003 [P] Create database migrations
- [ ] T004 [P] Create model file structure

**Checkpoint**: 
`npm run typecheck`
 passes

---

## Phase 2: UI Mocks (Storybook)

<!--
  Build UI components with fixture data before backend exists.
  Uses schema types from plan.md for type-safe fixtures.
-->

**Goal**: All UI components viewable in Storybook

- [ ] T005 [P] [US-1] Create ExampleList component with fixtures
- [ ] T006 [P] [US-1] Create ExampleForm component with fixtures
- [ ] T007 [P] [US-2] Create ExampleDetail component with fixtures
- [ ] T008 Add Storybook stories for all components

**Checkpoint**: UI review complete, UX validated

---

## Phase 3: User Story 1 - [Title] (P1)

**Goal**: [What this story delivers - from spec.md]

### Backend

- [ ] T009 [US-1] Implement model layer in src/models/
- [ ] T010 [US-1] Implement server actions in src/actions/
- [ ] T011 [US-1] Add input validation with Zod

### Integration

- [ ] T012 [US-1] Connect UI components to server actions
- [ ] T013 [US-1] Add error handling and loading states

### Tests

- [ ] T014 [P] [US-1] Unit tests for model layer
- [ ] T015 [P] [US-1] Integration tests for server actions
- [ ] T016 [US-1] E2E test for happy path

**Checkpoint**: US-1 independently testable and deployable

---

## Phase 4: User Story 2 - [Title] (P2)

**Goal**: [What this story delivers - from spec.md]

### Backend

- [ ] T017 [US-2] Implement additional model methods
- [ ] T018 [US-2] Implement server actions

### Integration

- [ ] T019 [US-2] Connect UI components to server actions
- [ ] T020 [US-2] Integrate with US-1 components (if needed)

### Tests

- [ ] T021 [P] [US-2] Unit tests
- [ ] T022 [P] [US-2] Integration tests

**Checkpoint**: US-1 + US-2 both work independently

---

## Phase 5: User Story 3 - [Title] (P3)

**Goal**: [What this story delivers - from spec.md]

- [ ] T023 [US-3] Implement backend
- [ ] T024 [US-3] Connect UI
- [ ] T025 [P] [US-3] Tests

**Checkpoint**: All user stories complete

---

## Phase N: Polish

**Goal**: Cross-cutting improvements

- [ ] T026 [P] Performance optimization
- [ ] T027 [P] Accessibility audit
- [ ] T028 Verify success metrics from spec.md
- [ ] T029 Update quickstart.md with final instructions

---

## Dependencies

\`\`\`
Phase 0 (Spike) ─► Phase 1 (Setup) ─► Phase 2 (UI Mocks)
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    ▼                       ▼                       ▼
              Phase 3 (US-1)          Phase 4 (US-2)          Phase 5 (US-3)
                    │                       │                       │
                    └───────────────────────┴───────────────────────┘
                                            │
                                            ▼
                                      Phase N (Polish)
\`\`\`

## Parallel Opportunities

- All [P] tasks within a phase can run simultaneously
- After Phase 2, user story phases can proceed in parallel
- Different developers can own different user stories
`,
  "quickstart.md": `# Quickstart: [FEATURE NAME]

**Spec**: 
###-feature-slug

<!--
  How to quickly get started developing this spec.
  Written after plan.md, before tasks.md.
-->

## Prerequisites

- [ ] Node.js 20+
- [ ] Docker (for database)
- [ ] [Other requirements]

## Setup

\`\`\`bash
# 1. Start dependencies
make up

# 2. Install packages (if new deps added)
npm install

# 3. Run migrations (if schema changes)
npm run db:migrate

# 4. Seed test data (if applicable)
npm run db:seed
\`\`\`

## Development

\`\`\`bash
# Start dev server
npm run dev

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck
\`\`\`

## Key Files

<!--
  Files developers should read to understand context.
-->

| File                        | Purpose                |
| --------------------------- | ---------------------- |
| 
src/models/example.ts
     | Data model definitions |
| 
src/actions/example.ts
    | Server actions         |
| 
src/app/examples/page.tsx
 | Main UI entry point    |

## Testing This Feature

### Manual Testing

1. Navigate to 
/examples
2. [Step-by-step testing instructions]
3. Verify [expected behavior]

### Automated Tests

\`\`\`bash
# Run feature-specific tests
npm run test -- --grep "example"

# Run E2E tests
npm run test:e2e -- examples.spec.ts
\`\`\`

## Common Issues

<!--
  Known gotchas and how to resolve them.
-->

### [Issue Name]

**Symptom**: [What you'll see]

**Solution**: [How to fix]

## Related Docs

- [spec.md](./spec.md) - Feature specification
- [plan.md](./plan.md) - Implementation details
- [tasks.md](./tasks.md) - Task breakdown
`,
  "research.md": `# Research: [TOPIC]

**Spec**: 
###-feature-slug
**Date**: [DATE]

<!--
  Research documentation for libraries, methods, or approaches.
  Create multiple research files if needed: research-auth.md, research-db.md, etc.
  Keep spec.md and plan.md terse by moving detailed comparisons here.
-->

## Context

[What problem/decision this research addresses]

## Options Evaluated

### Option 1: [Name]

**URL**: [link]

**Pros**:

- [Benefit]
- [Benefit]

**Cons**:

- [Drawback]
- [Drawback]

**Example**:

\`\`\`typescript
// Code example showing usage
\`\`\`

---

### Option 2: [Name]

**URL**: [link]

**Pros**:

- [Benefit]

**Cons**:

- [Drawback]

**Example**:

\`\`\`typescript
// Code example showing usage
\`\`\`

---

### Option 3: [Name]

**URL**: [link]

**Pros**:

- [Benefit]

**Cons**:

- [Drawback]

---

## Comparison Matrix

| Criteria           | Option 1 | Option 2 | Option 3 |
| ------------------ | -------- | -------- | -------- |
| Bundle size        | [value]  | [value]  | [value]  |
| TypeScript support | [value]  | [value]  | [value]  |
| Maintenance        | [value]  | [value]  | [value]  |
| Community          | [value]  | [value]  | [value]  |

## Recommendation

**Chosen**: Option [X]

**Rationale**: [Why this option was selected over others]

## References

- [Link to docs]
- [Link to comparison article]
- [Link to benchmark]
`
};

export async function analyzeRepoForSpecs(projectId: string): Promise<SpecAnalysisProposal> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const project = await fetchProjectById(projectId);
  if (!project) throw new Error("Project not found");

  const repo = project.repositories[0]?.repo;
  if (!repo) throw new Error("Repository not found");

  const [owner, repoName] = repo.fullName.split("/");

  // Check if specs folder exists
  const specsDir = await listDirectory(repo.fullName, "specs");
  const existingSpecs = specsDir.success && specsDir.entries.length > 0;

  // Check for project type indicators
  let projectType = "Unknown";
  const packageJson = await readFile(repo.fullName, "package.json");
  const goMod = await readFile(repo.fullName, "go.mod");
  
  if (packageJson.success) {
    projectType = "Node.js/JavaScript";
    // Could check for next, react, etc.
  } else if (goMod.success) {
    projectType = "Go";
  }

  // Propose files
  const proposedFiles = [
    {
      path: "specs/AGENTS.md",
      description: "Root spec index and documentation for agents"
    },
    {
      path: "specs/.templates/spec.md",
      description: "Feature specification template"
    },
    {
      path: "specs/.templates/plan.md",
      description: "Implementation plan template"
    },
    {
      path: "specs/.templates/tasks.md",
      description: "Task breakdown template"
    },
    {
      path: "specs/.templates/quickstart.md",
      description: "Developer onboarding template"
    },
    {
      path: "specs/.templates/research.md",
      description: "Research documentation template"
    }
  ];

  return {
    projectId,
    projectSlug: project.slug,
    existingSpecs,
    proposedFiles,
    projectType
  };
}

export async function bootstrapSpecs(
  projectId: string,
): Promise<{ success: boolean; prUrl?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const project = await fetchProjectById(projectId);
  if (!project) return { success: false, error: "Project not found" };

  const repo = project.repositories[0]?.repo;
  if (!repo) return { success: false, error: "Repository not found" };

  const [owner, repoName] = repo.fullName.split("/");
  const branchName = "chore/bootstrap-specs";

  try {
    // 1. Create AGENTS.md
    await updateFile({
      owner,
      repo: repoName,
      path: "specs/AGENTS.md",
      content: TEMPLATES["AGENTS.md"],
      message: "docs: add specs/AGENTS.md",
      branch: branchName,
    });

    // 2. Create templates
    const templates = [
      { name: "spec.md", content: TEMPLATES["spec.md"] },
      { name: "plan.md", content: TEMPLATES["plan.md"] },
      { name: "tasks.md", content: TEMPLATES["tasks.md"] },
      { name: "quickstart.md", content: TEMPLATES["quickstart.md"] },
      { name: "research.md", content: TEMPLATES["research.md"] },
    ];

    for (const tmpl of templates) {
      await updateFile({
        owner,
        repo: repoName,
        path: `specs/.templates/${tmpl.name}`,
        content: tmpl.content,
        message: `docs: add specs template ${tmpl.name}`,
        branch: branchName,
      });
    }

    // 3. Create PR
    const pr = await createPullRequest({
      owner,
      repo: repoName,
      title: "chore: bootstrap spec-driven development",
      head: branchName,
      base: "main", // Default to main for now
      body: "This PR sets up the directory structure and templates for Spec-Driven Development.\n\nSee 
specs/AGENTS.md
 for details on the workflow.",
    });

    revalidatePath(`/projects/${project.slug}/specs/workflow`);

    return { success: true, prUrl: pr.htmlUrl };
  } catch (error) {
    console.error("Error bootstrapping specs:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

export async function distillSpec(
  projectId: string,
  description: string,
  filePaths: string[]
): Promise<{ success: boolean; specContent?: string; error?: string }> {
  // TODO: Implement Agent integration for code analysis
  console.log("Distilling spec for project", projectId, description, filePaths);
  
  // Mock response for now
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return {
    success: true,
    specContent: `# Distilled Spec: ${description}\n\n## User Stories\n\nBased on analysis of ${filePaths.length} files...`
  };
}
