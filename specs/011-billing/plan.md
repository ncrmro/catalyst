# Implementation Plan: Usage-Based Billing

**Spec**: `011-billing`
**Updated**: 2026-02-16

## Architecture Overview

### High-Level Design

Billing is an **optional workspace package** at `web/packages/billing/` that the main web app conditionally loads when `BILLING_ENABLED=true`. Self-hosted deployments skip the package entirely — no Stripe SDK in the bundle, no billing tables, no limit enforcement.

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Web Application                              │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Core (always loaded)                                          │  │
│  │                                                                │  │
│  │  src/actions/environments.ts  ── calls ──▶  billingGuard()    │  │
│  │  src/models/environments.ts                                    │  │
│  │  src/app/(dashboard)/...                                       │  │
│  └─────────────────────────────────────────────┬──────────────────┘  │
│                                                │                     │
│                            BILLING_ENABLED?    │                     │
│                              ┌─────────────────┘                     │
│                        yes ──┘                                       │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  packages/billing/ (optional, dynamically imported)            │  │
│  │                                                                │  │
│  │  src/stripe.ts          Stripe client + helpers                │  │
│  │  src/models.ts          DB operations (customers, subs, usage) │  │
│  │  src/limits.ts          Free tier enforcement logic            │  │
│  │  src/webhooks.ts        Stripe webhook handler                 │  │
│  │  src/usage-job.ts       Daily usage recording + reporting      │  │
│  │  src/db/schema.ts       Drizzle schema (billing tables)        │  │
│  │  src/db/migrations/     Billing-only migrations                │  │
│  │  src/components/        Billing UI (settings, banners)         │  │
│  │  src/actions.ts         Server actions for billing UI          │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      External Services                               │
│  ┌─────────────────┐    ┌─────────────────┐                          │
│  │     Stripe       │    │  GitHub Actions │                          │
│  │  Billing Meters  │    │  Daily Cron     │                          │
│  │  Checkout/Portal │    │  Usage Job      │                          │
│  └─────────────────┘    └─────────────────┘                          │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

- **`packages/billing/`**: Owns all Stripe integration, billing DB schema, limit enforcement, billing UI, and usage recording. Has its own `package.json` with `stripe` dependency.
- **Core web app**: Calls into billing via a thin guard function (`billingGuard()`) that returns `{ allowed: true }` when billing is disabled (no-op) or delegates to the billing package when enabled. Core code never directly imports `stripe` or billing internals.
- **`billingGuard()` pattern**: A function in `src/lib/billing-guard.ts` that uses `dynamic import()` to load the billing package only when `BILLING_ENABLED=true`. Returns a no-op/allow-all response when disabled.

### Integration Points

- **Environment creation** (`src/actions/environments.ts`): Before creating, calls `billingGuard().canCreateEnvironment(teamId)` — returns `true` when billing disabled.
- **Dashboard layout** (`src/app/(dashboard)/layout.tsx`): Conditionally renders billing nav item and upgrade banner.
- **API routes**: Billing routes (`/api/stripe/webhook`, `/api/jobs/record-usage`) only registered when billing is enabled.
- **DB migrations**: Billing migrations run separately from core migrations, only when `BILLING_ENABLED=true`.

## Technology Stack

### Stripe SDK
**Chosen**: `stripe` npm package in `packages/billing/package.json`
**Rationale**: Already in use. Keeping it in the billing package means self-hosted builds exclude it entirely.

### Dynamic Import Pattern
**Chosen**: `await import("@catalyst/billing")` with `BILLING_ENABLED` check
**Rationale**: Next.js tree-shakes unused dynamic imports. When `BILLING_ENABLED` is false, the billing package code is never loaded or bundled for the client.

### Database Migrations
**Chosen**: Separate Drizzle migration directory in `packages/billing/src/db/migrations/`
**Rationale**: Billing tables don't exist in self-hosted deployments. Core `drizzle.config.ts` conditionally includes billing schema when enabled. No FK from core → billing.

