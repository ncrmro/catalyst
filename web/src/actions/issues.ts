"use server";

import { auth } from "@/auth";
import { fetchIssues, refreshTokenIfNeeded } from "@/lib/vcs-providers";
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

  // Refresh tokens before fetching issues to ensure valid GitHub access
  try {
    await refreshTokenIfNeeded(userId);
  } catch (error) {
    console.error("Failed to refresh tokens before fetching issues:", error);
    // Continue anyway - getUserOctokit will attempt refresh again
  }

  // Call core function with authenticated instance
  return (await fetchIssues(userId, repositories)) as unknown as Issue[];
}
