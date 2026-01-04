# Implementation Plan: Agents

**Branch**: `007-agents` | **Date**: 2025-01-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-agents/spec.md`

## Summary

Implement multiple synchronized interfaces for human-agent collaboration: Web chat, TUI, MCP server, and VCS ChatOps. The core capability is project-context agent chat with VCS integration, enabling users to query project status, create issues, comment on PRs/MRs, and orchestrate external AI agents (Copilot, GitLab Duo) through a unified interface.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 15 (App Router)
**Primary Dependencies**:

- `@tetrastack/threads` - Chat/activity persistence layer
- `@tetrastack/react-agent-chat` - React chat UI components
- `@catalyst/vcs-provider` - VCS abstraction (GitHub, GitLab, Gitea, Forgejo)
- AI SDK v6 (`ai`, `@ai-sdk/react`) - LLM integration
- Anthropic Claude API - Agent backend

**Storage**: PostgreSQL with Drizzle ORM (threads stored via `@tetrastack/threads` schema)
**Testing**: Vitest (unit/integration), Playwright (e2e)
**Target Platform**: Web (Next.js), CLI (Node.js TUI)
**Project Type**: Web application with shared packages
**Performance Goals**: < 5s for VCS queries, < 2s for spec-grouped view, streaming chat responses
**Constraints**: VCS API rate limits, token refresh handling, multi-provider parity
**Scale/Scope**: Support projects with up to 100 specs, multiple VCS providers per user

## Project Structure

### Documentation (this feature)

```text
specs/007-user-agent-interfaces/
├── spec.md              # Feature specification
├── plan.md              # This file
├── quickstart.md        # Developer onboarding (TBD)
└── tasks.md             # Phased task breakdown (TBD)
```

### Source Code

```text
web/
├── packages/
│   ├── @tetrastack/threads/           # Chat persistence (existing)
│   │   └── src/
│   │       ├── models/                 # Thread, Item, Stream, Edge
│   │       ├── database/schema/        # SQLite/PostgreSQL schemas
│   │       └── types/                  # MessagePart, enums, identifiers
│   │
│   ├── @tetrastack/react-agent-chat/  # Chat UI components (existing)
│   │   └── src/
│   │       ├── components/             # ChatContainer, MessageList, etc.
│   │       ├── hooks/                  # useAgentChat, useClarifyingQuestions
│   │       └── types/                  # ToolInvocation, ClarifyingQuestion
│   │
│   └── @catalyst/vcs-provider/        # VCS abstraction (existing)
│       └── src/
│           ├── providers/github/       # GitHub implementation
│           ├── types.ts                # VCSProvider interface
│           └── provider-registry.ts    # Provider factory
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/                   # Chat API endpoint (NEW)
│   │   │   │   └── route.ts
│   │   │   └── mcp/                    # MCP server (existing, extend)
│   │   │
│   │   └── (dashboard)/
│   │       └── projects/
│   │           └── [projectId]/
│   │               ├── page.tsx        # Spec-grouped task view (MODIFY)
│   │               ├── chat/           # Project chat page (NEW)
│   │               │   └── page.tsx
│   │               └── specs/
│   │                   └── [specSlug]/
│   │                       ├── page.tsx      # Spec detail (MODIFY)
│   │                       └── chat/         # Spec-context chat (NEW)
│   │                           └── page.tsx
│   │
│   ├── components/
│   │   └── agent-chat/                 # Catalyst-specific chat components (NEW)
│   │       ├── ProjectChatProvider.tsx
│   │       ├── SpecChatProvider.tsx
│   │       └── ExpandableAgentChat.tsx
│   │
│   ├── models/
│   │   ├── threads.ts                  # Thread model integration (NEW)
│   │   └── spec-context.ts             # SpecContext loading (NEW)
│   │
│   ├── actions/
│   │   ├── chat.ts                     # Chat server actions (NEW)
│   │   └── specs.ts                    # Spec actions (MODIFY)
│   │
│   └── agents/
│       └── project-agent/              # Project-aware agent (NEW)
│           ├── tools/
│           │   ├── vcs-tools.ts        # create_issue, comment_pr, etc.
│           │   ├── spec-tools.ts       # get_spec_status, list_tasks
│           │   └── copilot-tools.ts    # assign_to_copilot, mention_copilot
│           └── index.ts
│
└── __tests__/
    ├── e2e/
    │   └── agent-chat.spec.ts          # E2E chat tests (NEW)
    └── integration/
        └── chat-api.test.ts            # API integration tests (NEW)
