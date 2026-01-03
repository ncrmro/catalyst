import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { fetchProjects } from "@/actions/projects";
import { reportSchema } from "@/types/reports";
import {
  getGitHubMCPClient,
  createGitHubMCPClient,
  GitHubMCPClient,
} from "@/lib/mcp-clients";

// System prompt for the periodic report agent
const SYSTEM_PROMPT = `You are a Project Report Generator Agent for the Catalyst platform. Your role is to analyze pull requests and issues to generate comprehensive project reports.

Your responsibilities include:
1. Summarizing recently merged pull requests with high-level rationale for why they were merged
2. Analyzing relationships between merged PRs and open PRs to identify patterns
3. Prioritizing open PR reviews based on user-facing features and project primary goals
4. Identifying which open PRs contribute most to the project's core objectives
5. Providing actionable recommendations for PR review priorities

When generating reports:
- Focus on the "why" behind merged PRs - what problem they solved or feature they delivered
- Connect merged work to open PRs to show development momentum and direction  
- Prioritize open PRs that deliver user-facing value or advance core project goals
- Highlight PRs that might be blocked or dependent on other work
- Suggest which PRs should be reviewed first based on impact and strategic importance
- Keep language clear and focused on development priorities and user impact

The user will provide you with project data including merged and open pull requests to analyze.`;

export interface PeriodicReportOptions {
  provider?: "anthropic" | "openai";
  model?: string;
  enableGitHubMCP?: boolean;
  gitHubMCPApiKey?: string;
  accessToken?: string;
}

export class PeriodicReportAgent {
  private provider: "anthropic" | "openai";
  private model: string;
  private enableGitHubMCP: boolean;
  private gitHubMCPClient?: GitHubMCPClient;

  constructor(options: PeriodicReportOptions = {}) {
    this.provider = options.provider || "openai";
    this.model =
      options.model ||
      (this.provider === "anthropic"
        ? "claude-3-sonnet-20240229"
        : "gpt-5-mini");
    this.enableGitHubMCP = options.enableGitHubMCP ?? true;

    if (this.enableGitHubMCP) {
      // Prefer session access token over API key for user-specific GitHub access
      if (options.accessToken) {
        this.gitHubMCPClient = createGitHubMCPClient({
          accessToken: options.accessToken,
        });
      } else if (options.gitHubMCPApiKey) {
        this.gitHubMCPClient = getGitHubMCPClient({
          apiKey: options.gitHubMCPApiKey,
        });
      } else {
        // Fallback to default client (uses environment variable)
        this.gitHubMCPClient = getGitHubMCPClient();
      }
    }
  }

  async generateReport(): Promise<z.infer<typeof reportSchema>> {
    // Fetch data using the action functions
    const projectsData = await this.fetchProjects();

    // Check GitHub MCP availability for enhanced reporting context
    let gitHubToolsAvailable = false;
    let gitHubToolsCount = 0;

    if (this.enableGitHubMCP && this.gitHubMCPClient) {
      try {
        const gitHubTools = await this.gitHubMCPClient.getTools();
        gitHubToolsAvailable =
          this.gitHubMCPClient.isAvailable() &&
          Object.keys(gitHubTools).length > 0;
        gitHubToolsCount = Object.keys(gitHubTools).length;

        if (gitHubToolsAvailable) {
          console.log(
            `GitHub MCP integration enabled with ${gitHubToolsCount} tools available`,
          );
        }
      } catch (error) {
        console.warn("Failed to load GitHub MCP tools:", error);
      }
    }

    const model =
      this.provider === "anthropic"
        ? anthropic(this.model)
        : openai(this.model);

    // Enhanced prompt focused on PR analysis and prioritization
    const prompt = `Generate a comprehensive project report based on the following data:

PROJECTS DATA:
${JSON.stringify(projectsData.data, null, 2)}

${
  gitHubToolsAvailable
    ? `
GITHUB INTEGRATION:
GitHub MCP tools are available (${gitHubToolsCount} tools) and can provide additional repository insights, issue tracking, PR analysis, and code metrics to enhance the report with real GitHub data.`
    : ""
}

Analyze this data to create a detailed report covering:

1. Summary of recently merged pull requests with rationale for why they were merged
2. Analysis of open pull requests and their relationship to recent merged work
3. Prioritization of open PRs based on user-facing features and core project goals
4. Identification of PRs that should be reviewed first for maximum impact
5. Recommendations for development priorities and next steps

Focus on connecting merged work to open work, identifying patterns, and providing clear PR review priorities based on strategic value and user impact.${gitHubToolsAvailable ? " Consider leveraging GitHub data for deeper PR relationship analysis." : ""}`;

    const result = await generateObject({
      model,
      system: SYSTEM_PROMPT,
      prompt,
      schema: reportSchema,
    });

    return result.object;
  }

  // Tool functions for external use if needed
  async fetchProjects() {
    try {
      const projectsData = await fetchProjects();
      return {
        success: true,
        data: projectsData,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: null,
      };
    }
  }

  async getGitHubTools() {
    if (!this.enableGitHubMCP || !this.gitHubMCPClient) {
      return {
        success: false,
        error: "GitHub MCP is not enabled",
        data: {},
      };
    }

    try {
      const tools = await this.gitHubMCPClient.getTools();
      return {
        success: true,
        data: tools,
        available: this.gitHubMCPClient.isAvailable(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: {},
      };
    }
  }
}

// Export a convenience function for generating reports
export async function generatePeriodicReport(options?: PeriodicReportOptions) {
  const agent = new PeriodicReportAgent(options);
  return agent.generateReport();
}
