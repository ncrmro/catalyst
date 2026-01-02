# @tetrastack/threads

> **Status:** Draft | **Scope:** Shared Package

## 1. Overview

This package provides a persistence layer for **Threads** - time-ordered sequences of events ("Items") that can be attached to any entity in a host application.

It supports three distinct use cases in a unified schema:

1. **Record Feeds:** Comments or activity logs attached to a Ticket, Deal, or Invoice.
2. **Agent Workflows:** Structured logs of AI agents executing tasks (DAGs, map-reduce).
3. **Chat Interfaces:** Traditional conversational UIs (supporting AI SDK's `useChat`).

## 2. Core Concepts

### 2.1 The Thread (Container)

A persistent context scoped to a specific "Project" and optionally attached to a "Parent Record" (e.g., a specific Ticket).

### 2.2 The Item (Event)

An immutable record within a thread. Items are typed events:

- **Human:** "Please update the status."
- **Agent:** "I am reasoning about step 2..." (Thoughts)
- **System:** "Workflow 'Approval' completed."
- **Tool:** "Executed `query_database` with params `{...}`."

### 2.3 Polymorphic Scope

Threads are loosely coupled to the host application via `scopeType` + `scopeId`. This allows a thread to belong to a `user_profile`, `ticket`, `document`, or exist independently.

---

## 3. Schema Design

Stack: **Drizzle ORM (SQLite/PostgreSQL)** + **UUIDv7** (Primary Keys & Sorting).

### 3.1 `threads`

_The container for activity._

| Column      | Type              | Notes                                     |
| ----------- | ----------------- | ----------------------------------------- |
| `id`        | text (PK, UUIDv7) | Time-sortable unique ID                   |
| `projectId` | text (FK)         | Tenant/Project isolation                  |
| `scopeType` | text (nullable)   | Discriminator (e.g., 'ticket', 'deal')    |
| `scopeId`   | text (nullable)   | The ID of the parent record               |
| `title`     | text (nullable)   | Summary or subject line                   |
| `metadata`  | text (JSON)       | Extensible context (tags, workflow state) |
| `createdAt` | integer (ts_ms)   |                                           |
| `updatedAt` | integer (ts_ms)   |                                           |

**Indexes:**

- `idx_threads_scope`: `(projectId, scopeType, scopeId)` — Fast lookup for "Show me the thread for Ticket #123"

### 3.2 `items`

_The append-only log of events._

| Column       | Type              | Notes                                           |
| ------------ | ----------------- | ----------------------------------------------- |
| `id`         | text (PK, UUIDv7) | **Serves as sequence.** Sort ASC to replay      |
| `threadId`   | text (FK)         | Links to `threads.id`                           |
| `role`       | text (enum)       | `user`, `assistant`, `system`, `tool`           |
| `parts`      | text (JSON)       | **The content.** Array of typed parts           |
| `runId`      | text (nullable)   | Groups items into a single Agent execution/turn |
| `spanId`     | text (nullable)   | Groups items into a specific DAG node           |
| `parentId`   | text (nullable)   | For threading within a thread (replies)         |
| `visibility` | text (enum)       | `visible`, `hidden`, `archived`                 |
| `attempt`    | integer           | Default 1. Used for retry logic                 |
| `requestId`  | text (not null)   | Traceability back to the HTTP request           |
| `createdAt`  | integer (ts_ms)   |                                                 |

**Indexes:**

- `idx_items_thread`: `(threadId, id)` — Primary query path
- `idx_items_run`: `(threadId, runId)` — Grouping by agent run
- `idx_items_span`: `(threadId, spanId)` — Grouping by DAG node

### 3.3 `edges` (DAG Support)

_Defines dependencies for complex agent workflows (Map-Reduce)._

| Column       | Type      | Notes                          |
| ------------ | --------- | ------------------------------ |
| `id`         | text (PK) |                                |
| `threadId`   | text (FK) | Links to `threads.id`          |
| `fromItemId` | text (FK) | The dependency (e.g., "Map A") |
| `toItemId`   | text (FK) | The dependent (e.g., "Reduce") |
| `type`       | text      | `depends_on`, `caused_by`      |
| `requestId`  | text      | Traceability                   |
| `createdAt`  | integer   |                                |

### 3.4 `streams` (Resumable Streaming)

_State for resumable streaming._

| Column        | Type              | Notes                            |
| ------------- | ----------------- | -------------------------------- |
| `id`          | text (PK, UUIDv7) |                                  |
| `threadId`    | text (FK)         | Links to `threads.id`            |
| `runId`       | text (nullable)   |                                  |
| `status`      | text (enum)       | `active`, `completed`, `aborted` |
| `resumeToken` | text (nullable)   |                                  |
| `lastEventId` | text (nullable)   |                                  |
| `snapshot`    | text (JSON)       | Current assistant message draft  |
| `expiresAt`   | integer (ts)      |                                  |
| `createdAt`   | integer (ts_ms)   |                                  |
| `updatedAt`   | integer (ts_ms)   |                                  |

---

## 4. Types & Data Contract

### 4.1 Message Parts (AI SDK Compatible)

```typescript
type TextPart = { type: 'text'; text: string };

type ImagePart = {
  type: 'image';
  image: string | Uint8Array; // Base64 or URL
  mimeType?: string;
};

type FilePart = {
  type: 'file';
  data: string; // URL or identifier
  mimeType: string;
  name?: string;
};

type ToolCallPart = {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: unknown;
};

type ToolResultPart = {
  type: 'tool-result';
  toolCallId: string;
  result: unknown;
  isError?: boolean;
};

type MessagePart =
  | TextPart
  | ImagePart
  | FilePart
  | ToolCallPart
  | ToolResultPart;
```

### 4.2 Enums

```typescript
const ROLES = {
  USER: 'user',
  ASSISTANT: 'assistant',
  SYSTEM: 'system',
  TOOL: 'tool',
} as const;

const VISIBILITY = {
  VISIBLE: 'visible',
  HIDDEN: 'hidden',
  ARCHIVED: 'archived',
} as const;

const EDGE_TYPES = {
  DEPENDS_ON: 'depends_on',
  CAUSED_BY: 'caused_by',
} as const;

const STREAM_STATUSES = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ABORTED: 'aborted',
  EXPIRED: 'expired',
} as const;
```

---

## 5. React Hooks (Future Phase)

### 5.1 `useThread` - Low-Level Access

For comment sections, activity feeds, or simple logging.

```typescript
import { useThread } from '@tetrastack/threads/hooks';

const {
  items, // ThreadItem[]
  append, // (text | parts) => Promise<void>
  status, // 'loading' | 'ready' | 'error'
  isSyncing, // boolean (background revalidation)
} = useThread({
  projectId: 'proj_123',
  scope: { type: 'ticket', id: 'T-101' },
  sort: 'asc',
});
```

**Key Features:**

- **Auto-Resolution:** Checks if thread exists for scope. If not, creates virtual empty thread locally.
- **Real-time (Optional):** Supports polling or SSE subscription.

### 5.2 `useChatThread` - AI SDK Compatible

A wrapper around Vercel AI SDK's `useChat` that adapts the thread schema.

```typescript
import { useChatThread } from '@tetrastack/threads/hooks';

const {
  messages, // Mapped to AI SDK UI format
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  reload, // Re-generate last assistant response
  runId, // Current active agent run ID
} = useChatThread({
  projectId: 'proj_123',
  scope: { type: 'deal', id: 'D-500' },
  api: '/api/universal-chat',
});
```

### 5.3 `useAgentThread` - DAG/Workflow

For visualizing Agent Runs (DAGs), specifically for "Glass" style interfaces.

```typescript
import { useAgentThread } from '@tetrastack/threads/hooks';

const {
  runs, // Array of Run Objects
  activeRun, // The currently executing run
  steps, // Flat list of items for the active run
  structure, // { nodes, edges } for DAG visualization
  trigger, // Function to start a new workflow run
} = useAgentThread({
  projectId: 'proj_123',
  scope: { type: 'report_generator', id: 'R-20' },
});

// structure.nodes = [{ id: 'span_1', label: 'Planner' }, ...]
// structure.edges = [{ from: 'span_1', to: 'span_2' }]
```

### 5.4 `ThreadsProvider`

Configuration context for all hooks.

```typescript
import { ThreadsProvider } from '@tetrastack/threads/hooks';

export function App() {
  return (
    <ThreadsProvider
      config={{
        baseUrl: '/api/threads',
        fetcher: async (url, init) => {
          const token = await getToken();
          return fetch(url, { ...init, headers: { Authorization: token } });
        }
      }}
    >
      <TicketPage />
    </ThreadsProvider>
  );
}
```

---

## 6. Model Layer (Many-First Pattern)

Following the codebase convention, all CRUD operations work with arrays:

```typescript
import { insertThreads, selectThreads } from '@tetrastack/threads/models';
import { insertItems, selectItems } from '@tetrastack/threads/models';

// Create threads
const [thread] = await insertThreads([
  {
    projectId: 'proj_123',
    scopeType: 'ticket',
    scopeId: 'T-101',
    title: 'Support Discussion',
  },
]);

// Append items
const [item] = await insertItems([
  {
    threadId: thread.id,
    role: 'user',
    parts: [{ type: 'text', text: 'Hello, I need help.' }],
    requestId: 'req_abc',
  },
]);

// Query items by thread
const items = await selectItems([eq(items.threadId, thread.id)]);
```

---

## 7. Workflow Examples

### Use Case A: User Comments on a Ticket

1. **Scope:** `scopeType='ticket'`, `scopeId='T-101'`
2. **User Action:** User types "This is critical."
3. **Data:**
   - `Thread`: Exists for T-101
   - `Item`: `role='user'`, `parts=[{text: "This is critical"}]`

### Use Case B: Agent Performing Background Work

1. **Scope:** `scopeType='system_task'`, `scopeId='TASK-55'`
2. **Agent Logic:** "I need to fetch data from Stripe."
3. **Data:**
   - `Item 1`: `role='assistant'`, `parts=[{text: "Querying Stripe..."}, {toolCall: 'stripe_get'}]`
   - `Item 2`: `role='tool'`, `parts=[{toolResult: {...JSON data...}}]`

4. **UI Rendering:** The UI sees these items. Since they are technical, the UI might collapse them into a "Processing..." indicator.

### Use Case C: Map-Reduce Workflow

1. **Initial Request:** Process 3 documents in parallel
2. **Fan-Out:**
   - Item 1: `spanId='mapper_1'`, "Processing doc A"
   - Item 2: `spanId='mapper_2'`, "Processing doc B"
   - Item 3: `spanId='mapper_3'`, "Processing doc C"
3. **Fan-In:**
   - Item 4: `spanId='reducer'`, "Combining results"
   - Edges: mapper_1→reducer, mapper_2→reducer, mapper_3→reducer

---

## 8. Package Exports

```typescript
// Main barrel
import { sqlite, postgres } from '@tetrastack/threads/database';
import { insertThreads, insertItems } from '@tetrastack/threads/models';
import { MessagePart, Role, Visibility } from '@tetrastack/threads/types';

// React (future)
import {
  useThread,
  useChatThread,
  ThreadsProvider,
} from '@tetrastack/threads/hooks';
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Current)

- Database schemas (SQLite + PostgreSQL)
- Type definitions
- Model layer with CRUD operations
- Documentation

### Phase 2: Testing

- Schema tests with in-memory SQLite
- Model integration tests

### Phase 3: React Hooks

- ThreadsProvider
- useThread, useChatThread, useAgentThread
- AI SDK adapter layer

---

## 10. Key Design Decisions

1. **UUIDv7 as sequence**: No separate sequence column; UUIDv7's time-ordering provides natural sequence
2. **Append-only items**: Items are immutable; updates create new items
3. **Polymorphic scope**: Threads attach to any entity via `scopeType` + `scopeId`
4. **Parts-based storage**: Native AI SDK compatibility with flexible message representation
5. **Visibility enum**: Allows hiding items from LLM context without deletion
6. **Edge table for DAGs**: Clean representation of workflow dependencies
7. **Many-first pattern**: All operations use arrays for consistency