## File Structure

### New Files (packages/billing/)

```
web/packages/billing/
├── package.json              — @catalyst/billing workspace package
├── tsconfig.json             — TypeScript config extending root
├── src/
│   ├── index.ts              — Public API: exports guard-compatible interface
│   ├── stripe.ts             — Stripe client singleton + helpers (from src/lib/stripe.ts)
│   ├── models.ts             — DB operations (from src/models/billing.ts)
│   ├── limits.ts             — canCreateEnvironment(), getTeamUsage()
│   ├── webhooks.ts           — Stripe webhook event handler
│   ├── usage-job.ts          — Daily usage recording + Stripe reporting
│   ├── actions.ts            — Server actions: checkout, portal, status
│   ├── constants.ts          — FREE_TIER_LIMITS, BILLING_METERS, PRICING
│   ├── db/
│   │   └── schema.ts         — Drizzle schema (from src/db/schema/billing.ts)
│   └── components/
│       ├── BillingSettings.tsx   — Full billing settings page content
│       ├── UpgradeBanner.tsx     — Limit-approaching/reached banner
│       └── UsageIndicator.tsx    — "2/3 environments used" display
```

### New Files (core web app)

```
web/src/lib/billing-guard.ts       — Thin guard: dynamic import or no-op
web/src/app/api/stripe/webhook/route.ts    — Delegates to billing package
web/src/app/api/jobs/record-usage/route.ts — Delegates to billing package
web/src/app/(dashboard)/settings/billing/page.tsx — Conditionally renders billing UI
```

### Modified Files

- `web/package.json` — Add `@catalyst/billing` workspace dependency (already has `packages/*` in workspaces)
- `web/src/actions/environments.ts` — Add `billingGuard().canCreateEnvironment()` check before environment creation
- `web/src/app/(dashboard)/layout.tsx` — Conditionally show billing nav item
- `web/drizzle.config.ts` — Conditionally include billing schema when `BILLING_ENABLED=true`

### Deleted Files (migrated to package)

- `web/src/lib/stripe.ts` → `packages/billing/src/stripe.ts`
- `web/src/models/billing.ts` → `packages/billing/src/models.ts`
- `web/src/db/schema/billing.ts` → `packages/billing/src/db/schema.ts`

## Implementation Strategy

### Phase 1: Package Scaffold + Migration

Create the `@catalyst/billing` workspace package and migrate existing billing code from `src/` into it. No new features — just reorganization.

1. Create `web/packages/billing/package.json` with `stripe` dependency
2. Move `src/lib/stripe.ts` → `packages/billing/src/stripe.ts`
3. Move `src/models/billing.ts` → `packages/billing/src/models.ts`
4. Move `src/db/schema/billing.ts` → `packages/billing/src/db/schema.ts`
5. Create `packages/billing/src/index.ts` with public API
6. Create `src/lib/billing-guard.ts` with dynamic import + no-op fallback
7. Update imports in any existing consumers
8. Verify `npm run build` works with and without `BILLING_ENABLED`

### Phase 2: Free Tier Enforcement (US-2)

Wire the billing guard into environment creation.

1. Create `packages/billing/src/limits.ts` with `canCreateEnvironment()`
2. Add `billingGuard().canCreateEnvironment()` call to `src/actions/environments.ts`
3. Create `packages/billing/src/components/UpgradeBanner.tsx`
4. Create `packages/billing/src/components/UsageIndicator.tsx`
5. Test: billing disabled → unlimited environments, billing enabled → limits enforced

### Phase 3: Checkout + Portal (US-1)

Implement the upgrade flow.

1. Create `packages/billing/src/actions.ts` with checkout/portal server actions
2. Create `web/src/app/(dashboard)/settings/billing/page.tsx`
3. Create `packages/billing/src/components/BillingSettings.tsx`
4. Wire upgrade CTA from UpgradeBanner to checkout flow

### Phase 4: Webhook Handler (US-5)

