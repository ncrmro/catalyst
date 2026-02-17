# Spike: Payment Collection - GitHub Sponsors vs Stripe

This spike explores the best approach for collecting payments on the Catalyst platform (tetraship.app), a deployment platform with working preview environments that now needs to monetize.

## Goal

Evaluate and recommend the best payment solution for collecting recurring subscription payments from Catalyst users, comparing GitHub Sponsors (simpler but limited) vs Stripe (more capable but more work).

## Problem

Catalyst is ready to start collecting payments from users. We need to decide between:
1. **GitHub Sponsors** - Leveraging our GitHub integration for a simpler approach
2. **Stripe** - Using a full-featured payment platform

## Tech Stack Context

- **Frontend**: Next.js 15 (App Router)
- **Backend**: Next.js 15 Server Actions / API routes
- **Database**: PostgreSQL with Drizzle ORM
- **Infrastructure**: Kubernetes operator (Go)
- **Authentication**: NextAuth.js with GitHub OAuth

## Research Findings

### 1. GitHub Sponsors

#### Overview
GitHub Sponsors is a native GitHub feature designed to support open-source developers and projects through recurring or one-time payments. It leverages existing GitHub accounts and billing infrastructure.

#### Pros
- **Zero Integration Complexity**: Users already have GitHub accounts; no new signup flow needed
- **Low Platform Fees**: 0% platform fee for personal sponsorships (only payment processing fees ~2.9% + $0.30)
- **Native GitHub Experience**: Seamless for developer-focused products
- **No PCI Compliance Burden**: GitHub handles all payment security
- **GraphQL API**: Query sponsorship data programmatically
- **Webhooks**: Receive notifications for sponsorship events (created, edited, deleted)
- **Brand Alignment**: Reinforces our developer tool positioning

#### Cons
- **Not Designed for SaaS**: GitHub Sponsors is for supporting open-source work, not commercial SaaS billing
- **Limited Subscription Management**: No built-in proration, upgrades/downgrades, or complex billing logic
- **No Customer Portal**: Users manage subscriptions through GitHub, not your app
- **No Usage-Based Billing**: Cannot charge based on resource usage or overages
- **Limited Revenue Model Flexibility**: Fixed monthly sponsorship tiers only
- **No Invoicing**: Cannot generate custom invoices or handle enterprise billing
- **No Tax Automation**: Limited tax collection/remittance capabilities
- **Terms of Service Risk**: Using Sponsors for commercial SaaS may violate GitHub's intended use case
- **Approval Required**: Must be approved for GitHub Sponsors program
- **Limited Customization**: Cannot customize checkout experience or branding
- **No Trials or Prorations**: Cannot offer free trials or handle mid-cycle changes gracefully

#### API & Integration Capabilities
- **GraphQL API**: Query sponsorship data, tier information, and sponsor lists
- **Webhooks**: Receive events for sponsorship lifecycle changes
- **Limitations**: 
  - Cannot programmatically create/cancel sponsorships (user-initiated only)
  - No support for complex subscription logic
  - Limited to GitHub's feature set

#### Pricing
- **Personal Sponsorships**: 0% platform fee + standard payment processing (~2.9% + $0.30)
- **Organization Sponsorships**: Up to 6% fee (3% processing + 3% GitHub fee)
  - Can reduce to 3% with invoiced billing
- **Effective Cost**: ~3-6% of revenue depending on sponsorship type

### 2. Stripe

#### Overview
Stripe is the industry-standard payment platform for SaaS applications, offering comprehensive billing, subscription management, and payment processing capabilities.

#### Pros
- **Built for SaaS**: Designed specifically for subscription billing and SaaS business models
- **Comprehensive Features**:
  - Subscription management with upgrades/downgrades
  - Proration and credit management
  - Free trials and coupon codes
  - Usage-based billing and metering
  - Customer portal for self-service
  - Invoice generation and custom billing
  - Dunning management (failed payment recovery)
  - Tax automation (Stripe Tax)
