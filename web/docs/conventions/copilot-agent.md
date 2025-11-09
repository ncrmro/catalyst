# GitHub Copilot Agent Setup Convention

This document describes the conventions and architecture for GitHub Copilot agent integration in this project.

## Overview

The GitHub Copilot setup uses a Docker-based workflow with conditional execution to provide a verified environment for agents while minimizing startup time during agent invocations.

## Architecture

### github.job Context Variable

GitHub Actions automatically sets the `github.job` context variable to the name of the current job. We use this to conditionally run expensive setup/verification steps.

**Job Name Values:**

- `copilot-setup-steps`: When running via PR or workflow_dispatch (normal setup mode)
- `copilot`: When running during Copilot agent execution

**Validation:**
The workflow includes a validation step that checks the `GITHUB_JOB` environment variable to ensure it has one of these expected values, failing fast with a clear error if not.

### Conditional Workflow Execution

#### Setup Mode (`github.job=copilot-setup-steps`)

When running in setup mode (PR or workflow_dispatch), the workflow:

1. **Validates environment** - Checks `GITHUB_JOB` environment variable
2. **Checks out code** - Clones the repository
3. **Sets up Docker** - Configures Docker Buildx for building images
4. **Creates .env file** - Copies `.env.example` and adds secrets
5. **Caches npm dependencies** - Runs `npm ci` to populate node_modules
6. **Starts services** - Runs `make up` to start all Docker services
7. **Verifies environment** - Runs `make ci` to execute full test suite

**Rationale:** This ~2-5 minute verification ensures the environment is working correctly before any Copilot agents use it.

#### Copilot Mode (`github.job=copilot`)

When running in Copilot agent execution mode, the workflow:

1. **Validates environment** - Checks `GITHUB_JOB` environment variable
2. **Checks out code** - Clones the repository
3. **Sets up Docker** - Configures Docker Buildx
4. **Creates .env file** - Copies `.env.example` and adds secrets
5. **Uses cached npm dependencies** - Reuses node_modules from setup
6. **Skips services startup** - Services start on-demand via make commands
7. **Skips verification** - Environment already verified in setup mode

**Rationale:** This allows agents to start immediately without a 2-5 minute delay on every invocation.

## Docker-Based Make Commands

All development commands use Docker Compose to ensure consistency across environments.

### Command Categories

#### No Service Dependencies (Fast)

These commands use `--no-deps` to avoid starting unnecessary services:

```makefile
make lint           # ESLint + typecheck
make format         # Prettier + ESLint --fix
make install        # npm install
make test-unit      # Unit tests
make test-components # Component tests
```

#### With Service Dependencies

These commands automatically start required services:

```makefile
make test-integration  # Starts db service
make test-agents       # Starts db service
make e2e              # Starts all services (db, web)
make ci               # Starts all required services for full test suite
```

#### Service Management

```makefile
make up      # Start all services (db, web) and run migrations
make down    # Stop all services
make destroy # Stop services, remove volumes, clean data
```

### Why Docker for Everything?

1. **Consistency**: Same commands work locally, in CI, and in GitHub Copilot
2. **Isolation**: Each command runs in a clean container
3. **Dependencies**: Services start automatically when needed
4. **Caching**: npm dependencies cached via volumes
5. **No local setup**: No need to install Node.js, Playwright, or other tools locally

## File Structure

```
.github/
├── workflows/
│   └── copilot-setup-steps.yml  # Main workflow file
└── copilot-instructions.md       # Quick reference for agents

docs/
└── conventions/
    └── copilot-agent.md         # This file

Makefile                         # Docker-based commands
docker-compose.yaml              # Service definitions
```

## Workflow File Convention

### Required Components

1. **Job name must be `copilot-setup-steps`**

   ```yaml
   jobs:
     copilot-setup-steps: # Required name
   ```

2. **GITHUB_JOB validation step**

   ```yaml
   - name: Validate GITHUB_JOB environment variable
     run: |
       echo "GITHUB_JOB=$GITHUB_JOB"
       if [[ "$GITHUB_JOB" != "copilot-setup-steps" && "$GITHUB_JOB" != "copilot" ]]; then
         echo "ERROR: Unexpected GITHUB_JOB value: $GITHUB_JOB"
         exit 1
       fi
   ```

3. **Conditional steps using `github.job` context**

   ```yaml
   - name: Build and start services (setup mode only)
     if: github.job == 'copilot-setup-steps'
     run: make up
   ```

4. **npm cache for both modes**
   ```yaml
   - name: Cache npm dependencies
     run: npm ci
     # Note: Both modes use this cache
   ```

