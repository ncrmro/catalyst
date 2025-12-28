/**
 * CI Check Normalization Utilities
 * Part of spec 009-projects - US3: View CI Check Status
 * T027: Implement normalizeStatusChecks() utility
 */

import type { StatusCheck, CheckState, ChecksSummary } from "@/types/ci-checks";

/**
 * Maps GitHub Check conclusion to our normalized state
 */
function mapCheckConclusion(conclusion: string | null): CheckState {
  switch (conclusion) {
    case "success":
      return "passing";
    case "failure":
      return "failing";
    case "cancelled":
      return "cancelled";
    case "skipped":
      return "skipped";
    case "neutral":
    case "action_required":
    case "timed_out":
      return "neutral";
    case null:
      return "pending";
    default:
      return "neutral";
  }
}

/**
 * Maps GitHub Commit Status state to our normalized state
 */
function mapStatusState(state: string): CheckState {
  switch (state) {
    case "success":
      return "passing";
    case "failure":
    case "error":
      return "failing";
    case "pending":
      return "pending";
    default:
      return "neutral";
  }
}

/**
 * Determines the source of a check based on context and app info
 */
function determineCheckSource(
  context: string,
  appName?: string,
): StatusCheck["source"] {
  if (appName?.toLowerCase().includes("github actions") || context.includes("/")) {
    return "github-actions";
  }
  if (context.toLowerCase().includes("cloudflare")) {
    return "cloudflare";
  }
  if (context.toLowerCase().includes("vercel")) {
    return "vercel";
  }
  if (context.toLowerCase().includes("catalyst")) {
    return "catalyst";
  }
  return "external";
}

/**
 * Normalize GitHub Check Runs into our StatusCheck format
 * T025: Used with getCheckRuns()
 */
export function normalizeCheckRuns(
  checkRuns: Array<{
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    started_at: string;
    completed_at: string | null;
    details_url: string | null;
    output?: {
      title: string | null;
      summary: string | null;
    };
    app?: {
      name: string;
    };
  }>,
): StatusCheck[] {
  return checkRuns.map((check) => {
    const state =
      check.status === "completed"
        ? mapCheckConclusion(check.conclusion)
        : "pending";

    const startedAt = check.started_at ? new Date(check.started_at) : undefined;
    const completedAt = check.completed_at
      ? new Date(check.completed_at)
      : undefined;

    const duration =
      startedAt && completedAt
        ? completedAt.getTime() - startedAt.getTime()
        : undefined;

    return {
      id: `check-${check.id}`,
      name: check.name,
      state,
      url: check.details_url || undefined,
      description: check.output?.title || check.output?.summary || undefined,
      context: check.name,
      startedAt,
      completedAt,
      duration,
      source: determineCheckSource(check.name, check.app?.name),
      conclusion: check.conclusion || undefined,
    };
  });
}

/**
 * Normalize GitHub Commit Statuses into our StatusCheck format
 * T026: Used with getCommitStatuses()
 */
export function normalizeCommitStatuses(
  statuses: Array<{
    id: number;
    state: string;
    description: string | null;
    target_url: string | null;
    context: string;
    created_at: string;
    updated_at: string;
  }>,
): StatusCheck[] {
  return statuses.map((status) => {
    const createdAt = new Date(status.created_at);
    const updatedAt = new Date(status.updated_at);

    return {
      id: `status-${status.id}`,
      name: status.context,
      state: mapStatusState(status.state),
      url: status.target_url || undefined,
      description: status.description || undefined,
      context: status.context,
      startedAt: createdAt,
      completedAt: updatedAt,
      duration: updatedAt.getTime() - createdAt.getTime(),
      source: determineCheckSource(status.context),
    };
  });
}

/**
 * Merge and deduplicate checks from multiple sources
 * Prefers Check Runs over Commit Statuses when both exist for same check
 */
export function mergeChecks(
  checkRuns: StatusCheck[],
  commitStatuses: StatusCheck[],
): StatusCheck[] {
  const checkMap = new Map<string, StatusCheck>();

  // Add all check runs first (they have priority)
  checkRuns.forEach((check) => {
    checkMap.set(check.context.toLowerCase(), check);
  });

  // Add commit statuses only if no check run exists for that context
  commitStatuses.forEach((status) => {
    const key = status.context.toLowerCase();
    if (!checkMap.has(key)) {
      checkMap.set(key, status);
    }
  });

  return Array.from(checkMap.values());
}

/**
 * Create a summary of all checks
 * T027: Main normalization function
 */
export function createChecksSummary(checks: StatusCheck[]): ChecksSummary {
  const summary: ChecksSummary = {
    total: checks.length,
    passing: 0,
    failing: 0,
    pending: 0,
    cancelled: 0,
    skipped: 0,
    overallStatus: "pending",
    checks,
  };

  checks.forEach((check) => {
    switch (check.state) {
      case "passing":
        summary.passing++;
        break;
      case "failing":
        summary.failing++;
        break;
      case "pending":
        summary.pending++;
        break;
      case "cancelled":
        summary.cancelled++;
        break;
      case "skipped":
        summary.skipped++;
        break;
    }
  });

  // Determine overall status
  if (summary.failing > 0) {
    summary.overallStatus = "failure";
  } else if (summary.pending > 0) {
    summary.overallStatus = "pending";
  } else if (summary.passing > 0) {
    summary.overallStatus = "success";
  } else {
    summary.overallStatus = "neutral";
  }

  return summary;
}
