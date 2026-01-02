/**
 * Pull Requests Model
 *
 * Database operations for pull_requests table
 * No authentication - handled by actions layer
 */

import type { InferInsertModel } from "drizzle-orm";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { pullRequests, repos } from "@/db/schema";

export type InsertPullRequest = InferInsertModel<typeof pullRequests>;

/**
 * Query parameters for flexible pull request filtering
 */
export interface GetPullRequestsParams {
	ids?: string[];
	repoIds?: string[];
	state?: string;
	provider?: string;
	limit?: number;
}

/**
 * Get pull requests with optional filtering
 * Follows bulk operation pattern
 */
export async function getPullRequests(params: GetPullRequestsParams) {
	const { ids, repoIds, state, provider, limit = 50 } = params;

	// Build where conditions
	const conditions = [];
	if (ids && ids.length > 0) {
		conditions.push(inArray(pullRequests.id, ids));
	}
	if (repoIds && repoIds.length > 0) {
		conditions.push(inArray(pullRequests.repoId, repoIds));
	}
	if (state) {
		conditions.push(eq(pullRequests.state, state));
	}
	if (provider) {
		conditions.push(eq(pullRequests.provider, provider));
	}

	// Return empty array if no conditions
	if (conditions.length === 0) {
		return [];
	}

	return db
		.select()
		.from(pullRequests)
		.where(and(...conditions))
		.orderBy(desc(pullRequests.updatedAt))
		.limit(limit);
}

/**
 * Get pull requests with repository information
 * Useful for queries that need repo context
 */
export async function getPullRequestsWithRepos(params: GetPullRequestsParams) {
	const { ids, repoIds, state, provider, limit = 100 } = params;

	// Build where conditions for pull requests
	const conditions = [];
	if (ids && ids.length > 0) {
		conditions.push(inArray(pullRequests.id, ids));
	}
	if (repoIds && repoIds.length > 0) {
		conditions.push(inArray(pullRequests.repoId, repoIds));
	}
	if (state) {
		conditions.push(eq(pullRequests.state, state));
	}
	if (provider) {
		conditions.push(eq(pullRequests.provider, provider));
	}

	// Return empty array if no conditions
	if (conditions.length === 0) {
		return [];
	}

	return db
		.select({
			pullRequest: pullRequests,
			repo: repos,
		})
		.from(pullRequests)
		.innerJoin(repos, eq(pullRequests.repoId, repos.id))
		.where(and(...conditions))
		.orderBy(desc(pullRequests.updatedAt))
		.limit(limit);
}

/**
 * Find pull request by provider-specific data
 */
export async function findPullRequestByProvider(
	repoId: string,
	provider: string,
	providerPrId: string,
) {
	const [pr] = await db
		.select()
		.from(pullRequests)
		.where(
			and(
				eq(pullRequests.repoId, repoId),
				eq(pullRequests.provider, provider),
				eq(pullRequests.providerPrId, providerPrId),
			),
		)
		.limit(1);

	return pr || null;
}

/**
 * Upsert pull requests (insert or update if exists by unique constraint)
 * Handles single or multiple PRs
 */
export async function upsertPullRequests(
	data: InsertPullRequest | InsertPullRequest[],
) {
	const items = Array.isArray(data) ? data : [data];
	const results = [];

	for (const item of items) {
		// Check if PR already exists
		const existingPr = await findPullRequestByProvider(
			item.repoId,
			item.provider,
			item.providerPrId,
		);

		const prData = {
			...item,
			// Ensure JSON fields are properly formatted
			labels:
				item.labels && Array.isArray(item.labels)
					? JSON.stringify(item.labels)
					: item.labels,
			assignees:
				item.assignees && Array.isArray(item.assignees)
					? JSON.stringify(item.assignees)
					: item.assignees,
			reviewers:
				item.reviewers && Array.isArray(item.reviewers)
					? JSON.stringify(item.reviewers)
					: item.reviewers,
			updatedAt: new Date(),
		};

		if (existingPr) {
			// Update existing PR
			const [updatedPr] = await db
				.update(pullRequests)
				.set(prData)
				.where(eq(pullRequests.id, existingPr.id))
				.returning();

			results.push({ pullRequest: updatedPr, operation: "update" as const });
		} else {
			// Create new PR
			const [newPr] = await db.insert(pullRequests).values(prData).returning();

			results.push({ pullRequest: newPr, operation: "create" as const });
		}
	}

	return results;
}
