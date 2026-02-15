# Payment Collection Spike: GitHub Sponsors vs Stripe

## Overview

This spike investigates the best approach for collecting payments on the Catalyst platform (tetraship.app). We're evaluating two primary options: **GitHub Sponsors** and **Stripe**. The platform is a deployment tool with preview environments already working, and we need to start collecting revenue from users.

**Tech Stack Context:**
- Next.js 15 (App Router)
- PostgreSQL + Drizzle ORM
- Kubernetes operator (Go)
- NextAuth.js for authentication (GitHub OAuth)

## Problem Statement

Catalyst needs a payment solution that:
1. Integrates well with our existing GitHub-centric workflow
2. Supports SaaS subscription models
3. Handles usage-based billing (compute hours, storage, etc.)
4. Provides developer-friendly APIs for our Next.js 15 stack
5. Offers reasonable fees for a bootstrapped platform
6. Supports automated billing, upgrades, downgrades, and cancellations

## Options Analyzed

### Option 1: GitHub Sponsors

GitHub Sponsors is GitHub's built-in sponsorship platform, primarily designed for supporting open-source developers and projects.

**How it Works:**
- Users sponsor via their GitHub account
- Tiers can be configured with different benefits
- Payments processed through GitHub (Stripe backend)
- Webhooks available for tier changes
- No direct API for creating/managing sponsorships programmatically

**Integration Approach:**
```typescript
// Webhook endpoint to receive sponsorship events
// POST /api/github/sponsors/webhook

interface SponsorshipEvent {
  action: 'created' | 'cancelled' | 'tier_changed' | 'pending_cancellation' | 'pending_tier_change';
  sponsorship: {
    sponsor: { login: string; id: number };
    sponsorable: { login: string; id: number };
    tier: {
      monthly_price_in_cents: number;
      monthly_price_in_dollars: number;
      name: string;
    };
  };
}

// Map GitHub user to Catalyst user and update access
async function handleSponsorshipWebhook(event: SponsorshipEvent) {
  const user = await db.query.users.findFirst({
    where: eq(users.githubId, event.sponsorship.sponsor.id)
  });
  
  if (event.action === 'created' || event.action === 'tier_changed') {
    await db.update(users).set({
      subscriptionTier: event.sponsorship.tier.name,
      subscriptionStatus: 'active'
    });
  } else if (event.action === 'cancelled') {
    await db.update(users).set({
      subscriptionStatus: 'cancelled'
    });
  }
}
```

**Pros:**
- ✅ **Seamless GitHub Integration**: Users already authenticated with GitHub
- ✅ **Zero Setup Complexity**: Just enable Sponsors on your organization
- ✅ **Lower Fees**: 0% for open-source (first $100k), then 6% for commercial use
- ✅ **Built-in Trust**: Users trust GitHub's payment handling
- ✅ **Webhook Support**: Real-time notifications for tier changes
- ✅ **No PCI Compliance Burden**: GitHub handles all payment processing

**Cons:**
- ❌ **Limited to GitHub Users**: Can't accept payments from non-GitHub users
- ❌ **No Programmatic Control**: Can't create/cancel sponsorships via API
- ❌ **Designed for Donations**: Not built for SaaS subscription management
- ❌ **No Usage-Based Billing**: Can't charge for compute hours, API calls, etc.
- ❌ **No Proration**: Can't handle mid-month upgrades/downgrades properly
- ❌ **No Self-Service Portal**: Limited customer management capabilities
- ❌ **No Trials**: Can't offer free trials programmatically
- ❌ **Payment Delays**: Payouts are monthly, not immediate
- ❌ **Limited Analytics**: Basic reporting only
- ❌ **No Tax Handling**: No automatic tax calculation or invoicing
- ❌ **Tier Limitations**: Simple tier system, hard to model complex pricing

**Integration Complexity: ⭐⭐☆☆☆ (2/5 - Very Simple)**
- Estimated effort: 2-3 days
- Just webhook handling and database updates
- No payment UI to build

**Code Example - Database Schema:**
```typescript
// Add to schema.ts
export const subscriptions = pgTable("subscription", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  githubSponsorshipId: text("githubSponsorshipId"),
  tier: text("tier").notNull(), // 'starter', 'pro', 'enterprise'
  status: text("status").notNull(), // 'active', 'cancelled', 'past_due'
  monthlyPriceCents: integer("monthlyPriceCents").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});
```

### Option 2: Stripe

