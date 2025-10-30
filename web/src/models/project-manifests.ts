/**
 * Project Manifests Model
 *
 * Database operations for project_manifests table
 * No authentication - handled by actions layer
 */

import { db } from "@/db";
import { projectManifests } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";

export type InsertManifest = InferInsertModel<typeof projectManifests>;

/**
 * Query parameters for flexible manifest filtering
 */
export interface GetProjectManifestsParams {
  projectIds?: string[];
  repoIds?: string[];
  paths?: string[];
}

/**
 * Get project manifests with optional filtering
 * Follows bulk operation pattern
 */
export async function getProjectManifests(params: GetProjectManifestsParams) {
  const { projectIds, repoIds, paths } = params;

  // Build where conditions
  const conditions = [];
  if (projectIds && projectIds.length > 0) {
    conditions.push(inArray(projectManifests.projectId, projectIds));
  }
  if (repoIds && repoIds.length > 0) {
    conditions.push(inArray(projectManifests.repoId, repoIds));
  }
  if (paths && paths.length > 0) {
    conditions.push(inArray(projectManifests.path, paths));
  }

  // Return empty array if no conditions
  if (conditions.length === 0) {
    return [];
  }

  return db
    .select()
    .from(projectManifests)
    .where(and(...conditions));
}

/**
 * Check if a manifest exists for a project, repo, and path
 */
export async function manifestExists(
  projectId: string,
  repoId: string,
  path: string,
): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(projectManifests)
    .where(
      and(
        eq(projectManifests.projectId, projectId),
        eq(projectManifests.repoId, repoId),
        eq(projectManifests.path, path),
      ),
    )
    .limit(1);

  return !!existing;
}

/**
 * Create one or multiple project manifests
 * Follows bulk operation pattern
 */
export async function createProjectManifests(
  data: InsertManifest | InsertManifest[],
) {
  const items = Array.isArray(data) ? data : [data];
  return db.insert(projectManifests).values(items).returning();
}

/**
 * Delete project manifests matching the criteria
 * Supports bulk deletion by multiple criteria
 */
export async function deleteProjectManifests(params: {
  projectId: string;
  repoId: string;
  path: string;
}) {
  return db
    .delete(projectManifests)
    .where(
      and(
        eq(projectManifests.projectId, params.projectId),
        eq(projectManifests.repoId, params.repoId),
        eq(projectManifests.path, params.path),
      ),
    );
}
