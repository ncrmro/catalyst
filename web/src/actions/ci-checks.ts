"use server";

/**
 * CI Checks Server Actions
 *
 * Fetches and normalizes CI check status from GitHub Checks API and Commit Statuses API
 */

import { auth } from "@/auth";
import type { CIStatusSummary } from "@/lib/types/ci-checks";
import { getProvider, getVCSClient } from "@/lib/vcs-providers";
import { fetchProjectById } from "./projects";

/**
 * Get CI status for a pull request
 */
export async function getCIStatus(
	projectId: string,
	prNumber: number,
): Promise<CIStatusSummary | null> {
	try {
		const project = await fetchProjectById(projectId);
		if (!project) {
			return null;
		}

		const repo = project.repositories[0]?.repo;
		if (!repo) {
			return null;
		}

		const session = await auth();
		if (!session?.user?.id) {
			console.warn("No authenticated user found for fetching CI status");
			return null;
		}

		const [owner, repoName] = repo.fullName.split("/");
		if (!owner || !repoName) {
			console.warn(`Invalid repository name format: ${repo.fullName}`);
			return null;
		}

		// Call provider function via generic interface
		const client = await getVCSClient(session.user.id);
		const provider = getProvider(client.providerId);

		// Cast result to match local type definition if needed,
		// though ideally types should be shared or mapped
		return (await provider.getCIStatus(
			client,
			owner,
			repoName,
			prNumber,
		)) as unknown as CIStatusSummary;
	} catch (error) {
		console.error(`Error fetching CI status for PR ${prNumber}:`, error);
		return null;
	}
}
