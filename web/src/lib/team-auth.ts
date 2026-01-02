"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { teams, teamsMemberships } from "@/db/schema";

/**
 * Get all team IDs that the current user is a member of
 */
export async function getUserTeamIds(): Promise<string[]> {
	const session = await auth();

	if (!session?.user?.id) {
		return [];
	}

	try {
		const userTeams = await db
			.select({
				teamId: teamsMemberships.teamId,
			})
			.from(teamsMemberships)
			.where(eq(teamsMemberships.userId, session.user.id));

		// Ensure we always return an array
		if (!Array.isArray(userTeams)) {
			console.warn("getUserTeamIds: userTeams is not an array:", userTeams);
			return [];
		}

		return userTeams.map((team) => team.teamId);
	} catch (error) {
		console.error("Error fetching user team IDs:", error);
		return [];
	}
}

/**
 * Check if the current user is a member of a specific team
 */
export async function isUserTeamMember(teamId: string): Promise<boolean> {
	const session = await auth();

	if (!session?.user?.id) {
		return false;
	}

	try {
		const membership = await db
			.select()
			.from(teamsMemberships)
			.where(
				and(
					eq(teamsMemberships.userId, session.user.id),
					eq(teamsMemberships.teamId, teamId),
				),
			)
			.limit(1);

		return membership.length > 0;
	} catch (error) {
		console.error("Error checking team membership:", error);
		return false;
	}
}

/**
 * Check if the current user has admin or owner role in a specific team
 */
export async function isUserTeamAdminOrOwner(teamId: string): Promise<boolean> {
	const session = await auth();

	if (!session?.user?.id) {
		return false;
	}

	try {
		const membership = await db
			.select({
				role: teamsMemberships.role,
			})
			.from(teamsMemberships)
			.where(
				and(
					eq(teamsMemberships.userId, session.user.id),
					eq(teamsMemberships.teamId, teamId),
				),
			)
			.limit(1);

		if (membership.length === 0) {
			return false;
		}

		const role = membership[0].role;
		return role === "admin" || role === "owner";
	} catch (error) {
		console.error("Error checking team admin/owner status:", error);
		return false;
	}
}

/**
 * Get team details for teams that the current user is a member of
 */
export async function getUserTeamsWithDetails() {
	const session = await auth();

	if (!session?.user?.id) {
		return [];
	}

	try {
		const userTeams = await db
			.select({
				teamId: teams.id,
				teamName: teams.name,
				teamDescription: teams.description,
				role: teamsMemberships.role,
			})
			.from(teamsMemberships)
			.innerJoin(teams, eq(teamsMemberships.teamId, teams.id))
			.where(eq(teamsMemberships.userId, session.user.id));

		return userTeams;
	} catch (error) {
		console.error("Error fetching user teams with details:", error);
		return [];
	}
}

/**
 * Get the user's primary team ID (first team they're a member of)
 */
export async function getUserPrimaryTeamId(): Promise<string | null> {
	const session = await auth();

	if (!session?.user?.id) {
		return null;
	}

	try {
		const userTeam = await db
			.select({
				teamId: teamsMemberships.teamId,
			})
			.from(teamsMemberships)
			.where(eq(teamsMemberships.userId, session.user.id))
			.limit(1);

		return userTeam.length > 0 ? userTeam[0].teamId : null;
	} catch (error) {
		console.error("Error fetching user primary team ID:", error);
		return null;
	}
}
