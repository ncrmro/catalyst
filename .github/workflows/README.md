# GitHub Workflows

This directory contains GitHub Actions workflows for the Catalyst project.

## Validation Workflow

The `validate.yml` workflow is the main entry point for CI validation on pull requests.

### How It Works

1. **Change Detection**: Uses `tj-actions/changed-files@v47` to detect which files have changed
2. **Conditional Execution**: Only runs tests for components that have been modified
3. **Workflow Call**: Delegates to existing test workflows using `workflow_call` trigger
4. **Smart Summary**: Allows CI checks to pass even when specific tests are skipped

### Components Tracked

- **Operator**: `operator/**`, operator workflow files
- **Web**: `web/**`, web test workflow files  
- **Charts**: `charts/**`, chart test workflow files
- **Dockerfiles**: `dockerfiles/**`, dockerfile workflow files
- **Boilerplates**: `boilerplate/**`, boilerplate test workflow files

### Adding New Test Workflows

To add a new component to the validation workflow:

1. Add `workflow_call:` trigger to your test workflow:
   ```yaml
   on:
     pull_request:
       paths:
         - 'your-component/**'
     workflow_call:
   ```

2. Update `validate.yml`:
   - Add file patterns in the `detect-changes` job
   - Add a new job that conditionally calls your workflow
   - Add the job to the `validate-summary` needs list

### Benefits

- ✅ **Faster CI**: Only runs relevant tests for changed components
- ✅ **Clean PR Checks**: No failures for unchanged components  
- ✅ **Easy to Extend**: Simple pattern to add new test workflows
- ✅ **Backward Compatible**: Individual workflows still work independently

## Individual Workflows

All test workflows can still be triggered independently via:
- Pull requests (when their specific paths change)
- Manual dispatch (`workflow_dispatch`)
- Called from other workflows (`workflow_call`)

### Test Workflows

- `operator.yml` - Operator unit tests and linting
- `test.operator.integration.yml` - Operator integration tests with Kind cluster
- `web.test.yml` - Web application tests (unit, integration, e2e)
- `test.charts.examples.yaml` - Example Helm chart linting and validation
- `test.charts.nextjs.yml` - NextJS Helm chart testing
- `test.boilerplates.rails.yml` - Rails boilerplate testing

### Release Workflows

- `release.yml` - Main release workflow that builds and deploys on push to main
- `dockerfiles.release.yaml` - Builds and publishes Dockerfile-based images

### Other Workflows

- `docs.yml` - Documentation building and deployment
- `test.kind.yml` - Kind cluster testing utilities
