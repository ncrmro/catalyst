# Catalyst Agents

This directory contains AI-powered agents for the Catalyst platform. These agents use the AI SDK to provide intelligent analysis and automation capabilities.

## Available Agents

### PeriodicReportAgent

The PeriodicReportAgent generates comprehensive periodic reports about the current state of projects and Kubernetes clusters managed by the Catalyst platform.

#### Features

- **Data Integration**: Automatically fetches current projects and clusters data
- **AI Analysis**: Uses AI to analyze infrastructure state and generate insights
- **Provider Support**: Works with both Anthropic Claude and OpenAI GPT models
- **Structured Output**: Returns well-structured reports with specific sections
- **Error Handling**: Robust error handling for data fetching and AI interactions

#### Basic Usage

```typescript
import { PeriodicReportAgent, generatePeriodicReport } from '@/agents';

// Using the convenience function
const report = await generatePeriodicReport();

// Using the agent class with custom options
const agent = new PeriodicReportAgent({
  provider: 'anthropic', // or 'openai'
  model: 'claude-3-sonnet-20240229' // or 'gpt-4'
});

const report = await agent.generateReport();
```

#### Configuration

The agent requires API keys for the AI providers:

- **Anthropic**: Set `ANTHROPIC_API_KEY` environment variable
- **OpenAI**: Set `OPENAI_API_KEY` environment variable

#### Report Structure

Generated reports include the following sections:

```typescript
interface Report {
  title: string;
  summary: string;
  projectsAnalysis: {
    totalProjects: number;
    activeEnvironments: number;
    inactiveEnvironments: number;
    insights: string[];
  };
  clustersAnalysis: {
    totalClusters: number;
    insights: string[];
  };
  recommendations: string[];
  nextSteps: string[];
}
```

#### Tools/Methods

The agent provides the following tools for data fetching:

- `fetchProjects()`: Retrieves current projects data including repositories and environments
- `fetchClusters()`: Retrieves current Kubernetes clusters information

#### Example

See `example.ts` for a complete demonstration of how to use the PeriodicReportAgent.

```bash
# Run the example (requires TypeScript execution)
npx tsx src/agents/example.ts
```

## Development

### Adding New Agents

1. Create a new TypeScript file in this directory
2. Follow the existing patterns for AI SDK integration
3. Export your agent class and convenience functions
4. Add appropriate tests in `__tests__/agents/`
5. Update this README with documentation

### Testing

All agents should have comprehensive test coverage. Tests are located in `__tests__/agents/`.

```bash
# Run agent tests
npm test -- __tests__/agents/

# Run specific agent tests
npm test -- __tests__/agents/periodic-report.test.ts
```

### Best Practices

- Always provide error handling for AI API calls
- Mock AI SDK calls in tests to avoid requiring API keys
- Use TypeScript interfaces for structured outputs
- Follow the existing naming conventions
- Document system prompts and expected behaviors
- Provide usage examples and clear documentation

## Environment Variables

Make sure to set the following environment variables for AI providers:

```bash
# For Anthropic Claude
ANTHROPIC_API_KEY=your_anthropic_api_key

# For OpenAI GPT
OPENAI_API_KEY=your_openai_api_key
```

## Dependencies

The agents rely on the following key dependencies:

- `ai`: AI SDK core library
- `@ai-sdk/anthropic`: Anthropic provider for AI SDK
- `@ai-sdk/openai`: OpenAI provider for AI SDK
- `zod`: Schema validation for structured outputs

These dependencies are automatically installed when running `npm install` in the web directory.