# Load .env file if it exists
ifneq (,$(wildcard ./.env))
  include .env
  export
endif

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

postgres: ## Start local PostgreSQL server (uses Nix pg_ctl if available, else Docker)
	@if command -v pg_ctl >/dev/null 2>&1; then \
		if [ ! -d .direnv/postgres ]; then \
			echo "Initializing PostgreSQL in .direnv/postgres..."; \
			mkdir -p .direnv/postgres; \
			initdb -D .direnv/postgres --username=postgres --auth=trust > /dev/null; \
			echo "host all all 0.0.0.0/0 trust" >> .direnv/postgres/pg_hba.conf; \
		fi; \
		if ! pg_isready -h localhost -p 5432 >/dev/null 2>&1; then \
			echo "Starting PostgreSQL with pg_ctl..."; \
			pg_ctl -D .direnv/postgres -o "-p 5432 -k /tmp" -l .direnv/postgres/server.log start; \
			until pg_isready -h localhost -p 5432 >/dev/null 2>&1; do sleep 1; done; \
			psql -h localhost -p 5432 -U postgres -d postgres -c "CREATE DATABASE catalyst;" 2>/dev/null || true; \
		else \
			echo "PostgreSQL is already running on port 5432."; \
		fi; \
	else \
		echo "pg_ctl not found, using Docker Compose..."; \
		$(DC) up -d db; \
		until pg_isready -h localhost -p 5432 >/dev/null 2>&1; do sleep 1; done; \
	fi

postgres-stop: ## Stop local PostgreSQL server
	@if command -v pg_ctl >/dev/null 2>&1; then \
		if [ -d .direnv/postgres ] && pg_ctl -D .direnv/postgres status >/dev/null 2>&1; then \
			echo "Stopping PostgreSQL..."; \
			pg_ctl -D .direnv/postgres stop; \
		fi; \
	else \
		$(DC) stop db; \
	fi

build: ## Build all services
	$(DC) run --env NODE_ENV=production --rm --no-deps app npm run build

seed: ## Seed the database with test data
	npm run seed

seed-projects: ## Seed the database with catalyst and meze projects
	npm run seed:projects

up: postgres ## Start local dev environment (K3s VM, Next.js, Operator) with logs in ./logs
	@echo "Installing Node.js dependencies..."
	@npm install
	@echo "Running database migrations..."
	@npm run db:migrate
	@echo "Seeding database..."
	@npm run seed
	@echo "Starting local development environment..."
	@mkdir -p ./logs
	@rm -f ./logs/infra.log ./logs/web.log ./logs/operator.log
	npx concurrently \
		--names "INFRA,WEB,OPERATOR" \
		--prefix-colors "blue,magenta,cyan" \
		--kill-others-on-fail \
		"rm -f kubeconfig.yaml && ../bin/k3s-vm 2>&1 | tee ./logs/infra.log" \
		"PORT=$${WEB_PORT:-3000} npm run dev 2>&1 | tee ./logs/web.log" \
		"until [ -f kubeconfig.yaml ]; do sleep 1; done; export KUBECONFIG=$$(pwd)/kubeconfig.yaml; nix develop .. --command make -C ../operator run 2>&1 | tee ./logs/operator.log"

up-self-deploy: postgres ## Start K3s VM with self-deployment mode (creates Environment CRs) with logs in ./logs
	@echo "Installing Node.js dependencies..."
	@npm install
	@echo "Running database migrations..."
	@npm run db:migrate
	@echo "Seeding database (SEED_SELF_DEPLOY=true)..."
	@SEED_SELF_DEPLOY=true npm run seed
	@echo "Starting local development environment..."
	@mkdir -p ./logs
	@rm -f ./logs/infra.log ./logs/web.log ./logs/operator.log
	npx concurrently \
		--names "INFRA,WEB,OPERATOR" \
		--prefix-colors "blue,magenta,cyan" \
		--kill-others-on-fail \
		"rm -f kubeconfig.yaml && ../bin/k3s-vm 2>&1 | tee ./logs/infra.log" \
		"PORT=$${WEB_PORT:-3000} npm run dev 2>&1 | tee ./logs/web.log" \
		"until [ -f kubeconfig.yaml ]; do sleep 1; done; export KUBECONFIG=$$(pwd)/kubeconfig.yaml; SEED_SELF_DEPLOY=true nix develop .. --command make -C ../operator run 2>&1 | tee ./logs/operator.log"

up-real: postgres ## Start the K3s VM (hybrid mode) and run local Next.js dev server with real GitHub integration
	@echo "Starting K3s VM in Hybrid Mode..."
	@../bin/k3s-vm

	@echo "Installing Node.js dependencies..."
	npm install

	@echo "Running database migrations..."
	npm run db:migrate

	@echo "Seeding database with test data..."
	npm run seed

	@echo "Starting local Next.js development server with real GitHub integration..."
	PORT=$${APP_PORT:-3000} GITHUB_REPOS_MODE=real npm run dev

down: postgres-stop ## Stop local Next.js dev server and Docker Compose services
	@echo "Stopping local Next.js dev server (if running)..."
	killall -SIGINT node || true
	@echo "Stopping Docker Compose services..."
	$(DC) down --remove-orphans

destroy: postgres-stop ## Clean all services and Next.js cache (including K3s VM data)
	@echo "Destroying Docker Compose services and volumes..."
	$(DC) down --remove-orphans --volumes
	@echo "Removing .next build cache..."
	rm -rf .next
	@echo "Stopping K3s VM (if running)..."
	-../bin/k3s-vm stop 2>/dev/null || true
	@echo "Removing K3s VM data..."
	rm -rf ../.k3s-vm/vm
	rm -f .kube/config kubeconfig.yaml
	@echo "Removing local PostgreSQL data..."
	rm -rf .direnv/postgres

reset: ## Clean and restart all services with fresh data
	$(MAKE) destroy
	$(MAKE) up

dbshell: ## Connect to PostgreSQL database shell (in K3s VM)
	@echo "Connecting to PostgreSQL in K3s VM..."
	@../bin/kubectl exec -it deploy/postgres -- psql -U postgres -d catalyst

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
	$(DC) run --env NODE_ENV=production --rm -it web npm run lint
	$(DC) run --env NODE_ENV=production --rm -it web npm test
	$(DC) run --no-deps e2e

e2e: ## Run e2e tests in Docker
	$(DC) run --no-deps --no-deps e2e

migration-reconcile: ## Reset drizzle folder from main branch and regenerate migrations
	## Can be used to regenerate migrations after rebasing on a branch with migration conflicts
	## or consolidating multiple migrations on a feature branch before merging
	rm -rf ./drizzle
	git fetch
	git checkout origin/main -- drizzle
	npm run db:generate
