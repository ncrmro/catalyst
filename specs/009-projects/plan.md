# Implementation Plan: Projects Management

**Branch**: `009-projects` | **Date**: 2025-12-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/009-projects/spec.md`

## Summary

| Phase | Tasks     | User Story             | Priority | Notes                          |
| ----- | --------- | ---------------------- | -------- | ------------------------------ |
| 1     | T001-T004 | Setup                  | -        | Minimal schema (slug only)     |
| 2     | T005-T014 | US1: Manage Specs      | P1       | File-based, VCS API            |
| 3     | T015-T024 | US2: View PRs          | P1       | PRs + preview env links        |
| 4     | T025-T034 | US3: CI Checks         | P1       | GitHub Checks API integration  |
| 5     | T035-T044 | US4-6: Polish          | P2       | Context, branch mgmt, settings |
| 6     | T045-T059 | US7: Categorized Work  | P1       | Feature vs Platform tasks      |
| 7     | T060-T074 | US8: Adopt Spec-Driven | P2       | Bootstrap, distill, annotate   |
| 8     | T075-T089 | US9: Manage Spec Work  | P2       | PR graph, review priority, Q&A |

**Total Tasks**: ~89
**MVP Scope**: Phases 1-4, 6 (US1 + US2 + US3 + US7)
**Key Principle**: VCS-First - fetch data from GitHub, don't sync to database

## Design Decisions

### VCS-First Architecture

**Decision**: Read PRs, specs, and CI checks directly from GitHub API instead of syncing to database tables.

**Rationale**:

- Simpler implementation (no sync logic, no stale data)
- Always up-to-date data
- Less database complexity
- Faster to ship MVP

**Trade-offs**:

- API rate limits (mitigate with caching)
- No offline access to VCS data
- Slower page loads for large repos (mitigate with pagination)

### File-Based Spec Management

**Decision**: Specs are read/written as files in the repo's `specs/` folder, not indexed in database.

**Rationale**:

- Specs are source-controlled with the code
- Uses existing spec-kit patterns
- No sync complexity
- Works with any git workflow

**Implementation**:

- Read: Fetch directory listing + file contents via GitHub API
- Write: Create commits/PRs via GitHub API

### Tokenized Spec Matching (FR-022)

**Decision**: Match PRs/issues/branches to specs using tokenized spec name matching.

**Rationale**:

- Spec names follow pattern `###-slug-words` (e.g., `009-projects`, `001-auth-system`)
- PRs/issues often reference specs with partial matches (`009`, `projects`, `auth`)
- Tokenized matching catches more valid associations than exact substring matching

**Algorithm**:

1. Split spec directory name on `-` to get tokens: `001-foo-bar` → `["001", "foo", "bar"]`
2. For each PR/issue/branch, check if title/name contains ANY token (case-insensitive)
3. If match found, associate item with that spec
4. Handle conflicts: if item matches multiple specs, prefer longer token matches

**Implementation** (`src/lib/pr-spec-matching.ts`, `src/lib/issue-spec-matching.ts`):

```typescript
function tokenizeSpecName(specName: string): string[] {
  return specName.split("-").filter((token) => token.length > 0);
}

function matchItemToSpec(itemTitle: string, specs: Spec[]): Spec | undefined {
  const titleLower = itemTitle.toLowerCase();

  for (const spec of specs) {
    const tokens = tokenizeSpecName(spec.name);
    for (const token of tokens) {
      if (titleLower.includes(token.toLowerCase())) {
        return spec;
      }
    }
  }
  return undefined;
}
```

**Edge Cases**:

- Single-digit tokens (e.g., `1`) may cause false positives - filter tokens shorter than 2 chars
- Common words (e.g., `the`, `add`) - rely on spec number prefix to disambiguate
- Multiple matches - first matching spec wins (specs processed in order)

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 15 (App Router)
**Primary Dependencies**: Next.js 15, NextAuth.js, Drizzle ORM, Octokit
**Storage**: PostgreSQL with Drizzle ORM (minimal extensions)
**Testing**: Vitest (unit/integration), Playwright (E2E)
**Target Platform**: Linux server (Docker/Kubernetes deployment)

## Project Structure

### Source Code

