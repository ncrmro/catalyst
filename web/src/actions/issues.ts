"use server";

import { auth } from "@/auth";
import type { Issue } from "@/types/reports";
import { vcs } from "@/lib/vcs";

/**
 * Fetch issues from specific repositories using session-based authentication
 */
export async function fetchIssuesFromRepos(
  repositories: string[],
): Promise<Issue[]> {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("No authenticated user found");
  }

  const scopedVcs = vcs.getScoped(session.user.id);

  // Fetch from each specified repository in parallel
  const issuePromises = repositories.map(async (repoFullName) => {
    try {
      const [owner, repoName] = repoFullName.split("/");
      if (!owner || !repoName) return [];

      const issues = await scopedVcs.issues.list(owner, repoName, {
        state: "open",
      });
      return issues.map((issue) => ({
        id: parseInt(issue.id),
        title: issue.title,
        number: issue.number,
        repository: repoName,
        url: issue.htmlUrl,
        created_at: issue.createdAt.toISOString(),
        updated_at: issue.updatedAt.toISOString(),
        labels: issue.labels,
        priority: "medium" as const, // Singleton doesn't return this yet
        effort_estimate: "medium" as const, // Singleton doesn't return this yet
        type: "improvement" as const, // Singleton doesn't return this yet
        state: issue.state,
      }));
    } catch (error) {
      console.warn(`Could not fetch issues for ${repoFullName}:`, error);
      return [];
    }
  });

  const results = await Promise.all(issuePromises);
  return results.flat();
}
