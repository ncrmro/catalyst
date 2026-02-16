/**
 * Stripe Client Library
 *
 * Provides a singleton Stripe client and helper functions for billing operations.
 * Used for checkout sessions, billing portal, and usage-based billing meters.
 */

import Stripe from "stripe";
import { createLogger } from "./logging";

const logger = createLogger("stripe");

// Billing meter identifiers (configured in Stripe Dashboard)
export const BILLING_METERS = {
  ACTIVE_ENV_DAY: "active_env_day",
  SPINDOWN_ENV_DAY: "spindown_env_day",
} as const;

// Free tier limits
export const FREE_TIER_LIMITS = {
  ACTIVE_ENVIRONMENTS: 3,
  SPUNDOWN_ENVIRONMENTS: 5,
  PROJECTS: 1,
} as const;

// Pricing (for display purposes, actual prices in Stripe)
export const PRICING = {
  ACTIVE_ENV_MONTHLY: 3.5, // $3.50/month
  SPUNDOWN_ENV_MONTHLY: 0.75, // $0.75/month
} as const;

/**
 * Get the Stripe secret key from environment, throwing if not set.
 */
function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY environment variable is not set. " +
        "Please configure Stripe credentials in your .env file.",
    );
  }
  return key;
}

/**
 * Singleton Stripe client instance.
 * Lazily initialized on first use.
 */
let stripeInstance: Stripe | null = null;

/**
 * Get the Stripe client singleton.
 * Throws if STRIPE_SECRET_KEY is not configured.
 */
export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(getStripeSecretKey(), {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return stripeInstance;
}

/**
 * Check if Stripe is configured (env vars present).
 * Use this for graceful degradation when Stripe is optional.
 */
export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

/**
 * Create a checkout session for a team to subscribe to the paid plan.
 *
 * @param params - Checkout session parameters
 * @returns The checkout session URL to redirect the user to
 */
export async function createCheckoutSession(params: {
  teamId: string;
  teamName: string;
  customerEmail: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  priceId: string;
}): Promise<{ checkoutUrl: string; sessionId: string }> {
  const stripe = getStripeClient();

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [
      {
        price: params.priceId,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      teamId: params.teamId,
      teamName: params.teamName,
    },
    subscription_data: {
      metadata: {
        teamId: params.teamId,
        teamName: params.teamName,
      },
    },
  };

  // Use existing customer or create one from email
  if (params.customerId) {
    sessionParams.customer = params.customerId;
  } else {
    sessionParams.customer_email = params.customerEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  logger.info("Created checkout session", {
    teamId: params.teamId,
    sessionId: session.id,
  });

  if (!session.url) {
    throw new Error("Checkout session created but URL is missing");
  }

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  };
}

/**
 * Create a billing portal session for managing subscriptions.
 *
 * @param params - Portal session parameters
 * @returns The portal URL to redirect the user to
 */
export async function createBillingPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<{ portalUrl: string }> {
  const stripe = getStripeClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  logger.info("Created billing portal session", {
    customerId: params.customerId,
  });

  return {
    portalUrl: session.url,
  };
}

/**
 * Record a usage meter event for billing.
 * Used for tracking active/spun-down environment usage.
 *
 * @param params - Meter event parameters
 */
export async function recordUsageMeterEvent(params: {
  customerId: string;
  eventName: string;
  value: number;
  timestamp?: number;
  idempotencyKey?: string;
}): Promise<void> {
  const stripe = getStripeClient();

  const meterEvent: Stripe.Billing.MeterEventCreateParams = {
    event_name: params.eventName,
    payload: {
      stripe_customer_id: params.customerId,
      value: String(params.value),
    },
    timestamp: params.timestamp ?? Math.floor(Date.now() / 1000),
  };

  const requestOptions: Stripe.RequestOptions = {};
  if (params.idempotencyKey) {
    requestOptions.idempotencyKey = params.idempotencyKey;
  }

  await stripe.billing.meterEvents.create(meterEvent, requestOptions);

  logger.info("Recorded usage meter event", {
    customerId: params.customerId,
    eventName: params.eventName,
    value: params.value,
  });
}

/**
 * Retrieve a customer by ID.
 */
export async function getCustomer(
  customerId: string,
): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
  const stripe = getStripeClient();
  return stripe.customers.retrieve(customerId);
}

/**
 * Create a new Stripe customer.
 */
export async function createCustomer(params: {
  email: string;
  name: string;
  metadata: { teamId: string };
}): Promise<Stripe.Customer> {
  const stripe = getStripeClient();

  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: params.metadata,
  });

  logger.info("Created Stripe customer", {
    customerId: customer.id,
    teamId: params.metadata.teamId,
  });

  return customer;
}

/**
 * Retrieve a subscription by ID.
 */
export async function getSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  const stripe = getStripeClient();
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Construct and verify a Stripe webhook event from the raw body and signature.
 *
 * @param rawBody - The raw request body as a string or buffer
 * @param signature - The Stripe-Signature header value
 * @returns The verified Stripe event
 */
export function constructWebhookEvent(
  rawBody: string | Buffer,
  signature: string,
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set");
  }

  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
