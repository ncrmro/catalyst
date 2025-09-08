#!/usr/bin/env tsx

import { readFileSync } from 'fs';
import { join } from 'path';
import { load as yamlLoad } from 'js-yaml';
import { z } from 'zod';
import { PeriodicReportAgent } from '../src/agents/periodic-report.js';

// Schema for the YAML configuration file
const modelConfigSchema = z.object({
  name: z.string().describe('Human-readable name for this model configuration'),
  provider: z.enum(['anthropic', 'openai']).describe('AI provider to use'),
  model: z.string().describe('Model identifier'),
  enableGitHubMCP: z.boolean().default(false).describe('Whether to enable GitHub MCP integration'),
});

const configSchema = z.object({
  models: z.array(modelConfigSchema).min(1).describe('List of model configurations to test'),
  mockData: z.object({
    useRealData: z.boolean().default(false).describe('Whether to use real data or mock data'),
    skipApiCalls: z.boolean().default(true).describe('Whether to skip actual API calls to save costs'),
  }).default({}),
  output: z.object({
    format: z.enum(['json', 'table', 'detailed']).default('detailed').describe('Output format'),
    includeReports: z.boolean().default(true).describe('Whether to include full report content in output'),
    includeTimings: z.boolean().default(true).describe('Whether to include execution timing information'),
  }).default({}),
});

type Config = z.infer<typeof configSchema>;
type ModelConfig = z.infer<typeof modelConfigSchema>;

interface TestResult {
  modelConfig: ModelConfig;
  success: boolean;
  error?: string;
  executionTime?: number;
  report?: any;
  agentMetadata?: {
    projectsFetched: boolean;
    clustersFetched: boolean;
    gitHubToolsAvailable: boolean;
  };
}

class PeriodicAgentTester {
  private config: Config;
  private results: TestResult[] = [];

  constructor(config: Config) {
    this.config = config;
  }

