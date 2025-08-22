import { PeriodicReportAgent } from '../../src/agents/periodic-report';

// Mock the AI SDK since we don't want to make actual API calls in tests
jest.mock('ai', () => ({
  generateObject: jest.fn().mockResolvedValue({
    object: {
      title: 'Test Periodic Report',
      summary: 'Test summary',
      projectsAnalysis: {
        totalProjects: 2,
        activeEnvironments: 3,
        inactiveEnvironments: 1,
        insights: ['Test project insight']
      },
      clustersAnalysis: {
        totalClusters: 1,
        insights: ['Test cluster insight']
      },
      githubAnalysis: {
        repositoriesCount: 2,
        totalIssues: 10,
        openIssues: 5,
        totalPullRequests: 8,
        openPullRequests: 3,
        recentCommits: 25,
        codeQualityAlerts: 2,
        securityAlerts: 1,
        workflowRuns: 15,
        insights: ['Test GitHub insight']
      },
      recommendations: ['Test recommendation'],
      nextSteps: ['Test next step']
    }
  })
}));

// Mock the action functions
jest.mock('../../src/actions/projects', () => ({
  fetchProjects: jest.fn().mockResolvedValue([
    { id: 1, name: 'Test Project 1' },
    { id: 2, name: 'Test Project 2' }
  ])
}));

jest.mock('../../src/actions/clusters', () => ({
  getClusters: jest.fn().mockResolvedValue([
    { id: 1, name: 'Test Cluster 1' }
  ])
}));

