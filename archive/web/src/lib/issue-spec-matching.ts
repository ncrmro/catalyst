/**
 * Issue to Spec Matching Utilities
 *
 * Utilities for matching issues to specs and categorizing issues as bugs or enhancements.
 */

import type { Issue } from "@/types/reports";
import type { Spec } from "@/lib/pr-spec-matching";
import { matchPRToSpec, isPRChore } from "@/lib/pr-spec-matching";

export interface IssuesBySpec {
  bySpec: Record<string, Issue[]>;
  noSpec: Issue[];
}

/**
 * Match an issue title to a spec ID using tokenized matching (FR-022)
 *
 * Reuses the same tokenized matching logic as PRs:
 * Given a spec like "001-foo-bar", an issue containing "001", "foo", OR "bar"
 * in its title will be matched to that spec.
 *
 * @param issueTitle - The issue title
 * @param specIds - Array of spec IDs to match against
 * @returns The matched spec ID or null if no match
 */
export function matchIssueToSpec(
  issueTitle: string,
  specIds: string[],
): string | null {
  return matchPRToSpec(issueTitle, specIds);
}

/**
 * Determine if an issue is a bug based on its type and labels
 *
 * @param issue - The issue to check
 * @returns true if the issue is a bug
 */
export function isIssueBug(issue: Issue): boolean {
  if (issue.type === "bug") {
    return true;
  }
  return issue.labels.some((label) => label.toLowerCase().includes("bug"));
}

/**
 * Determine if an issue is an enhancement/feature based on its type and labels
 *
 * @param issue - The issue to check
 * @returns true if the issue is an enhancement or feature
 */
export function isIssueEnhancement(issue: Issue): boolean {
  if (issue.type === "feature" || issue.type === "improvement") {
    return true;
  }
  return issue.labels.some((label) =>
    ["enhancement", "feature"].includes(label.toLowerCase()),
  );
}

/**
 * Group issues by spec and type (bugs vs enhancements)
 *
 * @param issues - Array of issues to group
 * @param specs - Array of specs to match against
 * @returns Object containing bug and enhancement issues grouped by spec
 */
export function groupIssuesBySpecAndType(
  issues: Issue[],
  specs: Spec[],
): { bugIssues: IssuesBySpec; enhancementIssues: IssuesBySpec } {
  const specIds = specs.map((s) => s.id);

  const bugIssues: IssuesBySpec = { bySpec: {}, noSpec: [] };
  const enhancementIssues: IssuesBySpec = { bySpec: {}, noSpec: [] };

  issues.forEach((issue) => {
    const isBug = isIssueBug(issue);
    const matchedSpecId = matchIssueToSpec(issue.title, specIds);
    const target = isBug ? bugIssues : enhancementIssues;

    if (matchedSpecId) {
      if (!target.bySpec[matchedSpecId]) {
        target.bySpec[matchedSpecId] = [];
      }
      target.bySpec[matchedSpecId].push(issue);
    } else {
      target.noSpec.push(issue);
    }
  });

  return { bugIssues, enhancementIssues };
}

/**
 * Determine if an issue is platform/chore work based on its title and type
 * Uses same patterns as PR chore detection.
 *
 * @param issue - The issue to check
 * @returns true if the issue is platform/chore work
 */
export function isIssuePlatform(issue: Issue): boolean {
  // Bugs are typically platform/maintenance work
  if (issue.type === "bug") {
    return true;
  }
  // Check title for chore patterns (same as PRs)
  return isPRChore(issue.title);
}

/**
 * Split issues into feature and platform categories
 *
 * @param issues - Array of issues to split
 * @returns Object containing feature and platform issues
 */
export function splitIssuesByType(issues: Issue[]): {
  featureIssues: Issue[];
  platformIssues: Issue[];
} {
  const featureIssues: Issue[] = [];
  const platformIssues: Issue[] = [];

  issues.forEach((issue) => {
    if (isIssuePlatform(issue)) {
      platformIssues.push(issue);
    } else {
      featureIssues.push(issue);
    }
  });

  return { featureIssues, platformIssues };
}
