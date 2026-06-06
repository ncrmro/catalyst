"use server";

/**
 * Server actions for pull requests
 * Handles PR operations using the models layer
 */

import { z } from "zod";
import {
  upsertPullRequests,
  findPullRequestByProvider,
  getPullRequests,
  getPullRequestsWithRepos,
  type InsertPullRequest,
} from "@/models/pull-requests";
import { getRepos } from "@/models/repos";
import {
  createPullRequestSchema,
  type CreatePullRequest,
  type UpdatePullRequest,
} from "@/schemas/pull-request";

/**
 * TypeScript types inferred from Zod schemas
 */
export type CreatePullRequestData = CreatePullRequest;
export type UpdatePullRequestData = UpdatePullRequest;

/**
 * Create or update a pull request record
 * Uses the unique constraint (repo_id, provider, provider_pr_id) to handle upserts
 */
export async function upsertPullRequest(data: CreatePullRequestData) {
  try {
    // Validate input data using Zod schema
    const validatedData = createPullRequestSchema.parse(data);

    // Convert arrays to JSON strings for database storage
    const dbData: InsertPullRequest = {
      ...validatedData,
      labels: validatedData.labels
        ? JSON.stringify(validatedData.labels)
        : null,
      assignees: validatedData.assignees
        ? JSON.stringify(validatedData.assignees)
        : null,
      reviewers: validatedData.reviewers
        ? JSON.stringify(validatedData.reviewers)
        : null,
    };

    // Use model to upsert PR
    const [result] = await upsertPullRequests(dbData);

    return {
      success: true,
      pullRequest: result.pullRequest,
      operation: result.operation,
    };
  } catch (error) {
    console.error("Error upserting pull request:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Find pull request by repository and provider-specific ID
 */
export async function findPullRequestByProviderData(
  repoId: string,
  provider: string,
  providerPrId: string,
) {
  try {
    const pr = await findPullRequestByProvider(repoId, provider, providerPrId);
    return { success: true, pullRequest: pr };
  } catch (error) {
    console.error("Error finding pull request:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all pull requests for a repository
 */
export async function getPullRequestsByRepo(repoId: string, limit = 50) {
  try {
    const prs = await getPullRequests({ repoIds: [repoId], limit });
    return { success: true, pullRequests: prs };
  } catch (error) {
    console.error("Error getting pull requests by repo:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get open pull requests across all repositories
 */
export async function getOpenPullRequests(limit = 100) {
  try {
    const prs = await getPullRequestsWithRepos({
      state: "open",
      limit,
    });
    return { success: true, pullRequests: prs };
  } catch (error) {
    console.error("Error getting open pull requests:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Find repository by GitHub repository data
 * Helper function to get repo ID for webhook operations
 */
export async function findRepoByGitHubData(githubId: number) {
  try {
    const repos = await getRepos({ githubIds: [githubId] });
    const repo = repos.length > 0 ? repos[0] : null;
    return { success: true, repo };
  } catch (error) {
    console.error("Error finding repo by GitHub ID:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