Stripe is a comprehensive payment platform designed for SaaS businesses, offering full programmatic control over billing and subscriptions.

**How it Works:**
- Users pay via credit card, bank transfer, or other methods
- Full API control over subscriptions, invoices, and payments
- Webhooks for all payment events
- Stripe Checkout for pre-built payment UI
- Stripe Customer Portal for self-service management

**Integration Approach:**
```typescript
// 1. Create Stripe Checkout Session
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createCheckoutSession(userId: string, priceId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  
  // Get or create Stripe customer
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      metadata: { userId }
    });
    customerId = customer.id;
    await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
  }
  
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
    subscription_data: {
      trial_period_days: 14,
      metadata: { userId }
    }
  });
  
  return session.url;
}

// 2. Handle Stripe Webhooks
export async function handleStripeWebhook(event: Stripe.Event) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      const subscription = event.data.object as Stripe.Subscription;
      await db.insert(subscriptions).values({
        userId: subscription.metadata.userId,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer as string,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        priceId: subscription.items.data[0].price.id,
      }).onConflictDoUpdate({
        target: subscriptions.stripeSubscriptionId,
        set: {
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          updatedAt: new Date(),
        }
      });
      break;
      
    case 'customer.subscription.deleted':
      const deletedSub = event.data.object as Stripe.Subscription;
      await db.update(subscriptions)
        .set({ status: 'cancelled' })
        .where(eq(subscriptions.stripeSubscriptionId, deletedSub.id));
      break;
      
    case 'invoice.payment_succeeded':
      // Track successful payments
      const invoice = event.data.object as Stripe.Invoice;
      await db.insert(payments).values({
        userId: invoice.metadata.userId,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        status: 'succeeded',
      });
      break;
      
    case 'invoice.payment_failed':
      // Handle failed payments
      const failedInvoice = event.data.object as Stripe.Invoice;
      await db.update(subscriptions)
        .set({ status: 'past_due' })
        .where(eq(subscriptions.stripeCustomerId, failedInvoice.customer as string));
      break;
  }
}

// 3. Usage-Based Billing
export async function trackUsage(userId: string, computeMinutes: number) {
  const subscription = await db.query.subscriptions.findFirst({
    where: and(
      eq(subscriptions.userId, userId),
      eq(subscriptions.status, 'active')
    )
  });
  
  if (subscription?.stripeSubscriptionItemId) {
    await stripe.subscriptionItems.createUsageRecord(
      subscription.stripeSubscriptionItemId,
      {
        quantity: computeMinutes,
        timestamp: Math.floor(Date.now() / 1000),
        action: 'increment',
      }
    );
  }
}

// 4. Customer Portal for Self-Service
export async function createPortalSession(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  
  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId!,
    return_url: `${process.env.NEXTAUTH_URL}/dashboard/billing`,
  });
  
  return session.url;
}
```

**Pros:**
- ✅ **Full API Control**: Create, modify, cancel subscriptions programmatically
- ✅ **Usage-Based Billing**: Track compute hours, API calls, storage, etc.
- ✅ **Proration Support**: Handle mid-cycle upgrades/downgrades automatically
- ✅ **Customer Portal**: Self-service subscription management
- ✅ **Free Trials**: Built-in trial period support
- ✅ **Multiple Payment Methods**: Cards, ACH, SEPA, wallets, etc.
- ✅ **Tax Automation**: Stripe Tax handles global tax compliance
- ✅ **Advanced Analytics**: Detailed revenue reports and MRR tracking
- ✅ **Invoicing**: Automatic invoice generation and delivery
- ✅ **Dunning**: Automatic retry logic for failed payments
- ✅ **Flexible Pricing Models**: Flat rate, per-seat, usage-based, hybrid
- ✅ **Not Limited to GitHub**: Accept payments from anyone
- ✅ **Instant Payouts**: Optional daily or instant payouts
- ✅ **Strong Ecosystem**: Extensive documentation and community

**Cons:**
- ❌ **Higher Fees**: 2.9% + $0.30 per transaction (3.6% for non-US cards)
- ❌ **More Complex Integration**: Requires building payment UI and webhook handlers
- ❌ **PCI Compliance**: Need to use Stripe Checkout or Elements for compliance
- ❌ **Stripe Account Required**: Additional account setup for business
- ❌ **More Code to Maintain**: Payment logic lives in your application

