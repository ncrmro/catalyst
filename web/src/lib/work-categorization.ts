/**
 * Work Categorization Utilities
 *
 * Logic for categorizing work items (PRs, branches) into feature or platform tasks.
 */

import { matchPRToSpec } from "./pr-spec-matching";
import type { CICheckState } from "./types/ci-checks";

export type WorkCategory = "feature" | "platform";

export interface WorkItemPR {
  kind: "pr";
  id: string;
  number: number;
  title: string;
  author: string;
  authorAvatar?: string;
  repository: string;
  url: string;
  headBranch: string;
  status: "draft" | "ready" | "changes_requested";
  updatedAt: Date;
  category: WorkCategory;
  ciStatus?: CICheckState;
  previewUrl?: string;
  specId?: string;
}

export interface WorkItemBranch {
  kind: "branch";
  id: string;
  name: string;
  repository: string;
  url: string;
  lastCommitMessage: string;
  lastCommitAuthor: string;
  lastCommitDate: Date;
  category: WorkCategory;
  specId?: string;
}

export interface WorkItemIssue {
  kind: "issue";
  id: string;
  number: number;
  title: string;
  repository: string;
  url: string;
  state: "open" | "closed";
  updatedAt: Date;
  category: WorkCategory;
  specId?: string;
}

export type WorkItem = WorkItemPR | WorkItemBranch | WorkItemIssue;

/**
 * Determine if a work item (PR or branch) is platform/chore work
 *
 * Rules:
 * - Check title/name for patterns: ^chore[:/(], ^ci[:/(], ^build[:/(], chore/, ^chore-
 * - Semantic prefixes: chore, ci, build
 *
 * @param title - PR title or branch name
 * @returns true if it's platform work
 */
export function isPlatformWork(title: string): boolean {
  const platformPatterns = [
    /^chore[:/(]/i,
    /^ci[:/(]/i,
    /^build[:/(]/i,
    /chore\//i,
    /^chore-/i,
    /^infra[:/(]/i,
    /^deps[:/(]/i,
  ];

  const trimmedTitle = title.trim();
  return platformPatterns.some((pattern) => pattern.test(trimmedTitle));
}

/**
 * Categorize a list of work items into feature and platform tasks
 */
export function categorizeWorkItems(items: WorkItem[]): {
  featureTasks: WorkItem[];
  platformTasks: WorkItem[];
} {
  const featureTasks: WorkItem[] = [];
  const platformTasks: WorkItem[] = [];

  items.forEach((item) => {
    if (item.category === "platform") {
      platformTasks.push(item);
    } else {
      featureTasks.push(item);
    }
  });

  return { featureTasks, platformTasks };
}

/**
 * Categorize a PR and match it to a spec
 */
export function categorizePR(
  pr: { title: string; headBranch: string },
  specIds: string[],
): { category: WorkCategory; specId?: string } {
  const isPlatform = isPlatformWork(pr.title) || isPlatformWork(pr.headBranch);
  const specId = matchPRToSpec(pr.title, specIds) || matchPRToSpec(pr.headBranch, specIds) || undefined;

  return {
    category: isPlatform ? "platform" : "feature",
    specId,
  };
}

/**
 * Categorize a branch and match it to a spec
 */
export function categorizeBranch(
  branch: { name: string; lastCommitMessage: string },
  specIds: string[],
): { category: WorkCategory; specId?: string } {
  const isPlatform = isPlatformWork(branch.name) || isPlatformWork(branch.lastCommitMessage);
  const specId = matchPRToSpec(branch.name, specIds) || matchPRToSpec(branch.lastCommitMessage, specIds) || undefined;

  return {
    category: isPlatform ? "platform" : "feature",
    specId,
  };
}
