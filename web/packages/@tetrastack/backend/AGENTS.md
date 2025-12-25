# AI Agent Context: @tetrastack/backend

This file provides architectural context and guidelines for AI agents working on the `@tetrastack/backend` package.

## Core Mandates

1.  **Type Safety**: Strict TypeScript usage. All database schemas and API responses must be typed.
2.  **Drizzle ORM**: Use `drizzle-orm` for all database interactions. Do not write raw SQL unless absolutely necessary.
3.  **NextAuth v5**: Follow NextAuth v5 (Beta) patterns. This is distinct from v4.

## Authentication Architecture

### Key Insight: Server-Side Direct Invocation

When implementing custom authentication flows (e.g., login pages, registration forms), **NEVER** use client-side REST calls to the auth API routes (e.g., `fetch('/api/auth/signin')`).

**Correct Pattern:**
Use Next.js **Server Actions** to import and call the `signIn` function directly from the server-side code.

**Why?**
The `signIn` function exported by `@tetrastack/backend/auth` (from `NextAuth(...)`) is designed to be called in a server context. It handles headers, cookies, and redirects natively within the Server Action flow.

**Code Example Pattern:**

```typescript
// Correct Approach
import { signIn } from "@tetrastack/backend/auth";

// Inside a React Component
<form
  action={async (formData) => {
    "use server";
    await signIn("credentials", formData);
  }}
>
```

**Anti-Pattern (DO NOT USE):**

```typescript
// Incorrect Approach
const handleSubmit = async (e) => {
  e.preventDefault();
  // DO NOT DO THIS
  await fetch('/api/auth/signin/credentials', {
    method: 'POST',
    body: JSON.stringify(...)
  });
}
```

## Database Schema

- **Location**: `src/database/schema/`
- **Conventions**:
  - Tables: `snake_case` (e.g., `verification_tokens`).
  - IDs: UUIDv7 via `src/utils/uuidv7.ts`.
  - Timestamps: `createdAt` and `updatedAt` on all entities.

## Package Structure

- `src/auth`: NextAuth configuration factory, providers, and callbacks.
- `src/database`: Drizzle schema definitions (must be imported by consumer).
- `src/uploads`: Cloudflare R2 interaction logic (presigned URLs).
- `src/utils`: Shared helpers (UUIDv7, slugify).

## Development

- Run `pnpm dev` in the root to start the local `libSQL` server alongside the app.
- Ensure environment variables (`DATABASE_URL`, `AUTH_SECRET`, `R2_*`) are set in `.env.local` of the consumer app.
