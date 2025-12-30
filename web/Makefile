# DC normally is docker compose, but podman compose is used if available
DC:=docker compose $(DC_ARGS)

.PHONY: help
help: ## Show this help message
	@echo 'Usage: make <target>'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %%-15s %%s\n", $$1, $$2}' $(MAKEFILE_LIST)


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
	npm run seed:projects

up: ## Start the K3s VM (hybrid mode) and run local Next.js dev server
	@echo "Installing Node.js dependencies..."
	npm install

	@echo "Starting K3s VM, Operator, and Next.js dev server..."
	npx concurrently --kill-others-on-fail -n "infra,web,operator" -c "blue,magenta,cyan" \
		"rm -f kubeconfig.yaml && ../bin/k3s-vm && npm run db:migrate && npm run seed" \
		"PORT=$${WEB_PORT:-3000} npm run dev" \
		"until [ -f kubeconfig.yaml ]; do sleep 1; done; export KUBECONFIG=$$(pwd)/kubeconfig.yaml; nix develop .. --command make -C ../operator run"

up-self-deploy: ## Start K3s VM with self-deployment mode (creates Environment CRs)
	@echo "Installing Node.js dependencies..."
	npm install

	@echo "Starting K3s VM, Operator, and Next.js dev server with SEED_SELF_DEPLOY=true..."
	npx concurrently --kill-others-on-fail -n "infra,web,operator" -c "blue,magenta,cyan" \
		"rm -f kubeconfig.yaml && ../bin/k3s-vm && npm run db:migrate && SEED_SELF_DEPLOY=true npm run seed" \
		"PORT=$${WEB_PORT:-3000} npm run dev" \
		"until [ -f kubeconfig.yaml ]; do sleep 1; done; export KUBECONFIG=$$(pwd)/kubeconfig.yaml; SEED_SELF_DEPLOY=true nix develop .. --command make -C ../operator run"

up-real: ## Start the K3s VM (hybrid mode) and run local Next.js dev server with real GitHub integration
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

down: ## Stop local Next.js dev server and Docker Compose services
	@echo "Stopping local Next.js dev server (if running)..."
	killall -SIGINT node || true
	@echo "Stopping Docker Compose services..."
	$(DC) down --remove-orphans

destroy: ## Clean all services and Next.js cache (including K3s VM data)
	@echo "Destroying Docker Compose services and volumes..."
	$(DC) down --remove-orphans --volumes
	@echo "Removing .next build cache..."
	rm -rf .next
	@echo "Resetting K3s VM..."
	../bin/k3s-vm reset

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
	$(DC) run --env NODE_ENV=production --rm -it app npm run lint
	$(DC) run --env NODE_ENV=production --rm -it app npm test
	$(DC) run --no-deps e2e

e2e: ## Run e2e tests in Docker
	$(DC) run --no-deps --no-deps e2e
