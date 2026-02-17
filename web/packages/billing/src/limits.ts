/**
 * Billing Limits
 *
 * Logic for checking and enforcing team limits based on subscription status.
 */

import { isTeamOnPaidPlan } from "./models";
import { FREE_TIER_LIMITS } from "./constants";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { eq, count } from "drizzle-orm";
import { projectEnvironments, projects } from "./db/schema";

export interface CanCreateEnvironmentResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a team can create a new environment based on subscription status and current usage.
 *
 * @param db - Drizzle database instance
 * @param teamId - Team ID
 * @returns Result indicating if environment creation is allowed and optional reason if not
 */
export async function canCreateEnvironment(
  db: PgDatabase<any, any, any>,
  teamId: string,
): Promise<CanCreateEnvironmentResult> {
  // Check if team has a paid plan
  const isPaid = await isTeamOnPaidPlan(db, teamId);

  if (isPaid) {
    // Paid teams have unlimited environments
    return { allowed: true };
  }

  // For free tier teams, count their current active environments
  // Active environments are those in project_environments table
  const result = await db
    .select({ count: count() })
    .from(projectEnvironments)
    .innerJoin(projects, eq(projectEnvironments.projectId, projects.id))
    .where(eq(projects.teamId, teamId));

  const currentEnvironmentCount = result[0]?.count ?? 0;

  // Check against free tier limit
  if (currentEnvironmentCount >= FREE_TIER_LIMITS.ACTIVE_ENVIRONMENTS) {
    return {
      allowed: false,
      reason: `You've reached the free tier limit of ${FREE_TIER_LIMITS.ACTIVE_ENVIRONMENTS} active environments. Upgrade to create more.`,
    };
  }

  return { allowed: true };
}

/**
 * Get current environment usage for a team.
 *
 * @param db - Drizzle database instance
 * @param teamId - Team ID
 * @returns Object with current count and limit
 */
export async function getTeamEnvironmentUsage(
  db: PgDatabase<any, any, any>,
  teamId: string,
): Promise<{
  currentCount: number;
  limit: number | null; // null means unlimited (paid plan)
  isPaid: boolean;
}> {
  const isPaid = await isTeamOnPaidPlan(db, teamId);

  if (isPaid) {
    // Paid teams don't have limits, but we still return the count
    const result = await db
      .select({ count: count() })
      .from(projectEnvironments)
      .innerJoin(projects, eq(projectEnvironments.projectId, projects.id))
      .where(eq(projects.teamId, teamId));

    return {
      currentCount: result[0]?.count ?? 0,
      limit: null,
      isPaid: true,
    };
  }

  // For free tier, return count and limit
  const result = await db
    .select({ count: count() })
    .from(projectEnvironments)
    .innerJoin(projects, eq(projectEnvironments.projectId, projects.id))
    .where(eq(projects.teamId, teamId));

  return {
    currentCount: result[0]?.count ?? 0,
    limit: FREE_TIER_LIMITS.ACTIVE_ENVIRONMENTS,
    isPaid: false,
  };
}
