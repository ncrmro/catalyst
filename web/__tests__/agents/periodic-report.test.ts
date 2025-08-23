// Mock the AI SDK modules to avoid requiring API keys in tests
jest.mock('ai', () => ({
  generateObject: jest.fn(),
  experimental_createMCPClient: jest.fn()
}));

jest.mock('@ai-sdk/anthropic', () => ({
  anthropic: jest.fn()
}));

jest.mock('@ai-sdk/openai', () => ({
  openai: jest.fn()
}));

// Mock the actions
jest.mock('../../src/actions/projects', () => ({
  fetchProjects: jest.fn()
}));

jest.mock('../../src/actions/clusters', () => ({
  getClusters: jest.fn()
}));

import { PeriodicReportAgent, generatePeriodicReport } from '../../src/agents/periodic-report';
import { fetchProjects } from '../../src/actions/projects';
import { getClusters } from '../../src/actions/clusters';
import { generateObject, experimental_createMCPClient as createMCPClient } from 'ai';

describe('PeriodicReportAgent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create an agent with default options', () => {
    const agent = new PeriodicReportAgent();
    expect(agent).toBeInstanceOf(PeriodicReportAgent);
  });

  it('should create an agent with custom options', () => {
    const agent = new PeriodicReportAgent({ 
      provider: 'openai', 
      model: 'gpt-3.5-turbo' 
    });
    expect(agent).toBeInstanceOf(PeriodicReportAgent);
  });

  it('should fetch projects data successfully', async () => {
    const mockProjectsData = {
      projects: [
        {
          id: 'test-project',
          name: 'Test Project',
          full_name: 'test/project',
          description: 'A test project',
          owner: { login: 'test', type: 'User' as const, avatar_url: '' },
          repositories: [],
          environments: [],
          preview_environments_count: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ],
      total_count: 1
    };

    (fetchProjects as jest.Mock).mockResolvedValue(mockProjectsData);

    const agent = new PeriodicReportAgent();
    const result = await agent.fetchProjects();

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockProjectsData);
    expect(fetchProjects).toHaveBeenCalledTimes(1);
  });

  it('should fetch clusters data successfully', async () => {
    const mockClustersData = [
      {
        name: 'test-cluster',
        endpoint: 'https://test.example.com',
        source: 'KUBECONFIG_TEST'
      }
    ];

    (getClusters as jest.Mock).mockResolvedValue(mockClustersData);

    const agent = new PeriodicReportAgent();
    const result = await agent.fetchClusters();

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockClustersData);
    expect(getClusters).toHaveBeenCalledTimes(1);
  });

  it('should handle errors when fetching projects', async () => {
    const errorMessage = 'Failed to fetch projects';
    (fetchProjects as jest.Mock).mockRejectedValue(new Error(errorMessage));

    const agent = new PeriodicReportAgent();
    const result = await agent.fetchProjects();

    expect(result.success).toBe(false);
    expect(result.error).toBe(errorMessage);
    expect(result.data).toBe(null);
  });

  it('should handle errors when fetching clusters', async () => {
    const errorMessage = 'Failed to fetch clusters';
    (getClusters as jest.Mock).mockRejectedValue(new Error(errorMessage));

    const agent = new PeriodicReportAgent();
    const result = await agent.fetchClusters();

    expect(result.success).toBe(false);
    expect(result.error).toBe(errorMessage);
    expect(result.data).toBe(null);
  });

  it('should generate a report with mocked AI response', async () => {
    const mockProjectsData = {
      projects: [
        {
          id: 'test-project',
          name: 'Test Project',
          full_name: 'test/project',
          description: 'A test project',
          owner: { login: 'test', type: 'User' as const, avatar_url: '' },
          repositories: [],
          environments: [
            {
              id: 'env-1',
              name: 'production',
              type: 'branch_push' as const,
              branch: 'main',
              status: 'active' as const,
              url: 'https://test.example.com',
              last_deployed: '2024-01-01T00:00:00Z'
            }
          ],
          preview_environments_count: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ],
      total_count: 1
    };

    const mockClustersData = [
      {
        name: 'test-cluster',
        endpoint: 'https://test.example.com',
        source: 'KUBECONFIG_TEST'
      }
    ];

    const mockReport = {
      title: 'Weekly Infrastructure Report',
      summary: 'Current infrastructure is stable with 1 project and 1 cluster.',
      projectsAnalysis: {
        totalProjects: 1,
        activeEnvironments: 1,
        inactiveEnvironments: 0,
        insights: ['All projects are running smoothly']
      },
      clustersAnalysis: {
        totalClusters: 1,
        insights: ['Cluster is healthy and responding']
      },
      recommendations: ['Continue monitoring'],
      nextSteps: ['Review security settings']
    };

    (fetchProjects as jest.Mock).mockResolvedValue(mockProjectsData);
    (getClusters as jest.Mock).mockResolvedValue(mockClustersData);
    (generateObject as jest.Mock).mockResolvedValue({ object: mockReport });

    const agent = new PeriodicReportAgent();
    const result = await agent.generateReport();

    expect(result).toEqual(mockReport);
    expect(generateObject).toHaveBeenCalledTimes(1);
  });

  it('should use the convenience function to generate a report', async () => {
    const mockReport = {
      title: 'Test Report',
      summary: 'Test summary',
      projectsAnalysis: {
        totalProjects: 0,
        activeEnvironments: 0,
        inactiveEnvironments: 0,
        insights: []
      },
      clustersAnalysis: {
        totalClusters: 0,
        insights: []
      },
      recommendations: [],
      nextSteps: []
    };

    (fetchProjects as jest.Mock).mockResolvedValue({ projects: [], total_count: 0 });
    (getClusters as jest.Mock).mockResolvedValue([]);
    (generateObject as jest.Mock).mockResolvedValue({ object: mockReport });

    const result = await generatePeriodicReport();

    expect(result).toEqual(mockReport);
    expect(generateObject).toHaveBeenCalledTimes(1);
  });

  describe('GitHub MCP Integration', () => {
    it('should create an agent with GitHub MCP enabled', () => {
      const agent = new PeriodicReportAgent({
        enableGitHubMCP: true,
        gitHubMCPConfig: {
          url: 'https://api.githubcopilot.com/mcp/',
          headers: { Authorization: 'Bearer test-token' }
        }
      });
      
      expect(agent).toBeInstanceOf(PeriodicReportAgent);
      expect(agent.isGitHubMCPEnabled()).toBe(false); // Should be false until client is initialized
    });

    it('should initialize MCP client and fetch tools successfully', async () => {
      const mockMCPClient = {
        tools: jest.fn().mockResolvedValue([
          { name: 'get_repo', description: 'Get repository information' },
          { name: 'list_issues', description: 'List repository issues' }
        ])
      };

      (createMCPClient as jest.Mock).mockResolvedValue(mockMCPClient);

      const agent = new PeriodicReportAgent({
        enableGitHubMCP: true,
        gitHubMCPConfig: {
          url: 'https://api.githubcopilot.com/mcp/',
          headers: { Authorization: 'Bearer test-token' }
        }
      });

      const mockProjectsData = { projects: [], total_count: 0 };
      const mockClustersData: never[] = [];
      const mockReport = {
        title: 'Test Report',
        summary: 'Test summary',
        projectsAnalysis: {
          totalProjects: 0,
          activeEnvironments: 0,
          inactiveEnvironments: 0,
          insights: []
        },
        clustersAnalysis: {
          totalClusters: 0,
          insights: []
        },
        recommendations: [],
        nextSteps: []
      };

      (fetchProjects as jest.Mock).mockResolvedValue(mockProjectsData);
      (getClusters as jest.Mock).mockResolvedValue(mockClustersData);
      (generateObject as jest.Mock).mockResolvedValue({ object: mockReport });

      const result = await agent.generateReport();

      expect(createMCPClient).toHaveBeenCalledWith({
        transport: {
          type: 'sse',
          url: 'https://api.githubcopilot.com/mcp/',
          headers: { Authorization: 'Bearer test-token' }
        }
      });

      expect(mockMCPClient.tools).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockReport);
    });

    it('should handle MCP client initialization failure gracefully', async () => {
      const initError = new Error('Failed to connect to MCP server');
      (createMCPClient as jest.Mock).mockRejectedValue(initError);

      const agent = new PeriodicReportAgent({
        enableGitHubMCP: true
      });

      await expect(agent.generateReport()).rejects.toThrow('Failed to connect to MCP server');
    });

    it('should handle MCP tools fetch failure gracefully', async () => {
      const mockMCPClient = {
        tools: jest.fn().mockRejectedValue(new Error('Failed to fetch tools'))
      };

      (createMCPClient as jest.Mock).mockResolvedValue(mockMCPClient);

      const agent = new PeriodicReportAgent({
        enableGitHubMCP: true
      });

      const mockProjectsData = { projects: [], total_count: 0 };
      const mockClustersData: never[] = [];
      const mockReport = {
        title: 'Test Report',
        summary: 'Test summary',
        projectsAnalysis: {
          totalProjects: 0,
          activeEnvironments: 0,
          inactiveEnvironments: 0,
          insights: []
        },
        clustersAnalysis: {
          totalClusters: 0,
          insights: []
        },
        recommendations: [],
        nextSteps: []
      };

      (fetchProjects as jest.Mock).mockResolvedValue(mockProjectsData);
      (getClusters as jest.Mock).mockResolvedValue(mockClustersData);
      (generateObject as jest.Mock).mockResolvedValue({ object: mockReport });

      // Should not throw, but should log warning
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await agent.generateReport();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch GitHub MCP tools:', expect.any(Error));
      expect(result).toEqual(mockReport);
      
      consoleSpy.mockRestore();
    });

    it('should generate report with GitHub MCP tools in prompt when available', async () => {
      const mockTools = [
        { name: 'get_repo', description: 'Get repository information' },
        { name: 'list_issues', description: 'List repository issues' }
      ];

      const mockMCPClient = {
        tools: jest.fn().mockResolvedValue(mockTools)
      };

      (createMCPClient as jest.Mock).mockResolvedValue(mockMCPClient);

      const agent = new PeriodicReportAgent({
        enableGitHubMCP: true
      });

      const mockProjectsData = { projects: [], total_count: 0 };
      const mockClustersData: never[] = [];
      const mockReport = {
        title: 'Test Report',
        summary: 'Test summary',
        projectsAnalysis: {
          totalProjects: 0,
          activeEnvironments: 0,
          inactiveEnvironments: 0,
          insights: []
        },
        clustersAnalysis: {
          totalClusters: 0,
          insights: []
        },
        recommendations: [],
        nextSteps: []
      };

      (fetchProjects as jest.Mock).mockResolvedValue(mockProjectsData);
      (getClusters as jest.Mock).mockResolvedValue(mockClustersData);
      (generateObject as jest.Mock).mockResolvedValue({ object: mockReport });

      await agent.generateReport();

      expect(generateObject).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('AVAILABLE GITHUB TOOLS:'),
        tools: mockTools
      }));
    });
  });
});