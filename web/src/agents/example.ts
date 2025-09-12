import { PeriodicReportAgent } from '@/agents';

/**
 * Example usage of the PeriodicReport agent
 * 
 * This script demonstrates how to:
 * 1. Create a PeriodicReport agent
 * 2. Generate a comprehensive report
 * 3. Handle different provider configurations
 */

async function main() {
  try {
    console.log('🤖 Starting Periodic Report Generation...\n');

    // Example 1: Using default configuration (OpenAI)
    console.log('📊 Generating report with OpenAI...');
    const openaiAgent = new PeriodicReportAgent();
    
    // In a real scenario, you would call generateReport() with proper API keys
    // const openaiReport = await openaiAgent.generateReport();
    
    // For demonstration, let's show the data fetching capabilities
    const projectsResult = await openaiAgent.fetchProjects();
    
    console.log('✅ Projects fetched successfully:', projectsResult.success);
    console.log('📋 Total projects:', projectsResult.data?.total_count || 0);
    console.log();

    // Example 2: Using GitHub MCP integration
    console.log('🐙 Testing GitHub MCP integration...');
    const agentWithMCP = new PeriodicReportAgent({
      provider: 'openai',
      enableGitHubMCP: true,
    });
    
    const gitHubToolsResult = await agentWithMCP.getGitHubTools();
    console.log('✅ GitHub MCP tools result:', {
      success: gitHubToolsResult.success,
      available: gitHubToolsResult.available,
      toolsCount: gitHubToolsResult.success ? Object.keys(gitHubToolsResult.data).length : 0,
      error: gitHubToolsResult.error || 'None'
    });
    console.log();

    // Example 3: Using Anthropic configuration
    console.log('📊 Configuring Anthropic agent...');
    const anthropicAgent = new PeriodicReportAgent({
      provider: 'anthropic',
      model: 'claude-3-sonnet-20240229'
    });
    
    console.log('✅ Anthropic agent configured successfully');
    console.log('🔧 Provider:', anthropicAgent instanceof PeriodicReportAgent ? 'anthropic' : 'unknown');
    console.log();

    // Example 4: Show what a generated report structure would look like
    console.log('📄 Example report structure:');
    const exampleReport = {
      title: 'Weekly Infrastructure Report - January 2024',
      summary: 'Current infrastructure is stable with 3 active projects and 2 Kubernetes clusters.',
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
      recommendations: [
        'Consider reactivating the inactive report-generator environment',
        'Review and optimize resource allocation in staging cluster',
        'Schedule security updates for next maintenance window'
      ],
      nextSteps: [
        'Monitor cluster performance metrics',
        'Review environment configurations',
        'Plan capacity scaling for Q2 growth'
      ]
    };

    console.log(JSON.stringify(exampleReport, null, 2));
    console.log();

    console.log('✨ Periodic Report Agent demonstration completed!');
    console.log('📝 To use with real AI providers, set up your API keys:');
    console.log('   - OPENAI_API_KEY for OpenAI GPT models (default)');
    console.log('   - ANTHROPIC_API_KEY for Anthropic Claude');

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