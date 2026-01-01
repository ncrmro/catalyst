"use server";

import { auth } from "@/auth";
import { getVCSClient, getProvider } from "@/lib/vcs-providers";

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

/**
 * Create a new branch in a repository
 */
export async function createBranch(params: CreateBranchParams) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const client = await getVCSClient(session.user.id);
  const provider = getProvider(client.providerId);

  const result = await provider.createBranch(
    client,
    params.owner,
    params.repo,
    params.name,
    params.fromBranch,
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

  const client = await getVCSClient(session.user.id);
  const provider = getProvider(client.providerId);

  const result = await provider.updateFile(
    client,
    params.owner,
    params.repo,
    params.path,
    params.content,
    params.message,
    params.branch,
  );

  return result;
}