- **Flexible Revenue Models**: Support for tiered, per-seat, usage-based, and hybrid pricing
- **Enterprise Ready**: Support for quotes, contracts, and custom agreements
- **Excellent Next.js Integration**: Well-documented patterns with Next.js 15
- **Rich API**: Comprehensive REST API with webhooks for all events
- **Analytics & Reporting**: Built-in revenue analytics and reporting tools
- **International Support**: Multi-currency, localized payment methods
- **Customer Portal**: Stripe-hosted portal for subscription management
- **Battle-Tested**: Used by thousands of SaaS companies at all scales

#### Cons
- **Higher Platform Fees**: 2.9% + $0.30 per transaction + 0.7% of recurring billing volume
- **Implementation Complexity**: Requires proper webhook handling, security, and state management
- **Separate Account Required**: Users need to create/manage payment details separately from GitHub
- **PCI Compliance**: Must follow security best practices (though Stripe handles most of this)
- **Webhook Maintenance**: Need to handle webhook events reliably (delivery, retries, idempotency)
- **More Code to Maintain**: Custom integration means more code to write and maintain

#### API & Integration Capabilities
- **Checkout Sessions**: Pre-built, hosted checkout pages (simplest integration)
- **Payment Intents**: Custom checkout flows with full control
- **Webhooks**: Comprehensive event system for all subscription lifecycle events
- **Customer Portal**: Allow customers to manage subscriptions, invoices, and payment methods
- **Stripe Billing**: Full subscription management with trials, coupons, proration
- **Stripe Tax**: Automated tax calculation and collection

#### Pricing (2024)
- **Transaction Fee**: 2.9% + $0.30 per successful card charge (domestic)
  - +1% for international cards
  - +1% for currency conversion
- **Stripe Billing Fee**: 0.7% of recurring billing volume (increased from 0.5% in 2024)
  - Grace period until June 30, 2025 for existing customers at 0.5%
- **ACH Direct Debit**: 0.8% per transaction (capped at $5)
- **Effective Cost**: ~3.6% of revenue for domestic subscriptions (2.9% + 0.7%)
  - Example: $100 monthly subscription = $3.60 in fees ($2.90 + $0.70)

#### Integration Complexity for Next.js 15 + PostgreSQL

**Estimated Implementation Time**: 2-3 days for basic subscription flow

**Core Components Needed**:

1. **Database Schema** (1-2 hours)
   ```sql
   -- Tables needed:
   - stripe_customers (user_id, stripe_customer_id, email)
   - subscriptions (id, user_id, stripe_subscription_id, status, plan_id, current_period_end)
   - subscription_plans (id, name, stripe_price_id, amount, interval)
   - payment_events (id, stripe_event_id, type, processed_at, raw_data)
   ```

2. **Server Action: Create Checkout Session** (2-3 hours)
   ```typescript
   // app/actions/stripe.ts
   'use server'
   import Stripe from 'stripe'
   
   export async function createCheckoutSession(priceId: string, userId: string) {
     const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
     const session = await stripe.checkout.sessions.create({
       mode: 'subscription',
       payment_method_types: ['card'],
       line_items: [{ price: priceId, quantity: 1 }],
       success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
       cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
       metadata: { userId }
     })
     return session.url
   }
   ```

3. **Webhook Handler** (4-6 hours - most complex part)
   ```typescript
   // app/api/webhooks/stripe/route.ts
   import { headers } from 'next/headers'
   import Stripe from 'stripe'
   
   export async function POST(req: Request) {
     const body = await req.text()
     const signature = headers().get('stripe-signature')!
     const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
     
     const event = stripe.webhooks.constructEvent(
       body,
       signature,
       process.env.STRIPE_WEBHOOK_SECRET!
     )
     
     // Handle events:
     // - checkout.session.completed: Create subscription record
     // - customer.subscription.updated: Update subscription status
     // - customer.subscription.deleted: Cancel subscription
     // - invoice.payment_succeeded: Extend access
     // - invoice.payment_failed: Notify user, handle dunning
     
     return Response.json({ received: true })
   }
   ```

4. **Frontend Components** (2-3 hours)
   - Pricing page with plan cards
   - Checkout button component
   - Subscription management page
   - Success/cancel pages