**Integration Complexity: ⭐⭐⭐⭐☆ (4/5 - Moderate to Complex)**
- Estimated effort: 1-2 weeks for full implementation
- Checkout flow + webhook handling + customer portal integration
- Database schema for subscriptions, payments, usage tracking
- Testing payment flows with Stripe test mode
- UI components for pricing, checkout, billing management

**Code Example - Complete Database Schema:**
```typescript
// Add to schema.ts
export const subscriptions = pgTable("subscription", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripeCustomerId").notNull(),
  stripeSubscriptionId: text("stripeSubscriptionId").unique().notNull(),
  stripeSubscriptionItemId: text("stripeSubscriptionItemId"), // For usage-based billing
  status: text("status").notNull(), // 'active', 'past_due', 'cancelled', 'trialing'
  priceId: text("priceId").notNull(), // Links to Stripe Price ID
  currentPeriodStart: timestamp("currentPeriodStart").notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").notNull().default(false),
  trialEnd: timestamp("trialEnd"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const payments = pgTable("payment", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id),
  stripeInvoiceId: text("stripeInvoiceId").unique().notNull(),
  amount: integer("amount").notNull(), // in cents
  currency: text("currency").notNull().default('usd'),
  status: text("status").notNull(), // 'succeeded', 'failed', 'pending'
  createdAt: timestamp("createdAt").notNull().defaultNow(),
});

export const usageRecords = pgTable("usage_record", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id),
  resourceType: text("resourceType").notNull(), // 'compute', 'storage', 'bandwidth'
  quantity: integer("quantity").notNull(),
  unit: text("unit").notNull(), // 'minutes', 'gb', 'requests'
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  synced: boolean("synced").notNull().default(false), // Synced to Stripe
});

// Update users table
export const users = pgTable("user", {
  // ... existing fields ...
  stripeCustomerId: text("stripeCustomerId").unique(),
});
```

## Comparison Matrix

| Feature | GitHub Sponsors | Stripe |
|---------|----------------|--------|
| **Integration Time** | 2-3 days | 1-2 weeks |
| **Integration Complexity** | ⭐⭐☆☆☆ (2/5) | ⭐⭐⭐⭐☆ (4/5) |
| **Transaction Fees** | 0-6% | 2.9% + $0.30 (3.6% non-US) |
| **Monthly Fixed Cost** | $0 | $0 (volume discounts available) |
| **Payment Methods** | Cards (via GitHub) | Cards, ACH, SEPA, wallets, more |
| **User Restrictions** | GitHub users only | Anyone |
| **Programmatic API** | ❌ Limited | ✅ Full control |
| **Usage-Based Billing** | ❌ No | ✅ Yes |
| **Free Trials** | ❌ No | ✅ Yes (configurable) |
| **Proration** | ❌ No | ✅ Automatic |
| **Customer Portal** | ❌ Limited | ✅ Full self-service |
| **Tax Automation** | ❌ No | ✅ Stripe Tax available |
| **Invoicing** | ❌ Basic | ✅ Automated |
| **Analytics** | ❌ Basic | ✅ Advanced (MRR, churn, etc.) |
| **Webhooks** | ✅ Yes | ✅ Comprehensive |
| **Documentation** | ⭐⭐⭐☆☆ | ⭐⭐⭐⭐⭐ |
| **Next.js 15 Support** | ✅ (minimal code) | ✅ (official SDK) |
| **Subscription Management** | ❌ Manual | ✅ Automated |
| **Failed Payment Handling** | ❌ Manual | ✅ Automatic dunning |
| **Multiple Pricing Models** | ❌ Simple tiers | ✅ Flexible (flat, usage, hybrid) |
| **Currency Support** | USD only | 135+ currencies |
| **Payout Schedule** | Monthly | Daily/instant (with fee) |
| **Best For** | Simple sponsorships | SaaS businesses |

## Pricing Comparison

### GitHub Sponsors Fees

**For Open Source:**
- First $100,000: 0% fees
- After $100,000: 6% fees
- Payment processing: Handled by GitHub (built into fee)

**For Commercial Use:**
- 6% platform fee on all transactions
- Payment processing: Included

**Example Monthly Revenue: $10,000**
- Gross Revenue: $10,000
- GitHub Sponsors Fee (6%): $600
- Net Revenue: $9,400

### Stripe Fees

**Standard Pricing:**
- Online payments: 2.9% + $0.30 per transaction
- International cards: +1.5% (4.4% total)
- Currency conversion: +1%

**Example Monthly Revenue: $10,000**
- Average transaction: $50 (200 transactions)
- Transaction fees: ($50 × 0.029 + $0.30) × 200 = $350
- Net Revenue: $9,650

