import { 
  generateObject, 
  experimental_createMCPClient as createMCPClient,
  experimental_MCPClient as MCPClient
} from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { fetchProjects } from '@/actions/projects';
import { getClusters } from '@/actions/clusters';

// Schema for the generated report
const reportSchema = z.object({
  title: z.string().describe('Title of the periodic report'),
  summary: z.string().describe('Executive summary of the current state'),
  projectsAnalysis: z.object({
    totalProjects: z.number(),
    activeEnvironments: z.number(),
    inactiveEnvironments: z.number(),
    insights: z.array(z.string()).describe('Key insights about projects')
  }),
  clustersAnalysis: z.object({
    totalClusters: z.number(),
    insights: z.array(z.string()).describe('Key insights about clusters')
  }),
  recommendations: z.array(z.string()).describe('Actionable recommendations'),
  nextSteps: z.array(z.string()).describe('Suggested next steps')
});

// System prompt for the periodic report agent
const SYSTEM_PROMPT = `You are a Periodic Report Generator Agent for the Catalyst platform. Your role is to analyze the current state of projects and Kubernetes clusters to generate comprehensive periodic reports.

Your responsibilities include:
1. Analyzing project data including repositories, environments, and deployment status
2. Evaluating Kubernetes cluster health and resource utilization
3. Identifying trends, issues, and opportunities for improvement
4. Providing actionable recommendations and next steps
5. Creating clear, concise reports that help teams understand their infrastructure status

When generating reports:
- Focus on actionable insights rather than just data summaries
- Highlight potential issues or risks that need attention
- Suggest concrete next steps for improvement
- Keep the language professional but accessible to both technical and non-technical stakeholders
- Include relevant metrics and trends when available

The user will provide you with current data about projects and clusters to analyze.`;

export interface PeriodicReportOptions {
  provider?: 'anthropic' | 'openai';
  model?: string;
  enableGitHubMCP?: boolean;
  gitHubMCPConfig?: {
    url?: string;
    headers?: Record<string, string>;
  };
}

export class PeriodicReportAgent {
  private provider: 'anthropic' | 'openai';
  private model: string;
  private enableGitHubMCP: boolean;
  private gitHubMCPConfig?: {
    url?: string;
    headers?: Record<string, string>;
  };
  private mcpClient?: MCPClient;

  constructor(options: PeriodicReportOptions = {}) {
    this.provider = options.provider || 'anthropic';
    this.model = options.model || (this.provider === 'anthropic' ? 'claude-3-sonnet-20240229' : 'gpt-4');
    this.enableGitHubMCP = options.enableGitHubMCP || false;
    this.gitHubMCPConfig = options.gitHubMCPConfig;
  }

  async generateReport(): Promise<z.infer<typeof reportSchema>> {
    // Initialize MCP client if enabled
    if (this.enableGitHubMCP) {
      await this.initializeMCPClient();
    }

    // Fetch data using the action functions
    const projectsData = await this.fetchProjects();
    const clustersData = await this.fetchClusters();

    // Fetch GitHub tools if MCP is enabled
    let githubTools: Record<string, unknown>[] = [];
    if (this.mcpClient) {
      try {
        githubTools = await this.getGitHubTools();
      } catch (error) {
        console.warn('Failed to fetch GitHub MCP tools:', error);
      }
    }

    const model = this.provider === 'anthropic' ? anthropic(this.model) : openai(this.model);

    const result = await generateObject({
      model,
      system: SYSTEM_PROMPT,
      prompt: `Generate a comprehensive periodic report for the Catalyst platform based on the following current data:

PROJECTS DATA:
${JSON.stringify(projectsData.data, null, 2)}

CLUSTERS DATA:
${JSON.stringify(clustersData.data, null, 2)}

${githubTools.length > 0 ? `
AVAILABLE GITHUB TOOLS:
${JSON.stringify(githubTools.map(tool => ({ name: tool.name, description: tool.description })), null, 2)}

You have access to GitHub MCP tools that can provide additional insights. Consider using these tools to enhance your analysis with real-time GitHub data when relevant.
` : ''}

Analyze this data to create a detailed report covering:

1. Current state of all projects and their environments
2. Kubernetes cluster status and health
3. Key insights and trends
4. Recommendations for improvements
5. Suggested next steps

Focus on providing actionable insights that help teams maintain and improve their infrastructure.`,
      schema: reportSchema,
      tools: this.mcpClient && githubTools.length > 0 ? githubTools : undefined,
    });

    return result.object;
  }

  // Tool functions for external use if needed
  async fetchProjects() {
    try {
      const projectsData = await fetchProjects();
      return {
        success: true,
        data: projectsData
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }
  }

  async fetchClusters() {
    try {
      const clustersData = await getClusters();
      return {
        success: true,
        data: clustersData
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: null
      };
    }
  }

  // MCP Client methods
  private async initializeMCPClient() {
    if (this.mcpClient) {
      return; // Already initialized
    }

    try {
      const defaultConfig = {
        url: 'https://api.githubcopilot.com/mcp/',
        headers: {}
      };

      const config = {
        ...defaultConfig,
        ...this.gitHubMCPConfig
      };

      this.mcpClient = await createMCPClient({
        transport: {
          type: 'sse' as const,
          url: config.url,
          headers: config.headers,
        },
      });

      console.log('GitHub MCP client initialized successfully');
    } catch (error) {
      console.error('Failed to initialize GitHub MCP client:', error);
      throw error;
    }
  }

  async getGitHubTools(): Promise<Record<string, unknown>[]> {
    if (!this.mcpClient) {
      throw new Error('MCP client not initialized. Call initializeMCPClient() first.');
    }

    try {
      const tools = await this.mcpClient.tools();
      console.log(`Retrieved ${tools.length} GitHub MCP tools`);
      return tools;
    } catch (error) {
      console.error('Failed to fetch GitHub MCP tools:', error);
      throw error;
    }
  }

  // Helper method to check if GitHub MCP is available
  isGitHubMCPEnabled(): boolean {
    return this.enableGitHubMCP && this.mcpClient !== undefined;
  }
}

// Export a convenience function for generating reports
export async function generatePeriodicReport(options?: PeriodicReportOptions) {
  const agent = new PeriodicReportAgent(options);
  return agent.generateReport();
}