/**
 * Type-safe wrapper for importing JSON fixtures.
 *
 * This module imports JSON fixture files and provides parser functions that:
 * - Convert ISO 8601 date strings to Date objects
 * - Ensure type safety with TypeScript interfaces
 * - Handle nullable values correctly
 *
 * Usage:
 *   import { projects, agents } from '@/fixtures';
 *
 *   // All dates are parsed as Date objects
 *   projects.active[0].createdAt instanceof Date // true
 */

import projectsData from "./projects.json";
import agentsData from "./agents.json";
import workItemsData from "./work-items.json";
import type {
  ProjectWithSummary,
  AgentWithStatus,
  WorkItemWithPriority,
} from "./types";

// Input types for JSON parsing (permissive to handle null values in JSON)
interface ProjectJson {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  teamId: string;
  teamName: string;
  repositoryCount: number;
  openWorkItemCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AgentJson {
  id: string;
  agentType: string;
  enabled: boolean;
  config: Record<string, boolean | undefined> | null;
  lastRunAt: string | null;
  lastRunStatus: string | null;
}

interface WorkItemJson {
  id: string;
  itemType: string;
  title: string;
  description: string | null;
  state: string;
  status: string;
  category: string;
  labels: string[];
  project: { id: string; name: string; slug: string };
  repository: { name: string; fullName: string } | null;
  externalUrl: string | null;
  authorLogin: string | null;
  assignees: string[];
  priority: {
    score: number;
    factors: {
      impact: number;
      effort: number;
      urgency: number;
      alignment: number;
      risk: number;
    };
    appliedRules: string[];
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Parse a project object from JSON format to TypeScript format.
 * Converts ISO date strings to Date objects and casts literal types.
 */
function parseProject(p: ProjectJson): ProjectWithSummary {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    status: p.status as ProjectWithSummary["status"],
    teamId: p.teamId,
    teamName: p.teamName,
    repositoryCount: p.repositoryCount,
    openWorkItemCount: p.openWorkItemCount,
    createdAt: new Date(p.createdAt),
    updatedAt: new Date(p.updatedAt),
  };
}

/**
 * Parse an agent object from JSON format to TypeScript format.
 * Converts ISO date strings to Date objects and handles nullable dates.
 */
function parseAgent(a: AgentJson): AgentWithStatus {
  return {
    id: a.id,
    agentType: a.agentType as AgentWithStatus["agentType"],
    enabled: a.enabled,
    config: a.config,
    lastRunAt: a.lastRunAt ? new Date(a.lastRunAt) : null,
    lastRunStatus: a.lastRunStatus as AgentWithStatus["lastRunStatus"],
  };
}

/**
 * Parse a work item object from JSON format to TypeScript format.
 * Converts ISO date strings to Date objects.
 */
function parseWorkItem(w: WorkItemJson): WorkItemWithPriority {
  return {
    id: w.id,
    itemType: w.itemType as WorkItemWithPriority["itemType"],
    title: w.title,
    description: w.description,
    state: w.state,
    status: w.status,
    category: w.category,
    labels: w.labels,
    project: w.project,
    repository: w.repository,
    externalUrl: w.externalUrl,
    authorLogin: w.authorLogin,
    assignees: w.assignees,
    priority: w.priority,
    createdAt: new Date(w.createdAt),
    updatedAt: new Date(w.updatedAt),
  };
}

/**
 * Parsed project fixtures organized by status.
 * All date fields are converted to Date objects.
 */
export const projects = {
  active: projectsData.active.map(parseProject),
  suspended: projectsData.suspended.map(parseProject),
  archived: projectsData.archived.map(parseProject),
} as const;

/**
 * Parsed agent fixtures organized by configuration state.
 * All date fields are converted to Date objects, nullable dates preserved.
 */
export const agents = {
  configured: agentsData.configured.map(parseAgent),
  unconfigured: agentsData.unconfigured.map(parseAgent),
  disabled: agentsData.disabled.map(parseAgent),
} as const;

/**
 * Parsed work item fixtures organized by priority level.
 * All date fields are converted to Date objects.
 */
export const workItems = {
  highPriority: (workItemsData.highPriority as WorkItemJson[]).map(
    parseWorkItem,
  ),
  mediumPriority: (workItemsData.mediumPriority as WorkItemJson[]).map(
    parseWorkItem,
  ),
  lowPriority: (workItemsData.lowPriority as WorkItemJson[]).map(parseWorkItem),
} as const;

/**
 * Helper to get all projects regardless of status.
 */
export const allProjects = [
  ...projects.active,
  ...projects.suspended,
  ...projects.archived,
] as const;

/**
 * Helper to get all agents regardless of configuration state.
 */
export const allAgents = [
  ...agents.configured,
  ...agents.unconfigured,
  ...agents.disabled,
] as const;

/**
 * Helper to find a project by ID.
 */
export function findProjectById(id: string): ProjectWithSummary | undefined {
  return allProjects.find((p) => p.id === id);
}

/**
 * Helper to find a project by slug.
 */
export function findProjectBySlug(
  slug: string,
): ProjectWithSummary | undefined {
  return allProjects.find((p) => p.slug === slug);
}

/**
 * Helper to find an agent by ID.
 */
export function findAgentById(id: string): AgentWithStatus | undefined {
  return allAgents.find((a) => a.id === id);
}

/**
 * Helper to get projects by status.
 */
export function getProjectsByStatus(
  status: "active" | "suspended" | "archived",
): readonly ProjectWithSummary[] {
  return projects[status];
}

/**
 * Helper to get agents by type.
 */
export function getAgentsByType(
  agentType: "platform" | "project" | "qa",
): AgentWithStatus[] {
  return allAgents.filter((a) => a.agentType === agentType);
}

/**
 * Helper to get enabled agents only.
 */
export function getEnabledAgents(): AgentWithStatus[] {
  return allAgents.filter((a) => a.enabled);
}

/**
 * Helper to get agents by last run status.
 */
export function getAgentsByLastRunStatus(
  status: "completed" | "failed" | null,
): AgentWithStatus[] {
  return allAgents.filter((a) => a.lastRunStatus === status);
}

/**
 * Helper to get all work items regardless of priority.
 */
export const allWorkItems = [
  ...workItems.highPriority,
  ...workItems.mediumPriority,
  ...workItems.lowPriority,
] as const;

/**
 * Helper to find a work item by ID.
 */
export function findWorkItemById(id: string): WorkItemWithPriority | undefined {
  return allWorkItems.find((w) => w.id === id);
}

/**
 * Helper to get work items by priority level.
 */
export function getWorkItemsByPriority(
  priority: "highPriority" | "mediumPriority" | "lowPriority",
): readonly WorkItemWithPriority[] {
  return workItems[priority];
}

/**
 * Helper to get work items by category.
 */
export function getWorkItemsByCategory(
  category: string,
): WorkItemWithPriority[] {
  return allWorkItems.filter((w) => w.category === category);
}

/**
 * Helper to get work items by item type.
 */
export function getWorkItemsByType(
  itemType: "issue" | "pull_request" | "agent_task",
): WorkItemWithPriority[] {
  return allWorkItems.filter((w) => w.itemType === itemType);
}
