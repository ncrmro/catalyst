# Configuration Files for Periodic Agent Testing

This directory contains various YAML configuration files for testing the periodic report agent with different models and settings.

## Available Configurations

### `quick-test.yaml`
- **Purpose**: Fast test with 2 models
- **API Calls**: Disabled (no cost)
- **Models**: OpenAI GPT-4, Claude 3 Sonnet
- **Output**: Detailed format
- **Best for**: Quick validation that the script works

### `agent-test-config.yaml` 
- **Purpose**: Comprehensive test with 6 different models
- **API Calls**: Disabled (no cost)
- **Models**: GPT-4 Turbo, GPT-4, GPT-3.5, Claude Opus, Claude Sonnet, Claude Haiku
- **Output**: Detailed format with full reports
- **Best for**: Complete evaluation of different model configurations

### `table-test.yaml`
- **Purpose**: Demonstrate table output format
- **API Calls**: Disabled (no cost)
- **Models**: 3 different models
- **Output**: Table format
- **Best for**: Compact comparison view

### `json-test.yaml`
- **Purpose**: Demonstrate JSON output format
- **API Calls**: Disabled (no cost)
- **Models**: 1 model (quick)
- **Output**: JSON format
- **Best for**: Machine-readable output for automation

### `real-api-test.yaml`
- **Purpose**: ⚠️ **REAL API CALLS** - generates actual reports
- **API Calls**: Enabled (⚠️ **COSTS MONEY!**)
- **Models**: Claude Haiku, GPT-3.5 (cheaper models)
- **Output**: Detailed with full report content
- **Best for**: Testing real report generation (use with caution!)

## Usage Examples

```bash
# Safe tests (no API costs)
npm run test:agent config/quick-test.yaml
npm run test:agent config/agent-test-config.yaml
npm run test:agent config/table-test.yaml
npm run test:agent config/json-test.yaml

# Real API test (costs money!)
npm run test:agent config/real-api-test.yaml
```

## Creating Custom Configurations

Copy any of these files and modify the models, settings, or output format as needed. See the [main documentation](../docs/periodic-agent-testing.md) for full configuration options.