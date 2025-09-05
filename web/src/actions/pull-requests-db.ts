'use server';

/**
 * Database operations for pull requests
 * Handles CRUD operations for the pull_requests table
 */

import { db, pullRequests, repos } from '@/db';
import { eq, and, desc } from 'drizzle-orm';

export interface CreatePullRequestData {
  repoId: string;
  provider: string;
  providerPrId: string;
  number: number;
  title: string;
  description?: string;
  state: 'open' | 'closed' | 'merged';
  status: 'draft' | 'ready' | 'changes_requested';
  url: string;
  authorLogin: string;
  authorAvatarUrl?: string;
  headBranch: string;
  baseBranch: string;
  commentsCount?: number;
  reviewsCount?: number;
  changedFilesCount?: number;
  additionsCount?: number;
  deletionsCount?: number;
  priority?: 'high' | 'medium' | 'low';
  labels?: string[]; // Will be serialized as JSON
  assignees?: string[]; // Will be serialized as JSON
  reviewers?: string[]; // Will be serialized as JSON
  mergedAt?: Date;
  closedAt?: Date;
}

export interface UpdatePullRequestData {
  title?: string;
  description?: string;
  state?: 'open' | 'closed' | 'merged';
  status?: 'draft' | 'ready' | 'changes_requested';
  commentsCount?: number;
  reviewsCount?: number;
  changedFilesCount?: number;
  additionsCount?: number;
  deletionsCount?: number;
  priority?: 'high' | 'medium' | 'low';
  labels?: string[];
  assignees?: string[];
  reviewers?: string[];
  mergedAt?: Date;
  closedAt?: Date;
}

/**
 * Create or update a pull request record
 * Uses the unique constraint (repo_id, provider, provider_pr_id) to handle upserts
 */
export async function upsertPullRequest(data: CreatePullRequestData) {
  try {
    // First, try to find existing PR
    const existingPr = await db
      .select()
      .from(pullRequests)
      .where(
        and(
          eq(pullRequests.repoId, data.repoId),
          eq(pullRequests.provider, data.provider),
          eq(pullRequests.providerPrId, data.providerPrId)
        )
      )
      .limit(1);

    const prData = {
      ...data,
      labels: data.labels ? JSON.stringify(data.labels) : null,
      assignees: data.assignees ? JSON.stringify(data.assignees) : null,
      reviewers: data.reviewers ? JSON.stringify(data.reviewers) : null,
      updatedAt: new Date(),
    };

    if (existingPr.length > 0) {
      // Update existing PR
      const [updatedPr] = await db
        .update(pullRequests)
        .set(prData)
        .where(eq(pullRequests.id, existingPr[0].id))
        .returning();
      
      return { success: true, pullRequest: updatedPr, operation: 'update' as const };
    } else {
      // Create new PR
      const [newPr] = await db
        .insert(pullRequests)
        .values(prData)
        .returning();
      
      return { success: true, pullRequest: newPr, operation: 'create' as const };
    }
  } catch (error) {
    console.error('Error upserting pull request:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Find pull request by repository and provider-specific ID
 */
export async function findPullRequestByProviderData(
  repoId: string, 
  provider: string, 
  providerPrId: string
) {
  try {
    const [pr] = await db
      .select()
      .from(pullRequests)
      .where(
        and(
          eq(pullRequests.repoId, repoId),
          eq(pullRequests.provider, provider),
          eq(pullRequests.providerPrId, providerPrId)
        )
      )
      .limit(1);

    return { success: true, pullRequest: pr || null };
  } catch (error) {
    console.error('Error finding pull request:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get all pull requests for a repository
 */
export async function getPullRequestsByRepo(repoId: string, limit = 50) {
  try {
    const prs = await db
      .select()
      .from(pullRequests)
      .where(eq(pullRequests.repoId, repoId))
      .orderBy(desc(pullRequests.updatedAt))
      .limit(limit);

    return { success: true, pullRequests: prs };
  } catch (error) {
    console.error('Error getting pull requests by repo:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get open pull requests across all repositories
 */
export async function getOpenPullRequests(limit = 100) {
  try {
    const prs = await db
      .select({
        pullRequest: pullRequests,
        repo: repos,
      })
      .from(pullRequests)
      .innerJoin(repos, eq(pullRequests.repoId, repos.id))
      .where(eq(pullRequests.state, 'open'))
      .orderBy(desc(pullRequests.updatedAt))
      .limit(limit);

    return { success: true, pullRequests: prs };
  } catch (error) {
    console.error('Error getting open pull requests:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Find repository by GitHub repository data
 * Helper function to get repo ID for webhook operations
 */
export async function findRepoByGitHubData(githubId: number) {
  try {
    const [repo] = await db
      .select()
      .from(repos)
      .where(eq(repos.githubId, githubId))
      .limit(1);

    return { success: true, repo: repo || null };
  } catch (error) {
    console.error('Error finding repo by GitHub ID:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}