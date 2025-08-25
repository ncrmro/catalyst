import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { fetchProjects } from '@/actions/projects';
import { getClusters } from '@/actions/clusters';
import { getGitHubMCPClient, createGitHubMCPClient, GitHubMCPClient } from '@/lib/mcp-clients';

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
  gitHubMCPApiKey?: string;
  accessToken?: string;
  mockMode?: boolean; // For testing - returns mock data instead of calling AI API
}

export class PeriodicReportAgent {
  private provider: 'anthropic' | 'openai';
  private model: string;
  private enableGitHubMCP: boolean;
  private gitHubMCPClient?: GitHubMCPClient;
  private mockMode: boolean;

  constructor(options: PeriodicReportOptions = {}) {
    this.provider = options.provider || 'anthropic';
    this.model = options.model || (this.provider === 'anthropic' ? 'claude-3-sonnet-20240229' : 'gpt-4');
    this.enableGitHubMCP = options.enableGitHubMCP ?? true;
    this.mockMode = options.mockMode ?? false;
    
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
    // Return mock data in mock mode (for testing)
    if (this.mockMode) {
      return {
        title: "Test Periodic Report (Mock Mode)",
        summary: "This is a mock report generated for testing purposes when AI API keys are not available or when running in test mode.",
        projectsAnalysis: {
          totalProjects: 2,
          activeEnvironments: 4,
          inactiveEnvironments: 1,
          insights: [
            "Mock data indicates 2 projects are being tracked",
            "Test environments are simulated as healthy",
            "This is generated without AI API calls"
          ]
        },
        clustersAnalysis: {
          totalClusters: 1,
          insights: [
            "Mock cluster data shows 1 test cluster",
            "All mock services are responding normally"
          ]
        },
        recommendations: [
          "Configure actual AI API keys for real reports",
          "Run tests in mock mode to avoid API dependencies",
          "Review mock data generation logic"
        ],
        nextSteps: [
          "Set up production API keys",
          "Verify real environment connectivity",
          "Schedule actual periodic reports"
        ]
      };
    }

    // Fetch data using the action functions
    const projectsData = await this.fetchProjects();
    const clustersData = await this.fetchClusters();

    // Check GitHub MCP availability for enhanced reporting context
    let gitHubToolsAvailable = false;
    let gitHubToolsCount = 0;
    
    if (this.enableGitHubMCP && this.gitHubMCPClient) {
      try {
        const gitHubTools = await this.gitHubMCPClient.getTools();
        gitHubToolsAvailable = this.gitHubMCPClient.isAvailable() && Object.keys(gitHubTools).length > 0;
        gitHubToolsCount = Object.keys(gitHubTools).length;
        
        if (gitHubToolsAvailable) {
          console.log(`GitHub MCP integration enabled with ${gitHubToolsCount} tools available`);
        }
      } catch (error) {
        console.warn('Failed to load GitHub MCP tools:', error);
      }
    }

    const model = this.provider === 'anthropic' ? anthropic(this.model) : openai(this.model);

    // Enhanced prompt that mentions GitHub integration capabilities
    const prompt = `Generate a comprehensive periodic report for the Catalyst platform based on the following current data:

PROJECTS DATA:
${JSON.stringify(projectsData.data, null, 2)}

CLUSTERS DATA:
${JSON.stringify(clustersData.data, null, 2)}

${gitHubToolsAvailable ? `
GITHUB INTEGRATION:
GitHub MCP tools are available (${gitHubToolsCount} tools) and can provide additional repository insights, issue tracking, PR analysis, and code metrics to enhance the report with real GitHub data.` : ''}

Analyze this data to create a detailed report covering:

1. Current state of all projects and their environments
2. Kubernetes cluster status and health
3. Key insights and trends
4. Recommendations for improvements
5. Suggested next steps

Focus on providing actionable insights that help teams maintain and improve their infrastructure.${gitHubToolsAvailable ? ' Consider leveraging GitHub data for more comprehensive analysis.' : ''}`;

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

  async getGitHubTools() {
    if (!this.enableGitHubMCP || !this.gitHubMCPClient) {
      return {
        success: false,
        error: 'GitHub MCP is not enabled',
        data: {}
      };
    }

    try {
      const tools = await this.gitHubMCPClient.getTools();
      return {
        success: true,
        data: tools,
        available: this.gitHubMCPClient.isAvailable()
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {}
      };
    }
  }
}

// Export a convenience function for generating reports
export async function generatePeriodicReport(options?: PeriodicReportOptions) {
  const agent = new PeriodicReportAgent(options);
  return agent.generateReport();
}