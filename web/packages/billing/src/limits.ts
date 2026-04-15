/**
 * Billing Limits
 *
 * Logic for checking and enforcing team limits based on subscription status.
 */

import { isTeamOnPaidPlan } from "./models";
import { FREE_TIER_LIMITS } from "./constants";
import type { PgDatabase } from "drizzle-orm/pg-core";

export interface CanCreateEnvironmentResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a team can create a new environment based on subscription status and current usage.
 *
 * @param db - Drizzle database instance
 * @param teamId - Team ID
 * @param currentEnvironmentCount - Number of active environments the team currently has
 * @returns Result indicating if environment creation is allowed and optional reason if not
 */
export async function canCreateEnvironment(
  db: PgDatabase<any, any, any>,
  teamId: string,
  currentEnvironmentCount: number,
): Promise<CanCreateEnvironmentResult> {
  const isPaid = await isTeamOnPaidPlan(db, teamId);

  if (isPaid) {
    return { allowed: true };
  }

  if (currentEnvironmentCount >= FREE_TIER_LIMITS.ACTIVE_ENVIRONMENTS) {
    return {
      allowed: false,
      reason: `You've reached the free tier limit of ${FREE_TIER_LIMITS.ACTIVE_ENVIRONMENTS} active environments. Upgrade to create more.`,
    };
  }

  return { allowed: true };
}
