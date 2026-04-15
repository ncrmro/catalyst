/**
 * Billing Guard
 *
 * Provides conditional access to billing functionality based on the BILLING_ENABLED
 * environment variable. When disabled, it provides no-op implementations that allow
 * all operations, ensuring the app works for self-hosted deployments without billing.
 */

import { db } from "@/db";
import { projectEnvironments, projects } from "@/db/schema";
import { count, eq } from "drizzle-orm";

const BILLING_ENABLED = process.env.BILLING_ENABLED === "true";

/**
 * Get the billing package dynamically if enabled.
 * Returns null if billing is disabled.
 */
export async function getBilling() {
  if (!BILLING_ENABLED) {
    return null;
  }

  // Use dynamic import to avoid bundling billing code when disabled
  // and to allow the package to be missing in some environments
  try {
    return await import("@catalyst/billing");
  } catch (error) {
    console.error("Failed to load @catalyst/billing package despite BILLING_ENABLED=true", error);
    return null;
  }
}

/**
 * Check if billing is enabled.
 */
export function isBillingEnabled(): boolean {
  return BILLING_ENABLED;
}

export interface BillingGuardResult {
  allowed: boolean;
  reason?: string;
}

export interface BillingGuard {
  canCreateEnvironment(teamId: string): Promise<BillingGuardResult>;
}

/**
 * Returns a billing guard that enforces team limits when billing is enabled.
 * When billing is disabled, all operations are allowed without limit checks.
 */
export function billingGuard(): BillingGuard {
  return {
    async canCreateEnvironment(teamId: string): Promise<BillingGuardResult> {
      if (!BILLING_ENABLED) {
        return { allowed: true };
      }

      const billing = await getBilling();
      if (!billing) {
        return { allowed: true };
      }

      // Count active environments for the team
      const result = await db
        .select({ count: count() })
        .from(projectEnvironments)
        .innerJoin(projects, eq(projectEnvironments.projectId, projects.id))
        .where(eq(projects.teamId, teamId));

      const currentCount = result[0]?.count ?? 0;
      return billing.canCreateEnvironment(db, teamId, currentCount);
    },
  };
}
