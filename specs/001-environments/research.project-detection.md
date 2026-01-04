# Research: Automatic Project Type Detection

**Date**: 2026-01-01
**Related**: FR-ENV-006 through FR-ENV-011, US-1

## Summary

Implement zero-friction development environments by automatically detecting project types from repository files and inferring sensible dev server commands. When a PR is opened, the system analyzes the repository structure and configures the environment without manual intervention.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  GITHUB WEBHOOK (PR opened)                                  │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  PROJECT DETECTION (web/src/lib/project-detection.ts)        │
│  1. Fetch repository file tree via GitHub API                │
│  2. Check for indicators in precedence order:                │
│     docker-compose.yml > Dockerfile > package.json > Makefile│
│  3. Parse detected files for specific config                 │
│  4. Return ProjectDetectionResult with devCommand            │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  ENVIRONMENT CR CREATION                                     │
│  1. Set spec.devCommand from detection result                │
│  2. Set spec.workdir if monorepo pattern detected            │
│  3. Store detection metadata in spec.annotations             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  OPERATOR RECONCILIATION                                     │
│  1. Read spec.devCommand (or use default)                    │
│  2. Configure container with detected command                │
│  3. Set status.detectedProjectType for UI display            │
└─────────────────────────────────────────────────────────────┘
```

## Detection Module Design

```typescript
// web/src/lib/project-detection.ts

export type ProjectType =
  | "docker-compose"
  | "dockerfile"
  | "nodejs"
  | "makefile"
  | "unknown";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

export interface ProjectDetectionResult {
  projectType: ProjectType;
  devCommand: string | null;
  packageManager?: PackageManager;
  workdir?: string; // For monorepos
  confidence: "high" | "medium" | "low";
  detectedFiles: string[];
  warnings?: string[];
}

export interface DetectionContext {
  owner: string;
  repo: string;
  ref: string; // branch/commit
  octokit: Octokit;
}

// Main detection function
export async function detectProjectType(
  ctx: DetectionContext,
): Promise<ProjectDetectionResult> {
  const tree = await fetchRepoTree(ctx);

  // Check in precedence order (FR-ENV-007)
  if (hasDockerCompose(tree)) {
    return detectDockerCompose(ctx, tree);
  }
  if (hasDockerfile(tree)) {
    return detectDockerfile(ctx, tree);
  }
  if (hasPackageJson(tree)) {
    return detectNodejs(ctx, tree);
  }
  if (hasMakefile(tree)) {
    return detectMakefile(ctx, tree);
  }

  // Fallback (FR-ENV-008)
  return {
    projectType: "unknown",
    devCommand: null,
    confidence: "low",
    detectedFiles: [],
    warnings: ["No recognized project type detected"],
  };
}
```

## Node.js Detection Logic

```typescript
// Detect package manager from lockfile
function detectPackageManager(tree: TreeEntry[]): PackageManager {
  if (tree.some((f) => f.path === "pnpm-lock.yaml")) return "pnpm";
  if (tree.some((f) => f.path === "yarn.lock")) return "yarn";
  if (tree.some((f) => f.path === "bun.lockb")) return "bun";
  return "npm"; // default
}

async function detectNodejs(
  ctx: DetectionContext,
  tree: TreeEntry[],
): Promise<ProjectDetectionResult> {
  const packageManager = detectPackageManager(tree);
  const runCmd = packageManager === "npm" ? "npm run" : packageManager;

  // Fetch and parse package.json
  const packageJson = await fetchFileContent(ctx, "package.json");
  const pkg = JSON.parse(packageJson);

  let devCommand: string | null = null;
  let confidence: "high" | "medium" | "low" = "low";

  if (pkg.scripts?.dev) {
    devCommand = `${runCmd} dev`;
    confidence = "high";
  } else if (pkg.scripts?.start) {
    devCommand = `${runCmd} start`;
    confidence = "medium";
  }

  // Check for monorepo patterns (FR-ENV-009)
  const workdir = detectWorkdir(tree, pkg);

  return {
    projectType: "nodejs",
    devCommand,
    packageManager,
    workdir,
    confidence,
    detectedFiles: ["package.json"],
  };
}
```

## Monorepo Detection (FR-ENV-009)

```typescript
const COMMON_APP_DIRS = ["web", "app", "frontend", "backend", "packages"];

