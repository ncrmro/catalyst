# Usage-Based Billing Tasks

## Overview

**Total Tasks**: 12
**Phases**: 6
**Parallelizable**: 5

## Task Dependency Graph

```
[1] → [2] → [3] ─┬→ [4] → [5] ──→ [12]
                  ├→ [6] [P]         ↑
                  ├→ [7] [P] → [8]   │
                  ├→ [9] [P] ────────┤
                  └→ [10] [P] ───────┘
                       ↑
               [11] [P] (needs [7])
```

## Phase 1: Package Scaffold + Migration

### Task 1: Create @catalyst/billing workspace package [Infrastructure]

**Type**: Infrastructure
**Dependencies**: None

**Description:**
Create the `web/packages/billing/` directory with `package.json`, `tsconfig.json`, and a minimal `src/index.ts` that exports the public API interface. Add `stripe` as a dependency. Verify the workspace is recognized by npm.

**Files to Create:**
- `web/packages/billing/package.json` — Workspace package with `stripe` dep, name `@catalyst/billing`
- `web/packages/billing/tsconfig.json` — TypeScript config extending root
- `web/packages/billing/src/index.ts` — Public API stub (exports `createBillingGuard`)
- `web/packages/billing/src/constants.ts` — FREE_TIER_LIMITS, BILLING_METERS, PRICING constants

**Acceptance Criteria:**
- [ ] `npm install` succeeds from `web/` root
- [ ] `@catalyst/billing` resolves in Node
- [ ] Constants are importable from `@catalyst/billing`

**Validation:**
Run `cd web && npm install && node -e "require.resolve('@catalyst/billing')"`

---

### Task 2: Migrate existing billing code to package [Infrastructure]

**Type**: Backend
**Dependencies**: Task 1

**Description:**
Move `src/lib/stripe.ts` → `packages/billing/src/stripe.ts`, `src/models/billing.ts` → `packages/billing/src/models.ts`, `src/db/schema/billing.ts` → `packages/billing/src/db/schema.ts`. Update all internal imports. Delete the original files. Re-export from `src/index.ts`.

**Files to Modify:**
- `web/packages/billing/src/stripe.ts` — Moved from `src/lib/stripe.ts`
- `web/packages/billing/src/models.ts` — Moved from `src/models/billing.ts`
- `web/packages/billing/src/db/schema.ts` — Moved from `src/db/schema/billing.ts`
- `web/packages/billing/src/index.ts` — Re-export public API
- `web/src/db/schema.ts` — Remove billing schema import (conditional on BILLING_ENABLED)

**Files to Delete:**
- `web/src/lib/stripe.ts`
- `web/src/models/billing.ts`
- `web/src/db/schema/billing.ts`

**Acceptance Criteria:**
- [ ] No `stripe` imports exist in `web/src/` (only in `packages/billing/`)
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds

**Validation:**
Run `cd web && npm run typecheck && npm run build`

---

### Task 3: Create billing guard with dynamic import [US-2] [Infrastructure]

**Type**: Backend
**Dependencies**: Task 2

**Description:**
Create `src/lib/billing-guard.ts` with the `BillingGuard` interface and `getBillingGuard()` function. When `BILLING_ENABLED !== "true"`, returns a no-op guard that allows everything. When enabled, dynamically imports `@catalyst/billing` and returns a real guard. Update `drizzle.config.ts` to conditionally include billing schema.

**Files to Create:**
- `web/src/lib/billing-guard.ts` — Guard interface + dynamic import logic

**Files to Modify:**
- `web/drizzle.config.ts` — Conditionally include billing schema when `BILLING_ENABLED=true`

**Acceptance Criteria:**
- [ ] `getBillingGuard()` returns no-op when `BILLING_ENABLED` is unset
- [ ] `getBillingGuard()` returns real guard when `BILLING_ENABLED=true`
- [ ] `npm run build` succeeds with `BILLING_ENABLED` unset (no stripe in bundle)
- [ ] `npm run build` succeeds with `BILLING_ENABLED=true`

