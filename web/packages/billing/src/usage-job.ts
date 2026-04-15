/**
 * Daily Usage Recording Job
 *
 * Records environment usage for all paid teams and reports to Stripe meters.
 * - Counts active and spun-down environments per team
 * - Subtracts free tier allowance
 * - Records to usage_records table (idempotent)
 * - Reports to Stripe Billing Meters
 */

import { recordUsageMeterEvent } from "./stripe";
import {
  recordDailyUsage,
  markUsageReported,
  isTeamOnPaidPlan,
  getStripeCustomerByTeamId,
} from "./models";
import { BILLING_METERS } from "./constants";
import { stripeSubscriptions } from "./db/schema";
import { inArray, eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";

/**
 * Minimal schema shape required by the usage job.
 *
 * `projects` must expose `id` and `teamId` columns.
 * `projectEnvironments` must expose `id`, `projectId`, and `environment` columns.
 * Column values are typed as `any` so both real Drizzle table instances and
 * lightweight test mocks satisfy this interface.
 */
export interface UsageJobSchema {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projects: { id: any; teamId: any; [key: string]: any };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  projectEnvironments: { id: any; projectId: any; environment: any; [key: string]: any };
}

/**
 * Environment counts for a single team.
 */
export interface TeamUsageCounts {
  teamId: string;
  activeCount: number;
  spundownCount: number;
}

/**
 * Result of recording usage for a single team.
 */
export interface TeamUsageResult {
  teamId: string;
  success: boolean;
  error?: string;
  recordId?: string;
  reportedToStripe: boolean;
}

/**
 * Options for the usage recording job.
 */
export interface UsageJobOptions {
  /**
   * The date to record usage for.
   * Defaults to yesterday (usage is recorded for the previous day).
   */
  date?: Date;

  /**
   * Whether to report to Stripe.
   * Set to false for testing or dry runs.
   * Defaults to true.
   */
  reportToStripe?: boolean;
}

/**
 * Count environments for a team by querying project_environments table
 * joined with projects table to filter by team.
 *
 * For now, we consider all environments as "active" since we don't have
 * deployment status in the database yet. In the future, this should query
 * Kubernetes to determine active vs spun-down based on replica count.
 *
 * @param db - Drizzle database instance
 * @param teamId - Team ID
 * @param schema - Database schema objects (projects, projectEnvironments)
 * @returns Environment counts
 */
export async function countTeamEnvironments(
  db: PgDatabase<any, any, any>,
  teamId: string,
  schema: UsageJobSchema,
): Promise<{ activeCount: number; spundownCount: number }> {
  try {
    const { projects, projectEnvironments } = schema;

    // Query all environments for this team's projects
    const environments = await db
      .select({
        id: projectEnvironments.id,
        environment: projectEnvironments.environment,
      })
      .from(projectEnvironments)
      .innerJoin(projects, eq(projectEnvironments.projectId, projects.id))
      .where(eq(projects.teamId, teamId));

    // For now, consider all environments as active
    // TODO: Query Kubernetes deployment status to determine active vs spun-down
    // Active = replicas > 0 with ready pods
    // Spun-down = replicas = 0 or no ready pods
    const activeCount = environments.length;
    const spundownCount = 0;

    return { activeCount, spundownCount };
  } catch (error) {
    console.error("[usage-job] Error counting environments", {
      teamId,
      error,
    });
    // Return zero counts on error
    return { activeCount: 0, spundownCount: 0 };
  }
}

/**
 * Record usage for a single team.
 *
 * @param db - Drizzle database instance
 * @param teamId - Team ID
 * @param date - Usage date
 * @param schema - Database schema objects (projects, projectEnvironments)
 * @param options - Job options
 * @returns Result of the operation
 */
export async function recordTeamUsage(
  db: PgDatabase<any, any, any>,
  teamId: string,
  date: Date,
  schema: UsageJobSchema,
  options: UsageJobOptions = {},
): Promise<TeamUsageResult> {
  const { reportToStripe = true } = options;

  try {
    // Check if team is on paid plan
    const isPaid = await isTeamOnPaidPlan(db, teamId);
    if (!isPaid) {
      // Skip recording for free tier teams (they don't get billed)
      return {
        teamId,
        success: true,
        reportedToStripe: false,
      };
    }

    // Count environments
    const counts = await countTeamEnvironments(db, teamId, schema);

    // Record to database (idempotent - updates existing record for same date)
    const usageRecord = await recordDailyUsage(db, teamId, date, {
      activeCount: counts.activeCount,
      spundownCount: counts.spundownCount,
    });

    // Report to Stripe if enabled and there's billable usage
    let reportedToStripe = false;
    if (
      reportToStripe &&
      (usageRecord.billableActiveCount > 0 ||
        usageRecord.billableSpundownCount > 0)
    ) {
      // Get Stripe customer for this team
      const customer = await getStripeCustomerByTeamId(db, teamId);
      if (!customer) {
        throw new Error(`No Stripe customer found for team ${teamId}`);
      }

      // Format date as YYYY-MM-DD for idempotency keys
      const dateStr = date.toISOString().split("T")[0];

      // Report active environments if any
      if (usageRecord.billableActiveCount > 0) {
        await recordUsageMeterEvent({
          customerId: customer.stripeCustomerId,
          eventName: BILLING_METERS.ACTIVE_ENV_DAY,
          value: usageRecord.billableActiveCount,
          timestamp: Math.floor(date.getTime() / 1000),
          idempotencyKey: `usage-${teamId}-${dateStr}-active`,
        });
      }

      // Report spun-down environments if any
      if (usageRecord.billableSpundownCount > 0) {
        await recordUsageMeterEvent({
          customerId: customer.stripeCustomerId,
          eventName: BILLING_METERS.SPINDOWN_ENV_DAY,
          value: usageRecord.billableSpundownCount,
          timestamp: Math.floor(date.getTime() / 1000),
          idempotencyKey: `usage-${teamId}-${dateStr}-spundown`,
        });
      }

      reportedToStripe = true;

      // Mark as reported in database
      await markUsageReported(db, usageRecord.id);
    }

    console.info("[usage-job] Recorded usage for team", {
      teamId,
      date: date.toISOString(),
      activeCount: counts.activeCount,
      spundownCount: counts.spundownCount,
      billableActive: usageRecord.billableActiveCount,
      billableSpundown: usageRecord.billableSpundownCount,
      reportedToStripe,
    });

    return {
      teamId,
      success: true,
      recordId: usageRecord.id,
      reportedToStripe,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    console.error("[usage-job] Failed to record usage for team", {
      teamId,
      error: errorMessage,
    });

    return {
      teamId,
      success: false,
      error: errorMessage,
      reportedToStripe: false,
    };
  }
}

/**
 * Run the daily usage recording job for all paid teams.
 *
 * @param db - Drizzle database instance
 * @param schema - Database schema objects (projects, projectEnvironments)
 * @param options - Job options
 * @returns Results for all teams
 */
export async function runDailyUsageJob(
  db: PgDatabase<any, any, any>,
  schema: UsageJobSchema,
  options: UsageJobOptions = {},
): Promise<{
  date: Date;
  totalTeams: number;
  successCount: number;
  failureCount: number;
  results: TeamUsageResult[];
}> {
  // Default to yesterday (usage is recorded for the previous day)
  const date = options.date ?? new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Normalize date to midnight UTC
  const normalizedDate = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );

  console.info("[usage-job] Starting daily usage job", {
    date: normalizedDate.toISOString(),
    reportToStripe: options.reportToStripe ?? true,
  });

  // Get all teams with active subscriptions
  const subscriptions = await db
    .select({
      teamId: stripeSubscriptions.teamId,
    })
    .from(stripeSubscriptions)
    .where(
      inArray(stripeSubscriptions.status, [
        "active",
        "trialing",
        "past_due",
        "incomplete",
      ]),
    );

  const teamIds = [...new Set(subscriptions.map((s) => s.teamId))];

  console.info("[usage-job] Found teams to process", {
    count: teamIds.length,
  });

  // Process each team
  const results: TeamUsageResult[] = [];
  for (const teamId of teamIds) {
    const result = await recordTeamUsage(db, teamId, normalizedDate, schema, options);
    results.push(result);
  }

  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  console.info("[usage-job] Daily usage job complete", {
    date: normalizedDate.toISOString(),
    totalTeams: teamIds.length,
    successCount,
    failureCount,
  });

  return {
    date: normalizedDate,
    totalTeams: teamIds.length,
    successCount,
    failureCount,
    results,
  };
}
