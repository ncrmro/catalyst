/**
 * Project-Repos Model
 *
 * Database operations for projects_repos join table
 * No authentication - handled by actions layer
 */

import { db } from "@/db";
import { projectsRepos } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";

export type InsertProjectRepo = InferInsertModel<typeof projectsRepos>;

/**
 * Query parameters for flexible project-repo filtering
 */
export interface GetProjectReposParams {
  projectIds?: string[];
  repoIds?: string[];
  isPrimary?: boolean;
}

/**
 * Get project-repo links with optional filtering
 * Follows bulk operation pattern
 */
export async function getProjectRepos(params: GetProjectReposParams) {
  const { projectIds, repoIds, isPrimary } = params;

  // Build where conditions
  const conditions = [];
  if (projectIds && projectIds.length > 0) {
    conditions.push(inArray(projectsRepos.projectId, projectIds));
  }
  if (repoIds && repoIds.length > 0) {
    conditions.push(inArray(projectsRepos.repoId, repoIds));
  }
  if (isPrimary !== undefined) {
    conditions.push(eq(projectsRepos.isPrimary, isPrimary));
  }

  // Return empty array if no conditions
  if (conditions.length === 0) {
    return [];
  }

  return db
    .select()
    .from(projectsRepos)
    .where(and(...conditions));
}

/**
 * Create one or multiple project-repo links
 * Follows bulk operation pattern
 */
export async function createProjectRepoLinks(
  data: InsertProjectRepo | InsertProjectRepo[],
) {
  const items = Array.isArray(data) ? data : [data];
  return db.insert(projectsRepos).values(items).returning();
}

/**
 * Set a repository as primary for a project
 * Unsets any existing primary repos for the project first
 */
export async function setPrimaryRepo(projectId: string, repoId: string) {
  return db.transaction(async (tx) => {
    // First, unset any existing primary repos for this project
    await tx
      .update(projectsRepos)
      .set({ isPrimary: false })
      .where(eq(projectsRepos.projectId, projectId));

    // Then set the specified repo as primary
    const [updated] = await tx
      .update(projectsRepos)
      .set({ isPrimary: true })
      .where(
        and(
          eq(projectsRepos.projectId, projectId),
          eq(projectsRepos.repoId, repoId),
        ),
      )
      .returning();

    return updated;
  });
}
