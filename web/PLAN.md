# Implementation Plan: Spec Chat Thread Persistence

## Goal

Implement persistent chat threads for spec detail pages using `@tetrastack/threads` package, replacing the current local state implementation.

## Context

- **Spec**: 009-projects (US-10: Chat with Spec-Aware Agent)
- **Current State**: SpecAgentChat.tsx uses local `useState` for messages
- **Target**: Persist chat history per spec using polymorphic threads (scopeType='spec', scopeId=specSlug)

## Completed Tasks

- [x] T107: Add threads schema to `web/src/db/schema.ts`
- [x] T108: Generate and run database migration (`drizzle/0017_overconfident_bloodscream.sql`)

## In Progress

- [ ] T109-T111: Create spec-chat server actions in `web/src/actions/spec-chat.ts`
  - `getOrCreateSpecThread(projectId, specSlug)` - idempotent thread creation
  - `appendMessage(threadId, role, parts)` - add message to thread
  - `listThreadMessages(threadId)` - retrieve thread history

## Pending Tasks

- [ ] T112-T114: Replace local state in SpecAgentChat with thread persistence
  - Load existing messages on mount
  - Save messages on send
  - Integrate AI SDK useChat hook with thread backend

- [ ] T115: Inject spec context as system message
  - Read spec.md, plan.md content
  - Format as system context for AI

## Technical Details

### Database Schema (from migration)

```sql
-- threads: polymorphic container for conversations
CREATE TABLE "threads" (
  "id" uuid PRIMARY KEY,
  "project_id" uuid NOT NULL,
  "scope_type" text,      -- 'spec'
  "scope_id" text,        -- spec slug (e.g., '009-projects')
  "title" text,
  "metadata" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- items: messages within threads
CREATE TABLE "items" (
  "id" uuid PRIMARY KEY,
  "thread_id" uuid NOT NULL,
  "role" text DEFAULT 'user',
  "parts" jsonb DEFAULT '[]',  -- AI SDK compatible message parts
  "visibility" text DEFAULT 'visible',
  "created_at" timestamp DEFAULT now()
);
```

### Server Action Pattern

Following existing patterns in `web/src/actions/`:

- Use `"use server"` directive
- Import db from `@/db`
- Use threads models from `@tetrastack/threads`
- Return typed results

### Files to Modify

1. **Create**: `web/src/actions/spec-chat.ts` - server actions
2. **Modify**: `web/src/app/(dashboard)/specs/[...slug]/_components/SpecAgentChat.tsx` - use thread persistence
3. **Create**: `web/src/app/api/chat/spec/route.ts` - AI chat endpoint (optional, may use server actions)

## References

- Threads package: `packages/@tetrastack/threads/`
- Existing chat component: `web/src/app/(dashboard)/specs/[...slug]/_components/SpecAgentChat.tsx`
- Tasks file: `specs/009-projects/tasks.md` (Phase 9)
