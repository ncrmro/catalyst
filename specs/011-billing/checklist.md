# Usage-Based Billing Consistency Checklist

**Date**: 2026-02-16
**Spec**: specs/011-billing/

## Summary

| Check | Result | Details |
|-------|--------|---------|
| Spec → Plan | PASS | All 23 FRs addressed by plan components |
| Plan → Tasks | PASS | All files in plan covered by tasks |
| Spec → Tasks | PASS | All 5 user stories covered with criteria |
| Unresolved Markers | PASS | No TBD/TODO markers found |
| Over-Engineering | PASS | All work traces to requirements |
| Dependency Integrity | PASS | No circular refs, parallel markers correct |

**Overall**: PASS

## Detailed Results

### Spec → Plan Traceability

| FR ID | Plan Component | Status |
|-------|---------------|--------|
| FR-BILL-019 | `BILLING_ENABLED` flag, billingGuard pattern | PASS |
| FR-BILL-020 | No-op guard, zero billing code when disabled | PASS |
| FR-BILL-021 | `web/packages/billing/` workspace package | PASS |
| FR-BILL-022 | Dynamic import via `getBillingGuard()` | PASS |
| FR-BILL-023 | "No FK from core → billing" in Data Model section | PASS |
| FR-BILL-001 | Stripe SDK in packages/billing/package.json | PASS |
| FR-BILL-002 | Data model: all tables keyed by team_id | PASS |
| FR-BILL-003 | limits.ts + billingGuard conditional enforcement | PASS |
| FR-BILL-004 | Guard returns allowed:true for paid or disabled | PASS |
| FR-BILL-005 | usage-job.ts daily recording | PASS |
| FR-BILL-006 | usage-job.ts Stripe meter reporting | PASS |
| FR-BILL-007 | Idempotency keys in usage-job.ts | PASS |
| FR-BILL-008 | "subtract free tier allowance" in usage-job.ts | PASS |
| FR-BILL-009 | stripe.ts createCheckoutSession | PASS |
| FR-BILL-010 | stripe.ts createBillingPortalSession | PASS |
| FR-BILL-011 | webhooks.ts subscription lifecycle handlers | PASS |
| FR-BILL-012 | Security: constructWebhookEvent signature verification | PASS |
| FR-BILL-013 | stripe_customers table: team_id → stripe_customer_id | PASS |
| FR-BILL-014 | stripe_subscriptions table: status + period dates | PASS |
| FR-BILL-015 | usage_records table: reported flag | PASS |
| FR-BILL-016 | BillingSettings component | PASS |
| FR-BILL-017 | UpgradeBanner component | PASS |
| FR-BILL-018 | billingGuard check in environments.ts | PASS |

### Plan → Tasks Traceability

| Plan File | Task(s) | Status |
|-----------|---------|--------|
| `packages/billing/package.json` | Task 1 | PASS |
| `packages/billing/tsconfig.json` | Task 1 | PASS |
| `packages/billing/src/index.ts` | Task 1, 2 | PASS |
| `packages/billing/src/constants.ts` | Task 1 | PASS |
| `packages/billing/src/stripe.ts` | Task 2 | PASS |
| `packages/billing/src/models.ts` | Task 2 | PASS |
| `packages/billing/src/db/schema.ts` | Task 2 | PASS |
| `src/lib/billing-guard.ts` | Task 3 | PASS |
| `packages/billing/src/limits.ts` | Task 4 | PASS |
| `src/actions/environments.ts` (modify) | Task 5 | PASS |
| `packages/billing/src/components/UpgradeBanner.tsx` | Task 6 | PASS |
| `packages/billing/src/components/UsageIndicator.tsx` | Task 6 | PASS |
| `packages/billing/src/actions.ts` | Task 7 | PASS |
| `src/app/(dashboard)/settings/billing/page.tsx` | Task 8 | PASS |
| `packages/billing/src/components/BillingSettings.tsx` | Task 8 | PASS |
| `src/app/(dashboard)/layout.tsx` (modify) | Task 8 | PASS |
| `packages/billing/src/webhooks.ts` | Task 9 | PASS |
| `src/app/api/stripe/webhook/route.ts` | Task 9 | PASS |
| `packages/billing/src/usage-job.ts` | Task 10 | PASS |
| `src/app/api/jobs/record-usage/route.ts` | Task 10 | PASS |
| `.github/workflows/billing-usage.yml` | Task 10 | PASS |
| `drizzle.config.ts` (modify) | Task 3 | PASS |

### Spec → Tasks Traceability

| Story | Task(s) | Criteria Coverage | Status |
|-------|---------|-------------------|--------|
| US-1 | T7, T8, T12 | 3/3 (checkout, return, portal) | PASS |
| US-2 | T3, T4, T5, T6, T12 | 4/4 (block, indicator, unlimited paid, no limits self-hosted) | PASS |
| US-3 | T8, T11 | 3/3 (usage display, estimated cost, billing date) | PASS |
| US-4 | T10 | 3/3 (record counts, Stripe meters, idempotent) | PASS |
| US-5 | T9 | 3/3 (cancel→downgrade, failed→past_due, deleted→blocked) | PASS |

### Unresolved Markers

| File | Line | Marker | Context |
|------|------|--------|---------|
| — | — | — | None found in spec.md, plan.md, or tasks.md |

All Open Questions in spec.md are resolved (marked `[x]`).

### Over-Engineering Check

| Item | Traces To | Status |
|------|-----------|--------|
| billingGuard pattern | FR-BILL-019, FR-BILL-020, FR-BILL-022 | PASS |
| Workspace package | FR-BILL-021 | PASS |
| Separate DB migrations | FR-BILL-023 | PASS |
| Bundle analysis (T12) | SC-006 | PASS |

No gold plating detected. All components serve a documented requirement.

### Dependency Integrity

- **Circular references**: None. Graph is a DAG: T1→T2→T3→{T4,T6,T7,T9,T10}→...→T12
- **Parallel marker conflicts**: None. T6 (UI components) shares no files with T4/T5 (backend limits). T7/T9/T10 all create different files in the billing package. T11 modifies BillingSettings.tsx which T8 creates but T8 is a dependency of T11.
- **Checkpoint coverage**: Complete. Each phase checkpoint verifies the critical outputs of that phase.

## Recommendations

None. All checks pass. Spec artifacts are consistent and ready for task execution via `/sweng`.
