"use server";

import { db, projectEnvironments } from "@/db";
import { eq, and } from "drizzle-orm";
import type { EnvironmentConfig } from "@/types/environment-config";
import { auth } from "@/auth";
import { isZeroConfigProject } from "@/lib/zero-config";

/**
 * Get the zero-config status for a project.
 *
 * Checks both deployment and development environment configurations
 * to determine if the project has been successfully auto-detected.
 *
 * @param projectId - Project ID to check
 * @param repoId - Repository ID to check (optional, uses primary repo if not provided)
 * @returns Object with zero-config status for both environment types
 */
export async function getProjectZeroConfigStatus(
  projectId: string,
  repoId?: string,
): Promise<{
  deployment: {
    config: EnvironmentConfig | null;
    isZeroConfig: boolean;
  };
  development: {
    config: EnvironmentConfig | null;
    isZeroConfig: boolean;
  };
  overall: boolean;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Build where conditions
  const conditions = [eq(projectEnvironments.projectId, projectId)];
  if (repoId) {
    conditions.push(eq(projectEnvironments.repoId, repoId));
  }

  // Query for both deployment and development environment configs
  const results = await db
    .select({
      environment: projectEnvironments.environment,
      config: projectEnvironments.config,
    })
    .from(projectEnvironments)
    .where(and(...conditions));

  // Find production/deployment config (check for "production" or "staging")
  const deploymentConfig = results.find(
    (r) => r.environment === "production" || r.environment === "staging",
  );

  // Find development config
  const developmentConfig = results.find(
    (r) => r.environment === "development",
  );

  const deploymentZeroConfig = isZeroConfigProject(deploymentConfig?.config);
  const developmentZeroConfig = isZeroConfigProject(developmentConfig?.config);

  return {
    deployment: {
      config: deploymentConfig?.config || null,
      isZeroConfig: deploymentZeroConfig,
    },
    development: {
      config: developmentConfig?.config || null,
      isZeroConfig: developmentZeroConfig,
    },
    // Overall status: true if either deployment OR development is zero-config
    overall: deploymentZeroConfig || developmentZeroConfig,
  };
}
