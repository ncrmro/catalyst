/**
 * Teams Model
 *
 * Database operations for teams table
 * No authentication - handled by actions layer
 */

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { teams, teamsMemberships, users } from "@/db/schema";

/**
 * Get teams for a specific user with owner info and role
 * Returns teams where the user is a member
 */
export async function getTeamsForUser(userId: string) {
	// Join teams with memberships and owner information
	const userTeams = await db
		.select({
			id: teams.id,
			name: teams.name,
			description: teams.description,
			ownerId: teams.ownerId,
			createdAt: teams.createdAt,
			updatedAt: teams.updatedAt,
			role: teamsMemberships.role,
			ownerName: users.name,
			ownerEmail: users.email,
		})
		.from(teamsMemberships)
		.innerJoin(teams, eq(teamsMemberships.teamId, teams.id))
		.innerJoin(users, eq(teams.ownerId, users.id))
		.where(eq(teamsMemberships.userId, userId));

	return userTeams.map((team) => ({
		id: team.id,
		name: team.name,
		description: team.description,
		ownerId: team.ownerId,
		createdAt: team.createdAt,
		updatedAt: team.updatedAt,
		role: team.role,
		owner: {
			name: team.ownerName,
			email: team.ownerEmail,
		},
	}));
}
