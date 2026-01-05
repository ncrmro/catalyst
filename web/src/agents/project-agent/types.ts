/**
 * Agent Context Types
 * Defines the context and configuration for the project agent.
 */

export interface ProjectContext {
  projectId: string;
  projectName: string;
  repoFullName?: string;
  providerId?: string;
  userId: string;
}

export interface SpecContext extends ProjectContext {
  specSlug: string;
  specDocuments?: {
    spec?: string; // spec.md content
    plan?: string; // plan.md content
    tasks?: ParsedTasks; // Parsed tasks.md
  };
  relatedWork?: {
    pullRequests?: unknown[]; // TODO: Type from VCS provider
    issues?: unknown[];
    branches?: unknown[];
  };
}

export interface ParsedTasks {
  phases: TaskPhase[];
  totalTasks: number;
  completedTasks: number;
}

export interface TaskPhase {
  name: string;
  description?: string;
  tasks: Task[];
}

export interface Task {
  id: string;
  description: string;
  completed: boolean;
  parallel?: boolean; // [P] marker
  userStory?: string; // [US#] marker
  dependencies?: string[];
}

export interface AgentToolContext {
  userId: string;
  project: {
    id: string;
    name: string;
    repoFullName?: string;
    providerId?: string;
  };
  specSlug?: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export type AgentTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema for parameters
  execute: (params: unknown, context: AgentToolContext) => Promise<ToolResult>;
};
