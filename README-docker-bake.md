# Docker Bake File

This repository includes a Docker Bake file (`docker-bake.yml`) that simplifies building development and runner layers in parallel using a matrix approach.

## Overview

The bake file defines four main build targets:
- `web-development`: NextJS development environment
- `web-runner`: NextJS production/runner environment  
- `rails-development`: Rails development environment
- `rails-runner`: Rails production/runner environment

## Usage

### Build All Targets (Default)
```bash
docker buildx bake -f docker-bake.yml
```

### Build Specific Application Types
```bash
# Build only web targets (development + runner)
docker buildx bake -f docker-bake.yml web-development web-runner

# Build only rails targets (development + runner)  
docker buildx bake -f docker-bake.yml rails-development rails-runner
```

### Build Specific Environments
```bash
# Build only development variants
docker buildx bake -f docker-bake.yml web-development rails-development

# Build only production/runner variants
docker buildx bake -f docker-bake.yml web-runner rails-runner
```

### Build Individual Targets
```bash
# Build specific target
docker buildx bake -f docker-bake.yml web-development
docker buildx bake -f docker-bake.yml rails-runner
```

## Matrix Functionality

The bake file implements a matrix approach by:

1. **Parallel Builds**: All targets can be built simultaneously by Docker Buildx
2. **Simplified Configuration**: Single file defines multiple build variants
3. **Flexible Targeting**: Choose which combinations to build based on needs
4. **Shared Context**: Each target shares the appropriate Docker context and build settings

## Build Targets

### Web Application
- **Context**: `web/`
- **Dockerfile**: `web/Dockerfile`
- **Development Target**: `development` stage
- **Runner Target**: `runner` stage
- **Platform**: `linux/amd64`

### Rails Application  
- **Context**: `boilerplate/rails/`
- **Dockerfile**: `boilerplate/rails/Dockerfile`
- **Development Target**: `base` stage with `RAILS_ENV=development`
- **Runner Target**: Full build (production ready)
- **Platform**: `linux/amd64`

## Images Produced

The builds will create the following Docker images:
- `catalyst/web:development`
- `catalyst/web:runner`
- `catalyst/rails:development`  
- `catalyst/rails:runner`

## Benefits

1. **Parallel Execution**: Multiple images build simultaneously, reducing total build time
2. **Matrix Simplification**: Single configuration file manages multiple build variants
3. **Selective Building**: Choose exactly which variants to build
4. **Consistent Naming**: Standardized image tags and naming conventions