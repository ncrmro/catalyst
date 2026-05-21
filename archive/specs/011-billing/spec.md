# Feature Specification: Usage-Based Billing

**Spec**: `011-billing`
**Created**: 2026-02-16
**Status**: In Review

## Overview

Implement usage-based billing with Stripe for Catalyst's per-environment pricing model. Billing is at the team level (not per-user), with a free tier for initial adoption and usage-based metering for paid plans.

## Design Constraints

### Self-Hosted Isolation

Billing is a **hosted-only concern**. Self-hosted Catalyst deployments MUST function without any billing code, configuration, or dependencies. Specifically:

- **No limits**: When billing is disabled, all features are unlimited (no free tier enforcement, no environment caps).
- **No Stripe dependency**: The app MUST boot cleanly with zero billing configuration. No Stripe keys, webhook secrets, or billing env vars should be expected.
- **No phone-home**: Self-hosted instances never contact Stripe or any external billing/licensing service.
- **Clean separation**: Core functionality (environments, deployments, VCS integration) MUST NOT import billing modules. The billing feature flag (`BILLING_ENABLED`) controls whether billing code is loaded at all.

### Package Location

All billing code lives in a **separate workspace package** at `web/packages/billing/`. This package:

- Has its own `package.json` with Stripe SDK and billing-specific dependencies
- Exports a clean interface consumed by the main web app only when `BILLING_ENABLED=true`
- Contains its own database migrations (billing tables), UI components, API routes, and webhook handlers
- Is excluded from the build when billing is disabled (no Stripe SDK in self-hosted bundles)

## Pricing Model

| Element | Price |
|---------|-------|
| Active environment | $3.50/month (~$0.12/day) |
| Spun-down environment | $0.75/month (~$0.025/day) |
| Free tier | 3 active envs, 5 spun-down, 1 project |

## User Stories

### US-1: Team Billing Setup (P1)

As a team admin, I want to upgrade my team to a paid plan so that I can create more than the free tier limit of environments.

**Why P1**: Core monetization path. Without this, the platform cannot generate revenue.

**Acceptance Criteria**:

1. **Given** a team on the free tier, **When** I navigate to billing settings, **Then** I see an "Upgrade" button that redirects to Stripe Checkout.
2. **Given** I complete Stripe Checkout, **When** I return to the app, **Then** my team is marked as "paid" and I can create additional environments.
3. **Given** a team with an active subscription, **When** I navigate to billing settings, **Then** I see a "Manage Subscription" button that opens the Stripe Billing Portal.

---

### US-2: Free Tier Enforcement (P1)

As a free tier user, I want to understand my usage limits so that I know when I need to upgrade.

**Why P1**: Prevents abuse and creates clear upgrade triggers. Only applies when billing is enabled.

**Acceptance Criteria**:

1. **Given** a team on the free tier with 3 active environments, **When** I try to create a 4th environment, **Then** I see a message indicating I've reached my limit with an upgrade CTA.
2. **Given** a team approaching their free tier limit, **When** I view the dashboard, **Then** I see a usage indicator showing "2/3 active environments used".
3. **Given** a paid team, **When** I create environments, **Then** there is no enforced limit (usage is metered).
4. **Given** billing is disabled (self-hosted), **When** any team creates environments, **Then** there are no limits enforced and no billing UI is shown.

---

### US-3: Usage Visibility (P2)

As a team admin, I want to see my current usage and estimated costs so that I can predict my bill.

**Why P2**: Transparency builds trust and reduces billing surprises.

**Acceptance Criteria**:

1. **Given** a paid team, **When** I view the billing page, **Then** I see current period usage (active env-days, spun-down env-days).
2. **Given** usage data, **When** I view billing details, **Then** I see an estimated cost for the current billing period.
3. **Given** a subscription, **When** I view the billing page, **Then** I see the next billing date and current subscription status.

---

### US-4: Automated Usage Recording (P2)

As a platform operator, I want environment usage to be automatically recorded and reported to Stripe so that billing is accurate without manual intervention.

**Why P2**: Core billing accuracy. Manual intervention doesn't scale.

**Acceptance Criteria**:

1. **Given** environments in various states, **When** the daily usage job runs, **Then** each team's active and spun-down environment counts are recorded.
2. **Given** recorded usage, **When** the job reports to Stripe, **Then** meter events are sent with correct quantities.
3. **Given** a job failure, **When** the job is re-run, **Then** it does not double-bill (idempotent).

---

### US-5: Subscription Lifecycle (P3)

As a team admin, I want my subscription changes to be reflected immediately so that I have accurate access control.

**Why P3**: Important for billing integrity but rare edge cases.

**Acceptance Criteria**:

1. **Given** an active subscription, **When** it is canceled via Stripe, **Then** the team is downgraded to free tier limits at period end.
2. **Given** a failed payment, **When** Stripe sends a webhook, **Then** the team's status reflects "past_due" but access continues.
3. **Given** a subscription is deleted, **When** I try to create environments beyond free tier, **Then** I am blocked with an upgrade prompt.

