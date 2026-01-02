# @tetrastack/threads

Universal thread and activity persistence layer for AI-powered applications.

## Overview

This package provides a unified schema and model layer for:

1. **Record Feeds**: Comments or activity logs attached to any entity
2. **Agent Workflows**: Structured logs of AI agents executing tasks (DAGs)
3. **Chat Interfaces**: Traditional conversational UIs (AI SDK compatible)

## Installation

```bash
npm install @tetrastack/threads
```

## Quick Start

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { createThreadModels } from '@tetrastack/threads/models';

// Create database connection
const sqlite = new Database(':memory:');
const db = drizzle(sqlite);

// Create models bound to your database
const models = createThreadModels(db);

// Create a thread scoped to a ticket
const [thread] = await models.threads.insert([
  {
    projectId: 'proj_123',
    scopeType: 'ticket',
    scopeId: 'T-101',
    title: 'Support Discussion',
  },
]);

// Append messages
await models.items.append({
  threadId: thread.id,
  role: 'user',
  parts: [{ type: 'text', text: 'Hello, I need help with billing.' }],
  requestId: 'req_abc',
});

await models.items.append({
  threadId: thread.id,
  role: 'assistant',
  parts: [
    { type: 'text', text: 'I can help with that! What is your account email?' },
  ],
  requestId: 'req_def',
});

// Get all messages
const messages = await models.items.listByThread(thread.id);
```

## Use Cases

### 1. Record Feeds (Comments/Activity)

Attach activity logs to any entity using polymorphic scoping:

```typescript
// Create thread for a document
const thread = await models.threads.getOrCreate(
  'proj_123',
  'document', // scopeType
  'doc_456', // scopeId
  'Document Comments',
);

// Add a comment
await models.items.append({
  threadId: thread.id,
  role: 'user',
  parts: [{ type: 'text', text: 'Great analysis! One suggestion...' }],
  requestId: 'req_123',
});

// Get visible comments only
const comments = await models.items.listVisible(thread.id);
```

### 2. Agent Workflows (DAGs)

Track complex agent executions with dependencies:

```typescript
// Create workflow thread
const [thread] = await models.threads.insert([
  {
    projectId: 'proj_123',
    scopeType: 'workflow',
    scopeId: 'wf_map_reduce',
    metadata: { workflowType: 'map-reduce' },
  },
]);

// Create mapper items
const mapper1 = await models.items.append({
  threadId: thread.id,
  role: 'assistant',
  parts: [{ type: 'text', text: 'Processing chunk 1...' }],
  spanId: 'span_mapper_1',
  requestId: 'req_m1',
});

const mapper2 = await models.items.append({
  threadId: thread.id,
  role: 'assistant',
  parts: [{ type: 'text', text: 'Processing chunk 2...' }],
  spanId: 'span_mapper_2',
  requestId: 'req_m2',
});

// Create reducer with dependencies
const reducer = await models.items.append({
  threadId: thread.id,
  role: 'assistant',
  parts: [{ type: 'text', text: 'Aggregating results...' }],
  spanId: 'span_reducer',
  requestId: 'req_r1',
});

// Add DAG edges
await models.edges.addDependency(thread.id, mapper1.id, reducer.id, 'req_r1');
await models.edges.addDependency(thread.id, mapper2.id, reducer.id, 'req_r1');

// Get DAG structure for visualization
const dag = await models.edges.getDAGStructure(thread.id);
// { nodes: ['mapper1', 'mapper2', 'reducer'], edges: [...] }

// Check if reducer can execute
const completedIds = new Set([mapper1.id, mapper2.id]);
const canRun = await models.edges.areDependenciesSatisfied(
  reducer.id,
  completedIds,
);
```

### 3. Chat Interfaces (AI SDK Compatible)

Build traditional chat UIs with streaming support:

```typescript
// Get or create chat thread
const thread = await models.threads.getOrCreate(
  'proj_123',
  'chat',
  'user_789',
  'Chat Session',
);

// Start streaming response
const stream = await models.streams.start(thread.id, 'run_123');

// Update snapshot during streaming
await models.streams.updateSnapshot(stream.id, {
  parts: [{ type: 'text', text: 'Processing' }],
});

await models.streams.updateSnapshot(stream.id, {
  parts: [{ type: 'text', text: 'Processing your request...' }],
});

// Complete the stream
await models.streams.complete(stream.id);

// Get messages for LLM context (excludes archived)
const context = await models.items.listForContext(thread.id);
```

## API Reference

### Thread Model

```typescript
const models = createThreadModels(db);