5. **Customer Portal Integration** (1 hour)
   ```typescript
   export async function createPortalSession(customerId: string) {
     const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
     const session = await stripe.billingPortal.sessions.create({
       customer: customerId,
       return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`
     })
     return session.url
   }
   ```

**Testing & Quality Assurance** (4-8 hours)
- Local webhook testing with Stripe CLI
- Test all subscription lifecycle events
- Handle edge cases (failed payments, cancellations)
- Ensure idempotency for webhook events

**Total Estimated Time**: 14-23 hours of development time

**Ongoing Maintenance**:
- Monitor webhook delivery and handle retries
- Update for Stripe API changes
- Handle customer support issues
- Ensure webhook endpoint stays reliable

## Comparison Table

| Criteria | GitHub Sponsors | Stripe |
|----------|----------------|--------|
| **Platform Fees** | 0-6% (0% for personal, up to 6% for org) | 3.6% (2.9% + 0.30 + 0.7% billing) |
| **Integration Time** | 1-2 days | 2-3 days |
| **Subscription Management** | Basic (fixed tiers only) | Advanced (trials, proration, upgrades) |
| **Usage-Based Billing** | ❌ No | ✅ Yes |
| **Customer Portal** | GitHub-hosted (limited) | Stripe-hosted (full-featured) |
| **Tax Automation** | ❌ Limited | ✅ Yes (Stripe Tax) |
| **Invoice Generation** | ❌ No | ✅ Yes |
| **Free Trials** | ❌ No | ✅ Yes |
| **Proration** | ❌ No | ✅ Yes |
| **Failed Payment Recovery** | ❌ Limited | ✅ Yes (Smart Retry) |
| **API Capabilities** | GraphQL + Webhooks (limited) | Comprehensive REST API + Webhooks |
| **User Experience** | Native GitHub | Custom/Stripe-hosted |
| **Appropriate for SaaS** | ⚠️ Questionable | ✅ Yes |
| **Brand Alignment** | Strong (developer tool) | Neutral |
| **Risk of ToS Violation** | ⚠️ Moderate-High | ✅ None |
| **International Support** | Limited | Excellent |
| **Enterprise Features** | ❌ No | ✅ Yes |

## Recommended Approach: Stripe

**Recommendation**: Use Stripe for Catalyst's payment collection.

### Justification

While GitHub Sponsors has appeal due to our GitHub integration and slightly lower fees, **Stripe is the clear choice** for the following reasons:

1. **Purpose-Built for SaaS**: GitHub Sponsors is designed for supporting open-source work, not commercial SaaS products. Using it for Catalyst could:
   - Violate GitHub's Terms of Service
   - Risk account suspension or forced migration
   - Send wrong message to users about our business model

2. **Essential Features**: Stripe provides critical SaaS features we'll need:
   - **Free Trials**: Essential for user acquisition and conversion
   - **Usage-Based Billing**: May want to charge based on environments, build minutes, etc.
   - **Proration**: Fair billing when users upgrade/downgrade mid-cycle
   - **Failed Payment Recovery**: Automated dunning to reduce churn
   - **Customer Portal**: Let users manage subscriptions without support tickets

3. **Growth Headroom**: As Catalyst grows, we'll need:
   - Enterprise billing (quotes, contracts, invoices)
   - Volume discounts and custom pricing
   - Advanced analytics and reporting
   - Integration with accounting systems
   - Tax automation for international sales

4. **Industry Standard**: Stripe is the expected payment solution for SaaS:
   - Users trust Stripe for payment security
   - Well-documented integration patterns
   - Extensive community support and resources
   - Battle-tested at scale

5. **Total Cost of Ownership**: While Stripe has slightly higher fees (3.6% vs 0-6%), the value provided justifies the cost:
   - Reduced churn through dunning
   - Higher conversion with free trials
   - Less support burden with customer portal
   - Time saved on billing edge cases
   - Avoiding ToS violation risk

6. **Reasonable Implementation Cost**: 2-3 days of development is acceptable for a payment system that will be the foundation of our business model.

### When GitHub Sponsors Might Be Appropriate

GitHub Sponsors would only make sense if:
- Catalyst was positioned as an open-source project accepting donations
- We had a completely free tier with optional "sponsor" support
- We were explicitly not running a commercial SaaS business
- We didn't need any advanced billing features

Since Catalyst is a commercial deployment platform, these conditions don't apply.

## Implementation Plan for Stripe

### Phase 1: Core Subscription Flow (Week 1)

**Day 1-2: Setup & Schema**
- [ ] Create Stripe account and configure test mode
- [ ] Install Stripe dependencies (`stripe`, `@stripe/stripe-js`)
- [ ] Set up environment variables (secret key, publishable key, webhook secret)
- [ ] Design and implement database schema:
  ```typescript
  // Drizzle schema additions needed:
  - stripeCustomers table (userId → stripeCustomerId mapping)
  - subscriptions table (subscription lifecycle tracking)
  - subscriptionPlans table (plan definitions)
  - stripeWebhookEvents table (event deduplication)
  ```
- [ ] Create database migration with `npm run db:generate`
- [ ] Apply migration with `npm run db:migrate`

**Day 2-3: Checkout Flow**
- [ ] Create subscription plans in Stripe Dashboard
  - Starter: $19/month
  - Pro: $49/month  
  - Enterprise: $199/month
- [ ] Create pricing page component (`/app/(dashboard)/pricing/page.tsx`)
- [ ] Implement Server Action to create checkout session
- [ ] Add checkout button component with loading states
- [ ] Create success/cancel redirect pages
- [ ] Test checkout flow end-to-end

**Day 3-4: Webhook Handler**
- [ ] Create webhook endpoint (`/app/api/webhooks/stripe/route.ts`)
- [ ] Implement signature verification
- [ ] Handle core events:
  - `checkout.session.completed`: Create subscription record
  - `customer.subscription.updated`: Update status/plan
  - `customer.subscription.deleted`: Mark as cancelled
  - `invoice.payment_succeeded`: Extend access period
  - `invoice.payment_failed`: Send notification, handle retry
- [ ] Implement idempotency using event ID tracking
- [ ] Add proper error handling and logging
- [ ] Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

**Day 4-5: Subscription Management**
- [ ] Create billing settings page (`/app/(dashboard)/settings/billing/page.tsx`)
- [ ] Display current subscription details
- [ ] Implement customer portal session creation
- [ ] Add "Manage Subscription" button linking to Stripe portal
- [ ] Show subscription status (active, past_due, cancelled)
- [ ] Display next billing date and amount

### Phase 2: Access Control (Week 2)

**Day 1-2: Permission System**
- [ ] Add subscription status check middleware
- [ ] Create `hasActiveSubscription()` helper function
- [ ] Implement feature gates based on plan tier
- [ ] Add subscription requirement to environment creation
- [ ] Show upgrade prompts for gated features
- [ ] Create banner for trial/payment issues

**Day 2-3: User Experience**
- [ ] Add subscription status to dashboard
- [ ] Implement "Upgrade" CTAs throughout app
- [ ] Create email notifications for:
  - Subscription confirmed
  - Payment failed
  - Subscription cancelled
  - Trial ending soon
- [ ] Add admin view to see all subscriptions

### Phase 3: Advanced Features (Week 3)

**Day 1-2: Free Trial**
- [ ] Configure trial period in Stripe (14 days)
- [ ] Update checkout session creation to include trial
- [ ] Add trial countdown UI
- [ ] Send trial ending notifications

**Day 2-3: Usage Tracking** (Future enhancement)
- [ ] Design metered billing schema
- [ ] Implement usage event reporting to Stripe
- [ ] Add usage dashboard for users
- [ ] Configure usage-based pricing tiers

**Day 3-4: Polish & Testing**
- [ ] Write integration tests for webhook handlers
- [ ] Test all subscription lifecycle scenarios
- [ ] Load test webhook endpoint
- [ ] Security audit (signature verification, rate limiting)
- [ ] Add monitoring/alerting for webhook failures
- [ ] Create runbook for payment issues

### Phase 4: Production Launch (Week 4)

**Day 1: Stripe Production Setup**
- [ ] Verify business details in Stripe account
- [ ] Configure production webhook endpoint
- [ ] Set up production pricing
- [ ] Configure Stripe Tax (if needed)
- [ ] Set up payment failure email notifications

**Day 2: Deployment**
- [ ] Deploy webhook endpoint with monitoring
- [ ] Verify webhook signature in production
- [ ] Test with real credit card (refund immediately)
- [ ] Monitor first few real subscriptions closely

**Day 3-4: Monitoring & Optimization**
- [ ] Set up webhook delivery monitoring
- [ ] Configure alerts for failed payments
- [ ] Review and optimize webhook retry logic
- [ ] Document common support scenarios
- [ ] Train team on handling payment issues

### Ongoing Maintenance

**Weekly**:
- Monitor webhook delivery success rate
- Review failed payment reports
- Check subscription churn metrics

**Monthly**:
- Review Stripe fees and reconcile with revenue
- Analyze subscription upgrade/downgrade patterns
- Update pricing/plans as needed

**Quarterly**:
- Review and update Stripe API integration for changes
- Evaluate new Stripe features for adoption
- Audit security and compliance

## Key Files to Create/Modify

### New Files
```
web/src/db/schema.ts                          # Add Stripe tables
web/drizzle/0XXX_stripe_subscriptions.sql    # Migration
web/src/actions/stripe.ts                     # Server actions for Stripe
web/src/lib/stripe.ts                         # Stripe client singleton
web/src/models/subscriptions.ts               # Subscription business logic
web/app/api/webhooks/stripe/route.ts         # Webhook handler
web/app/(dashboard)/pricing/page.tsx         # Pricing page
web/app/(dashboard)/settings/billing/page.tsx # Billing management
web/src/components/checkout-button.tsx        # Checkout component
web/src/middleware.ts                         # Add subscription checks
```

### Modified Files
```
web/.env                                      # Add Stripe keys
web/package.json                              # Add Stripe dependencies
web/src/db/schema.ts                          # Add Stripe tables
web/src/app/(dashboard)/layout.tsx           # Add subscription status
web/src/middleware.ts                         # Add subscription checks
```

## Security Considerations

1. **Webhook Signature Verification**: Always verify `stripe-signature` header
2. **Environment Variables**: Never expose secret keys in client code
3. **Idempotency**: Use `stripe_event_id` to prevent duplicate processing
4. **Database Transactions**: Use transactions for webhook handlers
5. **Rate Limiting**: Protect webhook endpoint from abuse
6. **Logging**: Log all webhook events for audit trail (but sanitize sensitive data)
7. **Error Handling**: Gracefully handle Stripe API errors and retries

## Testing Strategy

1. **Local Development**: Use Stripe test mode + Stripe CLI for webhooks
2. **Integration Tests**: Mock Stripe API responses for webhook handlers
3. **E2E Tests**: Test checkout flow with Stripe test cards
4. **Manual Testing**: Test all subscription lifecycle scenarios:
   - New subscription
   - Upgrade/downgrade
   - Cancellation
   - Failed payment
   - Reactivation

## Migration Path (Future Consideration)

If we ever need to migrate away from Stripe:
- Export all customer and subscription data
- Create migration script to new provider
- Run both systems in parallel during migration
- Use feature flags to switch payment provider per user
- Monitor closely for several months

## Conclusion

**Stripe is the recommended solution** for Catalyst's payment collection. While it requires more implementation effort than GitHub Sponsors, it provides:
- Appropriate SaaS billing capabilities
- No Terms of Service risk
- Essential features for growth (trials, usage billing, proration)
- Industry-standard integration patterns
- Better long-term scalability

The 2-3 day implementation time is reasonable for establishing our payment foundation, and the slightly higher fees (3.6% vs 0-6%) are justified by the comprehensive features and reduced business risk.

**Next Steps**: Begin Phase 1 implementation with Stripe test mode, following the implementation plan outlined above.
