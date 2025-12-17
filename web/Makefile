# DC normally is docker compose, but podman compose is used if available
DC:=docker compose $(DC_ARGS)

.PHONY: help
help: ## Show this help message
	@echo 'Usage: make <target>'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)


lint: ## Run code quality checks (Prettier, ESLint, Typecheck)
	@echo "Running Prettier..."
	-npx prettier --check .
	@echo "Running ESLint..."
	npm run lint
	@echo "Running Typecheck..."
	npm run typecheck

build: ## Build all services
	$(DC) run --env NODE_ENV=production --rm --no-deps app npm run build

seed: ## Seed the database with test data
	npm run seed

seed-projects: ## Seed the database with catalyst and meze projects
	$(DC) run --rm app npm run seed:projects

up: ## Start all services with mocked GitHub data
	$(DC) up --detach --wait
	$(DC) run --rm --env GITHUB_REPOS_MODE=mocked --env MOCKED=1 app npm run db:migrate
	$(DC) run --rm --env GITHUB_REPOS_MODE=mocked --env MOCKED=1 app npm run seed
	$(DC) run --rm -it --env GITHUB_REPOS_MODE=mocked --env MOCKED=1 app npm run dev

up-real: ## Start all services with real GitHub integration
	$(DC) up --detach --wait
	$(DC) run --rm app npm run db:migrate
	$(DC) run --rm app npm run seed
	$(DC) run --rm -it app npm run dev

down: ## Stop all services
	$(DC) down --remove-orphans

destroy: ## Clean all services and Next.js cache
	$(DC) down --remove-orphans --volumes
	rm -rf .next

reset: ## Clean and restart all services with fresh data
	$(MAKE) destroy
	$(MAKE) up

dbshell: ## Connect to PostgreSQL database shell
	$(DC) exec db psql -U postgres -d catalyst

ci: ## Run comprehensive CI tests (unit, integration, and e2e)
	@echo "Running comprehensive CI tests..."
	@echo "1. Running linter..."
	npm run lint
	@echo "2. Running unit tests..."
	npm run test:unit
	@echo "3. Running integration tests..."
	npm run test:integration
	@echo "4. Running component tests..."
	npm run test:components
	@echo "5. Running e2e tests..."
	npm run test:e2e
	@echo "All tests completed successfully!"

ci-docker: ## Run comprehensive CI tests in Docker (unit, integration, and e2e)
	$(DC) run --env NODE_ENV=production --rm -it app npm run lint
	$(DC) run --env NODE_ENV=production --rm -it app npm test
	$(DC) run --no-deps e2e

e2e: ## Run e2e tests in Docker
	$(DC) run --no-deps --no-deps e2e
