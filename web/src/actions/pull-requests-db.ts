'use server';

/**
 * Database operations for pull requests
 * Handles CRUD operations for the pull_requests table
 */

import { z } from 'zod';
import { db, pullRequests, repos } from '@/db';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Zod schema for creating a pull request
 * Inferred from the database schema to ensure type safety
 */
export const createPullRequestSchema = z.object({
  repoId: z.string().min(1),
  provider: z.string().min(1),
  providerPrId: z.string().min(1),
  number: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  state: z.enum(['open', 'closed', 'merged']),
  status: z.enum(['draft', 'ready', 'changes_requested']),
  url: z.string().url(),
  authorLogin: z.string().min(1),
  authorAvatarUrl: z.string().url().optional(),
  headBranch: z.string().min(1),
  baseBranch: z.string().min(1),
  commentsCount: z.number().int().nonnegative().optional().default(0),
  reviewsCount: z.number().int().nonnegative().optional().default(0),
  changedFilesCount: z.number().int().nonnegative().optional().default(0),
  additionsCount: z.number().int().nonnegative().optional().default(0),
  deletionsCount: z.number().int().nonnegative().optional().default(0),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium'),
  labels: z.array(z.string()).optional().default([]),
  assignees: z.array(z.string()).optional().default([]),
  reviewers: z.array(z.string()).optional().default([]),
  mergedAt: z.date().optional(),
  closedAt: z.date().optional(),
});

/**
 * Zod schema for updating a pull request
 * All fields are optional for partial updates
 */
export const updatePullRequestSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  state: z.enum(['open', 'closed', 'merged']).optional(),
  status: z.enum(['draft', 'ready', 'changes_requested']).optional(),
  commentsCount: z.number().int().nonnegative().optional(),
  reviewsCount: z.number().int().nonnegative().optional(),
  changedFilesCount: z.number().int().nonnegative().optional(),
  additionsCount: z.number().int().nonnegative().optional(),
  deletionsCount: z.number().int().nonnegative().optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
  reviewers: z.array(z.string()).optional(),
  mergedAt: z.date().optional(),
  closedAt: z.date().optional(),
});

/**
 * TypeScript types inferred from Zod schemas
 */
export type CreatePullRequestData = z.infer<typeof createPullRequestSchema>;
export type UpdatePullRequestData = z.infer<typeof updatePullRequestSchema>;

/**
 * Create or update a pull request record
 * Uses the unique constraint (repo_id, provider, provider_pr_id) to handle upserts
 */
export async function upsertPullRequest(data: CreatePullRequestData) {
  try {
    // Validate input data using Zod schema
    const validatedData = createPullRequestSchema.parse(data);
    
    // First, try to find existing PR
    const existingPr = await db
      .select()
      .from(pullRequests)
      .where(
        and(
          eq(pullRequests.repoId, validatedData.repoId),
          eq(pullRequests.provider, validatedData.provider),
          eq(pullRequests.providerPrId, validatedData.providerPrId)
        )
      )
      .limit(1);

    const prData = {
      ...validatedData,
      labels: validatedData.labels.length > 0 ? JSON.stringify(validatedData.labels) : null,
      assignees: validatedData.assignees.length > 0 ? JSON.stringify(validatedData.assignees) : null,
      reviewers: validatedData.reviewers.length > 0 ? JSON.stringify(validatedData.reviewers) : null,
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
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
      };
    }
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