**With 20% International Cards:**
- Domestic: 160 × ($1.45 + $0.30) = $280
- International: 40 × ($2.20 + $0.30) = $100
- Total fees: $380
- Net Revenue: $9,620

**Annual Comparison at $10k MRR:**
- GitHub Sponsors: $7,200/year in fees (6%)
- Stripe (100% domestic): $4,200/year in fees (3.5%)
- Stripe (20% international): $4,560/year in fees (3.8%)

**Stripe is more cost-effective** at scale due to lower percentage fees, despite the fixed $0.30 per transaction.

## Integration Complexity for Next.js 15 + PostgreSQL

### GitHub Sponsors Integration

**Required Changes:**
1. **Database Schema** (1 hour)
   - Add `subscriptions` table
   - Add `stripeCustomerId` to users (GitHub uses Stripe backend)

2. **Webhook Handler** (4 hours)
   - Create `/api/github/sponsors/webhook` route
   - Verify webhook signatures
   - Handle sponsorship events
   - Update user subscription status

3. **Access Control** (2 hours)
   - Middleware to check subscription status
   - Feature gates based on tier

4. **UI Updates** (3 hours)
   - Show current sponsorship tier
   - Link to GitHub Sponsors page
   - Display subscription status

**Total: ~10 hours (2-3 days)**

**Files to Create/Modify:**
```
web/src/db/schema.ts              (add subscriptions table)
web/src/app/api/github/sponsors/webhook/route.ts  (webhook handler)
web/src/middleware.ts             (access control)
web/src/components/subscription-badge.tsx  (UI component)
```

### Stripe Integration

**Required Changes:**
1. **Dependencies** (30 minutes)
   ```bash
   npm install stripe @stripe/stripe-js
   ```

2. **Database Schema** (2 hours)
   - Add `subscriptions`, `payments`, `usageRecords` tables
   - Add Stripe customer ID to users
   - Set up relations

3. **Stripe Configuration** (1 hour)
   - Set up Stripe account
   - Create products and prices
   - Configure webhook endpoints

4. **Checkout Flow** (8 hours)
   - Create `/api/stripe/checkout` route
   - Build pricing page UI
   - Implement Stripe Checkout redirect
   - Success/cancel page handlers

5. **Webhook Handler** (8 hours)
   - Create `/api/stripe/webhook` route
   - Verify webhook signatures
   - Handle all subscription events
   - Error handling and logging

6. **Customer Portal** (4 hours)
   - Create `/api/stripe/portal` route
   - Add "Manage Billing" button
   - Handle portal redirects

7. **Usage Tracking** (8 hours)
   - Build usage metering system
   - Track compute minutes, storage, etc.
   - Sync usage to Stripe periodically
   - Background job for aggregation

8. **Access Control** (4 hours)
   - Middleware to check subscription status
   - Feature gates based on tier and usage
   - Handle trial periods

9. **UI Components** (8 hours)
   - Pricing page
   - Subscription status dashboard
   - Usage metrics display
   - Payment history

10. **Testing** (8 hours)
    - Test mode integration testing
    - Webhook event simulation
    - Error scenarios
    - UI/UX testing

**Total: ~50 hours (1-2 weeks)**

**Files to Create/Modify:**
```
web/src/db/schema.ts                          (add tables)
web/src/lib/stripe.ts                         (Stripe client)
web/src/app/api/stripe/checkout/route.ts     (checkout session)
web/src/app/api/stripe/webhook/route.ts      (webhook handler)
web/src/app/api/stripe/portal/route.ts       (customer portal)
web/src/app/(dashboard)/pricing/page.tsx     (pricing page)
web/src/app/(dashboard)/billing/page.tsx     (billing dashboard)
web/src/actions/subscriptions.ts             (subscription actions)
web/src/actions/usage.ts                     (usage tracking)
web/src/lib/usage-metering.ts                (usage aggregation)
web/src/middleware.ts                         (access control)
web/src/components/pricing-card.tsx          (UI components)
web/src/components/usage-chart.tsx           (usage visualization)
```

## Recommended Approach

**Recommendation: Stripe** ⭐

### Justification

While GitHub Sponsors offers simplicity and lower fees for open-source projects, **Stripe is the better choice for Catalyst** as a commercial SaaS platform for the following reasons:

