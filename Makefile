.PHONY: help e2e up

help: ## Show this help message
	@echo 'Usage: make <target>'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

e2e: ## Run web e2e tests
	cd web && npm run test:e2e

up: ## Start the web development environment
	$(MAKE) -C web up

build-docker: ## Build docker images for web and operator
	docker buildx bake -f docker-compose.build.yml
