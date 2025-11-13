# DC normally is docker compose, but podman compose is used if available
DC:=docker compose $(DC_ARGS)

# Load environment variables from .env if it exists
-include .env
export

.PHONY: help
help: ## Show this help message
	@echo 'Usage: make <target>'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)


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

# Kind VM targets
kind-vm-start: ## Start Kind VM (reuses if healthy) and configure kubectl
	@./scripts/ensure-kind-vm
	@echo "✓ Kind VM ready"
	@echo "  Run: export KUBECONFIG=$$(pwd)/.kube/config"

kind-vm-stop: ## Stop Kind VM
	@echo "Stopping Kind VM..."
	@pkill -9 -f "qemu-system-x86_64" || echo "VM not running"

kind-vm-restart: ## Force restart Kind VM (kills existing VM and starts fresh)
	@echo "Force restarting Kind VM..."
	@pkill -9 -f "qemu-system-x86_64" || true
	@sleep 2
	@$(MAKE) kind-vm-start

kind-vm-reset: ## Reset Kind VM (stop, remove disk image, and rebuild)
	@echo "Resetting Kind VM..."
	@pkill -9 -f "qemu-system-x86_64" || true
	@sleep 1
	@rm -f kind-vm.qcow2
	@echo "✓ VM disk removed, next start will rebuild from scratch"
	@$(MAKE) kind-vm-start

kind-vm-health: ## Check if Kind VM is healthy
	@./scripts/kind-vm-health-check && echo "✓ VM is healthy" || echo "✗ VM is not running/healthy"

kind-vm-cleanup: ## Kill all stale QEMU processes
	@echo "Cleaning up stale QEMU processes..."
	@pkill -9 -f "qemu-system-x86_64" || echo "No processes to kill"
	@sleep 1
	@echo "Done"

kind-vm-status: ## Check Kind VM status
	@KIND_SSH_PORT=$${KIND_SSH_PORT:-2222}; \
	KIND_K8S_PORT=$${KIND_K8S_PORT:-6443}; \
	if ssh -q -o BatchMode=yes -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=2 nixos@localhost -p $$KIND_SSH_PORT exit 2>/dev/null; then \
		echo "✓ Kind VM is running"; \
		echo "  SSH: ssh nixos@localhost -p $$KIND_SSH_PORT"; \
		echo "  K8s API: https://localhost:$$KIND_K8S_PORT"; \
	else \
		echo "✗ Kind VM is not running"; \
		echo "  Start with: make kind-vm-start"; \
	fi

test-k8s: ## Run Kubernetes integration tests with Kind VM
	@./scripts/ensure-kind-vm
	@export KUBECONFIG=$$(pwd)/.kube/config && \
	 export KUBECONFIG_PRIMARY=$$(base64 -w 0 .kube/config) && \
	 npm run test:integration:prpod

up-with-k8s: kind-vm-start up ## Start all services + Kind VM

dev-with-k8s: kind-vm-start ## Start Kind VM + development environment
	@echo "✓ Kind VM running"
	@echo "  Kubeconfig: .kube/config"
	@echo ""
	@echo "Next steps:"
	@echo "  1. export KUBECONFIG=\$$(pwd)/.kube/config"
	@echo "  2. make up    # Start app services"
	@echo "  3. kubectl get nodes"
	@echo "  4. k9s        # Monitor cluster"