1. **SaaS-Appropriate Features**: Stripe is built for SaaS businesses and provides essential features that GitHub Sponsors lacks:
   - Usage-based billing for compute resources
   - Automatic proration for plan changes
   - Free trial support
   - Self-service customer portal
   - Comprehensive subscription management

2. **Product Flexibility**: Catalyst will likely need complex pricing models:
   - Base subscription fee + usage charges
   - Different tiers with resource limits
   - Add-ons for additional features
   - GitHub Sponsors' simple tier system cannot accommodate this

3. **Market Reach**: Not limiting users to GitHub accounts opens the market significantly:
   - Companies may want to use corporate cards, not personal GitHub accounts
   - Non-technical decision-makers (CTOs, finance) may not have GitHub accounts
   - Enterprise customers expect standard B2B payment methods

4. **Professional Billing Experience**: Stripe provides:
   - Automated invoicing with company details
   - Tax calculation and compliance
   - Multiple payment methods
   - Payment retry logic for failed charges
   - This creates a more professional, enterprise-ready experience

5. **Cost Effectiveness**: At scale, Stripe is actually cheaper:
   - GitHub Sponsors: 6% flat fee
   - Stripe: ~3.5-3.8% effective rate
   - Savings increase with volume

6. **Integration Quality**: While Stripe requires more upfront work:
   - Excellent Next.js SDK and documentation
   - Well-maintained libraries
   - Strong community support
   - Long-term maintenance is easier

7. **Growth Potential**: Stripe scales with the business:
   - Supports international expansion
   - Handles currency conversion
   - Provides advanced analytics
   - GitHub Sponsors would become a limitation

**When GitHub Sponsors Makes Sense:**
- Pure open-source projects seeking community funding
- Developer tools targeting only GitHub users
- Simple donation-based revenue models
- Projects wanting to minimize integration work

**Catalyst is not in this category** - it's a commercial deployment platform that needs robust billing capabilities.

## Implementation Plan (Stripe)

### Phase 1: Foundation (Week 1)

**Goal**: Basic subscription checkout working in test mode

1. **Setup** (Day 1)
   - Install Stripe dependencies
   - Set up Stripe test account
   - Configure environment variables
   - Create initial products and prices in Stripe dashboard

2. **Database Schema** (Day 1)
   - Add subscriptions, payments, usageRecords tables
   - Run migrations
   - Update user model with stripeCustomerId

3. **Stripe Client Library** (Day 2)
   - Create `src/lib/stripe.ts` with server-side client
   - Create `src/lib/stripe-client.ts` for client-side (Stripe.js)
   - Add helper functions for common operations

4. **Checkout Flow** (Day 2-3)
   - Build `/api/stripe/checkout` route
   - Create pricing page at `/pricing`
   - Implement redirect to Stripe Checkout
   - Handle success/cancel redirects

5. **Webhook Handler** (Day 3-4)
   - Create `/api/stripe/webhook` route
   - Implement signature verification
   - Handle core events: subscription.created, subscription.updated, subscription.deleted
   - Test with Stripe CLI webhook forwarding

6. **Basic Testing** (Day 5)
   - End-to-end test of signup flow
   - Verify webhook events update database correctly
   - Test cancellation flow
   - Document test card numbers

### Phase 2: Polish (Week 2)

**Goal**: Production-ready subscription management

7. **Customer Portal** (Day 1)
   - Create `/api/stripe/portal` route
   - Add "Manage Billing" button to dashboard
   - Test upgrade/downgrade flows
   - Verify proration calculations

8. **Access Control** (Day 2)
   - Update middleware to check subscription status
   - Implement feature gates based on plan tier
   - Handle trial period access
   - Add grace period for past_due status

9. **UI Enhancements** (Day 3)
   - Build billing dashboard at `/billing`
   - Show current plan, usage, and payment method
   - Display payment history
   - Add subscription status badges

10. **Error Handling** (Day 4)
    - Handle webhook replay attacks
    - Add retry logic for failed Stripe API calls
    - Implement proper error logging
    - User-facing error messages

11. **Production Preparation** (Day 5)
    - Switch to production Stripe keys
    - Set up production webhook endpoint
    - Configure Stripe Tax (if needed)
    - Add monitoring and alerting

### Phase 3: Usage-Based Billing (Future - 1 week)

**Goal**: Track and bill for compute usage

12. **Usage Tracking Infrastructure**
    - Build usage metering system
    - Track compute minutes per user/project
    - Implement background aggregation job
    - Store usage records in database

