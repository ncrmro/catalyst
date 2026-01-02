"use server";

import { getUserTeamIds } from "@/lib/team-auth";
import {
	getRepoConnectionDetails,
	getRepoConnectionStatus,
	getReposWithConnections,
} from "@/models/repos";

/**
 * Get the connection status of repositories by their GitHub IDs
 */
export async function getRepositoryConnectionStatus(
	githubIds: number[],
): Promise<Record<number, boolean>> {
	if (githubIds.length === 0) {
		return {};
	}

	try {
		// Check if we should return mocked data
		const mocked = process.env.MOCKED;

		if (mocked === "1") {
			// For demo purposes, let's say some repos are connected
			// This simulates that repos with IDs 1, 201, and 301 are connected
			const connectedIds = [1, 201, 301];
			const result: Record<number, boolean> = {};

			for (const id of githubIds) {
				result[id] = connectedIds.includes(id);
			}

			return result;
		}

		return await getRepoConnectionStatus(githubIds);
	} catch (error) {
		console.error("Error checking repository connection status:", error);
		// Return all as unconnected in case of error
		const result: Record<number, boolean> = {};
		for (const id of githubIds) {
			result[id] = false;
		}
		return result;
	}
}

/**
 * Get detailed information about connected repositories including their project associations
 */
export async function getConnectedRepositoryDetails(githubIds: number[]) {
	if (githubIds.length === 0) {
		return {};
	}

	try {
		// Check if we should return mocked data
		const mocked = process.env.MOCKED;

		if (mocked === "1") {
			// Mock data for connected repositories
			return {
				1: {
					projectName: "My Awesome Project",
					projectId: "proj-1",
					isPrimary: true,
				},
				201: {
					projectName: "Main Product",
					projectId: "proj-2",
					isPrimary: true,
				},
				301: {
					projectName: "Community Tools",
					projectId: "proj-3",
					isPrimary: false,
				},
			};
		}

		return await getRepoConnectionDetails(githubIds);
	} catch (error) {
		console.error("Error fetching connected repository details:", error);
		return {};
	}
}

/**
 * Fetch all repositories from the database for the current user's teams
 * These are the repositories that have been previously added or created during seeding
 */
export async function fetchDatabaseRepos() {
	try {
		// Get user's team IDs for authorization
		const userTeamIds = await getUserTeamIds();

		if (userTeamIds.length === 0) {
			return [];
		}

		// Query repositories that belong to the user's teams with connections
		const userRepos = await getReposWithConnections({ teamIds: userTeamIds });

		// Format response to match GitHub repos structure
		return userRepos.map((repo) => ({
			id: repo.githubId,
			name: repo.name,
			full_name: repo.fullName,
			description: repo.description,
			private: repo.isPrivate,
			owner: {
				login: repo.ownerLogin,
				type: repo.ownerType as "User" | "Organization",
				avatar_url:
					repo.ownerAvatarUrl || "https://github.com/identicons/github.png",
			},
			html_url: repo.url,
			language: repo.language,
			stargazers_count: repo.stargazersCount,
			forks_count: repo.forksCount,
			open_issues_count: repo.openIssuesCount,
			updated_at: repo.pushedAt?.toISOString() || repo.updatedAt.toISOString(),
			connection: repo.connection || null,
			teamId: repo.teamId,
			database_id: repo.id, // Internal database ID, useful for some operations
		}));
	} catch (error) {
		console.error("Error fetching repositories from database:", error);
		return [];
	}
}
