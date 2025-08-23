# GitHub MCP Integration

This document describes the GitHub MCP (Model Context Protocol) integration added to the Catalyst periodic report agent.

## Overview

The periodic report agent now supports GitHub MCP server integration, which provides access to GitHub tools for enhanced repository analysis, issue tracking, pull request management, and other GitHub-related functionality.

## Configuration

### Environment Variables

Add the following environment variable to enable GitHub MCP authentication:

```bash
GITHUB_MCP_API_KEY=your_github_mcp_api_key_here
```

### Usage

#### Basic Usage with MCP Enabled (Default)

```typescript
import { PeriodicReportAgent } from '@/agents/periodic-report';

const agent = new PeriodicReportAgent({
  provider: 'anthropic',
  enableGitHubMCP: true, // This is the default
});

// Generate report with GitHub MCP integration
const report = await agent.generateReport();
```

#### Disable GitHub MCP

```typescript
const agent = new PeriodicReportAgent({
  provider: 'anthropic',
  enableGitHubMCP: false,
});
```

#### Custom API Key

```typescript
const agent = new PeriodicReportAgent({
  provider: 'anthropic',
  enableGitHubMCP: true,
  gitHubMCPApiKey: 'your-custom-api-key',
});
```

#### Check GitHub Tools Availability

```typescript
const toolsResult = await agent.getGitHubTools();
console.log('GitHub MCP available:', toolsResult.available);
console.log('Tools count:', Object.keys(toolsResult.data).length);
```

## Features

- **Graceful Fallback**: If GitHub MCP is unavailable or authentication fails, the agent continues normal operation
- **Tool Integration**: GitHub tools are made available to enhance report generation
- **Configurable**: Can be enabled/disabled per agent instance
- **Error Handling**: Comprehensive error handling with helpful logging

## GitHub MCP Server Configuration

The client connects to the GitHub Copilot MCP server at:
```
https://api.githubcopilot.com/mcp/
```

Using Server-Sent Events (SSE) transport with optional authentication headers.

## Implementation Details

### Files Modified

- `src/lib/mcp-clients.ts` - GitHub MCP client implementation
- `src/agents/periodic-report.ts` - Enhanced with GitHub MCP integration
- `src/agents/example.ts` - Updated example with MCP demonstration

### Key Classes

- `GitHubMCPClient` - Main MCP client class
- `PeriodicReportAgent` - Enhanced report agent with MCP support

### Error Handling

The integration includes comprehensive error handling:
- Network connectivity issues
- Authentication failures
- Invalid API keys
- Tool availability checks

All errors are logged as warnings and don't interrupt normal operation.

## Testing

Run the integration test:

```bash
npx tsx __tests__/github-mcp-integration.test.ts
```

Run the example:

```bash
npx tsx src/agents/example.ts
```

## Production Configuration

For production use, ensure you have:

1. Valid GitHub MCP API key set in environment variables
2. Appropriate network access to `api.githubcopilot.com`
3. Proper error monitoring for MCP connection issues

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check your `GITHUB_MCP_API_KEY` environment variable
2. **Network Errors**: Verify connectivity to `api.githubcopilot.com`
3. **Tool Unavailable**: The agent will continue without GitHub tools - check logs for details

### Debug Mode

Enable debug logging by checking the console output for GitHub MCP-related messages:
- Initialization success/failure
- Tool availability
- Error details