```

## Entity Mapping

### Package Entities → Catalyst Usage

| Package Entity   | Catalyst Usage         | Scope Configuration                                                    |
| ---------------- | ---------------------- | ---------------------------------------------------------------------- |
| `Thread`         | Chat session container | `scopeType: "project"` or `"spec"`, `scopeId: projectId` or `specSlug` |
| `Item`           | Chat messages          | `role: user/assistant/system/tool`, `parts[]` for content              |
| `Stream`         | Resumable streaming    | Used for long agent responses                                          |
| `Edge`           | Workflow dependencies  | For complex multi-step agent tasks                                     |
| `ToolInvocation` | Agent tool calls       | VCS operations, spec queries                                           |
| `VCSProvider`    | Repository operations  | Per-project provider configuration                                     |
| `PullRequest`    | PR/MR data             | Normalized from GitHub/GitLab/etc.                                     |
| `Issue`          | Issue data             | Normalized from VCS providers                                          |
| `WebhookEvent`   | ChatOps triggers       | @mention parsing, assignment events                                    |

### Catalyst-Specific Entities

```typescript
// SpecContext - Loaded spec documents for agent context
interface SpecContext {
  specSlug: string;
  projectId: string;
  documents: {
    spec?: string; // spec.md content
    plan?: string; // plan.md content
    tasks?: ParsedTasks; // Parsed tasks.md
  };
  relatedWork: {
    pullRequests: PullRequest[];
    issues: Issue[];
    branches: Branch[];
  };
}

// ExternalAgentTask - Delegated work tracking (Document Type)
// Schema defined in web/src/schemas/documents/external-agent-task.ts
interface ExternalAgentTaskContent {
  externalAgent: "copilot" | "gitlab-duo" | string;
  issueId: string;
  issueNumber: number;
  status: "pending" | "assigned" | "in_progress" | "completed" | "failed";
  resultPrNumber?: number;
  error?: string;
  specSlug?: string;
}
```

## Agent Tools Design

### VCS Tools (via `@catalyst/vcs-provider`)

```typescript
// Tools exposed to the agent
const vcsTools = {
  list_issues: {
    description: "List issues from the project's repository",
    parameters: { state?: "open" | "closed" | "all", labels?: string[] },
    execute: async (params, ctx) => {
      const provider = await getVCSClient(ctx.userId, ctx.project.providerId);
      return provider.listIssues(ctx.project.repoFullName, params);
    }
  },

  create_issue: {
    description: "Create a new issue in the repository",
    parameters: { title: string, body?: string, labels?: string[], assignees?: string[] },
    execute: async (params, ctx) => {
      const provider = await getVCSClient(ctx.userId, ctx.project.providerId);
      // Auto-add spec label if in spec context
      if (ctx.specSlug) {
        params.labels = [...(params.labels || []), `spec:${ctx.specSlug}`];
      }
      return provider.createIssue(ctx.project.repoFullName, params);
    }
  },

  comment_on_pr: {
    description: "Post a comment on a pull request",
    parameters: { prNumber: number, body: string },
    execute: async (params, ctx) => {
      const provider = await getVCSClient(ctx.userId, ctx.project.providerId);
      return provider.createPRComment(ctx.project.repoFullName, params.prNumber, params.body);
    }
  },

  assign_to_copilot: {
    description: "Assign an issue to GitHub Copilot for automated implementation",
    parameters: { issueNumber: number },
    execute: async (params, ctx) => {
      // GitHub-specific - uses Copilot assignment API
      if (ctx.project.providerId !== "github") {
        throw new Error("Copilot assignment only available for GitHub repositories");
      }
      return assignCopilotToIssue(ctx.project.repoFullName, params.issueNumber);
    }
  },

  mention_external_agent: {
    description: "Mention an external AI agent in a comment to trigger action",
    parameters: { issueOrPrNumber: number, agent: string, instructions: string, type: "issue" | "pr" },
    execute: async (params, ctx) => {
      const agentMention = getAgentMention(ctx.project.providerId, params.agent);
      const body = `${agentMention} ${params.instructions}`;
      // ... post comment
    }
  }
};
```

### Spec Tools

```typescript
const specTools = {
  get_spec_status: {
    description: "Get the current status of a spec including PRs, issues, and task completion",
    parameters: { specSlug?: string }, // Optional - uses context if in spec chat
    execute: async (params, ctx) => {
      const slug = params.specSlug || ctx.specSlug;
      const specContext = await loadSpecContext(ctx.projectId, slug);
      return formatSpecStatus(specContext);
    }
  },

  list_remaining_tasks: {
    description: "List uncompleted tasks from the spec's tasks.md",
    parameters: { specSlug?: string },
    execute: async (params, ctx) => {
      const slug = params.specSlug || ctx.specSlug;
      const tasks = await parseTasksMd(ctx.projectId, slug);
      return tasks.filter(t => !t.completed);
    }
  },

  get_spec_blockers: {
    description: "Identify blockers for a spec (failing CI, stalled reviews, dependencies)",
    parameters: { specSlug?: string },
    execute: async (params, ctx) => {
      const slug = params.specSlug || ctx.specSlug;
      return analyzeSpecBlockers(ctx.projectId, slug);
    }
  }
};
```

## Chat API Design

### Endpoint: `POST /api/chat`

```typescript
// Request body
interface ChatRequest {
  threadId?: string; // Existing thread or create new
  projectId: string;
  specSlug?: string; // For spec-context chat
  message: string;
}

