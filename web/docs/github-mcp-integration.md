# GitHub MCP Integration

This document describes the GitHub MCP (Model Context Protocol) integration added to the Catalyst periodic report agent.

## Overview

The periodic report agent now supports GitHub MCP server integration, which provides access to GitHub tools for enhanced repository analysis, issue tracking, pull request management, and other GitHub-related functionality.

## Authentication

The GitHub MCP integration supports two authentication methods:

### 1. Session-Based Authentication (Recommended)

When users authenticate with GitHub OAuth, their access token is automatically used for GitHub MCP requests. This provides personalized access to repositories and GitHub data.

```typescript
// Session token is automatically used when available
const agent = new PeriodicReportAgent({
  provider: 'anthropic',
  accessToken: session.accessToken, // From user's GitHub OAuth session
});
```

### 2. API Key Authentication (Fallback)

For cases where session authentication is not available, you can provide a static API key:

```bash
GITHUB_MCP_API_KEY=your_github_mcp_api_key_here
```

## Configuration

### Usage

#### Session-Based Usage (Recommended)

```typescript
import { PeriodicReportAgent } from '@/agents/periodic-report';
import { auth } from '@/auth';

// In a server action or API route
const session = await auth();
const agent = new PeriodicReportAgent({
  provider: 'anthropic',
  enableGitHubMCP: true, // This is the default
  accessToken: session?.accessToken, // Uses current user's GitHub token
});

// Generate report with personalized GitHub access
const report = await agent.generateReport();
```

#### Disable GitHub MCP

```typescript
const agent = new PeriodicReportAgent({
  provider: 'anthropic',
  enableGitHubMCP: false,
});
```

#### Custom API Key (Fallback)

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

- **Session-Based Authentication**: Uses current user's GitHub OAuth token for personalized access
- **Graceful Fallback**: If GitHub MCP is unavailable or authentication fails, the agent continues normal operation
- **Tool Integration**: GitHub tools are made available to enhance report generation
- **Configurable**: Can be enabled/disabled per agent instance
- **Error Handling**: Comprehensive error handling with helpful logging
- **Backward Compatibility**: Still supports API key authentication as fallback

## GitHub MCP Server Configuration

The client connects to the GitHub Copilot MCP server at:
```
https://api.githubcopilot.com/mcp/
```

Using Server-Sent Events (SSE) transport with Bearer token authentication (either session access token or API key).

## Implementation Details

### Authentication Flow

1. **Session Token Priority**: If a user is authenticated with GitHub OAuth, their access token is used
2. **API Key Fallback**: If no session token is available, falls back to `GITHUB_MCP_API_KEY` environment variable
3. **No Authentication**: If neither is available, GitHub MCP is disabled with graceful fallback

### Files Modified

- `src/auth.ts` - Extended Session interface to include `accessToken`
- `src/lib/mcp-clients.ts` - GitHub MCP client implementation with session support
- `src/agents/periodic-report.ts` - Enhanced with GitHub MCP integration
- `src/actions/periodic-reports.ts` - Updated to use session authentication
- `src/agents/example.ts` - Updated example with MCP demonstration

### Key Classes

- `GitHubMCPClient` - Main MCP client class with session token support
- `PeriodicReportAgent` - Enhanced report agent with MCP support

### Error Handling

The integration includes comprehensive error handling:
- Network connectivity issues
- Authentication failures
- Invalid API keys or session tokens
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

1. **401 Unauthorized**: 
   - For session authentication: Ensure user is logged in with GitHub OAuth
   - For API key authentication: Check your `GITHUB_MCP_API_KEY` environment variable
2. **Network Errors**: Verify connectivity to `api.githubcopilot.com`
3. **Tool Unavailable**: The agent will continue without GitHub tools - check logs for details
4. **Session Token Missing**: User may need to re-authenticate with GitHub

### Debug Mode

Enable debug logging by checking the console output for GitHub MCP-related messages:
- Initialization success/failure
- Tool availability
- Error details