Handle Stripe subscription lifecycle events.

1. Create `packages/billing/src/webhooks.ts`
2. Create `web/src/app/api/stripe/webhook/route.ts` delegating to package
3. Handle: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`

### Phase 5: Usage Recording + Visibility (US-3, US-4)

Automated metering and billing page usage display.

1. Create `packages/billing/src/usage-job.ts`
2. Create `web/src/app/api/jobs/record-usage/route.ts`
3. Create `.github/workflows/billing-usage.yml` cron job
4. Add usage display to BillingSettings component

## Data Model

Schema lives in `packages/billing/src/db/schema.ts`. Tables identical to current design:

- **stripe_customers**: `team_id` (unique) → `stripe_customer_id`
- **stripe_subscriptions**: `team_id` → subscription state. Partial unique index for one active sub per team.
- **usage_records**: `(team_id, usage_date)` unique. Daily snapshots with `reported_to_stripe` flag.

**Critical constraint**: No foreign keys FROM core tables TO billing tables. The billing schema references `teams(id)` via FK, but never the reverse. Core DB works without billing tables existing.

## API Design

### Billing Guard Interface

```typescript
// src/lib/billing-guard.ts
export interface BillingGuard {
  canCreateEnvironment(teamId: string): Promise<{ allowed: boolean; reason?: string }>;
  isBillingEnabled(): boolean;
}

export async function getBillingGuard(): Promise<BillingGuard> {
  if (process.env.BILLING_ENABLED !== "true") {
    return {
      canCreateEnvironment: async () => ({ allowed: true }),
      isBillingEnabled: () => false,
    };
  }
  const billing = await import("@catalyst/billing");
  return billing.createBillingGuard();
}
```

### API Routes

- `POST /api/stripe/webhook` — Stripe webhook receiver (billing package handles)
- `POST /api/jobs/record-usage` — Daily usage cron endpoint (auth via bearer token)

## Security Considerations

- **FR-BILL-012 (webhook verification)**: `constructWebhookEvent()` in billing package verifies Stripe signatures
- **Usage job auth**: Bearer token via `JOBS_SECRET` env var, checked in route handler
- **Team admin check**: Billing actions verify caller is team admin/owner before proceeding
- **No client exposure**: Stripe secret key only in server-side billing package code
- **Self-hosted**: Zero attack surface from billing — no Stripe SDK, no webhook endpoints, no billing env vars expected

## Performance Strategy

- **SC-004 (usage job <5min)**: Batch query all teams with subscriptions, bulk insert usage records, batch Stripe meter events
- **Dynamic import**: Billing package loaded on first use, not at app startup. Zero overhead for non-billing requests.
- **Bundle size**: Self-hosted builds exclude `stripe` dependency entirely (~500KB saved)

## Testing Strategy

### Unit Tests (packages/billing/)
- Limit calculation logic (free tier math)
- Usage recording idempotency
- Billing guard no-op behavior when disabled
- Webhook event parsing and subscription state transitions

### Integration Tests (packages/billing/)
- Database operations: customer/subscription CRUD, usage record upsert
- Stripe API calls with mocked Stripe client
- Full usage job execution against test DB

### E2E Tests
- Happy path: hit limit → see banner → checkout → can create more (billing enabled)
- Self-hosted path: create unlimited environments with no billing UI visible

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Dynamic import adds latency to first billing call | Minor UX delay on first billing page load | Pre-warm in dashboard layout if billing enabled |
| Billing migration breaks existing schema | Data loss for existing billing tables | Migration script preserves data, just moves ownership |
| Tree-shaking doesn't fully exclude billing | Stripe SDK in self-hosted bundle | Verify with bundle analyzer in CI |
| Drizzle doesn't support conditional schema loading | Build failures when billing disabled | Separate drizzle config per mode, tested in CI |

## Related Documents

- Spec: `spec.md`
- Research: `../../research/github-marketplace-billing/README.md` (Marketplace not viable)