```text
web/
├── src/
│   ├── db/
│   │   └── schema.ts                    # Add slug to projects (if needed)
│   ├── models/
│   │   └── projects.ts                  # Existing - minimal changes
│   ├── actions/
│   │   ├── projects.ts                  # Existing project actions
│   │   ├── specs.ts                     # NEW: Spec file operations
│   │   ├── work-items.ts                # NEW: PR listing from VCS
│   │   └── ci-checks.ts                 # NEW: CI status from VCS
│   ├── lib/
│   │   ├── vcs/
│   │   │   ├── types.ts                 # VCS provider interfaces
│   │   │   ├── github.ts                # GitHub API adapter
│   │   │   └── specs.ts                 # Spec file operations
│   │   └── types/
│   │       ├── specs.ts                 # SpecFile, SpecContent types
│   │       └── ci-checks.ts             # StatusCheck types
│   └── app/
│       └── projects/
│           └── [slug]/
│               ├── page.tsx             # Project overview
│               ├── specs/
│               │   ├── page.tsx         # Spec list
│               │   └── [specId]/
│               │       └── page.tsx     # Spec detail/edit
│               ├── work/
│               │   └── page.tsx         # PR list
│               └── prs/
│                   └── [number]/
│                       └── page.tsx     # PR detail with CI checks
├── __tests__/
│   ├── unit/
│   │   └── lib/
│   │       └── vcs/
│   │           ├── github.test.ts
│   │           └── specs.test.ts
│   └── integration/
│       └── actions/
│           ├── specs.test.ts
│           └── work-items.test.ts
```

## Phase Details

### Phase 1: Setup (Minimal)

**Goal**: Ensure projects table has slug field for URL routing.

**Tasks**:

- Check if slug already exists in schema
- Add migration if needed
- Backfill existing projects with generated slugs

**No new tables** - just ensure slug works.

### Phase 2: US1 - Manage Specs (P1)

**Goal**: Users can view and manage specs stored in their repository.

**Implementation**:

1. **VCS Adapter** (`src/lib/vcs/specs.ts`):
   - `listSpecs(owner, repo)`: List folders in `specs/` directory
   - `getSpecContent(owner, repo, path)`: Read file content
   - `updateSpecContent(owner, repo, path, content, message)`: Commit file update
   - `createSpec(owner, repo, name, content)`: Create new spec folder with initial files

2. **Server Actions** (`src/actions/specs.ts`):
   - `getProjectSpecs(projectId)`: Get specs list for project
   - `getSpecContent(projectId, specPath)`: Get spec file content
   - `updateSpec(projectId, specPath, content)`: Update spec file
   - `createSpec(projectId, name)`: Create new spec

3. **UI Pages**:
   - `/projects/[slug]/specs`: Spec list with folders
   - `/projects/[slug]/specs/[specId]`: Spec detail with markdown rendering
   - Edit mode with form to update content

### Phase 3: US2 - View PRs (P1)

**Goal**: Users can see open PRs with links to preview environments.

**Implementation**:

1. **VCS Adapter** (`src/lib/vcs/github.ts`):
   - `listPullRequests(owner, repo, state)`: Get PRs from GitHub
   - Enrich with preview environment data from `pullRequestPods` table

2. **Server Actions** (`src/actions/work-items.ts`):
   - `getProjectPullRequests(projectId)`: Get PRs with preview env links
   - `getPullRequest(projectId, number)`: Get single PR detail

3. **UI Pages**:
   - `/projects/[slug]/work`: PR list showing open PRs
   - Each PR shows: title, author, preview URL (if available), status

### Phase 4: US3 - CI Checks (P1)

**Goal**: Developers can see CI check status for PRs.

**Implementation**:

1. **VCS Adapter** (`src/lib/vcs/github.ts`):
   - `getCheckRuns(owner, repo, ref)`: GitHub Checks API
   - `getCommitStatuses(owner, repo, ref)`: Commit Statuses API
   - `normalizeStatusChecks()`: Unify both into StatusCheck type

2. **Server Actions** (`src/actions/ci-checks.ts`):
   - `getCIStatus(projectId, prNumber)`: Get unified CI status for PR

3. **UI Components**:
   - `CIStatusBadge`: Pass/fail/pending indicator
   - `CIChecksList`: Detailed check list with links to logs

4. **Integration**:
   - Add CI status to PR detail page
   - Add CI status summary to PR list

### Phase 5: US4-6 - Polish (P2)

**Goal**: Enhanced PR context, branch management, project settings.

**Implementation**:

1. **PR Context Display**:
   - Show PR description (markdown rendered)
   - Link to related issues/specs if mentioned
   - Show commits list

2. **Branch Management**:
   - "Update Branch" action (merge main into PR)
   - Show commits behind count
   - Indicate merge-ready status

3. **Project Settings**:
   - View/edit project name
   - View linked repository
   - View team ownership

### Phase 6: US7 - Categorized Work Items (P1)

**Goal**: Display PRs and branches categorized into Feature Tasks and Platform Tasks.

**Implementation**: See tasks.md for detailed breakdown (T045-T059).

### Phase 7: US8 - Adopt Spec-Driven Development (P2)

**Goal**: Users can bootstrap and adopt spec-driven development through a dedicated workflow UI.

**Implementation**:

1. **Spec Workflow UI** (`src/app/(dashboard)/projects/[slug]/specs/workflow/`):
   - Dedicated page for spec operations (bootstrap, create, amend)
   - Agent chat interface for interactive spec creation
   - Preview of generated content before committing

