import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { fetchProjects } from '@/actions/projects';
import { getClusters } from '@/actions/clusters';
import { GitHubMCPTools } from './github-mcp-tools';

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
  githubAnalysis: z.object({
    repositoriesCount: z.number(),
    totalIssues: z.number(),
    openIssues: z.number(),
    totalPullRequests: z.number(),
    openPullRequests: z.number(),
    recentCommits: z.number(),
    codeQualityAlerts: z.number(),
    securityAlerts: z.number(),
    workflowRuns: z.number(),
    insights: z.array(z.string()).describe('Key insights about GitHub repositories and development activity')
  }),
  recommendations: z.array(z.string()).describe('Actionable recommendations'),
  nextSteps: z.array(z.string()).describe('Suggested next steps')
});

// System prompt for the periodic report agent
const SYSTEM_PROMPT = `You are a Periodic Report Generator Agent for the Catalyst platform. Your role is to analyze the current state of projects, Kubernetes clusters, and GitHub repositories to generate comprehensive periodic reports.

Your responsibilities include:
1. Analyzing project data including repositories, environments, and deployment status
2. Evaluating Kubernetes cluster health and resource utilization
3. Analyzing GitHub repository activity, code quality, and development workflows
4. Identifying trends, issues, and opportunities for improvement across infrastructure and development
5. Providing actionable recommendations and next steps
6. Creating clear, concise reports that help teams understand their complete development and infrastructure status

When generating reports:
- Focus on actionable insights rather than just data summaries
- Highlight potential issues or risks that need attention in infrastructure, code quality, and development processes
- Suggest concrete next steps for improvement across all areas
- Keep the language professional but accessible to both technical and non-technical stakeholders
- Include relevant metrics and trends when available
- Correlate GitHub activity with infrastructure status when possible

The user will provide you with current data about projects, clusters, and GitHub repositories to analyze.`;

export interface PeriodicReportOptions {
  provider?: 'anthropic' | 'openai';
  model?: string;
}

export class PeriodicReportAgent {
  private provider: 'anthropic' | 'openai';
  private model: string;
  private githubTools: GitHubMCPTools;

  constructor(options: PeriodicReportOptions = {}) {
    this.provider = options.provider || 'anthropic';
    this.model = options.model || (this.provider === 'anthropic' ? 'claude-3-sonnet-20240229' : 'gpt-4');
    this.githubTools = new GitHubMCPTools();
  }

  async generateReport(): Promise<z.infer<typeof reportSchema>> {
    // Fetch data using the action functions
    const projectsData = await this.fetchProjects();
    const clustersData = await this.fetchClusters();
    const githubData = await this.fetchGitHubData();

    const model = this.provider === 'anthropic' ? anthropic(this.model) : openai(this.model);

    const result = await generateObject({
      model,
      system: SYSTEM_PROMPT,
      prompt: `Generate a comprehensive periodic report for the Catalyst platform based on the following current data:

PROJECTS DATA:
${JSON.stringify(projectsData.data, null, 2)}

CLUSTERS DATA:
${JSON.stringify(clustersData.data, null, 2)}

GITHUB DATA:
${JSON.stringify(githubData.data, null, 2)}

Analyze this data to create a detailed report covering:

1. Current state of all projects and their environments
2. Kubernetes cluster status and health
3. GitHub repository activity, code quality, and development workflow health
4. Key insights and trends across infrastructure and development
5. Recommendations for improvements in both infrastructure and development processes
6. Suggested next steps

Focus on providing actionable insights that help teams maintain and improve their infrastructure and development workflows. Pay particular attention to:
- Code quality trends and security alerts
- Development velocity indicators (commits, PRs, issue resolution)
- Infrastructure deployment patterns
- Cross-correlation between GitHub activity and infrastructure changes`,
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

  // GitHub MCP tool functions for fetching repository insights
  async fetchGitHubRepositories(owner?: string, repo?: string) {
    try {
      // If specific owner/repo provided, get that repository
      if (owner && repo) {
        const repoData = await this.githubTools.getRepositoryDetails(owner, repo);
        return {
          success: true,
          data: [repoData]
        };
      }

      // Otherwise, search for repositories related to the organization
      // For now, we'll use a general search - in production this could be configured
      const searchResults = await this.githubTools.searchRepositories('org:catalyst OR user:catalyst');
      return {
        success: true,
        data: searchResults
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: []
      };
    }
  }

  async getRepositoryDetails(owner: string, repo: string) {
    return await this.githubTools.getRepositoryDetails(owner, repo);
  }

  // Aggregate GitHub data across all repositories
  async fetchGitHubData() {
    try {
      // Get repositories - for now using mock data
      // In production, this would get actual repositories from the projects
      const mockRepos = [
        { owner: 'catalyst', repo: 'main-app' },
        { owner: 'catalyst', repo: 'infrastructure' }
      ];

      const aggregatedData = await this.githubTools.aggregateGitHubData(mockRepos);

      return {
        success: true,
        data: aggregatedData
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          repositoriesCount: 0,
          totalIssues: 0,
          openIssues: 0,
          totalPullRequests: 0,
          openPullRequests: 0,
          recentCommits: 0,
          codeQualityAlerts: 0,
          securityAlerts: 0,
          workflowRuns: 0,
          repositories: []
        }
      };
    }
  }
}

// Export a convenience function for generating reports
export async function generatePeriodicReport(options?: PeriodicReportOptions) {
  const agent = new PeriodicReportAgent(options);
  return agent.generateReport();
}