### Documentation Comments

The workflow file includes extensive comments explaining:

- How `GITHUB_JOB` is automatically set by GitHub Actions
- Why each step runs in setup vs copilot mode
- Performance implications (2-5 min verification cost)
- How npm cache is shared between modes

## Makefile Convention

### Command Structure

```makefile
# [Category description]
command: ## Description for help text
	@echo "Human-readable status message..."
	@$(DC) run --rm [--no-deps] service npm run script
```

### Docker Compose Variable

```makefile
DC:=docker compose $(DC_ARGS)
```

This allows overriding with `podman compose` or adding extra arguments.

### Help Text

All commands include `##` comments that appear in `make help`:

```bash
$ make help
lint                 Run linting (Docker-based, no service dependencies)
format               Format code with Prettier and ESLint --fix (Docker-based, no service dependencies)
test-unit            Run unit tests (Docker-based, no service dependencies)
...
```

## Copilot Instructions File

The `.github/copilot-instructions.md` file provides quick reference for agents, including:

1. **Environment notice** - Explains that services are not running by default
2. **Quick start commands** - Common make commands
3. **Testing commands** - All available test targets
4. **CI pipeline** - How to run full verification

This file is kept concise while linking to `CLAUDE.md` for full documentation.

## Modifying the Setup

### Adding a New Service

1. Add service to `docker-compose.yaml`
2. Update `make up` if initialization needed
3. Add make command if direct access needed
4. Update relevant test commands to depend on the service

### Adding Environment Variables

1. Add to `.env.example` with placeholder
2. Update workflow to set from secrets if needed:
   ```yaml
   - name: Create .env file
     run: |
       cp .env.example .env
       echo "NEW_SECRET=${{ secrets.NEW_SECRET }}" >> .env
   ```

### Adding Verification Steps

Add to the `make ci` command:

```makefile
ci: ## Run full CI pipeline: lint and all tests including e2e
	@echo "Running linting..."
	@$(DC) run --rm --no-deps web npm run lint
	# ... existing steps ...
	@echo "Running new verification..."
	@$(DC) run --rm web npm run new:verify
	@echo "✓ CI complete"
```

### Modifying Test Strategy

If you want to reduce verification time in setup mode:

1. Consider which tests are critical for environment verification
2. Update `make ci` to run only critical tests
3. Document why certain tests are excluded
4. Ensure agents can run full tests on-demand

## Troubleshooting

### Workflow Fails with "Unexpected GITHUB_JOB value"

- The validation step caught an unexpected job name
- Check that the job name is exactly `copilot-setup-steps`
- Verify GitHub isn't changing the `GITHUB_JOB` variable behavior

### Services Not Starting in Copilot Mode

- This is expected - services start on-demand
- Run `make up` manually if you need them running
- Or use commands that start services (e.g., `make test-integration`)

### Tests Pass in Setup but Fail in Copilot

- Check if services are running (`make up`)
- Verify `.env` file has all required variables
- Check Docker volumes for stale data (`make destroy`)

### npm Cache Not Working

- Verify `npm ci` runs in both modes
- Check GitHub Actions cache is not full
- Confirm node_modules volume is mounted in docker-compose.yaml

## Performance Considerations

### Setup Mode Performance

**One-time cost**: ~2-5 minutes for full verification

- Linting: ~10-20 seconds
- Unit tests: ~30 seconds
- Component tests: ~20-30 seconds
- Integration tests: ~30 seconds
- Agent tests: ~20-30 seconds
- E2E tests: ~1-2 minutes
- Docker image building: ~30-60 seconds (cached after first run)

### Copilot Mode Performance

**Startup time**: ~10-20 seconds

- Most time spent on checkout and Docker setup
- npm cache reuse eliminates installation time
- Services start on-demand as needed

## Best Practices

1. **Keep `make ci` comprehensive** - It's your environment verification
2. **Use `--no-deps` for isolated tasks** - Faster execution
3. **Document service dependencies** - Help comments in Makefile
4. **Validate assumptions** - Like the GITHUB_JOB validation step
5. **Keep copilot-instructions.md concise** - Link to full docs in CLAUDE.md
6. **Test locally with Docker** - Same commands as CI/Copilot
7. **Update docs when changing workflow** - Keep this file current

## References

- Main workflow: `.github/workflows/copilot-setup-steps.yml`
- Copilot instructions: `.github/copilot-instructions.md`
- Full project docs: `CLAUDE.md`
- Makefile: `Makefile`
- Docker services: `docker-compose.yaml`
