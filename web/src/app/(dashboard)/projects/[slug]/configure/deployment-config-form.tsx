import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  EnvironmentConfig,
  HelmConfig,
  DockerConfig,
  ManifestsConfig,
  DetectionConfidence,
  ProjectType,
  PackageManager,
} from "@/types/environment-config";
import {
  isHelmConfig,
  isDockerConfig,
  isManifestsConfig,
  DEFAULT_MANAGED_SERVICES,
} from "@/types/environment-config";

/**
 * Get human-readable label for project type
 */
function getProjectTypeLabel(projectType: ProjectType): string {
  switch (projectType) {
    case "docker-compose":
      return "Docker Compose";
    case "dockerfile":
      return "Dockerfile";
    case "nodejs":
      return "Node.js";
    case "makefile":
      return "Makefile";
    case "unknown":
      return "Unknown";
  }
}

/**
 * Get badge color classes for confidence level
 */
function getConfidenceBadgeClasses(confidence: DetectionConfidence): string {
  switch (confidence) {
    case "high":
      return "bg-success-container text-on-success-container";
    case "medium":
      return "bg-warning-container text-on-warning-container";
    case "low":
      return "bg-error-container text-on-error-container";
  }
}

/**
 * Format package manager for display
 */
function formatPackageManager(pm: PackageManager): string {
  switch (pm) {
    case "pnpm":
      return "pnpm";
    case "yarn":
      return "Yarn";
    case "bun":
      return "Bun";
    case "npm":
      return "npm";
  }
}

export interface DeploymentConfigFormProps {
  initialConfig?: Partial<EnvironmentConfig>;
  onSubmit?: (config: EnvironmentConfig) => void;
  onBack?: () => void;
}

const DEFAULT_HELM_CONFIG: HelmConfig = {
  method: "helm",
  chartPath: "./charts/app",
  valuesPath: "",
  managedServices: DEFAULT_MANAGED_SERVICES,
};

const DEFAULT_DOCKER_CONFIG: DockerConfig = {
  method: "docker",
  dockerfilePath: "./Dockerfile",
  context: ".",
  managedServices: DEFAULT_MANAGED_SERVICES,
};

const DEFAULT_MANIFESTS_CONFIG: ManifestsConfig = {
  method: "manifests",
  directory: "./k8s",
  managedServices: DEFAULT_MANAGED_SERVICES,
};

function getDefaultConfigForMethod(
  method: EnvironmentConfig["method"],
): EnvironmentConfig {
  switch (method) {
    case "helm":
      return DEFAULT_HELM_CONFIG;
    case "docker":
      return DEFAULT_DOCKER_CONFIG;
    case "manifests":
      return DEFAULT_MANIFESTS_CONFIG;
  }
}

