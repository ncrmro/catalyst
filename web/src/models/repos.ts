/**
 * Repositories Model
 *
 * Database operations for repos table
 * No authentication - handled by actions layer
 */

import { db } from "@/db";
import { repos, projectsRepos, projects } from "@/db/schema";
import { eq, inArray, and } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";

export type InsertRepo = InferInsertModel<typeof repos>;
export type UpdateRepo = Partial<Omit<InsertRepo, "id" | "createdAt">>;

/**
 * Query parameters for flexible repository filtering
 */
export interface GetReposParams {
  ids?: string[];
  githubIds?: number[];
  teamIds?: string[];
  ownerLogin?: string;
  orderBy?: "pushedAt" | "updatedAt";
}

/**
 * Get repositories with optional filtering
 * Follows bulk operation pattern - handles single or multiple IDs
 */
export async function getRepos(params: GetReposParams) {
  const { ids, githubIds, teamIds, ownerLogin, orderBy = "pushedAt" } = params;

  // Build where conditions
  const conditions = [];
  if (ids && ids.length > 0) {
    conditions.push(inArray(repos.id, ids));
  }
  if (githubIds && githubIds.length > 0) {
    conditions.push(inArray(repos.githubId, githubIds));
  }
  if (teamIds && teamIds.length > 0) {
    conditions.push(inArray(repos.teamId, teamIds));
  }
  if (ownerLogin) {
    conditions.push(eq(repos.ownerLogin, ownerLogin));
  }

  // Return empty array if no conditions (prevents fetching all repos)
  if (conditions.length === 0) {
    return [];
  }

  // Build query with ordering
  if (orderBy === "pushedAt") {
    return db
      .select()
      .from(repos)
      .where(and(...conditions))
      .orderBy(repos.pushedAt);
  } else {
    return db
      .select()
      .from(repos)
      .where(and(...conditions))
      .orderBy(repos.updatedAt);
  }
}

/**
 * Get repositories with their project connections
 * Returns repos with connection info (projectId, isPrimary)
 */
export async function getReposWithConnections(params: GetReposParams) {
  const { ids, githubIds, teamIds, ownerLogin } = params;

  // Build where conditions for repos
  const conditions = [];
  if (ids && ids.length > 0) {
    conditions.push(inArray(repos.id, ids));
  }
  if (githubIds && githubIds.length > 0) {
    conditions.push(inArray(repos.githubId, githubIds));
  }
  if (teamIds && teamIds.length > 0) {
    conditions.push(inArray(repos.teamId, teamIds));
  }
  if (ownerLogin) {
    conditions.push(eq(repos.ownerLogin, ownerLogin));
  }

  // Return empty array if no conditions
  if (conditions.length === 0) {
    return [];
  }

  // Get repos
  const reposList = await db
    .select()
    .from(repos)
    .where(and(...conditions))
    .orderBy(repos.pushedAt);

  if (reposList.length === 0) {
    return [];
  }

  // Get project connections for these repos
  const repoIds = reposList.map((repo) => repo.id);

  const connections = await db
    .select({
      repoId: projectsRepos.repoId,
      projectId: projectsRepos.projectId,
      isPrimary: projectsRepos.isPrimary,
      projectName: projects.name,
    })
    .from(projectsRepos)
    .innerJoin(projects, eq(projectsRepos.projectId, projects.id))
    .where(inArray(projectsRepos.repoId, repoIds));

  // Map connections to repos
  const connectionMap = new Map<
    string,
    Array<{ projectId: string; projectName: string; isPrimary: boolean }>
  >();

  for (const conn of connections) {
    const existing = connectionMap.get(conn.repoId) || [];
    existing.push({
      projectId: conn.projectId,
      projectName: conn.projectName,
      isPrimary: conn.isPrimary,
    });
    connectionMap.set(conn.repoId, existing);
  }

  // Return repos with connection info
  return reposList.map((repo) => {
    const connections = connectionMap.get(repo.id) || [];
    return {
      ...repo,
      connections,
      // Keep single connection property for backward compatibility (using first one)
      connection: connections.length > 0 ? connections[0] : null,
    };
  });
}

/**
 * Get connection status for repositories by GitHub IDs
 * Returns a map of githubId -> boolean (connected or not)
 */
export async function getRepoConnectionStatus(
  githubIds: number[],
): Promise<Record<number, boolean>> {
  if (githubIds.length === 0) {
    return {};
  }

  // Query repos that are connected to projects
  const connectedRepos = await db
    .select({
      githubId: repos.githubId,
    })
    .from(repos)
    .innerJoin(projectsRepos, eq(repos.id, projectsRepos.repoId))
    .where(inArray(repos.githubId, githubIds));

  // Create a map of connected repository IDs
  const connectedIds = new Set(connectedRepos.map((repo) => repo.githubId));

  // Return status for all requested IDs
  const result: Record<number, boolean> = {};
  for (const id of githubIds) {
    result[id] = connectedIds.has(id);
  }

  return result;
}

/**
 * Get detailed connection information for repositories by GitHub IDs
 * Returns a map of githubId -> { projectId, isPrimary }
 */
export async function getRepoConnectionDetails(githubIds: number[]) {
  if (githubIds.length === 0) {
    return {};
  }

  // Query for connected repository details from database
  const connectedRepoDetails = await db
    .select({
      githubId: repos.githubId,
      projectId: projectsRepos.projectId,
      isPrimary: projectsRepos.isPrimary,
    })
    .from(repos)
    .innerJoin(projectsRepos, eq(repos.id, projectsRepos.repoId))
    .where(inArray(repos.githubId, githubIds));

  const result: Record<number, { projectId: string; isPrimary: boolean }> = {};

  for (const detail of connectedRepoDetails) {
    result[detail.githubId] = {
      projectId: detail.projectId,
      isPrimary: detail.isPrimary,
    };
  }

  return result;
}

/**
 * Create one or multiple repositories
 * Follows bulk operation pattern
 */
export async function createRepos(data: InsertRepo | InsertRepo[]) {
  const items = Array.isArray(data) ? data : [data];
  return db.insert(repos).values(items).returning();
}

/**
 * Upsert repositories by githubId (insert or update if exists)
 * Uses onConflictDoNothing for now - can be changed to onConflictDoUpdate if needed
 */
export async function upsertRepos(data: InsertRepo | InsertRepo[]) {
  const items = Array.isArray(data) ? data : [data];
  return db.insert(repos).values(items).onConflictDoNothing().returning();
}
