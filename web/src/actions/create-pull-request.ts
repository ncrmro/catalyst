"use server";

import { auth } from "@/auth";
import { createPullRequest, getUserOctokit } from "@/lib/vcs-providers";

export interface CreatePullRequestInput {
  repository: string; // Format: "owner/repo"
  title: string;
  head: string; // Source branch
  base: string; // Target branch
  body?: string;
}

export interface CreatePullRequestResult {
  success: boolean;
  error?: string;
  prUrl?: string;
  prNumber?: number;
}

/**
 * Server action to create a new pull request in a GitHub repository
 */
export async function createPullRequestAction(
  input: CreatePullRequestInput,
): Promise<CreatePullRequestResult> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    // Parse owner and repo from repository string
    const [owner, repo] = input.repository.split("/");
    if (!owner || !repo) {
      return {
        success: false,
        error: "Invalid repository format. Expected 'owner/repo'",
      };
    }

    // Validate input
    if (!input.title.trim()) {
      return {
        success: false,
        error: "Title is required",
      };
    }

    if (!input.head.trim()) {
      return {
        success: false,
        error: "Source branch is required",
      };
    }

    if (!input.base.trim()) {
      return {
        success: false,
        error: "Target branch is required",
      };
    }

    // Get authenticated client
    const client = await getUserOctokit(session.user.id);

    // Create the pull request
    const pr = await createPullRequest(
      { providerId: "github", raw: client },
      owner,
      repo,
      input.title,
      input.head,
      input.base,
      input.body,
    );

    return {
      success: true,
      prUrl: pr.htmlUrl,
      prNumber: pr.number,
    };
  } catch (error) {
    console.error("Error creating pull request:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create pull request",
    };
  }
}
