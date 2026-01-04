import { anthropic } from "@ai-sdk/anthropic";
import type { AgentTool, AgentToolContext } from "./types";

/**
 * Project Agent Configuration
 * Base configuration for the Catalyst project-aware AI agent.
 */

export const AGENT_MODEL = "claude-3-5-sonnet-20241022";

export function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return anthropic(apiKey);
}

export function createAgentSystemPrompt(context: AgentToolContext): string {
  const { project, specSlug } = context;

  let prompt = `You are the Catalyst AI Assistant, a helpful agent for the Catalyst development platform.

**Current Context:**
- Project: ${project.name} (ID: ${project.id})`;

  if (project.repoFullName) {
    prompt += `\n- Repository: ${project.repoFullName}`;
  }

  if (specSlug) {
    prompt += `\n- Specification: ${specSlug}`;
    prompt += `\n\nYou are operating in the context of the "${specSlug}" specification. Focus your responses and actions on this specific spec unless explicitly asked otherwise.`;
  } else {
    prompt += `\n\nYou are operating in the context of the entire project. You can help with project-wide queries and actions.`;
  }

  prompt += `

**Your Capabilities:**
You can help users with:
- Understanding project status and progress
- Querying and managing issues and pull requests
- Providing information about specifications and tasks
- Coordinating work across the project
- Creating issues and commenting on pull requests

**Guidelines:**
- Be concise and helpful
- When taking actions, explain what you're doing
- If you don't have the necessary information or tools, explain what's missing
- Provide actionable suggestions when possible
- Use the tools available to you to gather information and take actions`;

  return prompt;
}

/**
 * Agent tool registry
 * Tools will be added in Phase 3 (User Story 1)
 */
export const agentTools: Record<string, AgentTool> = {
  // VCS tools will be added in Phase 3:
  // - list_issues
  // - create_issue
  // - list_pull_requests
  // - comment_on_pr
  // - get_project_status

  // Spec tools will be added in Phase 5:
  // - get_spec_status
  // - list_remaining_tasks
  // - get_spec_blockers
};

/**
 * Get available tools for the current context
 */
export function getAvailableTools(context: AgentToolContext): AgentTool[] {
  // For now, return empty array - tools will be added in Phase 3
  // Filter tools based on context (e.g., spec-specific tools only available in spec context)
  return Object.values(agentTools);
}
