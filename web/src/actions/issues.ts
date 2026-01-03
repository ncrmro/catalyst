"use server";

import { auth } from "@/auth";
import { fetchIssues } from "@/lib/vcs-providers";
import type { Issue } from "@/types/reports";

/**
 * Fetch issues from specific repositories using session-based authentication
 * Uses GitHub App user tokens from database with PAT fallback
 */
export async function fetchIssuesFromRepos(
  repositories: string[],
): Promise<Issue[]> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("No authenticated user found");
  }

  const userId = session.user.id;

  // Call core function with authenticated instance
  return (await fetchIssues(userId, repositories)) as unknown as Issue[];
}
