"use server";

/**
 * CI Checks Server Actions
 * 
 * Fetches and normalizes CI check status from GitHub Checks API and Commit Statuses API
 */

import { auth } from "@/auth";
import { Octokit } from "@octokit/rest";
import { fetchProjectById } from "./projects";
import type { CICheck, CIStatusSummary, CICheckState, CICheckSource } from "@/lib/types/ci-checks";

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
    if (!session?.accessToken) {
      console.warn("No GitHub access token found");
      return null;
    }

    const octokit = new Octokit({
      auth: session.accessToken,
    });

    const [owner, repoName] = repo.fullName.split("/");
    if (!owner || !repoName) {
      console.warn(`Invalid repository name format: ${repo.fullName}`);
      return null;
    }

    // Get PR to get the head SHA
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo: repoName,
      pull_number: prNumber,
    });

    const headSha = pr.head.sha;

    // Fetch both check runs and commit statuses in parallel
    const [checkRunsResponse, statusesResponse] = await Promise.all([
      octokit.rest.checks.listForRef({
        owner,
        repo: repoName,
        ref: headSha,
      }).catch((error) => {
        console.warn("Could not fetch check runs:", error);
        return null;
      }),
      octokit.rest.repos.getCombinedStatusForRef({
        owner,
        repo: repoName,
        ref: headSha,
      }).catch((error) => {
        console.warn("Could not fetch commit statuses:", error);
        return null;
      }),
    ]);

    const checks: CICheck[] = [];

    // Process check runs (newer GitHub Checks API)
    if (checkRunsResponse) {
      for (const checkRun of checkRunsResponse.data.check_runs) {
        checks.push(normalizeCheckRun(checkRun));
      }
    }

    // Process commit statuses (older Status API)
    if (statusesResponse) {
      for (const status of statusesResponse.data.statuses) {
        checks.push(normalizeCommitStatus(status));
      }
    }

    // Calculate summary
    const passingChecks = checks.filter((c) => c.state === "passing").length;
    const failingChecks = checks.filter((c) => c.state === "failing").length;
    const pendingChecks = checks.filter((c) => c.state === "pending").length;

    // Determine overall state
    let overall: CICheckState = "passing";
    if (failingChecks > 0) {
      overall = "failing";
    } else if (pendingChecks > 0) {
      overall = "pending";
    }

    return {
      overall,
      checks,
      totalChecks: checks.length,
      passingChecks,
      failingChecks,
      pendingChecks,
    };
  } catch (error) {
    console.error(`Error fetching CI status for PR ${prNumber}:`, error);
    return null;
  }
}

/**
 * Normalize a GitHub Check Run to CICheck format
 */
function normalizeCheckRun(checkRun: {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  started_at: string | null;
  completed_at: string | null;
  html_url: string | null;
  details_url: string | null;
  output: { title: string | null } | null;
  app: { slug?: string } | null;
}): CICheck {
  // Map GitHub check run conclusion and status to our state
  let state: CICheckState = "pending";
  if (checkRun.status === "completed") {
    switch (checkRun.conclusion) {
      case "success":
        state = "passing";
        break;
      case "failure":
        state = "failing";
        break;
      case "cancelled":
      case "timed_out":
        state = "cancelled";
        break;
      case "skipped":
      case "neutral":
        state = "skipped";
        break;
      default:
        // action_required, stale
        state = "failing";
    }
  } else if (checkRun.status === "queued" || checkRun.status === "in_progress") {
    state = "pending";
  }

  // Determine source from check run name or app
  let source: CICheckSource = "external";
  const name = checkRun.name.toLowerCase();
  const appSlug = checkRun.app?.slug?.toLowerCase() || "";
  
  if (name.includes("github") || appSlug.includes("github")) {
    source = "github-actions";
  } else if (name.includes("cloudflare") || appSlug.includes("cloudflare")) {
    source = "cloudflare";
  } else if (name.includes("vercel") || appSlug.includes("vercel")) {
    source = "vercel";
  } else if (name.includes("catalyst") || appSlug.includes("catalyst")) {
    source = "catalyst";
  }

  const startedAt = checkRun.started_at ? new Date(checkRun.started_at) : undefined;
  const completedAt = checkRun.completed_at ? new Date(checkRun.completed_at) : undefined;
  const duration = startedAt && completedAt
    ? Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)
    : undefined;

  return {
    id: String(checkRun.id),
    name: checkRun.name,
    state,
    url: checkRun.html_url || checkRun.details_url || undefined,
    description: checkRun.output?.title || undefined,
    context: checkRun.name,
    startedAt,
    completedAt,
    duration,
    source,
  };
}

/**
 * Normalize a GitHub Commit Status to CICheck format
 */
function normalizeCommitStatus(status: {
  id: number;
  context: string;
  state: string;
  description: string | null;
  target_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}): CICheck {
  // Map GitHub status state to our state
  let state: CICheckState;
  switch (status.state) {
    case "success":
      state = "passing";
      break;
    case "failure":
    case "error":
      state = "failing";
      break;
    case "pending":
      state = "pending";
      break;
    default:
      state = "pending";
  }

  // Determine source from context
  let source: CICheckSource = "external";
  const context = status.context.toLowerCase();
  
  if (context.includes("github") || context.includes("actions")) {
    source = "github-actions";
  } else if (context.includes("cloudflare")) {
    source = "cloudflare";
  } else if (context.includes("vercel")) {
    source = "vercel";
  } else if (context.includes("catalyst")) {
    source = "catalyst";
  }

  return {
    id: String(status.id),
    name: status.context,
    state,
    url: status.target_url || undefined,
    description: status.description || undefined,
    context: status.context,
    startedAt: status.created_at ? new Date(status.created_at) : undefined,
    completedAt: status.updated_at ? new Date(status.updated_at) : undefined,
    source,
  };
}