// Insert threads (many-first pattern)
const [thread] = await models.threads.insert([
  { projectId, scopeType, scopeId, title },
]);

// Find by polymorphic scope
const threads = await models.threads.findByScope(projectId, scopeType, scopeId);

// Get or create (idempotent)
const thread = await models.threads.getOrCreate(
  projectId,
  scopeType,
  scopeId,
  title,
);

// List by project
const threads = await models.threads.listByProject(projectId);

// Update metadata
await models.threads.updateThread(id, { title, metadata });
```

### Items Model

```typescript
// Append single item
const item = await models.items.append({ threadId, role, parts, requestId });

// Batch insert
const [item1, item2] = await models.items.insert([...]);

// List items (time-sorted via UUIDv7)
const items = await models.items.listByThread(threadId, 'asc');

// List by run or span
const runItems = await models.items.listByRun(threadId, runId);
const spanItems = await models.items.listBySpan(threadId, spanId);

// Visibility management
await models.items.setVisibility(id, 'hidden');
await models.items.archive(id);  // Remove from UI and LLM context
await models.items.hide(id);     // Hide from UI, keep in LLM context

// Filter by visibility
const visible = await models.items.listVisible(threadId);
const forLLM = await models.items.listForContext(threadId);
```

### Edges Model (DAG)

```typescript
// Add dependency edge
await models.edges.addDependency(threadId, fromItemId, toItemId, requestId);

// Get dependencies (items this item depends on)
const deps = await models.edges.getDependencies(toItemId);

// Get dependents (items that depend on this item)
const dependents = await models.edges.getDependents(fromItemId);

// Get DAG structure for visualization
const { nodes, edges } = await models.edges.getDAGStructure(threadId);

// Check if ready to execute
const ready = await models.edges.areDependenciesSatisfied(itemId, completedSet);
```

### Streams Model

```typescript
// Start a stream
const stream = await models.streams.start(threadId, runId, expiresInMs);

// Update snapshot during streaming
await models.streams.updateSnapshot(streamId, { parts, metadata }, lastEventId);

// Set resume token for reconnection
await models.streams.setResumeToken(streamId, resumeToken);

// Complete or abort
await models.streams.complete(streamId);
await models.streams.abort(streamId);

// Resume handling
const stream = await models.streams.getByResumeToken(token);
const canResume = await models.streams.canResume(streamId);

// Cleanup expired streams
const expiredCount = await models.streams.expireStale();
```

## Schema

### Tables

| Table     | Purpose                                         |
| --------- | ----------------------------------------------- |
| `threads` | Container for activity, polymorphically scoped  |
| `items`   | Append-only event log with AI SDK message parts |
| `edges`   | DAG dependencies for workflow execution         |
| `streams` | State for resumable streaming                   |

### Key Features

- **UUIDv7 IDs**: Time-sortable primary keys
- **Polymorphic Scoping**: `scopeType` + `scopeId` for flexible attachment
- **Visibility Control**: `visible`, `hidden`, `archived` states
- **DAG Support**: Edges table for complex workflow dependencies
- **Streaming State**: Resume tokens and snapshots for reconnection

## Custom Metadata

Use the factory pattern for type-safe custom metadata:

```typescript
import { createThreadTables } from '@tetrastack/threads/database/sqlite';

type ThreadMeta = { workflowType: string; priority: number };
type ItemMeta = { confidence: number; model: string };

const { threads, items, edges, streams } = createThreadTables<
  ThreadMeta,
  ItemMeta
>();
```

## Database Support

### SQLite

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import {
  threads,
  items,
  edges,
  streams,
} from '@tetrastack/threads/database/sqlite';

const db = drizzle(sqlite);
```

### PostgreSQL

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import {
  threads,
  items,
  edges,
  streams,
} from '@tetrastack/threads/database/postgres';

const db = drizzle(pool);
```

## Design Principles

### Many-First Pattern

All CRUD operations work with arrays by default:

```typescript
// Insert multiple
const [item1, item2] = await models.items.insert([data1, data2]);

// Single item uses destructuring
const [item] = await models.items.insert([data]);
```

### Database Agnostic

Models accept any Drizzle database instance, allowing host applications to:

- Use their own database connections
- Share connection pools
- Manage transactions externally

### AI SDK Compatible

Message parts follow the AI SDK v6 format for seamless integration:

```typescript
type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mediaType: string }
  | { type: 'file'; data: string; mediaType: string; filename: string }
  | {
      type: 'tool-invocation';
      toolInvocationId: string;
      toolName: string;
      args: unknown;
    }
  | { type: 'tool-result'; toolInvocationId: string; result: unknown };
```

## License

MIT
