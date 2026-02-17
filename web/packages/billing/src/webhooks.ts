/**
 * Stripe Webhook Event Handlers
 *
 * Processes Stripe webhook events for subscription lifecycle management.
 * Handles checkout completion, subscription updates, and payment events.
 */

import type Stripe from "stripe";
import type { PgDatabase } from "drizzle-orm/pg-core";
import {
  linkStripeCustomer,
  upsertSubscription,
  getStripeCustomerByStripeId,
} from "./models";
import { getSubscription } from "./stripe";

/**
 * Handle checkout.session.completed event.
 * Links the Stripe customer to the team and creates the subscription record.
 *
 * @param db - Drizzle database instance
 * @param event - Stripe checkout session completed event
 */
export async function handleCheckoutSessionCompleted(
  db: PgDatabase<any, any, any>,
  event: Stripe.CheckoutSessionCompletedEvent,
): Promise<void> {
  const session = event.data.object;

  console.info("[webhook] Processing checkout.session.completed", {
    sessionId: session.id,
    customerId: session.customer,
  });

  // Extract team ID from session metadata
  const teamId = session.metadata?.teamId;
  if (!teamId) {
    console.error("[webhook] No teamId in session metadata", {
      sessionId: session.id,
    });
    throw new Error("Missing teamId in session metadata");
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  if (!customerId) {
    console.error("[webhook] No customer ID in session", {
      sessionId: session.id,
    });
    throw new Error("Missing customer ID in session");
  }

  // Link customer to team (idempotent)
  await linkStripeCustomer(db, teamId, customerId, session.customer_email);

  console.info("[webhook] Linked Stripe customer to team", {
    teamId,
    customerId,
  });

  // If there's a subscription, create/update the subscription record
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (subscriptionId) {
    // We need to fetch the full subscription object from Stripe
    // For now, we'll wait for the customer.subscription.created/updated event
    console.info(
      "[webhook] Subscription will be handled by customer.subscription events",
      {
        subscriptionId,
      },
    );
  }
}

/**
 * Handle customer.subscription.updated event.
 * Updates the subscription status and metadata in the database.
 *
 * @param db - Drizzle database instance
 * @param event - Stripe subscription updated event
 */
export async function handleCustomerSubscriptionUpdated(
  db: PgDatabase<any, any, any>,
  event: Stripe.CustomerSubscriptionUpdatedEvent,
): Promise<void> {
  const subscription = event.data.object;

  console.info("[webhook] Processing customer.subscription.updated", {
    subscriptionId: subscription.id,
    status: subscription.status,
  });

  // Get the customer record to find the team ID
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const customerRecord = await getStripeCustomerByStripeId(db, customerId);
  if (!customerRecord) {
    console.error("[webhook] Customer not found in database", {
      customerId,
      subscriptionId: subscription.id,
    });
    // This might be a new customer that hasn't been linked yet
    // We'll skip this event and wait for checkout.session.completed
    return;
  }

  // Upsert subscription (idempotent)
  await upsertSubscription(db, customerRecord.teamId, subscription);

  console.info("[webhook] Updated subscription", {
    teamId: customerRecord.teamId,
    subscriptionId: subscription.id,
    status: subscription.status,
  });
}

/**
 * Handle customer.subscription.deleted event.
 * Marks the subscription as deleted/canceled in the database.
 *
 * @param db - Drizzle database instance
 * @param event - Stripe subscription deleted event
 */
export async function handleCustomerSubscriptionDeleted(
  db: PgDatabase<any, any, any>,
  event: Stripe.CustomerSubscriptionDeletedEvent,
): Promise<void> {
  const subscription = event.data.object;

  console.info("[webhook] Processing customer.subscription.deleted", {
    subscriptionId: subscription.id,
  });

  // Get the customer record to find the team ID
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const customerRecord = await getStripeCustomerByStripeId(db, customerId);
  if (!customerRecord) {
    console.error("[webhook] Customer not found in database", {
      customerId,
      subscriptionId: subscription.id,
    });
    return;
  }

  // Upsert subscription with deleted status (idempotent)
  await upsertSubscription(db, customerRecord.teamId, subscription);

  console.info("[webhook] Marked subscription as deleted", {
    teamId: customerRecord.teamId,
    subscriptionId: subscription.id,
  });
}

/**
 * Handle invoice.paid event.
 * Records successful payment for the subscription.
 *
 * @param db - Drizzle database instance
 * @param event - Stripe invoice paid event
 */
export async function handleInvoicePaid(
  db: PgDatabase<any, any, any>,
  event: Stripe.InvoicePaidEvent,
): Promise<void> {
  const invoice = event.data.object;

  console.info("[webhook] Processing invoice.paid", {
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
  });

  // If this is for a subscription, ensure the subscription status is current
  if (invoice.subscription) {
    const subscriptionId =
      typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription.id;

    const customerId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;

    if (!customerId) {
      console.error("[webhook] No customer ID in invoice", {
        invoiceId: invoice.id,
      });
      return;
    }

    const customerRecord = await getStripeCustomerByStripeId(db, customerId);
    if (!customerRecord) {
      console.error("[webhook] Customer not found in database", {
        customerId,
        invoiceId: invoice.id,
      });
      return;
    }

    console.info("[webhook] Invoice paid for subscription", {
      teamId: customerRecord.teamId,
      subscriptionId,
      invoiceId: invoice.id,
    });

    // The subscription status will be updated via customer.subscription.updated event
    // We just log the payment success here
  }
}

/**
 * Handle invoice.payment_failed event.
 * Fetches the subscription from Stripe and updates status to past_due in database.
 *
 * @param db - Drizzle database instance
 * @param event - Stripe invoice payment failed event
 */
export async function handleInvoicePaymentFailed(
  db: PgDatabase<any, any, any>,
  event: Stripe.InvoicePaymentFailedEvent,
): Promise<void> {
  const invoice = event.data.object;

  console.info("[webhook] Processing invoice.payment_failed", {
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
  });

  // If this is for a subscription, fetch the updated subscription and update status
  if (invoice.subscription) {
    const subscriptionId =
      typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription.id;

    const customerId =
      typeof invoice.customer === "string"
        ? invoice.customer
        : invoice.customer?.id;

    if (!customerId) {
      console.error("[webhook] No customer ID in invoice", {
        invoiceId: invoice.id,
      });
      return;
    }

    const customerRecord = await getStripeCustomerByStripeId(db, customerId);
    if (!customerRecord) {
      console.error("[webhook] Customer not found in database", {
        customerId,
        invoiceId: invoice.id,
      });
      return;
    }

    console.warn("[webhook] Payment failed for subscription", {
      teamId: customerRecord.teamId,
      subscriptionId,
      invoiceId: invoice.id,
    });

    // Fetch the latest subscription status from Stripe (should be 'past_due')
    // and update our database
    try {
      const subscription = await getSubscription(subscriptionId);
      await upsertSubscription(db, customerRecord.teamId, subscription);

      console.info("[webhook] Updated subscription status to past_due", {
        teamId: customerRecord.teamId,
        subscriptionId,
        status: subscription.status,
      });
    } catch (error) {
      console.error("[webhook] Failed to fetch/update subscription", {
        subscriptionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

/**
 * Main webhook event handler that dispatches to specific handlers.
 *
 * @param db - Drizzle database instance
 * @param event - Stripe webhook event
 */
export async function handleWebhookEvent(
  db: PgDatabase<any, any, any>,
  event: Stripe.Event,
): Promise<void> {
  console.info("[webhook] Received Stripe webhook", {
    type: event.type,
    id: event.id,
  });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          db,
          event as Stripe.CheckoutSessionCompletedEvent,
        );
        break;

      case "customer.subscription.updated":
        await handleCustomerSubscriptionUpdated(
          db,
          event as Stripe.CustomerSubscriptionUpdatedEvent,
        );
        break;

      case "customer.subscription.deleted":
        await handleCustomerSubscriptionDeleted(
          db,
          event as Stripe.CustomerSubscriptionDeletedEvent,
        );
        break;

      case "invoice.paid":
        await handleInvoicePaid(db, event as Stripe.InvoicePaidEvent);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          db,
          event as Stripe.InvoicePaymentFailedEvent,
        );
        break;

      // New subscription created (handle same as updated)
      case "customer.subscription.created": {
        const createdEvent = event as Stripe.CustomerSubscriptionCreatedEvent;
        // The event data has the same structure, just call the handler directly
        await handleCustomerSubscriptionUpdated(
          db,
          {
            ...createdEvent,
            type: "customer.subscription.updated",
          } as Stripe.CustomerSubscriptionUpdatedEvent,
        );
        break;
      }

      default:
        console.info("[webhook] Unhandled event type", { type: event.type });
        // Not an error - just an event we don't need to handle
        break;
    }

    console.info("[webhook] Successfully processed webhook", {
      type: event.type,
      id: event.id,
    });
  } catch (error) {
    console.error("[webhook] Error processing webhook", {
      type: event.type,
      id: event.id,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
