"use server";

import { auth } from "@/auth";
import { createIssue, getUserOctokit } from "@/lib/vcs-providers";

export interface CreateIssueInput {
  repository: string; // Format: "owner/repo"
  title: string;
  body?: string;
}

export interface CreateIssueResult {
  success: boolean;
  error?: string;
  issueUrl?: string;
  issueNumber?: number;
}

/**
 * Server action to create a new issue in a GitHub repository
 */
export async function createIssueAction(
  input: CreateIssueInput,
): Promise<CreateIssueResult> {
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

    // Get authenticated client
    const client = await getUserOctokit(session.user.id);

    // Create the issue
    const issue = await createIssue(
      { providerId: "github", raw: client },
      owner,
      repo,
      input.title,
      input.body,
    );

    return {
      success: true,
      issueUrl: issue.htmlUrl,
      issueNumber: issue.number,
    };
  } catch (error) {
    console.error("Error creating issue:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create issue",
    };
  }
}
