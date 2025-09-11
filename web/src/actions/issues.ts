'use server';

import { auth } from "@/lib/auth.config";
import { getUserOctokit, fetchIssuesFromRepos as coreFetchIssuesFromRepos } from "@/lib/github";
import type { Issue } from "@/actions/reports";

/**
 * Fetch issues from specific repositories using session-based authentication
 * Uses GitHub App user tokens from database with PAT fallback
 */
export async function fetchIssuesFromRepos(repositories: string[]): Promise<Issue[]> {
  const session = await auth();
  
  if (!session?.user?.id) {
    throw new Error('No authenticated user found');
  }

  // Get authenticated Octokit instance with session management
  const octokit = await getUserOctokit(session.user.id);
  
  // Call core function with authenticated instance
  return await coreFetchIssuesFromRepos(octokit, repositories);
}

