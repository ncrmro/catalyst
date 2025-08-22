# DC normally is docker compose, but podman compose is used if available
DC:=docker-compose $(DC_ARGS)


build: ## Build all services
	$(DC) run --env NODE_ENV=production --rm -it app pnpm run build

up: ## Start all services
	$(DC) up -d
	GITHUB_REPOS_MODE=mocked npm run dev

down: ## Stop all services
	$(DC) down --remove-orphans

destroy: ## Clean all services
	$(DC) down --remove-orphans --volumes

dbshell: ## Connect to PostgreSQL database shell
	$(DC) exec db psql -U postgres -d catalyst

ci:
	$(DC) run --env NODE_ENV=production --rm -it app pnpm run lint

e2e: ## Run e2e tests in Docker
	$(DC) run --no-deps --no-deps e2e
