# Periodic Report Agent Testing Script

This TypeScript script allows you to test the periodic report agent with different AI models and configurations using YAML configuration files.

## Features

- Test multiple AI models (OpenAI and Anthropic) in a single run
- Support for mock mode to avoid API costs during testing
- Multiple output formats (detailed, table, JSON)
- Comprehensive error handling and validation
- Execution timing and metadata collection

## Usage

You can run the script using either the npm script or npx directly:

```bash
# Using npm script (recommended)
npm run test:agent <config-file.yaml>

# Using npx directly
npx tsx scripts/test-periodic-agent.ts <config-file.yaml>
```

### Examples

```bash
# Quick test with mock data (no API costs)
npm run test:agent config/quick-test.yaml

# Full comprehensive test (no API costs)
npm run test:agent config/agent-test-config.yaml

# Table format output
npm run test:agent config/table-test.yaml

# JSON format output
npm run test:agent config/json-test.yaml

# Real API test (WARNING: Costs money!)
npm run test:agent config/real-api-test.yaml
```

## Configuration File Format

The configuration file is a YAML file with the following structure:

```yaml
# List of model configurations to test
models:
  - name: "Human readable name"
    provider: "openai" | "anthropic"
    model: "model-identifier"
    enableGitHubMCP: true | false

# Mock data configuration
mockData:
  useRealData: true | false        # Use real database data vs mock
  skipApiCalls: true | false       # Skip AI API calls to save costs

# Output formatting
output:
  format: "detailed" | "table" | "json"  # Output format
  includeReports: true | false           # Include full report content
  includeTimings: true | false           # Include execution times
```

### Model Configurations

#### OpenAI Models
- `gpt-4` - Most capable, expensive
- `gpt-4-turbo-preview` - Fast and capable
- `gpt-3.5-turbo` - Fast and cheap

#### Anthropic Models  
- `claude-3-opus-20240229` - Most capable, expensive
- `claude-3-sonnet-20240229` - Balanced performance/cost
- `claude-3-haiku-20240307` - Fast and cheap

### Mock Data Options

- **useRealData**: Whether to fetch real data from the database or use mock data
- **skipApiCalls**: Whether to skip actual AI API calls
  - `true` (recommended): Tests agent setup and data fetching without AI calls
  - `false`: Generates real reports (costs API credits!)

### Output Formats

- **detailed**: Full information with summaries and metadata
- **table**: Compact tabular format
- **json**: Machine-readable JSON output

## Example Configurations

### Quick Test (Safe, No Costs)
```yaml
models:
  - name: "OpenAI GPT-4"
    provider: "openai"
    model: "gpt-4"
    enableGitHubMCP: false

mockData:
  skipApiCalls: true  # No API costs

output:
  format: "detailed"
```

### Comprehensive Test (Safe, No Costs)
```yaml
models:
  - name: "OpenAI GPT-4"
    provider: "openai"
    model: "gpt-4"
    enableGitHubMCP: false
  - name: "Claude 3 Sonnet"
    provider: "anthropic"
    model: "claude-3-sonnet-20240229"
    enableGitHubMCP: true

mockData:
  skipApiCalls: true

output:
  format: "table"
```

### Real API Test (WARNING: Costs Money!)
```yaml
models:
  - name: "Claude 3 Haiku"
    provider: "anthropic"
    model: "claude-3-haiku-20240307"
    enableGitHubMCP: false

mockData:
  skipApiCalls: false  # Will make real API calls!

output:
  format: "detailed"
  includeReports: true
```

## Output Information

The script provides the following information for each model test:

- **Success/Failure**: Whether the agent configuration worked
- **Execution Time**: How long the test took to run
- **Data Access Status**: 
  - Projects (P): Whether project data was fetched successfully
  - Clusters (C): Whether cluster data was fetched successfully  
  - GitHub Tools (G): Whether GitHub MCP tools are available
- **Report Content**: Full report when `skipApiCalls: false` and `includeReports: true`

## Prerequisites

- API keys configured in environment variables:
  - `OPENAI_API_KEY` for OpenAI models
  - `ANTHROPIC_API_KEY` for Anthropic models
- Database access for real data fetching
- Kubernetes cluster access for cluster data

## Safety Notes

- Always start with `skipApiCalls: true` to test configurations safely
- Only set `skipApiCalls: false` when you want to generate real reports and are prepared for API costs
- Use cheaper models (GPT-3.5-turbo, Claude Haiku) first when testing with real API calls
- Monitor your API usage and costs when running with `skipApiCalls: false`

## Error Handling

The script provides helpful error messages for:
- Missing configuration files
- Invalid YAML syntax
- Configuration validation errors
- Runtime errors during agent execution

All errors include specific details about what went wrong and how to fix it.