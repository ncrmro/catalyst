"use server";

/**
 * CI Check Status Actions
 * Part of spec 009-projects - US3: View CI Check Status
 * T028: getCIStatus action
 */

import { auth } from "@/auth";
import { providerRegistry } from "@/lib/vcs-providers";
import { getPullRequest } from "@/actions/pull-requests-vcs";
import {
  normalizeCheckRuns,
  normalizeCommitStatuses,
  mergeChecks,
  createChecksSummary,
} from "@/lib/ci-checks";
import type { ChecksSummary } from "@/types/ci-checks";

/**
 * Get CI status for a pull request
 * T028: Fetches and normalizes CI checks from GitHub
 *
 * @param projectSlug - Project slug
 * @param prNumber - Pull request number
 * @returns Summary of all CI checks
 */
export async function getCIStatus(
  projectSlug: string,
  prNumber: number,
): Promise<ChecksSummary | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      console.log("[getCIStatus] Not authenticated");
      return null;
    }

    // Get the PR to find its head SHA
    const pr = await getPullRequest(projectSlug, prNumber);
    if (!pr) {
      console.log("[getCIStatus] PR not found");
      return null;
    }

    // Parse repository owner and name
    const [owner, repo] = pr.repositoryFullName.split("/");
    if (!owner || !repo) {
      console.log("[getCIStatus] Invalid repository name");
      return null;
    }

    // Get GitHub client
    const provider = providerRegistry.getDefault();
    const client = await provider.authenticate(session.user.id);
    const octokit = client.raw;

    // Get head SHA from the PR
    // Note: We'll need to fetch this from the PR object
    // For now, we'll use pr.id as a placeholder - in reality we need pr.head.sha
    // This would require extending the PullRequest type to include head SHA

    try {
      // Fetch PR details to get head SHA
      const { data: prData } = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });

      const headSha = prData.head.sha;

      // T025: Fetch Check Runs
      const { data: checkRunsData } = await octokit.rest.checks.listForRef({
        owner,
        repo,
        ref: headSha,
      });

      // T026: Fetch Commit Statuses
      const { data: commitStatusesData } =
        await octokit.rest.repos.listCommitStatusesForRef({
          owner,
          repo,
          ref: headSha,
        });

      // T027: Normalize and merge checks
      const normalizedCheckRuns = normalizeCheckRuns(
        checkRunsData.check_runs || [],
      );
      const normalizedStatuses = normalizeCommitStatuses(
        commitStatusesData || [],
      );
      const allChecks = mergeChecks(normalizedCheckRuns, normalizedStatuses);

      // Create summary
      return createChecksSummary(allChecks);
    } catch (error) {
      console.error("[getCIStatus] Error fetching checks:", error);
      return null;
    }
  } catch (error) {
    console.error("[getCIStatus] Error:", error);
    return null;
  }
}
