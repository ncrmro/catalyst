/**
 * Deployment Configurations Model
 *
 * Database operations for project_deployment_configs table.
 * Manages deployment settings for production, staging, and preview environments.
 * No authentication - handled by actions layer.
 */

import { db } from "@/db";
import {
  projectDeploymentConfigs,
  type DeploymentConfig,
  type DeploymentStrategy,
  type CIProvider,
  type EnvironmentName,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";

export type InsertDeploymentConfig = InferInsertModel<
  typeof projectDeploymentConfigs
>;
export type SelectDeploymentConfig = InferSelectModel<
  typeof projectDeploymentConfigs
>;
export type UpdateDeploymentConfig = Partial<
  Omit<InsertDeploymentConfig, "id" | "createdAt" | "projectId">
>;

// Re-export types for convenience
export type {
  DeploymentConfig,
  DeploymentStrategy,
  CIProvider,
  EnvironmentName,
};

/**
 * Query parameters for flexible deployment config filtering
 */
export interface GetDeploymentConfigsParams {
  ids?: string[];
  projectIds?: string[];
  environmentNames?: EnvironmentName[];
  enabled?: boolean;
}

/**
 * Get deployment configs with flexible filtering
 * Follows bulk operation pattern
 */
export async function getDeploymentConfigs(params: GetDeploymentConfigsParams) {
  const { ids, projectIds, environmentNames, enabled } = params;

  // Build where conditions
  const conditions = [];
  if (ids && ids.length > 0) {
    conditions.push(inArray(projectDeploymentConfigs.id, ids));
  }
  if (projectIds && projectIds.length > 0) {
    conditions.push(inArray(projectDeploymentConfigs.projectId, projectIds));
  }
  if (environmentNames && environmentNames.length > 0) {
    conditions.push(
      inArray(projectDeploymentConfigs.environmentName, environmentNames),
    );
  }
  if (enabled !== undefined) {
    conditions.push(eq(projectDeploymentConfigs.enabled, enabled));
  }

  // Return empty array if no conditions (prevents fetching all configs)
  if (conditions.length === 0) {
    return [];
  }

  return db.query.projectDeploymentConfigs.findMany({
    where: and(...conditions),
    with: {
      project: true,
    },
  });
}

/**
 * Inferred type from getDeploymentConfigs
 */
export type DeploymentConfigWithProject = Awaited<
  ReturnType<typeof getDeploymentConfigs>
>[number];

/**
 * Get a single deployment config by project ID and environment name
 */
export async function getDeploymentConfigByProjectAndEnv(
  projectId: string,
  environmentName: EnvironmentName,
) {
  return db.query.projectDeploymentConfigs.findFirst({
    where: and(
      eq(projectDeploymentConfigs.projectId, projectId),
      eq(projectDeploymentConfigs.environmentName, environmentName),
    ),
    with: {
      project: true,
    },
  });
}

/**
 * Get all deployment configs for a project
 */
export async function getProjectDeploymentConfigs(projectId: string) {
  return db.query.projectDeploymentConfigs.findMany({
    where: eq(projectDeploymentConfigs.projectId, projectId),
    orderBy: (configs, { asc }) => [asc(configs.environmentName)],
  });
}

/**
 * Create one or multiple deployment configs
 * Follows bulk operation pattern
 */
export async function createDeploymentConfigs(
  data: InsertDeploymentConfig | InsertDeploymentConfig[],
) {
  const items = Array.isArray(data) ? data : [data];
  return db.insert(projectDeploymentConfigs).values(items).returning();
}

/**
 * Upsert deployment config - create or update
 * Uses ON CONFLICT to handle existing configs
 */
export async function upsertDeploymentConfig(data: InsertDeploymentConfig) {
  const existing = await getDeploymentConfigByProjectAndEnv(
    data.projectId,
    data.environmentName as EnvironmentName,
  );

  if (existing) {
    return updateDeploymentConfig(existing.id, {
      enabled: data.enabled,
      deploymentStrategy: data.deploymentStrategy,
      ciProvider: data.ciProvider,
      triggerBranch: data.triggerBranch,
      autoDeploy: data.autoDeploy,
      requireApproval: data.requireApproval,
      config: data.config,
    });
  }

  const [created] = await createDeploymentConfigs(data);
  return created;
}

/**
 * Update a deployment config by ID
 */
export async function updateDeploymentConfig(
  id: string,
  data: UpdateDeploymentConfig,
) {
  const [updated] = await db
    .update(projectDeploymentConfigs)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(projectDeploymentConfigs.id, id))
    .returning();

  return updated;
}

/**
 * Update multiple deployment configs by IDs
 * Follows bulk operation pattern
 */
export async function updateDeploymentConfigs(
  ids: string[],
  data: UpdateDeploymentConfig,
) {
  if (ids.length === 0) {
    return [];
  }

  return db
    .update(projectDeploymentConfigs)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(inArray(projectDeploymentConfigs.id, ids))
    .returning();
}

/**
 * Delete deployment configs by IDs
 */
export async function deleteDeploymentConfigs(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }

  return db
    .delete(projectDeploymentConfigs)
    .where(inArray(projectDeploymentConfigs.id, ids))
    .returning();
}

/**
 * Check if a deployment config exists for a project and environment
 */
export async function deploymentConfigExists(
  projectId: string,
  environmentName: EnvironmentName,
): Promise<boolean> {
  const config = await db.query.projectDeploymentConfigs.findFirst({
    where: and(
      eq(projectDeploymentConfigs.projectId, projectId),
      eq(projectDeploymentConfigs.environmentName, environmentName),
    ),
    columns: { id: true },
  });
  return !!config;
}

/**
 * Initialize default deployment configs for a new project
 * Creates configs for all three environments with default settings
 */
export async function initializeProjectDeploymentConfigs(projectId: string) {
  const environments: EnvironmentName[] = ["production", "staging", "preview"];

  const configs: InsertDeploymentConfig[] = environments.map((envName) => ({
    projectId,
    environmentName: envName,
    enabled: false,
    deploymentStrategy: "docker" as DeploymentStrategy,
    ciProvider: "internal" as CIProvider,
    triggerBranch:
      envName === "production"
        ? "main"
        : envName === "staging"
          ? "develop"
          : "*",
    autoDeploy: envName === "preview", // Only auto-deploy for preview environments
    requireApproval: envName === "production", // Require approval for production
    config: {
      dockerfilePath: "./Dockerfile",
    },
  }));

  return createDeploymentConfigs(configs);
}