---

## Functional Requirements

### Module Isolation

- **FR-BILL-019**: Billing MUST be an optional module controlled by `BILLING_ENABLED` environment variable.
- **FR-BILL-020**: When `BILLING_ENABLED` is not set or `false`, the app MUST function with zero billing code loaded, no Stripe dependencies, and no environment limits.
- **FR-BILL-021**: All billing code (Stripe SDK, migrations, UI components, API routes, webhooks) MUST reside in `web/packages/billing/` as a separate workspace package.
- **FR-BILL-022**: Core platform code (environments, deployments, VCS) MUST NOT have import-time dependencies on the billing package.
- **FR-BILL-023**: Billing database tables MUST be in separate migrations owned by the billing package. Core tables MUST NOT have foreign keys to billing tables.

### Core Billing

- **FR-BILL-001**: System MUST support Stripe as the payment processor.
- **FR-BILL-002**: Billing MUST be scoped to teams, not individual users.
- **FR-BILL-003**: When billing is enabled, system MUST enforce free tier limits (3 active, 5 spun-down, 1 project) for teams without a subscription. When billing is disabled, no limits apply.
- **FR-BILL-004**: System MUST allow unlimited environments for teams with active subscriptions or when billing is disabled.

### Usage Metering

- **FR-BILL-005**: System MUST track daily usage per team (active and spun-down environment counts).
- **FR-BILL-006**: System MUST report usage to Stripe Billing Meters for paid teams only.
- **FR-BILL-007**: Usage reporting MUST be idempotent (re-running does not duplicate charges).
- **FR-BILL-008**: System MUST calculate billable usage by subtracting free tier allowance.

### Stripe Integration

- **FR-BILL-009**: System MUST support Stripe Checkout for new subscriptions.
- **FR-BILL-010**: System MUST support Stripe Billing Portal for subscription management.
- **FR-BILL-011**: System MUST handle Stripe webhooks for subscription lifecycle events.
- **FR-BILL-012**: Webhook handler MUST verify Stripe signatures for security.

### Data Model

- **FR-BILL-013**: System MUST store Stripe customer ID mapped to team ID.
- **FR-BILL-014**: System MUST store subscription status and period dates.
- **FR-BILL-015**: System MUST store daily usage records with reported flag.

### UI Components

- **FR-BILL-016**: Billing settings page MUST show current plan, usage, and management options.
- **FR-BILL-017**: Upgrade banner MUST appear when free tier limits are approached or reached.
- **FR-BILL-018**: Environment creation MUST check free tier limits before proceeding.

## Key Entities

- **StripeCustomer**: Maps a Catalyst team to a Stripe customer ID. One team = one customer.
- **StripeSubscription**: Tracks subscription status, period dates, and cancellation state.
- **UsageRecord**: Daily snapshot of environment counts per team, with Stripe reporting status.

## Edge Cases

- What happens if a team downgrades while over the free tier limit?
  - Existing environments remain but no new ones can be created until under limit.
- What if the usage job fails mid-way through teams?
  - Job is idempotent; can be safely re-run. Records which teams have been reported.
- What if Stripe webhook delivery fails?
  - Stripe retries webhooks. System handles duplicate events gracefully.
- What if a team has multiple subscriptions?
  - Database constraint allows only one active subscription per team.

## Success Criteria

- **SC-001**: Free tier users are blocked from creating >3 active environments with clear messaging (billing enabled only).
- **SC-002**: Paid teams receive accurate invoices matching their environment usage.
- **SC-003**: Upgrade flow completes in <30 seconds (redirect to Stripe and back).
- **SC-004**: Daily usage job processes all teams in <5 minutes.
- **SC-005**: App boots and functions fully with `BILLING_ENABLED` unset — no errors, no billing UI, no limits.
- **SC-006**: Production build without billing excludes Stripe SDK from the bundle.

## Out of Scope

- Per-user billing (billing is team-level only)
- Credit system or prepaid balances
- Invoicing outside of Stripe
- Custom enterprise pricing tiers
- Usage analytics dashboards beyond basic counts
- Prorated refunds for mid-cycle cancellations (handled by Stripe)
- Helm chart billing components (billing deployment configuration deferred to later spec)
- GitHub Marketplace billing (does not support metered billing — see `research/github-marketplace-billing/`)

## Open Questions

- [x] Should billing be at team or user level? → **Team level**
- [x] How to handle free tier enforcement? → **Application-side blocking (disabled for self-hosted)**
- [x] What triggers usage recording? → **Daily cron job via GitHub Actions**
- [x] How to isolate billing from self-hosted? → **Optional module via `BILLING_ENABLED` flag, separate `web/packages/billing/` workspace package**
- [x] What about self-hosted limits? → **No limits when billing is disabled**
- [x] GitHub Marketplace as billing alternative? → **Not viable — no metered billing support. Stripe confirmed.**