13. **Stripe Usage Sync**
    - Create cron job to sync usage to Stripe
    - Handle batch reporting
    - Implement idempotency
    - Add usage-based pricing to plans

14. **Usage Dashboard**
    - Display current usage metrics
    - Show usage trends over time
    - Estimate upcoming charges
    - Usage limit warnings

### Key Stripe Webhook Events to Handle

```typescript
// Priority 1: Must handle immediately
'customer.subscription.created'       // New subscription
'customer.subscription.updated'       // Plan change, status change
'customer.subscription.deleted'       // Cancellation
'invoice.payment_succeeded'          // Successful payment
'invoice.payment_failed'             // Failed payment
'customer.subscription.trial_will_end' // Trial expiring

// Priority 2: Should handle for good UX
'payment_intent.succeeded'           // Payment confirmed
'payment_intent.payment_failed'      // Payment failed
'customer.updated'                   // Customer details changed

// Priority 3: Nice to have
'invoice.upcoming'                   // Invoice coming (send reminder)
'charge.dispute.created'             // Dispute filed
```

### Testing Strategy

1. **Stripe Test Mode**
   - Use test API keys during development
   - Test cards: `4242 4242 4242 4242` (success), `4000 0000 0000 9995` (declined)
   - Stripe CLI for webhook testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

2. **Integration Tests**
   - Mock Stripe API for unit tests
   - Use Stripe test fixtures for integration tests
   - Test all webhook event types

3. **Manual Testing Checklist**
   - [ ] Sign up for trial
   - [ ] Trial expiration handling
   - [ ] Upgrade plan mid-cycle
   - [ ] Downgrade plan mid-cycle
   - [ ] Cancel subscription
   - [ ] Failed payment recovery
   - [ ] Customer portal access
   - [ ] Invoice generation

### Environment Variables

```bash
# .env.local
STRIPE_SECRET_KEY=sk_test_...              # Server-side
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Client-side
STRIPE_WEBHOOK_SECRET=whsec_...            # Webhook signature verification

# Production
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Pricing Model Recommendation

**Suggested Tiers for Catalyst:**

1. **Free Tier** (No credit card required)
   - 1 project
   - 1 preview environment
   - 100 compute minutes/month
   - Community support

2. **Pro Tier** ($29/month)
   - 10 projects
   - Unlimited preview environments
   - 2,000 compute minutes/month
   - Additional minutes: $0.01/min
   - Email support
   - 14-day trial

3. **Team Tier** ($99/month)
   - Unlimited projects
   - Unlimited preview environments
   - 10,000 compute minutes/month
   - Additional minutes: $0.008/min
   - Priority support
   - SSO (future)
   - 14-day trial

4. **Enterprise** (Custom)
   - Custom SLA
   - Dedicated support
   - On-premise option
   - Custom contracts

**Implementation in Stripe:**
- Create products for each tier
- Base subscription price + metered billing for compute
- Set up usage-based pricing for additional minutes
- Configure trial period

## Security Considerations

### GitHub Sponsors
- ✅ Webhook signature verification required
- ✅ GitHub handles PCI compliance
- ⚠️ Less control over payment flow

### Stripe
- ✅ Use Stripe Checkout or Elements (PCI compliant)
- ✅ Never store raw card details
- ✅ Webhook signature verification required
- ✅ Use environment variables for keys
- ✅ Implement idempotency keys for API calls
- ⚠️ More responsibility for security

## Conclusion

**Stripe is the clear winner for Catalyst** despite higher integration complexity. The platform needs SaaS-appropriate features that GitHub Sponsors simply cannot provide. The upfront investment of 1-2 weeks for Stripe integration will pay dividends as the platform grows.

### Next Steps

1. ✅ Set up Stripe test account
2. ✅ Create products and pricing in Stripe dashboard
3. ✅ Implement Phase 1: Foundation (basic checkout)
4. ✅ Implement Phase 2: Polish (production-ready)
5. 📅 Implement Phase 3: Usage-based billing (as needed)

### References

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Next.js Guide](https://stripe.com/docs/payments/quickstart)
- [GitHub Sponsors Documentation](https://docs.github.com/en/sponsors)
- [Stripe vs GitHub Sponsors Comparison](https://stripe.com/blog)
- [SaaS Pricing Best Practices](https://www.priceintelligently.com/)

---

**Spike completed**: 2026-02-15
**Estimated implementation time**: 1-2 weeks for production-ready Stripe integration
**Recommended approach**: Stripe with subscription + usage-based billing
