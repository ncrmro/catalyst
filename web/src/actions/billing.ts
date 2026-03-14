"use server";

/**
 * Billing Server Actions
 *
 * Server actions for billing flows: checkout, portal, and billing status.
 * These actions dynamically import the billing package when BILLING_ENABLED=true
 * and provide appropriate errors when billing is disabled.
 *
 * All actions verify team admin/owner role before proceeding.
 */

import { auth } from "@/auth";
import { db } from "@/db";
import { isUserTeamAdminOrOwner, isUserTeamMember } from "@/lib/team-auth";
import { getBilling, isBillingEnabled } from "@/lib/billing-guard";
import { teams } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Result type for billing operations
 */
interface BillingActionResult<T = void> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Create a Stripe Checkout session for a team to upgrade to paid plan.
 * Requires team admin or owner role and billing to be enabled.
 *
 * @param teamId - The team ID to create checkout for
 * @returns Checkout URL to redirect user to, or error
 */
export async function createCheckoutSession(
  teamId: string,
): Promise<BillingActionResult<{ checkoutUrl: string }>> {
  try {
    // Check if billing is enabled
    if (!isBillingEnabled()) {
      return {
        success: false,
        error: "Billing is not enabled on this instance",
      };
    }

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to manage billing",
      };
    }

    // Check team admin/owner permission
    const isAdmin = await isUserTeamAdminOrOwner(teamId);
    if (!isAdmin) {
      return {
        success: false,
        error: "Only team owners and admins can manage billing",
      };
    }

    // Get team details
    const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
    if (!team) {
      return {
        success: false,
        error: "Team not found",
      };
    }

    // Dynamically import billing package
    const billing = await getBilling();
    if (!billing) {
      return {
        success: false,
        error: "Billing package not available",
      };
    }

    // Get or create Stripe customer
    const customerId = await billing.getOrCreateStripeCustomer(
      db,
      teamId,
      team.name,
      session.user.email ?? "",
    );

    // Get price ID from environment
    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      return {
        success: false,
        error: "Billing is not configured. Please contact support.",
      };
    }

    // Create checkout session
    const { checkoutUrl } = await billing.createCheckoutSession({
      teamId,
      teamName: team.name,
      customerEmail: session.user.email ?? "",
      customerId,
      successUrl: `${process.env.NEXTAUTH_URL}/settings/billing?success=true`,
      cancelUrl: `${process.env.NEXTAUTH_URL}/settings/billing?canceled=true`,
      priceId,
    });

    return {
      success: true,
      data: { checkoutUrl },
    };
  } catch (error) {
    console.error("[billing-actions] createCheckoutSession error:", error);
    return {
      success: false,
      error: "Failed to create checkout session. Please try again.",
    };
  }
}

/**
 * Create a Stripe Billing Portal session for managing subscriptions.
 * Requires team admin or owner role and existing Stripe customer.
 *
 * @param teamId - The team ID to create portal session for
 * @returns Portal URL to redirect user to, or error
 */
export async function createBillingPortalSession(
  teamId: string,
): Promise<BillingActionResult<{ portalUrl: string }>> {
  try {
    // Check if billing is enabled
    if (!isBillingEnabled()) {
      return {
        success: false,
        error: "Billing is not enabled on this instance",
      };
    }

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to manage billing",
      };
    }

    // Check team admin/owner permission
    const isAdmin = await isUserTeamAdminOrOwner(teamId);
    if (!isAdmin) {
      return {
        success: false,
        error: "Only team owners and admins can manage billing",
      };
    }

    // Dynamically import billing package
    const billing = await getBilling();
    if (!billing) {
      return {
        success: false,
        error: "Billing package not available",
      };
    }

    // Get Stripe customer
    const customer = await billing.getStripeCustomerByTeamId(db, teamId);
    if (!customer) {
      return {
        success: false,
        error: "No billing account found for this team",
      };
    }

    // Create portal session
    const { portalUrl } = await billing.createBillingPortalSession({
      customerId: customer.stripeCustomerId,
      returnUrl: `${process.env.NEXTAUTH_URL}/settings/billing`,
    });

    return {
      success: true,
      data: { portalUrl },
    };
  } catch (error) {
    console.error("[billing-actions] createBillingPortalSession error:", error);
    return {
      success: false,
      error: "Failed to create billing portal session. Please try again.",
    };
  }
}

/**
 * Get billing status for a team including subscription and usage summary.
 * Requires team admin or owner role.
 *
 * @param teamId - The team ID to get billing status for
 * @returns Billing status with subscription and usage data, or error
 */
export async function getTeamBillingStatus(teamId: string): Promise<
  BillingActionResult<{
    hasSubscription: boolean;
    subscription: {
      id: string;
      status: string;
      currentPeriodEnd: Date | null;
      cancelAtPeriodEnd: boolean;
    } | null;
    customerId: string | null;
    currentMonthUsage: {
      activeEnvDays: number;
      spundownEnvDays: number;
    };
    freeTierLimits: {
      ACTIVE_ENVIRONMENTS: number;
      SPUNDOWN_ENVIRONMENTS: number;
      PROJECTS: number;
    };
  }>
> {
  try {
    // Check if billing is enabled
    if (!isBillingEnabled()) {
      return {
        success: false,
        error: "Billing is not enabled on this instance",
      };
    }

    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return {
        success: false,
        error: "You must be logged in to view billing",
      };
    }

    // Check team admin/owner permission
    const isAdmin = await isUserTeamAdminOrOwner(teamId);
    if (!isAdmin) {
      return {
        success: false,
        error: "Only team owners and admins can view billing",
      };
    }

    // Dynamically import billing package
    const billing = await getBilling();
    if (!billing) {
      return {
        success: false,
        error: "Billing package not available",
      };
    }

    // Get billing status from model
    const billingStatus = await billing.getTeamBillingStatus(db, teamId);

    return {
      success: true,
      data: billingStatus,
    };
  } catch (error) {
    console.error("[billing-actions] getTeamBillingStatus error:", error);
    return {
      success: false,
      error: "Failed to retrieve billing status. Please try again.",
    };
  }
}

/**
 * Check if a team has an active subscription.
 * Works for all team members (not just admins/owners).
 * Returns true if billing is disabled (grant access by default).
 *
 * @param teamId - The team ID to check
 * @returns true if the team has an active subscription or billing is disabled
 */
export async function checkTeamHasActiveSubscription(
  teamId: string,
): Promise<boolean> {
  // If billing is not enabled, grant access to all team members
  if (!isBillingEnabled()) {
    return true;
  }

  const session = await auth();
  if (!session?.user?.id) {
    return false;
  }

  const isMember = await isUserTeamMember(teamId);
  if (!isMember) {
    return false;
  }

  try {
    const billing = await getBilling();
    if (!billing) {
      // Billing package unavailable despite being enabled — grant access
      return true;
    }

    return billing.isTeamOnPaidPlan(db, teamId);
  } catch (error) {
    console.error("[billing-actions] checkTeamHasActiveSubscription error:", error);
    return false;
  }
}
