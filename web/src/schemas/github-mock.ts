/**
 * Zod schemas for GitHub mock data validation
 * These schemas ensure type safety when loading YAML mock data
 */

import { z } from '@tetrastack/backend/utils';

/**
 * GitHub owner schema (simplified)
 */
export const githubOwnerSchema = z.object({
  login: z.string().min(1),
  type: z.enum(['User', 'Organization']),
  avatar_url: z.string().url()
});

/**
 * GitHub repository connection schema for linking to projects
 */
export const githubRepoConnectionSchema = z.object({
  projectId: z.string().min(1),
  isPrimary: z.boolean()
});

/**
 * GitHub repository schema aligned with database schema
 */
export const githubRepoSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  full_name: z.string().min(1),
  description: z.string().nullable(),
  private: z.boolean(),
  owner: githubOwnerSchema,
  html_url: z.string().url(),
  clone_url: z.string().url().optional(),
  ssh_url: z.string().optional(),
  created_at: z.string().optional(),
  updated_at: z.string(),
  pushed_at: z.string().optional(),
  language: z.string().nullable(),
  stargazers_count: z.number().int().nonnegative(),
  forks_count: z.number().int().nonnegative(),
  open_issues_count: z.number().int().nonnegative(),
  connection: githubRepoConnectionSchema.nullable().optional(),
  database_id: z.string().optional(),
  teamId: z.string().optional()
});

/**
 * GitHub organization schema
 */
export const githubOrganizationSchema = z.object({
  login: z.string().min(1),
  id: z.number().int().positive(),
  avatar_url: z.string().url(),
  description: z.string().nullable()
});

/**
 * Pull request schema for mock data
 */
export const mockPullRequestSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().min(1),
  number: z.number().int().positive(),
  author: z.string().min(1),
  author_avatar: z.string().url(),
  repository: z.string().min(1),
  url: z.string().url(),
  created_at: z.string(),
  updated_at: z.string(),
  comments_count: z.number().int().nonnegative(),
  priority: z.enum(['high', 'medium', 'low']),
  status: z.enum(['draft', 'ready', 'changes_requested'])
});

/**
 * Project environment schema
 */
export const projectEnvironmentSchema = z.object({
  name: z.string().min(1),
  namespace_pattern: z.string().min(1),
  cluster: z.string().min(1)
});

/**
 * Project schema for mock data
 */
export const mockProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  team: z.string().min(1),
  primary_repo: z.string().min(1),
  environments: z.array(projectEnvironmentSchema)
});

/**
 * Complete mock data schema
 */
export const githubMockDataSchema = z.object({
  user_repos: z.array(githubRepoSchema),
  organizations: z.array(githubOrganizationSchema),
  org_repos: z.record(z.string(), z.array(githubRepoSchema)),
  pull_requests: z.array(mockPullRequestSchema),
  projects: z.array(mockProjectSchema).optional()
});

/**
 * Repository data structure for API responses
 */
export const reposDataSchema = z.object({
  user_repos: z.array(githubRepoSchema),
  organizations: z.array(githubOrganizationSchema),
  org_repos: z.record(z.string(), z.array(githubRepoSchema)),
  github_integration_enabled: z.boolean()
});

/**
 * Type inference from schemas
 */
export type GitHubOwner = z.infer<typeof githubOwnerSchema>;
export type GitHubRepoConnection = z.infer<typeof githubRepoConnectionSchema>;
export type GitHubRepo = z.infer<typeof githubRepoSchema>;
export type GitHubOrganization = z.infer<typeof githubOrganizationSchema>;
export type MockPullRequest = z.infer<typeof mockPullRequestSchema>;
export type ProjectEnvironment = z.infer<typeof projectEnvironmentSchema>;
export type MockProject = z.infer<typeof mockProjectSchema>;
export type GitHubMockData = z.infer<typeof githubMockDataSchema>;
export type ReposData = z.infer<typeof reposDataSchema>;