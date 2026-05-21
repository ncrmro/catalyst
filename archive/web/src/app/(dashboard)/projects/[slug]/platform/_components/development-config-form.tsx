"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateEnvironmentConfig } from "@/actions/environment-config";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  EnvironmentConfig,
  ProjectType,
  PackageManager,
  DetectionConfidence,
} from "@/types/environment-config";
import { cn } from "@/lib/utils";

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

type DeploymentMethod = "helm" | "docker" | "manifests";

const DEPLOYMENT_METHODS: { value: DeploymentMethod; label: string }[] = [
  { value: "helm", label: "Helm Chart" },
  { value: "docker", label: "Docker" },
  { value: "manifests", label: "K8s Manifests" },
];

interface DevelopmentConfigFormProps {
  projectId: string;
  environmentName: string;
  config?: EnvironmentConfig | null;
  onSave?: () => void;
}

export function DevelopmentConfigForm({
  projectId,
  environmentName,
  config,
  onSave,
}: DevelopmentConfigFormProps) {
  const router = useRouter();
  const [localConfig, setLocalConfig] = useState<EnvironmentConfig | null>(
    config ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasSuccessfulDetection =
    localConfig?.autoDetect !== false &&
    localConfig?.projectType &&
    localConfig?.projectType !== "unknown";

  // Detection ran but couldn't identify project type
  const hasFailedDetection =
    localConfig?.autoDetect !== false &&
    localConfig?.projectType === "unknown" &&
    localConfig?.detectedAt;

  const isOverridden =
    localConfig?.autoDetect === false && localConfig?.overriddenAt;

  const handleOverride = () => {
    setLocalConfig((prev) =>
      prev
        ? {
            ...prev,
            autoDetect: false,
            overriddenAt: new Date().toISOString(),
          }
        : prev,
    );
  };

  const handleReEnableAutoDetect = () => {
    setLocalConfig((prev) =>
      prev
        ? {
            ...prev,
            autoDetect: true,
            overriddenAt: undefined,
          }
        : prev,
    );
  };

  const handleMethodChange = (method: DeploymentMethod) => {
    if (!localConfig) return;

    // Create a new config with the selected method
    const baseConfig = {
      autoDetect: localConfig.autoDetect,
      projectType: localConfig.projectType,
      packageManager: localConfig.packageManager,
      devCommand: localConfig.devCommand,
      workdir: localConfig.workdir,
      confidence: localConfig.confidence,
      detectedAt: localConfig.detectedAt,
      overriddenAt: localConfig.overriddenAt,
      managedServices: localConfig.managedServices,
    };

    let newConfig: EnvironmentConfig;
    switch (method) {
      case "helm":
        newConfig = { ...baseConfig, method: "helm", chartPath: "./charts" };
        break;
      case "docker":
        newConfig = {
          ...baseConfig,
          method: "docker",
          dockerfilePath: "Dockerfile",
          context: ".",
        };
        break;
      case "manifests":
        newConfig = {
          ...baseConfig,
          method: "manifests",
          directory: "./k8s",
        };
        break;
      default:
        // Exhaustive check
        return;
    }

    setLocalConfig(newConfig);
  };

  const handleFieldChange = (field: string, value: string) => {
    if (!localConfig) return;
    setLocalConfig({ ...localConfig, [field]: value } as EnvironmentConfig);
  };

  const handleManagedServiceToggle = (
    service: "postgres" | "redis" | "opensearch",
    enabled: boolean,
  ) => {
    if (!localConfig) return;

    const currentServices = localConfig.managedServices || {};
    const currentServiceConfig = currentServices[service];
    const normalizedServiceConfig =
      currentServiceConfig && typeof currentServiceConfig === "object"
        ? currentServiceConfig
        : { enabled: Boolean(currentServiceConfig) };

    setLocalConfig({
      ...localConfig,
      managedServices: {
        ...currentServices,
        [service]: { ...normalizedServiceConfig, enabled },
      },
    } as EnvironmentConfig);
  };

  const handleSubmit = async () => {
    if (!localConfig) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateEnvironmentConfig(
        projectId,
        environmentName,
        localConfig,
      );
      if (!result.success) {
        setError(result.error || "Failed to update configuration");
        return;
      }
      setSuccess(true);
      router.refresh();
      onSave?.();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // No config yet
  if (!localConfig) {
    return (
      <div className="py-4 text-center">
        <p className="text-on-surface-variant">
          No development environment configured
        </p>
        <p className="text-sm text-on-surface-variant/70 mt-1">
          Configure a development environment to enable PR previews
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-Detection Status - Failed */}
      {hasFailedDetection && (
        <div className="p-4 rounded-lg border border-warning/30 bg-warning/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-warning/20">
              <svg
                className="w-4 h-4 text-warning"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <span className="font-medium text-on-surface">
                Could not auto-detect project type
              </span>
              <p className="text-sm text-on-surface-variant mt-1">
                Unable to determine project configuration from repository
                structure. Please configure manually below.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Detection Status - Success */}
      {hasSuccessfulDetection && (
        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
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
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-on-surface">
                    Auto-detected:{" "}
                    {getProjectTypeLabel(localConfig.projectType!)}
                  </span>
                  {localConfig.packageManager && (
                    <span className="text-sm text-on-surface-variant">
                      with {formatPackageManager(localConfig.packageManager)}
                    </span>
                  )}
                  {localConfig.confidence && (
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs rounded-full",
                        getConfidenceBadgeClasses(localConfig.confidence),
                      )}
                    >
                      {localConfig.confidence} confidence
                    </span>
                  )}
                </div>
                {localConfig.devCommand && (
                  <p className="text-sm text-on-surface-variant mt-1">
                    Dev command:{" "}
                    <code className="px-1.5 py-0.5 bg-surface rounded text-xs font-mono">
                      {localConfig.devCommand}
                    </code>
                  </p>
                )}
                {localConfig.workdir && (
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    Working directory:{" "}
                    <code className="px-1.5 py-0.5 bg-surface rounded text-xs font-mono">
                      {localConfig.workdir}
                    </code>
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleOverride}
              className="px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface border border-outline/50 rounded-md hover:bg-surface transition-colors"
            >
              Override
            </button>
          </div>
        </div>
      )}

      {/* Manual Override Notice */}
      {isOverridden && (
        <div className="p-4 rounded-lg border border-outline/30 bg-surface">
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
              onClick={handleReEnableAutoDetect}
              className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 border border-primary/50 rounded-md hover:bg-primary/5 transition-colors"
            >
              Re-enable auto-detect
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md bg-error/10 text-error border border-error/20 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-md bg-success/10 text-success border border-success/20 text-sm">
          Configuration saved successfully
        </div>
      )}

      {/* Deployment Method */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-on-surface">
          Deployment Method
        </h4>
        <div className="grid grid-cols-3 gap-4">
          {DEPLOYMENT_METHODS.map(({ value, label }) => (
            <div
              key={value}
              className={cn(
                "cursor-pointer rounded-lg border p-4 hover:bg-muted/50 transition-colors",
                localConfig.method === value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-input",
              )}
              onClick={() => handleMethodChange(value)}
            >
              <div className="font-medium text-on-surface">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Method-specific fields */}
      {localConfig.method === "helm" && "chartPath" in localConfig && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-on-surface">Helm Chart</h4>
          <div className="grid gap-2">
            <label className="text-sm text-muted-foreground">Chart Path</label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={localConfig.chartPath}
              onChange={(e) => handleFieldChange("chartPath", e.target.value)}
              placeholder="./charts"
            />
          </div>
        </div>
      )}

      {localConfig.method === "docker" && "dockerfilePath" in localConfig && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-on-surface">Docker</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm text-muted-foreground">
                Dockerfile Path
              </label>
              <input
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={localConfig.dockerfilePath}
                onChange={(e) =>
                  handleFieldChange("dockerfilePath", e.target.value)
                }
                placeholder="Dockerfile"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm text-muted-foreground">
                Build Context
              </label>
              <input
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={localConfig.context}
                onChange={(e) => handleFieldChange("context", e.target.value)}
                placeholder="."
              />
            </div>
          </div>
        </div>
      )}

      {localConfig.method === "manifests" && "directory" in localConfig && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-on-surface">
            Kubernetes Manifests
          </h4>
          <div className="grid gap-2">
            <label className="text-sm text-muted-foreground">
              Manifests Directory
            </label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={localConfig.directory}
              onChange={(e) => handleFieldChange("directory", e.target.value)}
              placeholder="./k8s"
            />
          </div>
        </div>
      )}

      {/* Advanced Options - Managed Services */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-on-surface">
          Advanced Options
        </h4>

        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-3 text-left text-sm font-medium bg-surface-container rounded-md hover:bg-surface-container-highest transition-colors">
            <svg
              className="w-4 h-4 transition-transform [&[data-state=open]]:rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span>Managed Services</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="space-y-3">
              {/* PostgreSQL */}
              <div
                className={cn(
                  "rounded-lg border p-4",
                  localConfig.managedServices?.postgres?.enabled
                    ? "border-primary/50 bg-primary/5"
                    : "border-input",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-on-surface">
                      PostgreSQL
                    </span>
                    <span className="text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded">
                      Database
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={
                        localConfig.managedServices?.postgres?.enabled || false
                      }
                      onChange={(e) =>
                        handleManagedServiceToggle("postgres", e.target.checked)
                      }
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>

              {/* Redis */}
              <div
                className={cn(
                  "rounded-lg border p-4",
                  localConfig.managedServices?.redis?.enabled
                    ? "border-primary/50 bg-primary/5"
                    : "border-input",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-on-surface">Redis</span>
                    <span className="text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded">
                      Cache
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={
                        localConfig.managedServices?.redis?.enabled || false
                      }
                      onChange={(e) =>
                        handleManagedServiceToggle("redis", e.target.checked)
                      }
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>

              {/* OpenSearch */}
              <div
                className={cn(
                  "rounded-lg border p-4",
                  localConfig.managedServices?.opensearch?.enabled
                    ? "border-primary/50 bg-primary/5"
                    : "border-input",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-on-surface">
                      OpenSearch
                    </span>
                    <span className="text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded">
                      Search
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={
                        localConfig.managedServices?.opensearch?.enabled ||
                        false
                      }
                      onChange={(e) =>
                        handleManagedServiceToggle(
                          "opensearch",
                          e.target.checked,
                        )
                      }
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t border-outline/30">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
