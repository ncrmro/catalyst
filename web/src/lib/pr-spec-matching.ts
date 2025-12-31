/**
 * PR to Spec Matching Utilities
 *
 * Utilities for matching pull requests to specs and categorizing PRs as feature or platform work.
 */

import type { PullRequest } from "@/types/reports";

export interface Spec {
  id: string;
  name: string;
  href: string;
}

export interface PRsBySpec {
  bySpec: Record<string, PullRequest[]>;
  noSpec: PullRequest[];
}

/**
 * Match a PR title to a spec ID
 *
 * Looks for spec IDs in PR titles using common patterns:
 * - "feat(009-projects): description"
 * - "[009-projects] description"
 * - "009-projects: description"
 *
 * @param prTitle - The pull request title
 * @param specIds - Array of spec IDs to match against
 * @returns The matched spec ID or null if no match
 */
export function matchPRToSpec(
  prTitle: string,
  specIds: string[],
): string | null {
  const titleLower = prTitle.toLowerCase();

  for (const specId of specIds) {
    // Case-insensitive substring match
    if (titleLower.includes(specId.toLowerCase())) {
      return specId;
    }
  }

  return null;
}

/**
 * Determine if a PR is a chore/platform task based on its title
 *
 * Chore patterns include: chore, ci, build, refactor, style, docs
 * These follow conventional commit prefixes.
 *
 * @param prTitle - The pull request title
 * @returns true if the PR is a chore/platform task
 */
export function isPRChore(prTitle: string): boolean {
  const chorePatterns = [
    /^chore/i,
    /^ci/i,
    /^build/i,
    /^refactor/i,
    /^style/i,
    /^docs/i,
  ];

  const trimmedTitle = prTitle.trim();
  return chorePatterns.some((pattern) => pattern.test(trimmedTitle));
}

/**
 * Group pull requests by spec and type (feature vs platform)
 *
 * @param pullRequests - Array of pull requests to group
 * @param specs - Array of specs to match against
 * @returns Object containing feature and platform PRs grouped by spec
 */
export function groupPRsBySpecAndType(
  pullRequests: PullRequest[],
  specs: Spec[],
): { featurePRs: PRsBySpec; platformPRs: PRsBySpec } {
  const specIds = specs.map((s) => s.id);

  const featurePRs: PRsBySpec = { bySpec: {}, noSpec: [] };
  const platformPRs: PRsBySpec = { bySpec: {}, noSpec: [] };

  pullRequests.forEach((pr) => {
    const isChore = isPRChore(pr.title);
    const matchedSpecId = matchPRToSpec(pr.title, specIds);
    const target = isChore ? platformPRs : featurePRs;

    if (matchedSpecId) {
      if (!target.bySpec[matchedSpecId]) {
        target.bySpec[matchedSpecId] = [];
      }
      target.bySpec[matchedSpecId].push(pr);
    } else {
      target.noSpec.push(pr);
    }
  });

  return { featurePRs, platformPRs };
}
