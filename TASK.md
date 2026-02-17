---
repo: ncrmro/catalyst
branch: stripe
agent: gemini
priority: 1
status: ready
created: 2026-02-16
---

# Move billing code into web/packages/billing/ workspace package

## Description

The `stripe` branch has billing code scattered in `web/src/` (stripe client, models, DB schema). The spec plan (`specs/011-billing/plan.md`) requires all billing code to live in `web/packages/billing/` as a separate workspace package so self-hosted deployments can exclude it entirely. This is Phase 1 (Tasks 1-3) of the billing spec.

Tech stack: Next.js 15, TypeScript, Drizzle ORM, npm workspaces. See `web/AGENTS.md` and `AGENTS.md` for full context. The existing `@catalyst/kubernetes-client` package at `web/packages/@catalyst/kubernetes-client/` is the reference pattern for internal packages.

### What needs to move

| From | To |
|------|-----|
| `web/src/lib/stripe.ts` | `web/packages/billing/src/stripe.ts` |
| `web/src/models/billing.ts` | `web/packages/billing/src/models.ts` |
| `web/src/db/schema/billing.ts` | `web/packages/billing/src/db/schema.ts` |

### Key design decisions

1. **Constants**: Extract `FREE_TIER_LIMITS`, `BILLING_METERS`, `PRICING` from stripe.ts into `constants.ts`
2. **Schema FK references**: The billing schema references core `teams` table. Use a minimal FK-only table definition within the billing package (just `pgTable("teams", { id: text("id").primaryKey() })`) to avoid coupling
3. **Dependency injection for db**: The billing models currently import `db` from `@/db`. Refactor to accept `db` as a parameter to billing functions instead
4. **Logging**: The stripe client uses `createLogger` from `@/lib/logging`. Replace with simple console-based logging within the package (no dependency on app internals)
5. **Package naming**: `@catalyst/billing` following the `@catalyst/kubernetes-client` pattern
6. **Stripe dependency**: Move `stripe` from `web/package.json` to `packages/billing/package.json`. `drizzle-orm` is a peer dependency
7. **Billing guard**: Create `web/src/lib/billing-guard.ts` that dynamically imports `@catalyst/billing` only when `BILLING_ENABLED=true`
8. **Drizzle config**: Update `web/drizzle.config.ts` to conditionally include billing schema when `BILLING_ENABLED=true`

## Acceptance Criteria

- [x] `web/packages/billing/package.json` exists with name `@catalyst/billing`, stripe dependency, drizzle-orm peer dep
- [x] `web/packages/billing/tsconfig.json` matches kubernetes-client pattern (ESNext, bundler resolution)
- [x] `web/packages/billing/src/index.ts` re-exports the public API
- [x] `web/packages/billing/src/constants.ts` has FREE_TIER_LIMITS, BILLING_METERS, PRICING
- [x] `web/packages/billing/src/stripe.ts` has Stripe client and helper functions (no app internal imports)
- [x] `web/packages/billing/src/models.ts` has billing DB operations accepting `db` parameter
- [x] `web/packages/billing/src/db/schema.ts` has billing tables with minimal teams FK reference
- [x] `web/src/lib/stripe.ts` is deleted
- [x] `web/src/models/billing.ts` is deleted
- [x] `web/src/db/schema/billing.ts` is deleted
- [x] `export * from "./schema/billing"` removed from `web/src/db/schema.ts`
- [x] `stripe` dependency removed from root `web/package.json`
- [x] `web/src/lib/billing-guard.ts` created with dynamic import guard
- [x] `web/drizzle.config.ts` conditionally includes billing schema
- [x] `cd web && npm install` succeeds (workspace resolves)
- [x] `npm run typecheck` passes
- [x] No `stripe` imports remain in `web/src/` (only in `packages/billing/`)
