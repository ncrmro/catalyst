/**
 * Environments Model
 *
 * Database operations for project_environments table
 * No authentication - handled by actions layer
 */

import type { InferInsertModel } from "drizzle-orm";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { projectEnvironments } from "@/db/schema";

export type InsertEnvironment = InferInsertModel<typeof projectEnvironments>;
export type UpdateEnvironment = Partial<
	Omit<InsertEnvironment, "id" | "createdAt">
>;

/**
 * Query parameters for flexible environment filtering
 */
export interface GetEnvironmentsParams {
	ids?: string[];
	projectIds?: string[];
	repoIds?: string[];
	environments?: string[];
}

/**
 * Get environments with optional filtering
 * Follows bulk operation pattern
 */
export async function getEnvironments(params: GetEnvironmentsParams) {
	const { ids, projectIds, repoIds, environments: envs } = params;

	// Build where conditions
	const conditions = [];
	if (ids && ids.length > 0) {
		conditions.push(inArray(projectEnvironments.id, ids));
	}
	if (projectIds && projectIds.length > 0) {
		conditions.push(inArray(projectEnvironments.projectId, projectIds));
	}
	if (repoIds && repoIds.length > 0) {
		conditions.push(inArray(projectEnvironments.repoId, repoIds));
	}
	if (envs && envs.length > 0) {
		conditions.push(inArray(projectEnvironments.environment, envs));
	}

	// Return empty array if no conditions
	if (conditions.length === 0) {
		return [];
	}

	return db
		.select()
		.from(projectEnvironments)
		.where(and(...conditions));
}

/**
 * Check if an environment already exists for a project and repo
 */
export async function environmentExists(
	projectId: string,
	repoId: string,
	environment: string,
): Promise<boolean> {
	const [existing] = await db
		.select()
		.from(projectEnvironments)
		.where(
			and(
				eq(projectEnvironments.projectId, projectId),
				eq(projectEnvironments.repoId, repoId),
				eq(projectEnvironments.environment, environment),
			),
		)
		.limit(1);

	return !!existing;
}

/**
 * Create one or multiple environments
 * Follows bulk operation pattern
 */
export async function createEnvironments(
	data: InsertEnvironment | InsertEnvironment[],
) {
	const items = Array.isArray(data) ? data : [data];
	return db.insert(projectEnvironments).values(items).returning();
}

/**
 * Update environments by IDs
 * Follows bulk operation pattern
 */
export async function updateEnvironments(
	ids: string[],
	data: UpdateEnvironment,
) {
	if (ids.length === 0) {
		return [];
	}

	return db
		.update(projectEnvironments)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(inArray(projectEnvironments.id, ids))
		.returning();
}