  async runTests(): Promise<TestResult[]> {
    console.log(`🧪 Starting periodic agent tests with ${this.config.models.length} model configurations\n`);

    for (const modelConfig of this.config.models) {
      console.log(`🤖 Testing: ${modelConfig.name} (${modelConfig.provider}/${modelConfig.model})`);
      
      const result = await this.testModelConfiguration(modelConfig);
      this.results.push(result);
      
      if (result.success) {
        console.log(`   ✅ Success (${result.executionTime}ms)`);
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
      
      console.log(); // Add spacing between tests
    }

    return this.results;
  }

  private async testModelConfiguration(modelConfig: ModelConfig): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Create agent instance
      const agent = new PeriodicReportAgent({
        provider: modelConfig.provider,
        model: modelConfig.model,
        enableGitHubMCP: modelConfig.enableGitHubMCP,
      });

      // Test basic functionality without making API calls if skipApiCalls is true
      let report;
      let agentMetadata;

      if (this.config.mockData.skipApiCalls) {
        // Test agent setup and data fetching capabilities without generating actual reports
        const projectsResult = await agent.fetchProjects();
        const clustersResult = await agent.fetchClusters();
        const gitHubToolsResult = await agent.getGitHubTools();

        agentMetadata = {
          projectsFetched: projectsResult.success,
          clustersFetched: clustersResult.success,
          gitHubToolsAvailable: gitHubToolsResult.success && gitHubToolsResult.available,
        };

        // Create a mock report structure to test the agent configuration
        report = {
          title: `Mock Report - ${modelConfig.name}`,
          summary: 'This is a mock report generated for testing purposes',
          projectsAnalysis: {
            totalProjects: projectsResult.data?.total_count || 0,
            activeEnvironments: 0,
            inactiveEnvironments: 0,
            insights: ['Mock insight: Agent configured successfully']
          },
          clustersAnalysis: {
            totalClusters: clustersResult.data?.length || 0,
            insights: ['Mock insight: Data fetching capabilities verified']
          },
          recommendations: ['Mock recommendation: Configuration is working'],
          nextSteps: ['Mock step: Ready for real usage']
        };
      } else {
        // Generate actual report (costs API credits)
        console.log(`   🔥 Generating real report (this will cost API credits)`);
        report = await agent.generateReport();
        
        // Still gather metadata
        const projectsResult = await agent.fetchProjects();
        const clustersResult = await agent.fetchClusters();
        const gitHubToolsResult = await agent.getGitHubTools();

        agentMetadata = {
          projectsFetched: projectsResult.success,
          clustersFetched: clustersResult.success,
          gitHubToolsAvailable: gitHubToolsResult.success && gitHubToolsResult.available,
        };
      }

      const executionTime = Date.now() - startTime;

      return {
        modelConfig,
        success: true,
        executionTime,
        report: this.config.output.includeReports ? report : undefined,
        agentMetadata,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        modelConfig,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime,
      };
    }
  }

  formatResults(): string {
    const { format } = this.config.output;

    switch (format) {
      case 'json':
        return JSON.stringify(this.results, null, 2);
      
      case 'table':
        return this.formatAsTable();
      
      case 'detailed':
      default:
        return this.formatDetailed();
    }
  }

  private formatAsTable(): string {
    const headers = ['Model', 'Provider', 'Status', 'Time (ms)', 'Data Access'];
    const rows = this.results.map(result => [
      result.modelConfig.name,
      `${result.modelConfig.provider}/${result.modelConfig.model}`,
      result.success ? '✅ Success' : '❌ Failed',
      result.executionTime?.toString() || 'N/A',
      result.agentMetadata ? 
        `P:${result.agentMetadata.projectsFetched ? '✓' : '✗'} C:${result.agentMetadata.clustersFetched ? '✓' : '✗'} G:${result.agentMetadata.gitHubToolsAvailable ? '✓' : '✗'}` : 
        'N/A'
    ]);

    // Simple table formatting
    const columnWidths = headers.map((header, i) => 
      Math.max(header.length, ...rows.map(row => row[i].length))
    );

    const separator = columnWidths.map(width => '-'.repeat(width)).join(' | ');
    const headerRow = headers.map((header, i) => header.padEnd(columnWidths[i])).join(' | ');
    const dataRows = rows.map(row => 
      row.map((cell, i) => cell.padEnd(columnWidths[i])).join(' | ')
    );

    return [headerRow, separator, ...dataRows].join('\n');
  }

  private formatDetailed(): string {
    const summary = this.generateSummary();
    const details = this.results.map((result, index) => {
      let output = `\n📊 Test ${index + 1}: ${result.modelConfig.name}\n`;
      output += `   Provider: ${result.modelConfig.provider}\n`;
      output += `   Model: ${result.modelConfig.model}\n`;
      output += `   GitHub MCP: ${result.modelConfig.enableGitHubMCP ? 'Enabled' : 'Disabled'}\n`;
      output += `   Status: ${result.success ? '✅ Success' : '❌ Failed'}\n`;
      
      if (result.executionTime) {
        output += `   Execution Time: ${result.executionTime}ms\n`;
      }

      if (result.agentMetadata) {
        output += `   Data Access:\n`;
        output += `     Projects: ${result.agentMetadata.projectsFetched ? '✅' : '❌'}\n`;
        output += `     Clusters: ${result.agentMetadata.clustersFetched ? '✅' : '❌'}\n`;
        output += `     GitHub Tools: ${result.agentMetadata.gitHubToolsAvailable ? '✅' : '❌'}\n`;
      }

      if (result.error) {
        output += `   Error: ${result.error}\n`;
      }

      if (result.report && this.config.output.includeReports) {
        output += `   Report Summary:\n`;
        output += `     Title: ${result.report.title}\n`;
        output += `     Projects: ${result.report.projectsAnalysis?.totalProjects || 0}\n`;
        output += `     Clusters: ${result.report.clustersAnalysis?.totalClusters || 0}\n`;
        output += `     Recommendations: ${result.report.recommendations?.length || 0}\n`;
      }

      return output;
    });

    return summary + details.join('\n');
  }

  private generateSummary(): string {
    const total = this.results.length;
    const successful = this.results.filter(r => r.success).length;
    const failed = total - successful;
    const avgTime = this.config.output.includeTimings ? 
      Math.round(this.results.reduce((sum, r) => sum + (r.executionTime || 0), 0) / total) : 
      null;

    let summary = `\n🎯 Test Summary\n`;
    summary += `   Total Tests: ${total}\n`;
    summary += `   Successful: ${successful} ✅\n`;
    summary += `   Failed: ${failed} ${failed > 0 ? '❌' : ''}\n`;
    if (avgTime !== null) {
      summary += `   Average Execution Time: ${avgTime}ms\n`;
    }
    summary += `   Success Rate: ${Math.round((successful / total) * 100)}%\n`;
    
    return summary;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: tsx scripts/test-periodic-agent.ts <config-file.yaml>');
    console.error('\nExample:');
    console.error('  tsx scripts/test-periodic-agent.ts config/agent-test-config.yaml');
    process.exit(1);
  }

  const configPath = args[0];
  
  try {
    // Load and parse YAML configuration
    const configFile = readFileSync(configPath, 'utf8');
    const rawConfig = yamlLoad(configFile);
    
    // Validate configuration
    const config = configSchema.parse(rawConfig);
    
    console.log(`📋 Loaded configuration from: ${configPath}`);
    console.log(`🔧 Config: ${config.models.length} models, output format: ${config.output.format}`);
    
    if (config.mockData.skipApiCalls) {
      console.log(`⚠️  API calls disabled - using mock mode to save costs`);
    } else {
      console.log(`🔥 API calls enabled - this will consume API credits!`);
    }
    
    // Run tests
    const tester = new PeriodicAgentTester(config);
    await tester.runTests();
    
    // Output results
    console.log('\n' + '='.repeat(60));
    console.log(tester.formatResults());
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:');
      console.error(error.errors.map(e => `  - ${e.path.join('.')}: ${e.message}`).join('\n'));
    } else {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    }
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { PeriodicAgentTester, configSchema, modelConfigSchema };