// Response: Streaming AI SDK response with tool calls
```

### Thread Scoping

```typescript
// Project-level chat
const thread = await threads.getOrCreate({
  projectId,
  scopeType: "project",
  scopeId: projectId,
});

// Spec-level chat
const thread = await threads.getOrCreate({
  projectId,
  scopeType: "spec",
  scopeId: `${projectId}:${specSlug}`,
});
```

## UI Components

### ExpandableAgentChat

Reusable chat component that can be embedded in project/spec pages:

```tsx
<ExpandableAgentChat
  projectId={projectId}
  specSlug={specSlug} // Optional - for spec context
  initialExpanded={false}
  position="bottom-right"
/>
```

### Spec-Grouped Task View

Project page modification to group PRs/issues by spec:

```tsx
// Group issues/PRs by spec label
const groupedBySpec = useMemo(() => {
  return groupTasksBySpec(pullRequests, issues, specs);
}, [pullRequests, issues, specs]);

// Render with agent button per spec
{
  specs.map((spec) => (
    <SpecSection key={spec.slug} spec={spec} tasks={groupedBySpec[spec.slug]}>
      <AgentButton href={`/projects/${projectId}/specs/${spec.slug}/chat`} />
    </SpecSection>
  ));
}
```

## Database Schema Extensions

### threads table (via `@tetrastack/threads`)

Already defined in package - no changes needed. Uses:

- `scopeType` = "project" | "spec"
- `scopeId` = projectId or `${projectId}:${specSlug}`

### external-agent-task (Document Type)

Instead of a separate SQL table, we use the `@tetrastack/documents` system.

- **Registry**: Registered in `web/src/schemas/documents/registry.ts`
- **Schema**: Defined in `web/src/schemas/documents/external-agent-task.ts`
- **Storage**: Stored in `documents` table with `type_id` corresponding to `external-agent-task`
- **Scoping**: `project_id` column in `documents` table used for project scoping

## Implementation Phases

### Phase 1: Core Chat Infrastructure (P1 User Story)

1. Integrate `@tetrastack/threads` with Catalyst database
2. Create `/api/chat` endpoint with basic agent
3. Implement VCS tools (list_issues, create_issue, comment_on_pr)
4. Build ProjectChatProvider component
5. Add chat page at `/projects/[projectId]/chat`

### Phase 2: Spec-Grouped View (P2 User Story)

1. Add spec label parsing for issues/PRs
2. Implement groupTasksBySpec utility
3. Modify project page to show grouped view
4. Add Agent button to each spec section

### Phase 3: Spec-Context Chat (P3 User Story)

1. Implement SpecContext loading (spec.md, plan.md, tasks.md)
2. Add spec tools (get_spec_status, list_remaining_tasks)
3. Build SpecChatProvider with pre-loaded context
4. Add chat page at `/projects/[projectId]/specs/[specSlug]/chat`

### Phase 4: External Agent Orchestration (P4 User Story)

1. Implement assign_to_copilot tool (GitHub API)
2. Add mention_external_agent tool
3. Register external-agent-task document type and tracking
4. Build UI for monitoring delegated work

### Phase 5: TUI Interface (P5 User Story)

1. Create `catalyst chat` CLI command
2. Implement OIDC authentication flow for CLI
3. Build terminal UI with same API backend

### Phase 6: VCS ChatOps (P6 User Story)

1. Extend webhook handler for @mention events
2. Implement ChatOps command parser
3. Add response posting back to VCS
