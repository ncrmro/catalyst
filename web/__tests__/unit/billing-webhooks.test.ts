/**
 * Unit tests for Stripe webhook handlers
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type Stripe from "stripe";
import type { PgDatabase } from "drizzle-orm/pg-core";

// Mock all the dependencies
const mockLinkStripeCustomer = vi.fn();
const mockGetStripeCustomerByStripeId = vi.fn();
const mockUpsertSubscription = vi.fn();
const mockGetSubscription = vi.fn();

vi.mock("@catalyst/billing/src/models", () => ({
  linkStripeCustomer: mockLinkStripeCustomer,
  getStripeCustomerByStripeId: mockGetStripeCustomerByStripeId,
  upsertSubscription: mockUpsertSubscription,
}));

vi.mock("@catalyst/billing/src/stripe", () => ({
  getSubscription: mockGetSubscription,
}));

// Import after mocking
const {
  handleCheckoutSessionCompleted,
  handleCustomerSubscriptionUpdated,
  handleCustomerSubscriptionDeleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleWebhookEvent,
} = await import("@catalyst/billing");

// Helper to create a minimal event structure
function createMockEvent<T extends Record<string, any>>(
  type: string,
  data: T,
): Stripe.Event {
  return {
    id: "evt_test_123",
    type,
    object: "event",
    api_version: "2025-02-24.acacia",
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    data: {
      object: data,
      previous_attributes: undefined,
    },
  } as unknown as Stripe.Event;
}

describe("Stripe Webhook Handlers", () => {
  let mockDb: PgDatabase<any, any, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = {} as PgDatabase<any, any, any>;
  });

  describe("handleCheckoutSessionCompleted", () => {
    it("should link customer to team", async () => {
      const event = createMockEvent("checkout.session.completed", {
        id: "cs_test_123",
        object: "checkout.session",
        customer: "cus_test_456",
        customer_email: "test@example.com",
        subscription: "sub_test_789",
        metadata: {
          teamId: "team-123",
        },
      }) as Stripe.CheckoutSessionCompletedEvent;

      await handleCheckoutSessionCompleted(mockDb, event);

      expect(mockLinkStripeCustomer).toHaveBeenCalledWith(
        mockDb,
        "team-123",
        "cus_test_456",
        "test@example.com",
      );
    });

    it("should throw error if teamId is missing", async () => {
      const event = createMockEvent("checkout.session.completed", {
        id: "cs_test_123",
        object: "checkout.session",
        customer: "cus_test_456",
        customer_email: "test@example.com",
        metadata: {},
      }) as Stripe.CheckoutSessionCompletedEvent;

      await expect(
        handleCheckoutSessionCompleted(mockDb, event),
      ).rejects.toThrow("Missing teamId in session metadata");
    });

    it("should throw error if customer ID is missing", async () => {
      const event = createMockEvent("checkout.session.completed", {
        id: "cs_test_123",
        object: "checkout.session",
        customer: null,
        customer_email: "test@example.com",
        metadata: {
          teamId: "team-123",
        },
      }) as Stripe.CheckoutSessionCompletedEvent;

      await expect(
        handleCheckoutSessionCompleted(mockDb, event),
      ).rejects.toThrow("Missing customer ID in session");
    });
  });

  describe("handleCustomerSubscriptionUpdated", () => {
    it("should update subscription for existing customer", async () => {
      const subscription = {
        id: "sub_test_123",
        object: "subscription",
        customer: "cus_test_456",
        status: "active",
        current_period_start: 1234567890,
        current_period_end: 1234567999,
        cancel_at_period_end: false,
        canceled_at: null,
      } as Stripe.Subscription;

      const event = createMockEvent(
        "customer.subscription.updated",
        subscription,
      ) as Stripe.CustomerSubscriptionUpdatedEvent;

      mockGetStripeCustomerByStripeId.mockResolvedValue({
        id: "customer-record-1",
        teamId: "team-123",
        stripeCustomerId: "cus_test_456",
        email: "test@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await handleCustomerSubscriptionUpdated(mockDb, event);

      expect(mockGetStripeCustomerByStripeId).toHaveBeenCalledWith(
        mockDb,
        "cus_test_456",
      );
      expect(mockUpsertSubscription).toHaveBeenCalledWith(
        mockDb,
        "team-123",
        subscription,
      );
    });

    it("should skip if customer not found in database", async () => {
      const event = createMockEvent("customer.subscription.updated", {
        id: "sub_test_123",
        object: "subscription",
        customer: "cus_test_456",
        status: "active",
      } as Stripe.Subscription) as Stripe.CustomerSubscriptionUpdatedEvent;

      mockGetStripeCustomerByStripeId.mockResolvedValue(null);

      await handleCustomerSubscriptionUpdated(mockDb, event);

      expect(mockUpsertSubscription).not.toHaveBeenCalled();
    });
  });

  describe("handleCustomerSubscriptionDeleted", () => {
    it("should mark subscription as deleted", async () => {
      const subscription = {
        id: "sub_test_123",
        object: "subscription",
        customer: "cus_test_456",
        status: "canceled",
        current_period_start: 1234567890,
        current_period_end: 1234567999,
        cancel_at_period_end: false,
        canceled_at: 1234567950,
      } as Stripe.Subscription;

      const event = createMockEvent(
        "customer.subscription.deleted",
        subscription,
      ) as Stripe.CustomerSubscriptionDeletedEvent;

      mockGetStripeCustomerByStripeId.mockResolvedValue({
        id: "customer-record-1",
        teamId: "team-123",
        stripeCustomerId: "cus_test_456",
        email: "test@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await handleCustomerSubscriptionDeleted(mockDb, event);

      expect(mockUpsertSubscription).toHaveBeenCalledWith(
        mockDb,
        "team-123",
        subscription,
      );
    });
  });

  describe("handleInvoicePaid", () => {
    it("should log payment success for subscription invoice", async () => {
      const event = createMockEvent("invoice.paid", {
        id: "in_test_123",
        object: "invoice",
        customer: "cus_test_456",
        subscription: "sub_test_789",
      } as Stripe.Invoice) as Stripe.InvoicePaidEvent;

      mockGetStripeCustomerByStripeId.mockResolvedValue({
        id: "customer-record-1",
        teamId: "team-123",
        stripeCustomerId: "cus_test_456",
        email: "test@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await handleInvoicePaid(mockDb, event);

      expect(mockGetStripeCustomerByStripeId).toHaveBeenCalledWith(
        mockDb,
        "cus_test_456",
      );
    });

    it("should handle non-subscription invoice", async () => {
      const event = createMockEvent("invoice.paid", {
        id: "in_test_123",
        object: "invoice",
        customer: "cus_test_456",
        subscription: null,
      } as Stripe.Invoice) as Stripe.InvoicePaidEvent;

      await handleInvoicePaid(mockDb, event);

      expect(mockGetStripeCustomerByStripeId).not.toHaveBeenCalled();
    });
  });

  describe("handleInvoicePaymentFailed", () => {
    it("should fetch subscription and set status to past_due", async () => {
      const event = createMockEvent("invoice.payment_failed", {
        id: "in_test_123",
        object: "invoice",
        customer: "cus_test_456",
        subscription: "sub_test_789",
      } as Stripe.Invoice) as Stripe.InvoicePaymentFailedEvent;

      const mockSubscription = {
        id: "sub_test_789",
        object: "subscription",
        customer: "cus_test_456",
        status: "past_due",
        current_period_start: 1234567890,
        current_period_end: 1234567999,
        cancel_at_period_end: false,
        canceled_at: null,
      } as Stripe.Subscription;

      mockGetStripeCustomerByStripeId.mockResolvedValue({
        id: "customer-record-1",
        teamId: "team-123",
        stripeCustomerId: "cus_test_456",
        email: "test@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockGetSubscription.mockResolvedValue(mockSubscription);

      await handleInvoicePaymentFailed(mockDb, event);

      expect(mockGetStripeCustomerByStripeId).toHaveBeenCalledWith(
        mockDb,
        "cus_test_456",
      );
      expect(mockGetSubscription).toHaveBeenCalledWith("sub_test_789");
      expect(mockUpsertSubscription).toHaveBeenCalledWith(
        mockDb,
        "team-123",
        mockSubscription,
      );
    });

    it("should handle non-subscription invoice", async () => {
      const event = createMockEvent("invoice.payment_failed", {
        id: "in_test_123",
        object: "invoice",
        customer: "cus_test_456",
        subscription: null,
      } as Stripe.Invoice) as Stripe.InvoicePaymentFailedEvent;

      await handleInvoicePaymentFailed(mockDb, event);

      expect(mockGetStripeCustomerByStripeId).not.toHaveBeenCalled();
      expect(mockGetSubscription).not.toHaveBeenCalled();
    });
  });

  describe("handleWebhookEvent", () => {
    it("should dispatch to checkout.session.completed handler", async () => {
      const event = createMockEvent("checkout.session.completed", {
        id: "cs_test_123",
        object: "checkout.session",
        customer: "cus_test_456",
        customer_email: "test@example.com",
        metadata: {
          teamId: "team-123",
        },
      }) as Stripe.CheckoutSessionCompletedEvent;

      await handleWebhookEvent(mockDb, event);

      expect(mockLinkStripeCustomer).toHaveBeenCalled();
    });

    it("should dispatch to customer.subscription.updated handler", async () => {
      const event = createMockEvent("customer.subscription.updated", {
        id: "sub_test_123",
        object: "subscription",
        customer: "cus_test_456",
        status: "past_due",
      } as Stripe.Subscription) as Stripe.CustomerSubscriptionUpdatedEvent;

      mockGetStripeCustomerByStripeId.mockResolvedValue({
        id: "customer-record-1",
        teamId: "team-123",
        stripeCustomerId: "cus_test_456",
        email: "test@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await handleWebhookEvent(mockDb, event);

      expect(mockUpsertSubscription).toHaveBeenCalled();
    });

    it("should handle unhandled event types gracefully", async () => {
      const event = createMockEvent("customer.created", {
        id: "cus_test_123",
        object: "customer",
      });

      await expect(handleWebhookEvent(mockDb, event)).resolves.not.toThrow();
    });

    it("should throw error when handler fails", async () => {
      const event = createMockEvent("checkout.session.completed", {
        id: "cs_test_123",
        object: "checkout.session",
        customer: "cus_test_456",
        customer_email: "test@example.com",
        metadata: {}, // Missing teamId - will cause error
      }) as Stripe.CheckoutSessionCompletedEvent;

      await expect(handleWebhookEvent(mockDb, event)).rejects.toThrow();
    });
  });
});
