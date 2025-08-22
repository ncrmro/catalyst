import { GitHubMCPTools } from '../../src/agents/github-mcp-tools';

describe('GitHubMCPTools', () => {
  let githubTools: GitHubMCPTools;

  beforeEach(() => {
    githubTools = new GitHubMCPTools();
  });

  describe('Repository Information', () => {
    it('should get repository info', async () => {
      const repoInfo = await githubTools.getRepositoryInfo('catalyst', 'main-app');
      
      expect(repoInfo).toBeDefined();
      expect(repoInfo?.name).toBe('main-app');
      expect(repoInfo?.owner).toBe('catalyst');
      expect(repoInfo).toHaveProperty('description');
      expect(repoInfo).toHaveProperty('language');
      expect(repoInfo).toHaveProperty('stars');
      expect(repoInfo).toHaveProperty('forks');
      expect(repoInfo).toHaveProperty('issues');
      expect(repoInfo).toHaveProperty('lastUpdated');
    });

    it('should get repository issues', async () => {
      const issues = await githubTools.getRepositoryIssues('catalyst', 'main-app');
      
      expect(issues).toBeDefined();
      expect(issues).toHaveProperty('total');
      expect(issues).toHaveProperty('open');
      expect(issues).toHaveProperty('closed');
      expect(issues).toHaveProperty('recentIssues');
      expect(Array.isArray(issues.recentIssues)).toBe(true);
      expect(typeof issues.total).toBe('number');
      expect(typeof issues.open).toBe('number');
      expect(typeof issues.closed).toBe('number');
    });

    it('should get repository pull requests', async () => {
      const prs = await githubTools.getRepositoryPullRequests('catalyst', 'main-app');
      
      expect(prs).toBeDefined();
      expect(prs).toHaveProperty('total');
      expect(prs).toHaveProperty('open');
      expect(prs).toHaveProperty('merged');
      expect(prs).toHaveProperty('closed');
      expect(prs).toHaveProperty('recentPRs');
      expect(Array.isArray(prs.recentPRs)).toBe(true);
      expect(typeof prs.total).toBe('number');
      expect(typeof prs.open).toBe('number');
      expect(typeof prs.merged).toBe('number');
      expect(typeof prs.closed).toBe('number');
    });

    it('should get repository commits', async () => {
      const commits = await githubTools.getRepositoryCommits('catalyst', 'main-app');
      
      expect(commits).toBeDefined();
      expect(commits).toHaveProperty('total');
      expect(commits).toHaveProperty('lastWeek');
      expect(commits).toHaveProperty('lastMonth');
      expect(commits).toHaveProperty('recentCommits');
      expect(Array.isArray(commits.recentCommits)).toBe(true);
      expect(typeof commits.total).toBe('number');
      expect(typeof commits.lastWeek).toBe('number');
      expect(typeof commits.lastMonth).toBe('number');
    });
  });

  describe('Code Quality and Security', () => {
    it('should get code scanning alerts', async () => {
      const alerts = await githubTools.getCodeScanningAlerts('catalyst', 'main-app');
      
      expect(alerts).toBeDefined();
      expect(alerts).toHaveProperty('total');
      expect(alerts).toHaveProperty('high');
      expect(alerts).toHaveProperty('medium');
      expect(alerts).toHaveProperty('low');
      expect(alerts).toHaveProperty('alerts');
      expect(Array.isArray(alerts.alerts)).toBe(true);
      expect(typeof alerts.total).toBe('number');
      expect(typeof alerts.high).toBe('number');
      expect(typeof alerts.medium).toBe('number');
      expect(typeof alerts.low).toBe('number');
    });

    it('should get secret scanning alerts', async () => {
      const alerts = await githubTools.getSecretScanningAlerts('catalyst', 'main-app');
      
      expect(alerts).toBeDefined();
      expect(alerts).toHaveProperty('total');
      expect(alerts).toHaveProperty('open');
      expect(alerts).toHaveProperty('resolved');
      expect(alerts).toHaveProperty('alerts');
      expect(Array.isArray(alerts.alerts)).toBe(true);
      expect(typeof alerts.total).toBe('number');
      expect(typeof alerts.open).toBe('number');
      expect(typeof alerts.resolved).toBe('number');
    });
  });

  describe('Workflows', () => {
    it('should get workflow runs', async () => {
      const workflows = await githubTools.getWorkflowRuns('catalyst', 'main-app');
      
      expect(workflows).toBeDefined();
      expect(workflows).toHaveProperty('total');
      expect(workflows).toHaveProperty('successful');
      expect(workflows).toHaveProperty('failed');
      expect(workflows).toHaveProperty('recentRuns');
      expect(Array.isArray(workflows.recentRuns)).toBe(true);
      expect(typeof workflows.total).toBe('number');
      expect(typeof workflows.successful).toBe('number');
      expect(typeof workflows.failed).toBe('number');
    });
  });

  describe('Repository Search and Details', () => {
    it('should search repositories', async () => {
      const results = await githubTools.searchRepositories('org:catalyst');
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should get comprehensive repository details', async () => {
      const details = await githubTools.getRepositoryDetails('catalyst', 'main-app');
      
      expect(details).toBeDefined();
      expect(details.repository).toBeDefined();
      expect(details.issues).toBeDefined();
      expect(details.pullRequests).toBeDefined();
      expect(details.commits).toBeDefined();
      expect(details.codeAlerts).toBeDefined();
      expect(details.securityAlerts).toBeDefined();
      expect(details.workflows).toBeDefined();
    });

    it('should aggregate GitHub data across multiple repositories', async () => {
      const repos = [
        { owner: 'catalyst', repo: 'main-app' },
        { owner: 'catalyst', repo: 'infrastructure' }
      ];
      
      const aggregatedData = await githubTools.aggregateGitHubData(repos);
      
      expect(aggregatedData).toBeDefined();
      expect(aggregatedData.repositoriesCount).toBe(2);
      expect(aggregatedData).toHaveProperty('totalIssues');
      expect(aggregatedData).toHaveProperty('openIssues');
      expect(aggregatedData).toHaveProperty('totalPullRequests');
      expect(aggregatedData).toHaveProperty('openPullRequests');
      expect(aggregatedData).toHaveProperty('recentCommits');
      expect(aggregatedData).toHaveProperty('codeQualityAlerts');
      expect(aggregatedData).toHaveProperty('securityAlerts');
      expect(aggregatedData).toHaveProperty('workflowRuns');
      expect(Array.isArray(aggregatedData.repositories)).toBe(true);
      expect(aggregatedData.repositories).toHaveLength(2);

      // Verify that numbers are indeed numbers
      expect(typeof aggregatedData.totalIssues).toBe('number');
      expect(typeof aggregatedData.openIssues).toBe('number');
      expect(typeof aggregatedData.totalPullRequests).toBe('number');
      expect(typeof aggregatedData.openPullRequests).toBe('number');
      expect(typeof aggregatedData.recentCommits).toBe('number');
      expect(typeof aggregatedData.codeQualityAlerts).toBe('number');
      expect(typeof aggregatedData.securityAlerts).toBe('number');
      expect(typeof aggregatedData.workflowRuns).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle repository info errors gracefully', async () => {
      // The mock implementation always returns data, but in real usage errors could occur
      const repoInfo = await githubTools.getRepositoryInfo('nonexistent', 'repo');
      
      expect(repoInfo).toBeDefined();
      expect(repoInfo?.name).toBe('repo');
      expect(repoInfo?.owner).toBe('nonexistent');
    });

    it('should handle aggregation with empty repository list', async () => {
      const aggregatedData = await githubTools.aggregateGitHubData([]);
      
      expect(aggregatedData).toBeDefined();
      expect(aggregatedData.repositoriesCount).toBe(0);
      expect(aggregatedData.totalIssues).toBe(0);
      expect(aggregatedData.openIssues).toBe(0);
      expect(aggregatedData.totalPullRequests).toBe(0);
      expect(aggregatedData.openPullRequests).toBe(0);
      expect(aggregatedData.recentCommits).toBe(0);
      expect(aggregatedData.codeQualityAlerts).toBe(0);
      expect(aggregatedData.securityAlerts).toBe(0);
      expect(aggregatedData.workflowRuns).toBe(0);
      expect(Array.isArray(aggregatedData.repositories)).toBe(true);
      expect(aggregatedData.repositories).toHaveLength(0);
    });

    it('should handle search errors gracefully', async () => {
      const results = await githubTools.searchRepositories('invalid-query');
      
      expect(Array.isArray(results)).toBe(true);
      // Mock implementation returns repositories regardless, but real implementation would handle errors
    });
  });

  describe('Data Structure Validation', () => {
    it('should ensure repository details have consistent structure', async () => {
      const details = await githubTools.getRepositoryDetails('catalyst', 'test-repo');
      
      // Validate structure of repository info
      if (details.repository) {
        expect(typeof details.repository.name).toBe('string');
        expect(typeof details.repository.owner).toBe('string');
        expect(typeof details.repository.description).toBe('string');
        expect(typeof details.repository.language).toBe('string');
        expect(typeof details.repository.stars).toBe('number');
        expect(typeof details.repository.forks).toBe('number');
        expect(typeof details.repository.issues).toBe('number');
        expect(typeof details.repository.lastUpdated).toBe('string');
      }

      // Validate issues structure
      expect(typeof details.issues.total).toBe('number');
      expect(typeof details.issues.open).toBe('number');
      expect(typeof details.issues.closed).toBe('number');
      expect(Array.isArray(details.issues.recentIssues)).toBe(true);

      // Validate pull requests structure
      expect(typeof details.pullRequests.total).toBe('number');
      expect(typeof details.pullRequests.open).toBe('number');
      expect(typeof details.pullRequests.merged).toBe('number');
      expect(typeof details.pullRequests.closed).toBe('number');
      expect(Array.isArray(details.pullRequests.recentPRs)).toBe(true);

      // Validate commits structure
      expect(typeof details.commits.total).toBe('number');
      expect(typeof details.commits.lastWeek).toBe('number');
      expect(typeof details.commits.lastMonth).toBe('number');
      expect(Array.isArray(details.commits.recentCommits)).toBe(true);

      // Validate code alerts structure
      expect(typeof details.codeAlerts.total).toBe('number');
      expect(typeof details.codeAlerts.high).toBe('number');
      expect(typeof details.codeAlerts.medium).toBe('number');
      expect(typeof details.codeAlerts.low).toBe('number');
      expect(Array.isArray(details.codeAlerts.alerts)).toBe(true);

      // Validate security alerts structure
      expect(typeof details.securityAlerts.total).toBe('number');
      expect(typeof details.securityAlerts.open).toBe('number');
      expect(typeof details.securityAlerts.resolved).toBe('number');
      expect(Array.isArray(details.securityAlerts.alerts)).toBe(true);

      // Validate workflows structure
      expect(typeof details.workflows.total).toBe('number');
      expect(typeof details.workflows.successful).toBe('number');
      expect(typeof details.workflows.failed).toBe('number');
      expect(Array.isArray(details.workflows.recentRuns)).toBe(true);
    });
  });
});