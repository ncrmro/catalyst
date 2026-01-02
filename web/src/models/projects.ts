/**
 * Projects Model
 *
 * Database operations for projects table
 * No authentication - handled by actions layer
 */

import type { InferInsertModel } from "drizzle-orm";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";

// Re-export types from shared types file for backwards compatibility
export type { ProjectRepo, ProjectWithRelations } from "@/types/projects";

export type InsertProject = InferInsertModel<typeof projects>;
export type UpdateProject = Partial<Omit<InsertProject, "id" | "createdAt">>;

/**
 * Query parameters for flexible project filtering
 */
export interface GetProjectsParams {
	ids?: string[];
	slugs?: string[];
	teamIds?: string[];
	ownerLogin?: string;
}

/**
 * Get projects with relations (always includes repositories and environments)
 * Follows bulk operation pattern - handles single or multiple IDs
 */
export async function getProjects(params: GetProjectsParams) {
	const { ids, slugs, teamIds, ownerLogin } = params;

	// Build where conditions
	const conditions = [];
	if (ids && ids.length > 0) {
		conditions.push(inArray(projects.id, ids));
	}
	if (slugs && slugs.length > 0) {
		conditions.push(inArray(projects.slug, slugs));
	}
	if (teamIds && teamIds.length > 0) {
		conditions.push(inArray(projects.teamId, teamIds));
	}
	if (ownerLogin) {
		conditions.push(eq(projects.ownerLogin, ownerLogin));
	}

	// Return empty array if no conditions (prevents fetching all projects)
	if (conditions.length === 0) {
		return [];
	}

	// Always use relational query for simplicity
	return db.query.projects.findMany({
		where: and(...conditions),
		with: {
			repositories: {
				with: {
					repo: true,
				},
			},
			environments: true,
		},
	});
}

/**
 * Create one or multiple projects
 * Follows bulk operation pattern
 */
export async function createProjects(data: InsertProject | InsertProject[]) {
	const items = Array.isArray(data) ? data : [data];
	return db.insert(projects).values(items).returning();
}

/**
 * Update multiple projects by IDs
 * Follows bulk operation pattern
 */
export async function updateProjects(ids: string[], data: UpdateProject) {
	if (ids.length === 0) {
		return [];
	}

	return db
		.update(projects)
		.set({
			...data,
			updatedAt: new Date(),
		})
		.where(inArray(projects.id, ids))
		.returning();
}

/**
 * Increment preview environment count for a project
 * Specialized operation for common use case
 */
export async function incrementPreviewCount(projectId: string) {
	const [project] = await db
		.select({ count: projects.previewEnvironmentsCount })
		.from(projects)
		.where(eq(projects.id, projectId));

	if (!project) {
		throw new Error("Project not found");
	}

	return db
		.update(projects)
		.set({
			previewEnvironmentsCount: (project.count || 0) + 1,
			updatedAt: new Date(),
		})
		.where(eq(projects.id, projectId))
		.returning();
}
