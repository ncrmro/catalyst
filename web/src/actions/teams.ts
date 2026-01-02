"use server";

import { auth } from "@/auth";
import { getTeamsForUser } from "@/models/teams";

export interface Team {
	id: string;
	name: string;
	description: string | null;
	ownerId: string;
	createdAt: Date;
	updatedAt: Date;
	role: string;
	owner: {
		name: string | null;
		email: string | null;
	};
}

/**
 * Mock data for development and testing
 */
function getMockTeamsData(): Team[] {
	const mockUserId = "mock-user-id";
	const now = new Date();

	return [
		{
			id: "team-1",
			name: "Test User's Team",
			description: "Personal team",
			ownerId: mockUserId,
			createdAt: now,
			updatedAt: now,
			role: "owner",
			owner: {
				name: "Test User",
				email: "test@example.com",
			},
		},
		{
			id: "team-2",
			name: "Awesome Organization",
			description: "A collaborative team for building amazing projects",
			ownerId: "other-user-id",
			createdAt: new Date(Date.now() - 86400000), // 1 day ago
			updatedAt: new Date(Date.now() - 3600000), // 1 hour ago
			role: "admin",
			owner: {
				name: "Organization Admin",
				email: "admin@awesome-org.com",
			},
		},
		{
			id: "team-3",
			name: "Development Team",
			description: "Core development team",
			ownerId: "dev-lead-id",
			createdAt: new Date(Date.now() - 604800000), // 1 week ago
			updatedAt: new Date(Date.now() - 86400000), // 1 day ago
			role: "member",
			owner: {
				name: "Dev Lead",
				email: "dev@company.com",
			},
		},
	];
}

export async function fetchUserTeams(): Promise<Team[]> {
	// Return mock data if in mocked mode
	if (process.env.MOCKED === "1") {
		return getMockTeamsData();
	}

	const session = await auth();

	try {
		return await getTeamsForUser(session.user.id);
	} catch (error) {
		console.error("Error fetching user teams:", error);
		throw new Error("Failed to fetch teams");
	}
}