2. **Bootstrap Specs Action** (`src/actions/spec-workflow.ts`):
   - `bootstrapSpecs(projectId)`: Analyze repo, generate `specs/AGENTS.md` + templates
   - Uses VCS API to read README, existing docs, code structure
   - Creates PR with proposed spec structure

3. **Distill Spec from Code** (`src/actions/spec-workflow.ts`):
   - `distillSpec(projectId, description, filePaths)`: Read code, generate spec.md
   - Agent analyzes code patterns, extracts user stories
   - Returns draft spec for user review

4. **Create/Amend Spec** (`src/actions/spec-workflow.ts`):
   - `createSpec(projectId, name, description)`: Generate new spec from description
   - `amendSpec(projectId, specPath, changes)`: Update existing spec
   - Both create PRs with changes

5. **Code Annotations** (`src/actions/spec-workflow.ts`):
   - `addCodeAnnotations(projectId, specPath)`: Identify code implementing FRs
   - Generate comments like `// FR-001: implements user authentication`
   - Create PR with annotation changes

**Agent Integration**:

- MCP tools for all spec workflow operations
- Agent can be invoked from UI or programmatically

### Phase 8: US9 - Manage Spec Implementation Work (P2)

**Goal**: Users can manage spec implementation through organized PRs with dependency visualization.

**Implementation**:

1. **Spec Implementation Dashboard** (`src/app/(dashboard)/projects/[slug]/specs/[specId]/implementation/`):
   - Overview of spec implementation progress
   - Task list with PR boundaries
   - PR dependency graph visualization

2. **Task-to-PR Mapping** (`src/lib/spec-implementation.ts`):
   - `suggestPRBoundaries(tasks)`: Analyze tasks.md, suggest small PR groupings
   - `identifyParallelWork(tasks)`: Find tasks marked [P] for concurrent work
   - Returns structured PR plan

3. **PR Dependency Graph** (`src/components/specs/PRDependencyGraph.tsx`):
   - Visual graph showing PR relationships
   - Nodes: PRs (open, merged, draft)
   - Edges: blocking relationships
   - Highlights merge order

4. **Review Priority** (`src/lib/review-priority.ts`):
   - `prioritizeReviews(prs)`: Sort PRs by review urgency
   - Priority order: blocking others > ready for review > changes requested > draft
   - Display priority badges in UI

5. **Spec Clarification Q&A** (`src/actions/spec-clarification.ts`):
   - `askSpecQuestion(projectId, specPath, question)`: Submit clarification question
   - Agent answers from spec context or flags for human
   - `recordClarification(specPath, question, answer)`: Track Q&A, suggest amendments

**UI Components**:

- `PRDependencyGraph`: Interactive graph visualization (consider react-flow or d3)
- `ReviewPriorityList`: Ordered list with priority badges
- `SpecQAPanel`: Chat-like interface for clarification questions

## Dependencies

### External APIs

- **GitHub REST API**: PRs, files, checks, statuses
- **GitHub GraphQL API**: Optional for richer PR queries

### Existing Infrastructure

- **VCS Provider Auth**: GitHub OAuth tokens (existing)
- **Preview Environments**: `pullRequestPods` table (existing)
- **Teams**: Team ownership (existing)

## Caching Strategy

To avoid GitHub API rate limits:

1. **Short TTL Cache** (30s-60s): PR list, CI status
2. **Longer TTL Cache** (5min): Spec file content
3. **Invalidation**: Webhook-triggered for push/PR events
4. **Implementation**: Next.js data cache or Redis if needed

## Success Metrics

From spec.md:

- **SC-001**: Project setup in under 2 minutes
- **SC-002**: PR list displays within 3 seconds
- **SC-003**: CI status accurate, updates within 30 seconds
- **SC-004**: Specs readable from any repo with `specs/` folder
- **SC-005**: Bootstrap spec-driven development within 5 minutes
- **SC-006**: Agent-generated specs follow templates with valid user stories
- **SC-007**: PR dependency graph accurately reflects blocking relationships

## Risk Mitigation

| Risk                   | Mitigation                                  |
| ---------------------- | ------------------------------------------- |
| GitHub API rate limits | Caching, pagination, user's token (5000/hr) |
| Large spec files       | Lazy loading, pagination                    |
| Slow GitHub API        | Loading states, optimistic UI               |
| Missing preview env    | Graceful degradation, show "not deployed"   |

## MVP Checkpoint

After completing Phases 1-4, validate:

1. [ ] Can view specs from a project repository
2. [ ] Can create/edit a spec file
3. [ ] Can see open PRs with preview environment links
4. [ ] Can see CI check status for a PR
5. [ ] Page loads meet performance criteria (<3s)

If all pass, MVP is complete. Phase 5 can be shipped incrementally.
