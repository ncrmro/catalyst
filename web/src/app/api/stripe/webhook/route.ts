/**
 * Stripe Webhook API Route
 *
 * Receives and processes Stripe webhook events for subscription management.
 * Verifies webhook signatures and delegates to the billing package handlers.
 */

import { NextRequest, NextResponse } from "next/server";
import { isBillingEnabled, getBilling } from "@/lib/billing-guard";
import { db } from "@/db";

export const runtime = "nodejs";

/**
 * POST /api/stripe/webhook
 *
 * Handles Stripe webhook events. Returns:
 * - 404 if billing is disabled
 * - 400 if signature verification fails
 * - 200 if event is processed successfully
 * - 500 if processing fails
 */
export async function POST(request: NextRequest) {
  // Check if billing is enabled
  if (!isBillingEnabled()) {
    console.warn("[stripe-webhook] Billing is disabled, returning 404");
    return NextResponse.json(
      { error: "Billing is not enabled" },
      { status: 404 },
    );
  }

  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("[stripe-webhook] Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 },
      );
    }

    // Load billing package
    const billing = await getBilling();
    if (!billing) {
      console.error(
        "[stripe-webhook] Failed to load billing package despite being enabled",
      );
      return NextResponse.json(
        { error: "Billing package unavailable" },
        { status: 500 },
      );
    }

    // Verify and construct the webhook event
    let event;
    try {
      event = billing.constructWebhookEvent(body, signature);
    } catch (error) {
      console.error("[stripe-webhook] Signature verification failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 },
      );
    }

    // Handle the webhook event
    try {
      await billing.handleWebhookEvent(db, event);

      return NextResponse.json(
        { received: true, eventType: event.type },
        { status: 200 },
      );
    } catch (error) {
      console.error("[stripe-webhook] Error processing webhook event", {
        eventType: event.type,
        eventId: event.id,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return 500 so Stripe will retry
      return NextResponse.json(
        { error: "Failed to process webhook event" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[stripe-webhook] Unexpected error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
