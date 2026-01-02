"use server";

import { checkGitHubConnection } from "@/actions/account";
import { auth } from "@/auth";
import { getUserPrimaryTeamId } from "@/lib/team-auth";
import { createProjects } from "@/models/projects";
import type { CreateProjectFormData } from "./create-project-form";

interface CreateProjectResult {
	success: boolean;
	project?: {
		id: string;
		slug: string;
		name: string;
	};
	error?: string;
}

export async function createProject(
	data: CreateProjectFormData,
): Promise<CreateProjectResult> {
	const session = await auth();

	if (!session?.user?.id) {
		return {
			success: false,
			error: "You must be signed in to create a project",
		};
	}

	// Get user's primary team
	const teamId = await getUserPrimaryTeamId();
	if (!teamId) {
		return {
			success: false,
			error: "You must belong to a team to create a project",
		};
	}

	// Get GitHub username for ownerLogin
	const githubStatus = await checkGitHubConnection();
	const ownerLogin = githubStatus.username || session.user.name || "user";

	try {
		const [project] = await createProjects({
			name: data.name,
			slug: data.slug,
			fullName: `${ownerLogin}/${data.slug}`,
			description: data.description || null,
			ownerLogin,
			ownerType: "User",
			teamId,
		});

		return {
			success: true,
			project: {
				id: project.id,
				slug: project.slug,
				name: project.name,
			},
		};
	} catch (error) {
		console.error("Failed to create project:", error);

		// Check for unique constraint violation
		if (error instanceof Error && error.message.includes("unique")) {
			return {
				success: false,
				error: "A project with this slug already exists in your team",
			};
		}

		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Failed to create project",
		};
	}
}
