import { z } from "zod";

/**
 * External Agent Task Document Schema
 * Tracks work delegated to external AI agents (GitHub Copilot, GitLab Duo, etc.)
 */
export const ExternalAgentTaskSchema = z.object({
  externalAgent: z.enum(["copilot", "gitlab-duo", "other"]).describe("The external AI agent handling this task"),
  issueId: z.string().describe("VCS issue identifier"),
  issueNumber: z.number().describe("VCS issue number"),
  issueUrl: z.string().url().optional().describe("Link to the issue"),
  status: z.enum(["pending", "assigned", "in_progress", "completed", "failed"]).describe("Current task status"),
  resultPrNumber: z.number().optional().describe("PR number created by the agent"),
  resultPrUrl: z.string().url().optional().describe("Link to the PR created by the agent"),
  error: z.string().optional().describe("Error message if task failed"),
  specSlug: z.string().optional().describe("Associated spec identifier"),
  assignedAt: z.string().datetime().optional().describe("When the task was assigned to the agent"),
  completedAt: z.string().datetime().optional().describe("When the task was completed"),
});

export type ExternalAgentTask = z.infer<typeof ExternalAgentTaskSchema>;

export const EXTERNAL_AGENT_TASK_TYPE_ID = "external-agent-task";
