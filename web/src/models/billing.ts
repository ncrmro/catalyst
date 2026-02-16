/**
 * Billing Models
 *
 * Database operations for Stripe billing integration.
 * Handles customer management, subscriptions, and usage recording.
 *
 * No authentication - handled by actions layer.
 */

import { db } from "@/db";
import {
  stripeCustomers,
  stripeSubscriptions,
  usageRecords,
  teams,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import {
  createCustomer as createStripeCustomer,
  FREE_TIER_LIMITS,
} from "@/lib/stripe";
import type Stripe from "stripe";

/**
 * Get or create a Stripe customer for a team.
 * If the team doesn't have a Stripe customer, creates one via Stripe API.
 *
 * @param teamId - Team ID
 * @param teamName - Team name (used for Stripe customer name)
 * @param email - Email for the Stripe customer
 * @returns Stripe customer ID
 */
export async function getOrCreateStripeCustomer(
  teamId: string,
  teamName: string,
  email: string,
): Promise<string> {
  // Check if customer already exists
  const existing = await db
    .select()
    .from(stripeCustomers)
    .where(eq(stripeCustomers.teamId, teamId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0].stripeCustomerId;
  }

  // Create customer in Stripe
  const customer = await createStripeCustomer({
    email,
    name: teamName,
    metadata: { teamId },
  });

  // Store mapping in database
  await db.insert(stripeCustomers).values({
    teamId,
    stripeCustomerId: customer.id,
    email,
  });

  return customer.id;
}

/**
 * Get Stripe customer for a team.
 *
 * @param teamId - Team ID
 * @returns Stripe customer record or null
 */
export async function getStripeCustomerByTeamId(teamId: string) {
  const customers = await db
    .select()
    .from(stripeCustomers)
    .where(eq(stripeCustomers.teamId, teamId))
    .limit(1);

  return customers[0] ?? null;
}

/**
 * Get Stripe customer by Stripe customer ID.
 *
 * @param stripeCustomerId - Stripe customer ID
 * @returns Stripe customer record or null
 */
export async function getStripeCustomerByStripeId(stripeCustomerId: string) {
  const customers = await db
    .select()
    .from(stripeCustomers)
    .where(eq(stripeCustomers.stripeCustomerId, stripeCustomerId))
    .limit(1);

  return customers[0] ?? null;
}

/**
 * Link a Stripe customer to a team (from checkout.session.completed webhook).
 *
 * @param teamId - Team ID from session metadata
 * @param stripeCustomerId - Stripe customer ID
 * @param email - Customer email
 */
export async function linkStripeCustomer(
  teamId: string,
  stripeCustomerId: string,
  email: string | null,
) {
  // Check if already linked
  const existing = await db
    .select()
    .from(stripeCustomers)
    .where(eq(stripeCustomers.teamId, teamId))
    .limit(1);

  if (existing.length > 0) {
    // Update if needed
    if (existing[0].stripeCustomerId !== stripeCustomerId) {
      await db
        .update(stripeCustomers)
        .set({
          stripeCustomerId,
          email,
          updatedAt: new Date(),
        })
        .where(eq(stripeCustomers.teamId, teamId));
    }
    return;
  }

  // Create new link
  await db.insert(stripeCustomers).values({
    teamId,
    stripeCustomerId,
    email,
  });
}

/**
 * Upsert a subscription record from Stripe webhook data.
 *
 * @param teamId - Team ID
 * @param subscription - Stripe subscription object
 */
export async function upsertSubscription(
  teamId: string,
  subscription: Stripe.Subscription,
) {
  const subscriptionData = {
    teamId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId:
      typeof subscription.customer === "string"
        ? subscription.customer
        : subscription.customer.id,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    canceledAt: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000)
      : null,
    updatedAt: new Date(),
  };

  // Try to update existing
  const updated = await db
    .update(stripeSubscriptions)
    .set(subscriptionData)
    .where(eq(stripeSubscriptions.stripeSubscriptionId, subscription.id))
    .returning();

  if (updated.length > 0) {
    return updated[0];
  }

  // Insert new
  const [created] = await db
    .insert(stripeSubscriptions)
    .values(subscriptionData)
    .returning();

  return created;
}

/**
 * Get subscription for a team.
 *
 * @param teamId - Team ID
 * @returns Active subscription or null
 */
export async function getSubscriptionByTeamId(teamId: string) {
  const subscriptions = await db
    .select()
    .from(stripeSubscriptions)
    .where(
      and(
        eq(stripeSubscriptions.teamId, teamId),
        // Only return active-ish subscriptions
        inArray(stripeSubscriptions.status, [
          "active",
          "trialing",
          "past_due",
          "incomplete",
        ]),
      ),
    )
    .limit(1);

  return subscriptions[0] ?? null;
}