describe('PeriodicReportAgent - GitHub Integration', () => {
  let agent: PeriodicReportAgent;

  beforeEach(() => {
    agent = new PeriodicReportAgent({
      provider: 'anthropic',
      model: 'claude-3-sonnet-20240229'
    });
  });

  describe('GitHub MCP Tool Functions', () => {
    it('should fetch GitHub repositories successfully', async () => {
      const result = await agent.fetchGitHubRepositories();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should handle specific owner/repo requests', async () => {
      const result = await agent.fetchGitHubRepositories('catalyst', 'main-app');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should get repository details with all components', async () => {
      const repoDetails = await agent.getRepositoryDetails('catalyst', 'main-app');
      
      expect(repoDetails).toBeDefined();
      expect(repoDetails.repository).toBeDefined();
      expect(repoDetails.issues).toBeDefined();
      expect(repoDetails.pullRequests).toBeDefined();
      expect(repoDetails.commits).toBeDefined();
      expect(repoDetails.codeAlerts).toBeDefined();
      expect(repoDetails.securityAlerts).toBeDefined();
      expect(repoDetails.workflows).toBeDefined();
    });

    it('should fetch repository info through GitHubMCPTools', async () => {
      const repoDetails = await agent.getRepositoryDetails('catalyst', 'main-app');
      
      expect(repoDetails).toBeDefined();
      expect(repoDetails.repository).toBeDefined();
      expect(repoDetails.repository?.name).toBe('main-app');
      expect(repoDetails.repository?.owner).toBe('catalyst');
      expect(repoDetails.repository).toHaveProperty('description');
      expect(repoDetails.repository).toHaveProperty('language');
      expect(repoDetails.repository).toHaveProperty('stars');
      expect(repoDetails.repository).toHaveProperty('forks');
      expect(repoDetails.repository).toHaveProperty('issues');
      expect(repoDetails.repository).toHaveProperty('lastUpdated');
    });

    it('should fetch repository issues data through GitHubMCPTools', async () => {
      const repoDetails = await agent.getRepositoryDetails('catalyst', 'main-app');
      const issues = repoDetails.issues;
      
      expect(issues).toBeDefined();
      expect(issues).toHaveProperty('total');
      expect(issues).toHaveProperty('open');
      expect(issues).toHaveProperty('closed');
      expect(issues).toHaveProperty('recentIssues');
      expect(Array.isArray(issues.recentIssues)).toBe(true);
    });

    it('should fetch repository pull requests data through GitHubMCPTools', async () => {
      const repoDetails = await agent.getRepositoryDetails('catalyst', 'main-app');
      const prs = repoDetails.pullRequests;
      
      expect(prs).toBeDefined();
      expect(prs).toHaveProperty('total');
      expect(prs).toHaveProperty('open');
      expect(prs).toHaveProperty('merged');
      expect(prs).toHaveProperty('closed');
      expect(prs).toHaveProperty('recentPRs');
      expect(Array.isArray(prs.recentPRs)).toBe(true);
    });

    it('should fetch repository commits data through GitHubMCPTools', async () => {
      const repoDetails = await agent.getRepositoryDetails('catalyst', 'main-app');
      const commits = repoDetails.commits;
      
      expect(commits).toBeDefined();
      expect(commits).toHaveProperty('total');
      expect(commits).toHaveProperty('lastWeek');
      expect(commits).toHaveProperty('lastMonth');
      expect(commits).toHaveProperty('recentCommits');
      expect(Array.isArray(commits.recentCommits)).toBe(true);
    });

    it('should fetch code scanning alerts through GitHubMCPTools', async () => {
      const repoDetails = await agent.getRepositoryDetails('catalyst', 'main-app');
      const alerts = repoDetails.codeAlerts;
      
      expect(alerts).toBeDefined();
      expect(alerts).toHaveProperty('total');
      expect(alerts).toHaveProperty('high');
      expect(alerts).toHaveProperty('medium');
      expect(alerts).toHaveProperty('low');
      expect(alerts).toHaveProperty('alerts');
      expect(Array.isArray(alerts.alerts)).toBe(true);
    });

    it('should fetch secret scanning alerts through GitHubMCPTools', async () => {
      const repoDetails = await agent.getRepositoryDetails('catalyst', 'main-app');
      const alerts = repoDetails.securityAlerts;
      
      expect(alerts).toBeDefined();
      expect(alerts).toHaveProperty('total');
      expect(alerts).toHaveProperty('open');
      expect(alerts).toHaveProperty('resolved');
      expect(alerts).toHaveProperty('alerts');
      expect(Array.isArray(alerts.alerts)).toBe(true);
    });

    it('should fetch workflow runs data through GitHubMCPTools', async () => {
      const repoDetails = await agent.getRepositoryDetails('catalyst', 'main-app');
      const workflows = repoDetails.workflows;
      
      expect(workflows).toBeDefined();
      expect(workflows).toHaveProperty('total');
      expect(workflows).toHaveProperty('successful');
      expect(workflows).toHaveProperty('failed');
      expect(workflows).toHaveProperty('recentRuns');
      expect(Array.isArray(workflows.recentRuns)).toBe(true);
    });

    it('should aggregate GitHub data across repositories', async () => {
      const result = await agent.fetchGitHubData();
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toHaveProperty('repositoriesCount');
      expect(result.data).toHaveProperty('totalIssues');
      expect(result.data).toHaveProperty('openIssues');
      expect(result.data).toHaveProperty('totalPullRequests');
      expect(result.data).toHaveProperty('openPullRequests');
      expect(result.data).toHaveProperty('recentCommits');
      expect(result.data).toHaveProperty('codeQualityAlerts');
      expect(result.data).toHaveProperty('securityAlerts');
      expect(result.data).toHaveProperty('workflowRuns');
      expect(result.data).toHaveProperty('repositories');
      expect(Array.isArray(result.data.repositories)).toBe(true);
    });
  });

  describe('Report Generation with GitHub Data', () => {
    it('should generate a report with GitHub analysis section', async () => {
      const report = await agent.generateReport();
      
      expect(report).toBeDefined();
      expect(report.title).toBe('Test Periodic Report');
      expect(report.summary).toBe('Test summary');
      
      // Check that all sections are present
      expect(report.projectsAnalysis).toBeDefined();
      expect(report.clustersAnalysis).toBeDefined();
      expect(report.githubAnalysis).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.nextSteps).toBeDefined();
      
      // Check GitHub analysis structure
      expect(report.githubAnalysis.repositoriesCount).toBe(2);
      expect(report.githubAnalysis.totalIssues).toBe(10);
      expect(report.githubAnalysis.openIssues).toBe(5);
      expect(report.githubAnalysis.totalPullRequests).toBe(8);
      expect(report.githubAnalysis.openPullRequests).toBe(3);
      expect(report.githubAnalysis.recentCommits).toBe(25);
      expect(report.githubAnalysis.codeQualityAlerts).toBe(2);
      expect(report.githubAnalysis.securityAlerts).toBe(1);
      expect(report.githubAnalysis.workflowRuns).toBe(15);
      expect(Array.isArray(report.githubAnalysis.insights)).toBe(true);
    });

    it('should handle errors gracefully in GitHub data fetching', async () => {
      // Mock a failure in one of the GitHub methods
      const originalFetchGitHubData = agent.fetchGitHubData;
      agent.fetchGitHubData = jest.fn().mockResolvedValue({
        success: false,
        error: 'GitHub API rate limit exceeded',
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
      });

      const result = await agent.fetchGitHubData();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('GitHub API rate limit exceeded');
      expect(result.data.repositoriesCount).toBe(0);
      
      // Restore original method
      agent.fetchGitHubData = originalFetchGitHubData;
    });
  });

  describe('Error Handling', () => {
    it('should handle repository details fetch errors gracefully', async () => {
      // Test the main getRepositoryDetails method which is what's exposed
      const repoDetails = await agent.getRepositoryDetails('nonexistent', 'repo');
      
      expect(repoDetails).toBeDefined();
      expect(repoDetails.repository).toBeDefined();
      expect(repoDetails.issues).toBeDefined();
      expect(repoDetails.pullRequests).toBeDefined();
      expect(repoDetails.commits).toBeDefined();
      expect(repoDetails.codeAlerts).toBeDefined();
      expect(repoDetails.securityAlerts).toBeDefined();
      expect(repoDetails.workflows).toBeDefined();
    });

    it('should handle GitHub data aggregation errors', async () => {
      // Mock a failure in fetchGitHubData
      const originalFetchGitHubData = agent.fetchGitHubData;
      agent.fetchGitHubData = jest.fn().mockResolvedValue({
        success: false,
        error: 'GitHub API rate limit exceeded',
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
      });

      const result = await agent.fetchGitHubData();
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('GitHub API rate limit exceeded');
      expect(result.data.repositoriesCount).toBe(0);
      
      // Restore original method
      agent.fetchGitHubData = originalFetchGitHubData;
    });
  });
});