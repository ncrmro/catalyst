/**
 * Zod schemas for pull request validation
 * These schemas are inferred from the database schema to ensure type safety
 */

import { z } from "zod";

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
  state: z.enum(["open", "closed", "merged"]),
  status: z.enum(["draft", "ready", "changes_requested"]),
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
  priority: z.enum(["high", "medium", "low"]).optional().default("medium"),
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
  state: z.enum(["open", "closed", "merged"]).optional(),
  status: z.enum(["draft", "ready", "changes_requested"]).optional(),
  url: z.string().url().optional(),
  authorLogin: z.string().min(1).optional(),
  authorAvatarUrl: z.string().url().optional(),
  headBranch: z.string().min(1).optional(),
  baseBranch: z.string().min(1).optional(),
  commentsCount: z.number().int().nonnegative().optional(),
  reviewsCount: z.number().int().nonnegative().optional(),
  changedFilesCount: z.number().int().nonnegative().optional(),
  additionsCount: z.number().int().nonnegative().optional(),
  deletionsCount: z.number().int().nonnegative().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  labels: z.array(z.string()).optional(),
  assignees: z.array(z.string()).optional(),
  reviewers: z.array(z.string()).optional(),
  mergedAt: z.date().optional(),
  closedAt: z.date().optional(),
});

/**
 * Type inference from Zod schemas
 */
export type CreatePullRequest = z.infer<typeof createPullRequestSchema>;
export type UpdatePullRequest = z.infer<typeof updatePullRequestSchema>;