/**
 * Check if a team is on a paid plan (has active subscription).
 *
 * @param teamId - Team ID
 * @returns True if team has an active subscription
 */
export async function isTeamOnPaidPlan(teamId: string): Promise<boolean> {
  const subscription = await getSubscriptionByTeamId(teamId);

  if (!subscription) {
    return false;
  }

  // Consider active, trialing, and past_due as "paid"
  // (past_due still has access while payment is being resolved)
  return ["active", "trialing", "past_due"].includes(subscription.status);
}

/**
 * Record daily usage for a team.
 * Idempotent - will update existing record for the same date.
 *
 * @param teamId - Team ID
 * @param date - Usage date
 * @param counts - Environment counts
 */
export async function recordDailyUsage(
  teamId: string,
  date: Date,
  counts: {
    activeCount: number;
    spundownCount: number;
  },
) {
  // Calculate billable amounts (subtract free tier)
  const billableActive = Math.max(
    0,
    counts.activeCount - FREE_TIER_LIMITS.ACTIVE_ENVIRONMENTS,
  );
  const billableSpundown = Math.max(
    0,
    counts.spundownCount - FREE_TIER_LIMITS.SPUNDOWN_ENVIRONMENTS,
  );

  const usageData = {
    teamId,
    usageDate: date,
    activeEnvironmentCount: counts.activeCount,
    spundownEnvironmentCount: counts.spundownCount,
    billableActiveCount: billableActive,
    billableSpundownCount: billableSpundown,
    updatedAt: new Date(),
  };

  // Check if record exists for this date
  const existing = await db
    .select()
    .from(usageRecords)
    .where(
      and(eq(usageRecords.teamId, teamId), eq(usageRecords.usageDate, date)),
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing record
    const [updated] = await db
      .update(usageRecords)
      .set(usageData)
      .where(eq(usageRecords.id, existing[0].id))
      .returning();

    return updated;
  }

  // Insert new record
  const [created] = await db
    .insert(usageRecords)
    .values(usageData)
    .returning();

  return created;
}

/**
 * Mark a usage record as reported to Stripe.
 *
 * @param usageRecordId - Usage record ID
 * @param error - Optional error message if reporting failed
 */
export async function markUsageReported(
  usageRecordId: string,
  error?: string,
) {
  await db
    .update(usageRecords)
    .set({
      reportedToStripe: !error,
      reportedAt: new Date(),
      reportError: error ?? null,
      updatedAt: new Date(),
    })
    .where(eq(usageRecords.id, usageRecordId));
}

/**
 * Get unreported usage records for billing.
 *
 * @returns Usage records that haven't been reported to Stripe
 */
export async function getUnreportedUsageRecords() {
  return db
    .select({
      usageRecord: usageRecords,
      team: teams,
      customer: stripeCustomers,
    })
    .from(usageRecords)
    .innerJoin(teams, eq(usageRecords.teamId, teams.id))
    .leftJoin(stripeCustomers, eq(usageRecords.teamId, stripeCustomers.teamId))
    .where(eq(usageRecords.reportedToStripe, false));
}

/**
 * Get team billing status including subscription and usage.
 *
 * @param teamId - Team ID
 * @returns Billing status with subscription and current usage
 */
export async function getTeamBillingStatus(teamId: string) {
  const [subscription, customer] = await Promise.all([
    getSubscriptionByTeamId(teamId),
    getStripeCustomerByTeamId(teamId),
  ]);

  // Get current month usage (simplified - all records for team)
  // In production, would filter by date range
  const monthlyUsage = await db
    .select()
    .from(usageRecords)
    .where(eq(usageRecords.teamId, teamId));

  // Calculate totals
  const totalActiveEnvDays = monthlyUsage.reduce(
    (sum, r) => sum + r.billableActiveCount,
    0,
  );
  const totalSpundownEnvDays = monthlyUsage.reduce(
    (sum, r) => sum + r.billableSpundownCount,
    0,
  );

  return {
    hasSubscription: !!subscription,
    subscription: subscription
      ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        }
      : null,
    customerId: customer?.stripeCustomerId ?? null,
    currentMonthUsage: {
      activeEnvDays: totalActiveEnvDays,
      spundownEnvDays: totalSpundownEnvDays,
    },
    freeTierLimits: FREE_TIER_LIMITS,
  };
}
