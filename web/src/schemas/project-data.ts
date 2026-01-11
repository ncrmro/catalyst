import { z } from "zod";
import type { PullRequest, Issue } from "@/types/reports";
import type { Branch } from "@/lib/vcs-providers";

export const specSchema = z.object({
  id: z.string(),
  name: z.string(),
  href: z.string(),
});

export const pullRequestSchema = z
  .object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    // Allow other fields
  })
  .passthrough() as unknown as z.ZodType<PullRequest>;

export const issueSchema = z
  .object({
    id: z.number(),
    number: z.number(),
    title: z.string(),
    // Allow other fields
  })
  .passthrough() as unknown as z.ZodType<Issue>;

export const branchSchema = z
  .object({
    name: z.string(),
    sha: z.string(),
    // Allow other fields
  })
  .passthrough() as unknown as z.ZodType<Branch>;

export const specsResultSchema = z.object({
  specs: z.array(specSchema),
  error: z
    .object({
      type: z.string(),
      message: z.string(),
    })
    .optional(),
});

export const dashboardDataSchema = z.object({
  specsResult: specsResultSchema,
  pullRequests: z.array(pullRequestSchema),
  issues: z.array(issueSchema),
  branches: z.array(branchSchema),
});