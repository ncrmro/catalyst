import { PeriodicReportAgent } from './periodic-report';

/**
 * Example usage of the PeriodicReport agent with GitHub MCP integration
 * 
 * This script demonstrates how to:
 * 1. Create a PeriodicReport agent with GitHub MCP tools
 * 2. Generate a comprehensive report including GitHub analysis
 * 3. Handle different provider configurations
 * 4. Use individual GitHub MCP tools
 */

async function main() {
  try {
    console.log('🤖 Starting Periodic Report Generation with GitHub MCP...\n');

    // Example 1: Using default configuration (Anthropic) with GitHub analysis
    console.log('📊 Generating report with GitHub MCP integration...');
    const agent = new PeriodicReportAgent();
    
    // Demonstrate data fetching capabilities
    const projectsResult = await agent.fetchProjects();
    const clustersResult = await agent.fetchClusters();
    const githubResult = await agent.fetchGitHubData(); // NEW: GitHub MCP data
    
    console.log('✅ Projects fetched successfully:', projectsResult.success);
    console.log('📋 Total projects:', projectsResult.data?.total_count || 0);
    
    console.log('✅ Clusters fetched successfully:', clustersResult.success);
    console.log('🏗️  Total clusters:', clustersResult.data?.length || 0);
    
    console.log('✅ GitHub data fetched successfully:', githubResult.success);
    console.log('📦 Total repositories:', githubResult.data.repositoriesCount);
    console.log('🐛 Total issues:', githubResult.data.totalIssues, `(${githubResult.data.openIssues} open)`);
    console.log('🔧 Total PRs:', githubResult.data.totalPullRequests, `(${githubResult.data.openPullRequests} open)`);
    console.log('📝 Recent commits:', githubResult.data.recentCommits);
    console.log('⚠️  Code quality alerts:', githubResult.data.codeQualityAlerts);
    console.log('🔒 Security alerts:', githubResult.data.securityAlerts);
    console.log('⚡ Workflow runs:', githubResult.data.workflowRuns);
    console.log();

    // Example 2: Demonstrate individual GitHub tools
    console.log('🔧 Demonstrating individual GitHub MCP tools...');
    const repoDetails = await agent.getRepositoryDetails('catalyst', 'main-app');
    
    console.log('📊 Repository Details:');
    console.log(`  Name: ${repoDetails.repository?.name}`);
    console.log(`  Owner: ${repoDetails.repository?.owner}`);
    console.log(`  Language: ${repoDetails.repository?.language}`);
    console.log(`  Stars: ${repoDetails.repository?.stars}`);
    console.log(`  Issues: ${repoDetails.issues.open}/${repoDetails.issues.total}`);
    console.log(`  PRs: ${repoDetails.pullRequests.open}/${repoDetails.pullRequests.total}`);
    console.log(`  Commits (last week): ${repoDetails.commits.lastWeek}`);
    console.log(`  Code alerts: ${repoDetails.codeAlerts.total} (${repoDetails.codeAlerts.high} high)`);
    console.log(`  Security alerts: ${repoDetails.securityAlerts.open}/${repoDetails.securityAlerts.total}`);
    console.log(`  Workflows: ${repoDetails.workflows.successful}/${repoDetails.workflows.total} successful`);
    console.log();

    // Example 3: Using OpenAI configuration
    console.log('📊 Configuring OpenAI agent...');
    const openaiAgent = new PeriodicReportAgent({
      provider: 'openai',
      model: 'gpt-4'
    });
    
    console.log('✅ OpenAI agent configured successfully with GitHub MCP tools');
    console.log();

    // Example 4: Show what a generated report structure would look like with GitHub data
    console.log('📄 Example report structure with GitHub analysis:');
    const exampleReport = {
      title: 'Weekly Infrastructure & Development Report - January 2024',
      summary: 'Infrastructure is stable with active development across 2 repositories, 3 projects, and 2 Kubernetes clusters.',
      projectsAnalysis: {
        totalProjects: 3,
        activeEnvironments: 7,
        inactiveEnvironments: 1,
        insights: [
          'All production environments are running smoothly',
          'One inactive report-generator environment identified',
          'Preview environments are well-utilized across projects'
        ]
      },
      clustersAnalysis: {
        totalClusters: 2,
        insights: [
          'Both clusters are healthy and responding',
          'Resource utilization is within normal parameters',
          'Network connectivity is stable'
        ]
      },
      githubAnalysis: { // NEW: GitHub analysis section
        repositoriesCount: 2,
        totalIssues: 15,
        openIssues: 8,
        totalPullRequests: 12,
        openPullRequests: 3,
        recentCommits: 25,
        codeQualityAlerts: 2,
        securityAlerts: 1,
        workflowRuns: 45,
        insights: [
          'Development velocity is high with 25 commits this week',
          '8 open issues require attention across repositories',
          '3 pull requests pending review',
          '2 code quality alerts need resolution',
          '1 security alert requires immediate attention',
          'CI/CD pipelines are running successfully (45 recent runs)'
        ]
      },
      recommendations: [
        'Address the open security alert in main-app repository',
        'Review and merge pending pull requests to maintain development flow',
        'Consider reactivating the inactive report-generator environment',
        'Review and optimize resource allocation in staging cluster',
        'Schedule security updates for next maintenance window'
      ],
      nextSteps: [
        'Prioritize security alert resolution',
        'Conduct code review session for pending PRs',
        'Monitor cluster performance metrics',
        'Review environment configurations',
        'Plan capacity scaling for Q2 growth'
      ]
    };

    console.log(JSON.stringify(exampleReport, null, 2));
    console.log();

    console.log('✨ Periodic Report Agent with GitHub MCP demonstration completed!');
    console.log('📝 To use with real AI providers and GitHub data, set up:');
    console.log('   - ANTHROPIC_API_KEY for Anthropic Claude');
    console.log('   - OPENAI_API_KEY for OpenAI GPT models');
    console.log('   - Configure actual repositories in fetchGitHubData()');
    console.log('   - Replace mock GitHub implementations with real MCP server calls');

  } catch (error) {
    console.error('❌ Error during report generation:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

export default main;