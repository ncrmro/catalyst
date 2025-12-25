/**
 * Type definitions for JSON fixtures used in testing and development.
 * These types correspond to the server action contracts defined in
 * specs/009-projects/contracts/server-actions.md
 *
 * Note: Dates are represented as ISO 8601 strings in JSON fixtures but
 * parsed to Date objects in TypeScript.
 */

/**
 * Project with summary statistics for list views and dashboards.
 * Includes team information and aggregate counts.
 */
export interface ProjectWithSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: "active" | "suspended" | "archived";
  teamId: string;
  teamName: string;
  repositoryCount: number;
  openWorkItemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Repository with connection status information.
 * Used in project details to show linked repositories.
 */
export interface RepositoryWithConnection {
  id: string;
  name: string;
  fullName: string;
  isPrimary: boolean;
  connectionStatus: "connected" | "disconnected";
}

/**
 * Agent configuration object defining which features are enabled.
 * Different agent types (platform, project, qa) support different features.
 */
export interface AgentConfig {
  testMaintenance?: boolean;
  dependencyUpdates?: boolean;
  ciImprovements?: boolean;
  conventionEnforcement?: boolean;
  prioritizationEnabled?: boolean;
  taskBreakdownEnabled?: boolean;
  smokeTestsEnabled?: boolean;
  testWritingEnabled?: boolean;
}

/**
 * Agent with last execution status.
 * Shows agent configuration and recent activity.
 */
export interface AgentWithStatus {
  id: string;
  agentType: "platform" | "project" | "qa";
  enabled: boolean;
  config: AgentConfig | null;
  lastRunAt: Date | null;
  lastRunStatus: "completed" | "failed" | null;
}

/**
 * Priority factors used for work item ranking.
 * Each factor is scored 0-100 with higher values indicating higher priority.
 */
export interface PriorityFactors {
  impact: number;
  effort: number;
  urgency: number;
  alignment: number;
  risk: number;
}

/**
 * Priority information for a work item.
 * Includes computed score, individual factors, and rules that were applied.
 */
export interface WorkItemPriority {
  score: number;
  factors: PriorityFactors;
  appliedRules: string[];
}

/**
 * Work item with computed priority information.
 * Represents an issue, pull request, or agent task with priority scoring.
 */
export interface WorkItemWithPriority {
  id: string;
  itemType: "issue" | "pull_request" | "agent_task";
  title: string;
  description: string | null;
  state: string;
  status: string;
  category: string;
  labels: string[];
  project: {
    id: string;
    name: string;
    slug: string;
  };
  repository: {
    name: string;
    fullName: string;
  } | null;
  externalUrl: string | null;
  authorLogin: string | null;
  assignees: string[];
  priority: WorkItemPriority;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Summary statistics for work items.
 * Provides counts by category and project for dashboard insights.
 */
export interface WorkItemSummary {
  totalOpen: number;
  byCategory: Record<string, number>;
  byProject: Record<string, number>;
}

/**
 * Result from getPrioritizedWork action.
 * Contains prioritized work items with pagination and summary stats.
 */
export interface PrioritizedWorkResult {
  workItems: WorkItemWithPriority[];
  summary: WorkItemSummary;
  total: number;
  hasMore: boolean;
}