**Validation:**
Run `cd web && npm run typecheck && BILLING_ENABLED= npm run build && BILLING_ENABLED=true npm run build`

---

## Checkpoint: Phase 1 Complete

**Verify:**
- [ ] Billing code lives entirely in `packages/billing/`
- [ ] `npm run build` succeeds without `BILLING_ENABLED` (no Stripe SDK loaded)
- [ ] `npm run build` succeeds with `BILLING_ENABLED=true`
- [ ] `npm run typecheck` passes
- [ ] No direct `stripe` imports in `web/src/`

---

## Phase 2: Free Tier Enforcement (US-2)

### Task 4: Implement limit checking logic [US-2]

**Type**: Backend
**Dependencies**: Task 3

**Description:**
Create `packages/billing/src/limits.ts` with `canCreateEnvironment(teamId)` that checks the team's subscription status and current environment count against `FREE_TIER_LIMITS`. Returns `{ allowed: true }` for paid teams or teams under the limit, `{ allowed: false, reason: "..." }` otherwise. Write unit tests.

**Files to Create:**
- `web/packages/billing/src/limits.ts` — Limit checking logic
- `web/packages/billing/__tests__/limits.test.ts` — Unit tests for limit math

**Acceptance Criteria:**
- [ ] Paid team → always allowed
- [ ] Free team under limit → allowed
- [ ] Free team at limit → blocked with reason
- [ ] Unit tests pass

**Validation:**
Run `cd web && npm test -- packages/billing/__tests__/limits.test.ts`

---

### Task 5: Wire billing guard into environment creation [US-2]

**Type**: Backend
**Dependencies**: Task 4

**Description:**
Add `billingGuard().canCreateEnvironment(teamId)` check to `src/actions/environments.ts` in the `createProjectEnvironment()` function, before the Kubernetes deployment step. Return a user-friendly error with upgrade CTA when blocked.

**Files to Modify:**
- `web/src/actions/environments.ts` — Add billing guard check before environment creation

**Acceptance Criteria:**
- [ ] With `BILLING_ENABLED` unset, environment creation succeeds without limit check
- [ ] With `BILLING_ENABLED=true`, free team at limit → blocked
- [ ] With `BILLING_ENABLED=true`, paid team → allowed
- [ ] Existing tests still pass

**Validation:**
Run `cd web && npm test`

---

### Task 6: Create billing UI components [P] [US-2]

**Type**: Frontend
**Dependencies**: Task 3

**Description:**
Create `UpgradeBanner` and `UsageIndicator` React components in the billing package. UpgradeBanner shows when team is at/near limits. UsageIndicator shows "2/3 active environments used". Both are no-ops when billing is disabled. Follow existing Glass design system patterns.

**Files to Create:**
- `web/packages/billing/src/components/UpgradeBanner.tsx` — Limit warning + upgrade CTA
- `web/packages/billing/src/components/UsageIndicator.tsx` — Usage count display

**Acceptance Criteria:**
- [ ] UpgradeBanner renders upgrade CTA when at limit
- [ ] UsageIndicator shows correct count (e.g., "2/3 active environments")
- [ ] Components follow existing Glass design system patterns

**Validation:**
Run `cd web && npm run typecheck`

---

## Checkpoint: Phase 2 Complete

**Verify:**
- [ ] Free tier enforcement blocks environment creation at limit (billing enabled)
- [ ] No limits when billing disabled
- [ ] UI components render correctly
- [ ] `make ci` passes

---

## Phase 3: Checkout + Portal (US-1)

### Task 7: Create billing server actions [P] [US-1]

**Type**: Backend
**Dependencies**: Task 3

**Description:**
Create `packages/billing/src/actions.ts` with server actions: `createCheckoutSession(teamId)` for upgrades, `createBillingPortalSession(teamId)` for subscription management, `getTeamBillingStatus(teamId)` for UI data. These wrap the Stripe helpers with auth checks.