export function DeploymentConfigForm({
  initialConfig,
  onSubmit,
  onBack,
}: DeploymentConfigFormProps) {
  // Initialize with the appropriate default config based on method
  const getInitialConfig = (): EnvironmentConfig => {
    const method = initialConfig?.method ?? "helm";
    const baseConfig = getDefaultConfigForMethod(method);

    // Merge initial config with defaults
    return {
      ...baseConfig,
      ...initialConfig,
      managedServices: {
        ...baseConfig.managedServices,
        ...initialConfig?.managedServices,
      },
    } as EnvironmentConfig;
  };

  const [config, setConfig] = useState<EnvironmentConfig>(getInitialConfig);

  const handleMethodChange = (method: EnvironmentConfig["method"]) => {
    // Switch to the default config for the new method, preserving managed services
    const newConfig = getDefaultConfigForMethod(method);
    setConfig({
      ...newConfig,
      managedServices: config.managedServices,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(config);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <Card className="mb-6 p-6">
        <h1 className="text-3xl font-bold text-on-background mb-2">
          Configure Deployment
        </h1>
        <p className="text-on-surface-variant">
          Choose how your application will be deployed to Kubernetes. This
          configuration enables automated deployments for development and
          production environments.
        </p>
      </Card>

      {/* Auto-Detection Status */}
      {config.autoDetect !== false &&
        config.projectType &&
        config.projectType !== "unknown" && (
          <Card className="mb-6 p-4 border-primary/30 bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-on-surface">
                      Auto-detected: {getProjectTypeLabel(config.projectType)}
                    </span>
                    {config.packageManager && (
                      <span className="text-sm text-on-surface-variant">
                        with {formatPackageManager(config.packageManager)}
                      </span>
                    )}
                    {config.confidence && (
                      <span
                        className={cn(
                          "px-2 py-0.5 text-xs rounded-full",
                          getConfidenceBadgeClasses(config.confidence),
                        )}
                      >
                        {config.confidence} confidence
                      </span>
                    )}
                  </div>
                  {config.devCommand && (
                    <p className="text-sm text-on-surface-variant mt-0.5">
                      Dev command:{" "}
                      <code className="px-1.5 py-0.5 bg-surface rounded text-xs font-mono">
                        {config.devCommand}
                      </code>
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig((prev) => ({
                    ...prev,
                    autoDetect: false,
                    overriddenAt: new Date().toISOString(),
                  }))
                }
                className="px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface border border-outline/50 rounded-md hover:bg-surface transition-colors"
              >
                Override
              </button>
            </div>
          </Card>
        )}

      {/* Manual Override Notice */}
      {config.autoDetect === false && config.overriddenAt && (
        <Card className="mb-6 p-4 border-outline/30 bg-surface">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary-container">
                <svg
                  className="w-4 h-4 text-on-secondary-container"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <div>
                <span className="font-medium text-on-surface">
                  Manual configuration
                </span>
                <p className="text-sm text-on-surface-variant">
                  Auto-detection has been overridden
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  autoDetect: true,
                  overriddenAt: undefined,
                }))
              }
              className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 border border-primary/50 rounded-md hover:bg-primary/5 transition-colors"
            >
              Re-enable auto-detect
            </button>
          </div>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        {/* Deployment Method Selection */}
        <Card className="mb-6 p-6">
          <h2 className="text-lg font-semibold text-on-surface mb-4">
            Deployment Method
          </h2>
          <div className="space-y-3">
            {/* Helm Chart Option */}
            <div
              onClick={() => handleMethodChange("helm")}
              className={cn(
                "border rounded-lg p-4 cursor-pointer transition-all",
                config.method === "helm"
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "border-outline/50 hover:border-outline hover:bg-surface/50",
              )}
            >
              <div className="flex items-start gap-4">
                <input
                  type="radio"
                  name="method"
                  value="helm"
                  checked={config.method === "helm"}
                  onChange={() => handleMethodChange("helm")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-on-surface">
                      Helm Chart
                    </h3>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-success-container text-on-success-container">
                      Recommended
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant">
                    Deploy using Helm charts with configurable values. Best for
                    complex applications with multiple components.
                  </p>
                  {isHelmConfig(config) && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-1">
                          Chart Path
                        </label>
                        <input
                          type="text"
                          value={config.chartPath}
                          onChange={(e) =>
                            setConfig((prev) =>
                              isHelmConfig(prev)
                                ? { ...prev, chartPath: e.target.value }
                                : prev,
                            )
                          }
                          placeholder="./charts/app"
                          className="w-full px-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-1">
                          Values File (optional)
                        </label>
                        <input
                          type="text"
                          value={config.valuesPath || ""}
                          onChange={(e) =>
                            setConfig((prev) =>
                              isHelmConfig(prev)
                                ? { ...prev, valuesPath: e.target.value }
                                : prev,
                            )
                          }
                          placeholder="./values.yaml"
                          className="w-full px-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Docker Option */}
            <div
              onClick={() => handleMethodChange("docker")}
              className={cn(
                "border rounded-lg p-4 cursor-pointer transition-all",
                config.method === "docker"
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "border-outline/50 hover:border-outline hover:bg-surface/50",
              )}
            >
              <div className="flex items-start gap-4">
                <input
                  type="radio"
                  name="method"
                  value="docker"
                  checked={config.method === "docker"}
                  onChange={() => handleMethodChange("docker")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-on-surface mb-1">Docker</h3>
                  <p className="text-sm text-on-surface-variant">
                    Build and deploy from a Dockerfile. Simple setup for
                    containerized applications.
                  </p>
                  {isDockerConfig(config) && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-1">
                          Dockerfile Path
                        </label>
                        <input
                          type="text"
                          value={config.dockerfilePath}
                          onChange={(e) =>
                            setConfig((prev) =>
                              isDockerConfig(prev)
                                ? { ...prev, dockerfilePath: e.target.value }
                                : prev,
                            )
                          }
                          placeholder="./Dockerfile"
                          className="w-full px-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-1">
                          Build Context
                        </label>
                        <input
                          type="text"
                          value={config.context || ""}
                          onChange={(e) =>
                            setConfig((prev) =>
                              isDockerConfig(prev)
                                ? { ...prev, context: e.target.value }
                                : prev,
                            )
                          }
                          placeholder="."
                          className="w-full px-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Kubernetes Manifests Option */}
            <div
              onClick={() => handleMethodChange("manifests")}
              className={cn(
                "border rounded-lg p-4 cursor-pointer transition-all",
                config.method === "manifests"
                  ? "border-primary bg-primary/5 ring-2 ring-primary"
                  : "border-outline/50 hover:border-outline hover:bg-surface/50",
              )}
            >
              <div className="flex items-start gap-4">
                <input
                  type="radio"
                  name="method"
                  value="manifests"
                  checked={config.method === "manifests"}
                  onChange={() => handleMethodChange("manifests")}
                  className="mt-1"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-on-surface mb-1">
                    Kubernetes Manifests
                  </h3>
                  <p className="text-sm text-on-surface-variant">
                    Apply raw Kubernetes YAML manifests. Full control over
                    resource definitions.
                  </p>
                  {isManifestsConfig(config) && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-on-surface mb-1">
                        Manifests Directory
                      </label>
                      <input
                        type="text"
                        value={config.directory}
                        onChange={(e) =>
                          setConfig((prev) =>
                            isManifestsConfig(prev)
                              ? { ...prev, directory: e.target.value }
                              : prev,
                          )
                        }
                        placeholder="./k8s"
                        className="w-full px-3 py-2 border border-outline/50 rounded-lg bg-surface text-on-surface placeholder:text-on-surface-variant/50"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Managed Services */}
        <Card className="mb-6 p-6">
          <h2 className="text-lg font-semibold text-on-surface mb-2">
            Managed Services
          </h2>
          <p className="text-sm text-on-surface-variant mb-4">
            Select infrastructure services to provision automatically. These
            will be managed by the platform with automatic backups and scaling.
          </p>
          <div className="space-y-3">
            {/* PostgreSQL */}
            <label
              className={cn(
                "flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors",
                config.managedServices?.postgres?.enabled
                  ? "border-primary bg-primary/5"
                  : "border-outline/50 hover:border-outline",
              )}
            >
              <input
                type="checkbox"
                checked={config.managedServices?.postgres?.enabled ?? false}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    managedServices: {
                      ...prev.managedServices,
                      postgres: { enabled: e.target.checked },
                    },
                  }))
                }
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-on-surface">
                    PostgreSQL
                  </span>
                  <span className="px-1.5 py-0.5 text-xs rounded bg-secondary-container text-on-secondary-container">
                    Database
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant">
                  Managed PostgreSQL with automatic backups
                </p>
              </div>
            </label>

            {/* Redis */}
            <label
              className={cn(
                "flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors",
                config.managedServices?.redis?.enabled
                  ? "border-primary bg-primary/5"
                  : "border-outline/50 hover:border-outline",
              )}
            >
              <input
                type="checkbox"
                checked={config.managedServices?.redis?.enabled ?? false}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    managedServices: {
                      ...prev.managedServices,
                      redis: { enabled: e.target.checked },
                    },
                  }))
                }
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-on-surface">Redis</span>
                  <span className="px-1.5 py-0.5 text-xs rounded bg-secondary-container text-on-secondary-container">
                    Cache
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant">
                  In-memory cache for sessions and queues
                </p>
              </div>
            </label>

            {/* OpenSearch */}
            <label
              className={cn(
                "flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors",
                config.managedServices?.opensearch?.enabled
                  ? "border-primary bg-primary/5"
                  : "border-outline/50 hover:border-outline",
              )}
            >
              <input
                type="checkbox"
                checked={config.managedServices?.opensearch?.enabled ?? false}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    managedServices: {
                      ...prev.managedServices,
                      opensearch: { enabled: e.target.checked },
                    },
                  }))
                }
                className="w-4 h-4"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-on-surface">
                    OpenSearch
                  </span>
                  <span className="px-1.5 py-0.5 text-xs rounded bg-secondary-container text-on-secondary-container">
                    Search
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant">
                  Full-text search and analytics engine
                </p>
              </div>
            </label>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-on-surface bg-surface border border-outline rounded-md hover:bg-secondary-container transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            className="px-6 py-2 text-sm font-medium text-on-primary bg-primary rounded-md hover:opacity-90 transition-opacity"
          >
            Continue
          </button>
        </div>
      </form>
    </div>
  );
}
