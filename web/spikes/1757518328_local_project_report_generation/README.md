# Local Project Report Generation Spike

## Overview
This spike explores a simple CLI-only workflow for validating project report generation functionality. It fetches current GitHub issues and pull requests, stores them in a non-committed YAML file, and uses this data to iterate on the project report generation agent functionality.

## Problem Statement
We need a quick way to validate and iterate on project report generation without relying on the full web application infrastructure. This allows for rapid testing and development of the report generation logic.

## Solution Approach
The simplest solution involves:
1. A project configuration file defining projects and their repositories
2. A fetch script that generates fake GitHub data for testing
3. A generate script that reads the data and produces AI-generated project reports

## Implementation

### 1. Project Configuration (`projects.yml` / `projects.template.yml`)
- `projects.template.yml` - Clean template showing expected structure
- `projects.yml` - Working file that gets populated with fake data
- Contains project definitions with associated repositories

Structure:
```yaml
projects:
  catalyst:
    repos:
      - ncrmro/catalyst
    issues: []
    pullRequests: []
  meze:
    repos:
      - ncrmro/meze
    issues: []
    pullRequests: []
```

### 2. Fetch Script (`fetch-github-data.ts`)
- Reads `projects.yml` configuration
- Generates realistic fake GitHub issues and pull requests
- Updates the YAML file with generated data under each project

### 3. Generate Script (`generate-report.ts`)
- Reads the populated `projects.yml` data
- Uses AI (OpenAI GPT-4o-mini) to generate comprehensive project reports
- Outputs both console logs and markdown files per project

## Usage

```bash
# Navigate to spike directory
cd web/spikes/1757518328_local_project_report_generation

# Generate fake GitHub data and populate projects.yml
make fetch

# Generate AI-powered project reports from the data
make generate

# Run both commands in sequence
make report

# Reset projects.yml to clean template
make reset
```

## Getting Started

1. **First time setup**: Copy the template to start fresh
   ```bash
   cp projects.template.yml projects.yml
   ```

2. **Customize projects**: Edit `projects.yml` to add your own projects and repositories

3. **Generate data and reports**: Run `make report` to see the complete workflow

## Key Benefits
1. **Simplicity**: Minimal setup required, uses existing code
2. **Isolation**: Can test report generation without full app context
3. **Iteration Speed**: Quick feedback loop for testing different report formats
4. **Data Persistence**: Can save interesting datasets for regression testing

## Dependencies
- Uses existing web app dependencies (Octokit, AI SDK, etc.)
- No new dependencies required

## Files
- `projects.template.yml` - Clean template showing expected project structure
- `projects.yml` - Working configuration file that gets populated with fake data
- `fetch-github-data.ts` - Generates fake GitHub issues and pull requests
- `generate-report.ts` - Creates AI-generated project reports from data
- `Makefile` - Simple commands for running the spike workflow
- `README.md` - This documentation file

## Findings
(To be updated after implementation and testing)

## Next Steps
1. Extend to include more GitHub data (commits, releases, etc.)
2. Add different report templates/formats
3. Consider integration back into main application
4. Explore caching strategies for production use