**Files to Create:**
- `web/packages/billing/src/actions.ts` — Server actions for billing flows

**Acceptance Criteria:**
- [ ] `createCheckoutSession` returns a Stripe Checkout URL
- [ ] `createBillingPortalSession` returns a Stripe Portal URL
- [ ] `getTeamBillingStatus` returns subscription + usage summary
- [ ] All actions verify team admin/owner role

**Validation:**
Run `cd web && npm run typecheck`

---

### Task 8: Create billing settings page [US-1] [US-3]

**Type**: Frontend
**Dependencies**: Task 7

**Description:**
Create the billing settings page at `(dashboard)/settings/billing/page.tsx` that renders `BillingSettings` from the billing package. Shows current plan, usage, upgrade button (free tier) or manage subscription button (paid). Conditionally renders only when billing is enabled. Add billing nav item to dashboard layout.

**Files to Create:**
- `web/src/app/(dashboard)/settings/billing/page.tsx` — Billing settings route
- `web/packages/billing/src/components/BillingSettings.tsx` — Full billing settings UI

**Files to Modify:**
- `web/src/app/(dashboard)/layout.tsx` — Add billing nav item (conditional on BILLING_ENABLED)

**Acceptance Criteria:**
- [ ] `/settings/billing` shows plan status and usage
- [ ] Free tier: "Upgrade" button redirects to Stripe Checkout
- [ ] Paid tier: "Manage Subscription" button opens Stripe Portal
- [ ] Page not accessible when billing disabled (404 or redirect)
- [ ] Nav item hidden when billing disabled

**Validation:**
Run `cd web && npm run typecheck && npm run build`

---

## Checkpoint: Phase 3 Complete

**Verify:**
- [ ] Upgrade flow: free tier → checkout → Stripe → back to app
- [ ] Billing portal accessible for paid teams
- [ ] Settings page shows correct data
- [ ] `make ci` passes

---

## Phase 4: Webhook Handler (US-5)

### Task 9: Implement Stripe webhook handler [P] [US-5]

**Type**: Backend
**Dependencies**: Task 3

**Description:**
Create `packages/billing/src/webhooks.ts` with handlers for: `checkout.session.completed` (link customer + create subscription), `customer.subscription.updated/deleted` (update subscription status), `invoice.paid/payment_failed` (update payment state). Create the API route at `/api/stripe/webhook` that delegates to the billing package.

**Files to Create:**
- `web/packages/billing/src/webhooks.ts` — Webhook event handlers
- `web/src/app/api/stripe/webhook/route.ts` — API route (delegates to package)
- `web/packages/billing/__tests__/webhooks.test.ts` — Unit tests with mock events

**Acceptance Criteria:**
- [ ] Webhook verifies Stripe signature
- [ ] `checkout.session.completed` creates customer + subscription records
- [ ] `customer.subscription.deleted` updates status
- [ ] `invoice.payment_failed` sets status to `past_due`
- [ ] Duplicate events handled gracefully (idempotent)
- [ ] Route returns 404 when billing disabled

**Validation:**
Run `cd web && npm test -- packages/billing/__tests__/webhooks.test.ts`

---

## Checkpoint: Phase 4 Complete

**Verify:**
- [ ] Webhook endpoint responds to Stripe events
- [ ] Subscription lifecycle reflected in database
- [ ] `make ci` passes

---

## Phase 5: Usage Recording + Visibility (US-3, US-4)

### Task 10: Implement daily usage recording job [P] [US-4]

**Type**: Backend
**Dependencies**: Task 3

**Description:**
Create `packages/billing/src/usage-job.ts` with the daily usage recording logic: query all paid teams, count environments by status, subtract free tier allowance, record to `usage_records`, report to Stripe meters. Create the API route and GitHub Actions workflow.

**Files to Create:**
- `web/packages/billing/src/usage-job.ts` — Usage recording + Stripe reporting
- `web/src/app/api/jobs/record-usage/route.ts` — API route (auth via bearer token)
- `.github/workflows/billing-usage.yml` — Daily cron trigger
- `web/packages/billing/__tests__/usage-job.test.ts` — Unit tests for recording logic

