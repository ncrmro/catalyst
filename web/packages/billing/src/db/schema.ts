import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// Minimal FK-only table definition to avoid coupling
export const teams = pgTable("teams", {
  id: text("id").primaryKey(),
});

/**
 * Stripe Customers Table
 *
 * Maps Catalyst teams to Stripe customer IDs.
 * One team can have one Stripe customer.
 */
export const stripeCustomers = pgTable(
  "stripe_customers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").notNull().unique(),
    email: text("email"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("stripe_customers_team_id_unique").on(table.teamId)],
);

export const stripeCustomersRelations = relations(
  stripeCustomers,
  ({ one }) => ({
    team: one(teams, {
      fields: [stripeCustomers.teamId],
      references: [teams.id],
    }),
  }),
);

/**
 * Stripe Subscriptions Table
 *
 * Tracks active/inactive subscription status for teams.
 * Used for determining if a team is on the paid plan.
 */
export const stripeSubscriptions = pgTable(
  "stripe_subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
    stripeCustomerId: text("stripe_customer_id").notNull(),
    /**
     * Stripe subscription status values:
     * - 'active': Subscription is active and paid
     * - 'trialing': Subscription in trial period
     * - 'past_due': Payment failed but subscription still active
     * - 'canceled': Subscription canceled
     * - 'unpaid': Subscription unpaid after retries
     * - 'incomplete': Initial payment failed
     * - 'incomplete_expired': Initial payment failed and expired
     * - 'paused': Subscription paused
     */
    status: text("status").notNull(),
    currentPeriodStart: timestamp("current_period_start", { mode: "date" }),
    currentPeriodEnd: timestamp("current_period_end", { mode: "date" }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    canceledAt: timestamp("canceled_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    // One active subscription per team (allow multiple historical records)
    uniqueIndex("stripe_subscriptions_team_id_active_unique")
      .on(table.teamId)
      .where(
        // Only enforce uniqueness for active-ish statuses
        sql`status IN ('active', 'trialing', 'past_due', 'incomplete')`,
      ),
  ],
);

export const stripeSubscriptionsRelations = relations(
  stripeSubscriptions,
  ({ one }) => ({
    team: one(teams, {
      fields: [stripeSubscriptions.teamId],
      references: [teams.id],
    }),
  }),
);

/**
 * Usage Records Table
 *
 * Daily snapshots of environment usage per team.
 * Used to report usage to Stripe Billing Meters.
 */
export const usageRecords = pgTable(
  "usage_records",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    /** The date this usage is for (UTC date) */
    usageDate: date("usage_date", { mode: "date" }).notNull(),
    /** Count of active (running) environments */
    activeEnvironmentCount: integer("active_environment_count")
      .notNull()
      .default(0),
    /** Count of spun-down (stopped) environments */
    spundownEnvironmentCount: integer("spundown_environment_count")
      .notNull()
      .default(0),
    /** Billable active count (after free tier subtraction) */
    billableActiveCount: integer("billable_active_count").notNull().default(0),
    /** Billable spun-down count (after free tier subtraction) */
    billableSpundownCount: integer("billable_spundown_count")
      .notNull()
      .default(0),
    /** Whether this record has been reported to Stripe */
    reportedToStripe: boolean("reported_to_stripe").notNull().default(false),
    /** Timestamp when reported to Stripe */
    reportedAt: timestamp("reported_at", { mode: "date" }),
    /** Error message if reporting failed */
    reportError: text("report_error"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    // One usage record per team per day
    uniqueIndex("usage_records_team_date_unique").on(
      table.teamId,
      table.usageDate,
    ),
  ],
);

export const usageRecordsRelations = relations(usageRecords, ({ one }) => ({
  team: one(teams, {
    fields: [usageRecords.teamId],
    references: [teams.id],
  }),
}));
