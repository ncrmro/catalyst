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
 * Tokenize a spec name into searchable tokens
 *
 * Splits spec directory name on hyphens and filters out short tokens
 * to avoid false positives.
 *
 * @example tokenizeSpecName("009-projects") => ["009", "projects"]
 * @example tokenizeSpecName("001-auth-system") => ["001", "auth", "system"]
 *
 * @param specName - The spec directory name (e.g., "009-projects")
 * @returns Array of tokens for matching
 */
export function tokenizeSpecName(specName: string): string[] {
  return specName.split("-").filter((token) => token.length >= 2); // Filter single-char tokens to avoid false positives
}

/**
 * Match a PR title to a spec ID using tokenized matching (FR-022)
 *
 * Given a spec like "001-foo-bar", a PR containing "001", "foo", OR "bar"
 * in its title will be matched to that spec.
 *
 * Matching priority:
 * 1. Exact full spec ID match (e.g., "feat(009-projects):" matches "009-projects")
 * 2. Token match - any token from the spec name appears in the title
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

  // First pass: exact spec ID match (highest priority)
  for (const specId of specIds) {
    if (titleLower.includes(specId.toLowerCase())) {
      return specId;
    }
  }

  // Second pass: tokenized matching
  for (const specId of specIds) {
    const tokens = tokenizeSpecName(specId);
    for (const token of tokens) {
      // Use word boundary matching to avoid partial word matches
      // e.g., "001" should match "001-projects" but not "10001"
      const tokenRegex = new RegExp(`\\b${token}\\b`, "i");
      if (tokenRegex.test(prTitle)) {
        return specId;
      }
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