**Acceptance Criteria:**
- [ ] Job counts active and spun-down environments per team
- [ ] Billable counts subtract free tier allowance
- [ ] Records are keyed by (team_id, date) — idempotent
- [ ] Stripe meter events sent with idempotency keys
- [ ] Route requires bearer token auth
- [ ] Route returns 404 when billing disabled

**Validation:**
Run `cd web && npm test -- packages/billing/__tests__/usage-job.test.ts`

---

### Task 11: Add usage display to billing page [P] [US-3]

**Type**: Frontend
**Dependencies**: Task 7

**Description:**
Extend the `BillingSettings` component to show current period usage (active env-days, spun-down env-days), estimated cost for current period, next billing date, and subscription status.

**Files to Modify:**
- `web/packages/billing/src/components/BillingSettings.tsx` — Add usage display section

**Acceptance Criteria:**
- [ ] Shows active env-days and spun-down env-days for current period
- [ ] Shows estimated cost based on PRICING constants
- [ ] Shows next billing date from subscription data
- [ ] Shows subscription status (active, past_due, etc.)

**Validation:**
Run `cd web && npm run typecheck`

---

## Checkpoint: Phase 5 Complete

**Verify:**
- [ ] Usage job runs successfully
- [ ] Billing page shows accurate usage data
- [ ] `make ci` passes

---

## Phase 6: Final Validation

### Task 12: E2E and self-hosted verification [US-1] [US-2]

**Type**: Test
**Dependencies**: Task 10, Task 11

**Description:**
Write E2E tests for the billing happy path (hit limit → see banner → checkout → can create more) and verify self-hosted mode (no limits, no billing UI, no Stripe in bundle). Run bundle analysis to confirm Stripe SDK excluded when `BILLING_ENABLED` is unset.

**Files to Create:**
- `web/__tests__/e2e/billing.spec.ts` — E2E billing flow test
- `web/__tests__/unit/billing-guard.test.ts` — Guard no-op test

**Acceptance Criteria:**
- [ ] E2E: free tier user hits limit → upgrade banner shown
- [ ] E2E: after checkout, can create more environments
- [ ] Self-hosted: no billing UI rendered anywhere
- [ ] Self-hosted: no Stripe SDK in production bundle
- [ ] All existing tests still pass

**Validation:**
Run `cd web && make ci && npm run test:e2e`

---

## Stripe Dashboard Setup (Manual)

Before testing paid flows, create in Stripe Dashboard:

1. **Billing Meters**:
   - `active_env_day` - Active environment days
   - `spindown_env_day` - Spun-down environment days

2. **Product**: "Catalyst Environment Usage"

3. **Prices**: Two metered prices linked to meters

4. **Webhook Endpoint**: `/api/stripe/webhook`
   - Events: checkout.session.completed, customer.subscription.*, invoice.*

---

## Progress Tracking

| Task | Status | Story | Agent | Notes |
|------|--------|-------|-------|-------|
| 1 | [ ] | Infrastructure | — | Package scaffold |
| 2 | [ ] | Infrastructure | — | Code migration |
| 3 | [ ] | US-2 / Infra | — | Billing guard |
| 4 | [ ] | US-2 | — | Limit logic |
| 5 | [ ] | US-2 | — | Wire guard into env creation |
| 6 | [ ] | US-2 | — | UI components (parallel with 4-5) |
| 7 | [ ] | US-1 | — | Billing server actions (parallel after T3) |
| 8 | [ ] | US-1, US-3 | — | Billing settings page |
| 9 | [ ] | US-5 | — | Webhook handler (parallel after T3) |
| 10 | [ ] | US-4 | — | Usage recording job (parallel after T3) |
| 11 | [ ] | US-3 | — | Usage display (parallel, needs T7) |
| 12 | [ ] | US-1, US-2 | — | E2E + self-hosted verification |
