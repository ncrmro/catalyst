/**
 * Test script to verify GitHub MCP integration
 * This script demonstrates how to use the PeriodicReportAgent with GitHub MCP tools
 */

import { PeriodicReportAgent } from '../src/agents/periodic-report';

async function testGitHubMCPIntegration() {
  console.log('🤖 Testing GitHub MCP Integration...\n');

  // Test 1: Create agent with GitHub MCP enabled (default)
  console.log('📊 Creating agent with GitHub MCP enabled...');
  const agentWithMCP = new PeriodicReportAgent({
    provider: 'anthropic',
    enableGitHubMCP: true,
  });

  // Test 2: Check GitHub tools availability
  console.log('🔧 Checking GitHub MCP tools availability...');
  const toolsResult = await agentWithMCP.getGitHubTools();
  console.log('✅ GitHub tools result:', {
    success: toolsResult.success,
    available: toolsResult.available,
    toolsCount: toolsResult.success ? Object.keys(toolsResult.data).length : 0,
    error: toolsResult.error || 'None'
  });

  // Test 3: Create agent with GitHub MCP disabled
  console.log('\n📊 Creating agent with GitHub MCP disabled...');
  const agentWithoutMCP = new PeriodicReportAgent({
    provider: 'anthropic',
    enableGitHubMCP: false,
  });

  const disabledToolsResult = await agentWithoutMCP.getGitHubTools();
  console.log('❌ Disabled GitHub tools result:', {
    success: disabledToolsResult.success,
    error: disabledToolsResult.error || 'None'
  });

  // Test 4: Verify data fetching still works
  console.log('\n📋 Testing data fetching capabilities...');
  const projectsResult = await agentWithMCP.fetchProjects();
  const clustersResult = await agentWithMCP.fetchClusters();
  
  console.log('📁 Projects data:', {
    success: projectsResult.success,
    count: projectsResult.data?.total_count || 0
  });
  
  console.log('🏗️  Clusters data:', {
    success: clustersResult.success,
    count: clustersResult.data?.length || 0
  });

  console.log('\n✅ GitHub MCP integration test completed!');
}

// Only run if this file is executed directly
if (require.main === module) {
  testGitHubMCPIntegration().catch(console.error);
}

export default testGitHubMCPIntegration;