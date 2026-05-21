# Quickstart: Usage-Based Billing

**Spec**: `011-billing`

## Prerequisites

1. Stripe account (test mode is fine for development)
2. Catalyst development environment running (`make up-local`)

## Setup Steps

### 1. Configure Environment Variables

Add to `web/.env`:

```bash
# Stripe Billing Configuration
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Jobs API authentication
JOBS_SECRET=your_secure_random_string
```

Get keys from [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys).

### 2. Run Database Migration

```bash
cd web
npm run db:migrate
```

This creates the billing tables: `stripe_customers`, `stripe_subscriptions`, `usage_records`.

### 3. Configure Stripe Billing Meters

In Stripe Dashboard → Billing → Meters:

1. Create meter `active_env_day`
   - Event name: `active_env_day`
   - Aggregation: Sum

2. Create meter `spindown_env_day`
   - Event name: `spindown_env_day`
   - Aggregation: Sum

### 4. Create Stripe Product & Prices

1. **Product**: Create "Catalyst Environment Usage"
2. **Prices**: Create two metered prices:
   - Active env: $0.12/unit (linked to `active_env_day` meter)
   - Spun-down env: $0.025/unit (linked to `spindown_env_day` meter)

### 5. Set Up Webhook Endpoint

In Stripe Dashboard → Developers → Webhooks:

1. Add endpoint: `https://your-app.com/api/stripe/webhook`
2. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
3. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

For local development, use [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## Development Workflow

### Testing Free Tier Limits

```typescript
import { canTeamCreateEnvironment } from '@/lib/billing-limits';

const result = await canTeamCreateEnvironment(teamId);
// { allowed: false, reason: 'free_tier_limit', currentCount: 3, limit: 3 }
```

### Testing Checkout Flow

```typescript
import { createCheckoutSession } from '@/actions/billing';

const { checkoutUrl } = await createCheckoutSession(teamId);
// Redirect user to checkoutUrl
```

### Testing Usage Recording

```bash
# Trigger usage job manually
curl -X POST http://localhost:3000/api/jobs/record-usage \
  -H "Authorization: Bearer your_jobs_secret"
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/stripe.ts` | Stripe client and helpers |
| `src/lib/billing-limits.ts` | Free tier enforcement |
| `src/models/billing.ts` | Database operations |
| `src/actions/billing.ts` | Server actions for UI |
| `src/db/schema/billing.ts` | Database schema |
| `src/app/api/stripe/webhook/route.ts` | Webhook handler |
| `src/app/api/jobs/record-usage/route.ts` | Usage job endpoint |

## Stripe Test Cards

| Card Number | Scenario |
|-------------|----------|
| 4242424242424242 | Successful payment |
| 4000002500003155 | Requires authentication |
| 4000000000009995 | Payment declined |

Use any future expiry date and any 3-digit CVC.

## Common Issues

### Webhook Signature Verification Failed

- Ensure `STRIPE_WEBHOOK_SECRET` matches the endpoint's signing secret
- For local dev, use `stripe listen` output secret

### "STRIPE_SECRET_KEY not set" Error

- Check `.env` file has the variable
- Restart the dev server after adding env vars

### Meter Events Not Appearing

- Events take a few minutes to appear in Stripe Dashboard
- Check the meter's event name matches exactly (`active_env_day`)
