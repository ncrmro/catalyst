# Stripe Webhook Handler - Testing Guide

## Overview

This document explains how to manually test the Stripe webhook handler implementation.

## Prerequisites

1. **Environment Variables Required:**
   ```bash
   BILLING_ENABLED=true
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

2. **Database:** PostgreSQL with billing tables migrated

3. **Stripe Account:** Test mode account with webhook endpoint configured

## Testing Approach

### 1. Webhook Endpoint Configuration

In Stripe Dashboard:
- Navigate to **Developers → Webhooks**
- Add endpoint: `https://your-domain.com/api/stripe/webhook`
- Select events to listen for:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`

### 2. Testing Checkout Flow

**Step 1: Create a checkout session**
```bash
# Use existing createCheckoutSession function
POST /api/billing/checkout
{
  "teamId": "test-team-123"
}
```

**Step 2: Complete checkout**
- Open returned checkout URL
- Use Stripe test card: `4242 4242 4242 4242`
- Complete the checkout flow

**Expected webhook sequence:**
1. `checkout.session.completed` → Links customer to team
2. `customer.subscription.created` → Creates subscription record
3. `invoice.paid` → Logs first payment

**Verification:**
```sql
-- Check customer was linked
SELECT * FROM stripe_customers WHERE team_id = 'test-team-123';

-- Check subscription created
SELECT * FROM stripe_subscriptions WHERE team_id = 'test-team-123';
```

### 3. Testing Subscription Updates

**Scenario: Cancel subscription**
```bash
# In Stripe Dashboard:
# Customers → Select customer → Subscriptions → Cancel subscription
```

**Expected webhook:**
- `customer.subscription.updated` with `status = 'canceled'`

**Verification:**
```sql
SELECT status, cancel_at_period_end, canceled_at 
FROM stripe_subscriptions 
WHERE team_id = 'test-team-123';
```

### 4. Testing Payment Failure

**Scenario: Simulate payment failure**
```bash
# In Stripe Dashboard:
# Use test card that triggers payment failure: 4000 0000 0000 0341
# Or manually trigger invoice payment failure
```

**Expected webhook sequence:**
1. `invoice.payment_failed` → Logs failure
2. `customer.subscription.updated` with `status = 'past_due'`

**Verification:**
```sql
SELECT status FROM stripe_subscriptions WHERE team_id = 'test-team-123';
-- Should be 'past_due'
```

### 5. Testing Idempotency

**Test duplicate event handling:**
```bash
# In Stripe Dashboard:
# Developers → Webhooks → Select event → Resend
```

**Expected behavior:**
- Handler processes without errors
- Database records remain unchanged
- No duplicate entries created

### 6. Testing Billing Disabled

**Disable billing:**
```bash
# Set environment variable
BILLING_ENABLED=false
# Or unset it completely
```

**Test webhook endpoint:**
```bash
curl -X POST http://localhost:3000/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test" \
  -d '{"type": "test"}'
```

**Expected response:**
```json
{
  "error": "Billing is not enabled"
}
```
Status: 404

## Troubleshooting

### Webhook Not Received

1. **Check webhook secret:** Ensure `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
2. **Check endpoint URL:** Verify publicly accessible URL
3. **Check firewall:** Ensure port is open to Stripe IPs
4. **Check logs:** Look for signature verification errors

### Signature Verification Failures

```bash
# Check webhook secret
echo $STRIPE_WEBHOOK_SECRET

# In Stripe Dashboard, verify signing secret matches
```

### Database Errors

```bash
# Check database connection
npm run db:studio

# Verify tables exist
SELECT tablename FROM pg_tables 
WHERE tablename LIKE 'stripe_%';
```

## Event Payload Examples

### checkout.session.completed
```json
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_...",
      "customer": "cus_...",
      "customer_email": "user@example.com",
      "subscription": "sub_...",
      "metadata": {
        "teamId": "team-123"
      }
    }
  }
}
```

### customer.subscription.updated
```json
{
  "type": "customer.subscription.updated",
  "data": {
    "object": {
      "id": "sub_...",
      "customer": "cus_...",
      "status": "past_due",
      "current_period_start": 1234567890,
      "current_period_end": 1234567999,
      "cancel_at_period_end": false
    }
  }
}
```

### invoice.payment_failed
```json
{
  "type": "invoice.payment_failed",
  "data": {
    "object": {
      "id": "in_...",
      "customer": "cus_...",
      "subscription": "sub_...",
      "amount_due": 1000,
      "attempt_count": 1
    }
  }
}
```

## Success Criteria

✅ Webhook endpoint responds with 200 for valid events  
✅ Customer linked to team after checkout completion  
✅ Subscription status updated in database  
✅ Payment failures logged correctly  
✅ Duplicate events handled without errors  
✅ Returns 404 when billing disabled  
✅ Signature verification prevents unauthorized requests  

## Next Steps

After manual testing passes:
1. Create integration tests with Stripe webhooks test library
2. Add monitoring/alerting for webhook failures
3. Document webhook retry logic (handled by Stripe)
4. Set up webhook event dashboard/logging
