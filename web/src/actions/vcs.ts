"use server";

import { auth } from "@/auth";
import { vcs } from "@/lib/vcs";

export interface CreateBranchParams {
  owner: string;
  repo: string;
  name: string;
  fromBranch?: string;
}

export interface UpdateFileParams {
  owner: string;
  repo: string;
  path: string;
  content: string;
  message: string;
  branch: string;
}

export interface CreatePullRequestParams {
  owner: string;
  repo: string;
  title: string;
  head: string;
  base: string;
  body?: string;
}

/**
 * Create a new branch in a repository
 */
export async function createBranch(params: CreateBranchParams) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const scopedVcs = vcs.getScoped(session.user.id);
  const result = await scopedVcs.branches.create(
    params.owner,
    params.repo,
    params.name,
    params.fromBranch,
  );

  return result;
}

/**
 * Create a pull request in a repository
 */
export async function createPullRequest(params: CreatePullRequestParams) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const scopedVcs = vcs.getScoped(session.user.id);
  const result = await scopedVcs.pullRequests.create(
    params.owner,
    params.repo,
    params.title,
    params.head,
    params.base,
    params.body,
  );

  return result;
}

/**
 * Update or create a file in a repository
 */
export async function updateFile(params: UpdateFileParams) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const scopedVcs = vcs.getScoped(session.user.id);
  const result = await scopedVcs.files.update(
    params.owner,
    params.repo,
    params.path,
    params.content,
    params.message,
    params.branch,
  );

  return result;
}