function detectWorkdir(
  tree: TreeEntry[],
  rootPkg: PackageJson,
): string | undefined {
  // Check if root package.json has workspaces (monorepo indicator)
  if (rootPkg.workspaces) {
    // Look for common app directories with their own package.json
    for (const dir of COMMON_APP_DIRS) {
      if (tree.some((f) => f.path === `${dir}/package.json`)) {
        return dir;
      }
    }
  }

  // Check for nested package.json in common locations
  for (const dir of COMMON_APP_DIRS) {
    const nestedPkg = tree.find((f) => f.path === `${dir}/package.json`);
    if (nestedPkg) {
      return dir;
    }
  }

  return undefined; // Use root
}
```

## CRD Extension

```go
// operator/api/v1alpha1/environment_types.go

type EnvironmentSpec struct {
    // ... existing fields ...

    // DevCommand is the command to run for development mode.
    // Auto-detected from project files if not specified.
    // Examples: "npm run dev", "make dev", "docker compose up"
    // +optional
    DevCommand string `json:"devCommand,omitempty"`

    // Workdir is the working directory relative to repo root.
    // Used for monorepos where the app is in a subdirectory.
    // +optional
    Workdir string `json:"workdir,omitempty"`
}

type EnvironmentStatus struct {
    // ... existing fields ...

    // DetectedProjectType indicates what was auto-detected.
    // Values: "docker-compose", "dockerfile", "nodejs", "makefile", "unknown"
    // +optional
    DetectedProjectType string `json:"detectedProjectType,omitempty"`
}
```

## Failure Recovery (FR-ENV-010)

```go
// operator/internal/controller/environment_controller.go

const (
    StatusReady    = "Ready"
    StatusDegraded = "Degraded"  // Dev command failed but container running
    StatusFailed   = "Failed"
)

func (r *EnvironmentReconciler) reconcileDevelopment(ctx context.Context, env *v1alpha1.Environment) error {
    // ... create deployment ...

    // Check if dev command is failing
    if podStatus.ContainerStatuses[0].State.Running != nil {
        // Container running, check dev process
        if devProcessFailed(podStatus) {
            env.Status.Phase = StatusDegraded
            env.Status.Message = "Dev command failed. Container running for debugging."
            // Don't return error - let user fix and retry
        }
    }
}
```

## Override Persistence (FR-ENV-011)

```typescript
// web/src/db/schema.ts

// Add to projectEnvironments table
deploymentConfig: jsonb("deployment_config").$type<{
  devCommand?: string; // User override
  workdir?: string; // User override
  autoDetect: boolean; // false = user has overridden
  detectedAt?: string; // ISO timestamp of last detection
  overriddenAt?: string; // ISO timestamp of user override
}>();
```

```typescript
// web/src/models/preview-environments.ts

async function createPreviewDeployment(params: CreatePreviewDeploymentParams) {
  // Check for existing project-level override
  const existingConfig = await getProjectDeploymentConfig(params.projectId);

  let devCommand: string | null;
  if (existingConfig?.autoDetect === false) {
    // User has overridden - preserve their setting
    devCommand = existingConfig.devCommand;
  } else {
    // Auto-detect (or re-detect if config is stale)
    const detection = await detectProjectType({
      owner: params.owner,
      repo: params.repo,
      ref: params.branch,
      octokit: params.octokit,
    });
    devCommand = detection.devCommand;
  }

  // Create Environment CR with detected/overridden command
  await createEnvironmentCR({
    // ...
    devCommand,
    workdir: existingConfig?.workdir,
  });
}
```

## UI Integration

```typescript
// web/src/components/environments/DetectionPreview.tsx

interface DetectionPreviewProps {
  result: ProjectDetectionResult;
  onOverride: (devCommand: string) => void;
}

export function DetectionPreview({ result, onOverride }: DetectionPreviewProps) {
  return (
    <div className="detection-preview">
      <div className="detected">
        <Badge variant={result.confidence}>
          {result.projectType}
        </Badge>
        <code>{result.devCommand || "No command detected"}</code>
      </div>

      {result.projectType === "unknown" && (
        <Alert variant="warning">
          No project type detected. Please configure manually.
        </Alert>
      )}

      <Button variant="outline" onClick={() => setShowOverride(true)}>
        Override
      </Button>
    </div>
  );
}
```

## Testing Strategy

| Test Type   | Coverage                                             |
| ----------- | ---------------------------------------------------- |
| Unit        | Detection heuristics for each project type           |
| Unit        | Precedence order when multiple indicators present    |
| Unit        | Monorepo detection patterns                          |
| Integration | Detection → CR creation flow                         |
| E2E         | PR opened → environment created with correct command |
| E2E         | Override persists across PR updates                  |

## Performance Considerations

- **GitHub API calls**: Minimize by fetching tree once, then individual files as needed
- **Caching**: Cache detection results per commit SHA (immutable)
- **Timeout**: 10s max for detection, fall back to "unknown" on timeout
