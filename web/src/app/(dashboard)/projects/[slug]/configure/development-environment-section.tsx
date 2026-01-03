"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  EnvironmentConfig,
  DetectionConfidence,
  ProjectType,
  PackageManager,
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

export interface DevelopmentEnvironmentSectionProps {
  environmentId?: string;
  config?: EnvironmentConfig | null;
  onConfigChange?: (config: EnvironmentConfig) => void;
}

export function DevelopmentEnvironmentSection({
  environmentId,
  config,
}: DevelopmentEnvironmentSectionProps) {
  const [localConfig, setLocalConfig] = useState<EnvironmentConfig | null>(
    config ?? null,
  );

  // No development environment configured yet
  if (!environmentId || !localConfig) {
    return (
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-on-surface mb-2">
          Development Environment
        </h2>
        <p className="text-sm text-on-surface-variant mb-4">
          Configure how PR preview environments are created. This serves as the
          template for all preview deployments.
        </p>
        <div className="p-4 rounded-lg border border-dashed border-outline/50 bg-surface-variant/20">
          <p className="text-sm text-on-surface-variant text-center">
            No development environment configured yet. Create one from the
            project overview page.
          </p>
        </div>
      </Card>
    );
  }

  const hasDetection =
    localConfig.autoDetect !== false &&
    localConfig.projectType &&
    localConfig.projectType !== "unknown";

  const isOverridden =
    localConfig.autoDetect === false && localConfig.overriddenAt;

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold text-on-surface mb-2">
        Development Environment
      </h2>
      <p className="text-sm text-on-surface-variant mb-4">
        Configure how PR preview environments are created. This serves as the
        template for all preview deployments.
      </p>

      {/* Auto-Detection Status */}
      {hasDetection && (
        <div className="mb-4 p-4 rounded-lg border border-primary/30 bg-primary/5">
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
                  <p className="text-sm text-on-surface-variant mt-0.5">
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
              onClick={() =>
                setLocalConfig((prev) =>
                  prev
                    ? {
                        ...prev,
                        autoDetect: false,
                        overriddenAt: new Date().toISOString(),
                      }
                    : prev,
                )
              }
              className="px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface border border-outline/50 rounded-md hover:bg-surface transition-colors"
            >
              Override
            </button>
          </div>
        </div>
      )}

      {/* Manual Override Notice */}
      {isOverridden && (
        <div className="mb-4 p-4 rounded-lg border border-outline/30 bg-surface">
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
                setLocalConfig((prev) =>
                  prev
                    ? {
                        ...prev,
                        autoDetect: true,
                        overriddenAt: undefined,
                      }
                    : prev,
                )
              }
              className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 border border-primary/50 rounded-md hover:bg-primary/5 transition-colors"
            >
              Re-enable auto-detect
            </button>
          </div>
        </div>
      )}

      {/* Deployment Method Display */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-surface-variant/30">
          <div>
            <span className="text-sm font-medium text-on-surface">
              Deployment Method
            </span>
            <p className="text-sm text-on-surface-variant capitalize">
              {localConfig.method}
            </p>
          </div>
        </div>

        {/* Method-specific details */}
        {localConfig.method === "helm" && "chartPath" in localConfig && (
          <div className="p-3 rounded-lg bg-surface-variant/30">
            <span className="text-sm font-medium text-on-surface">
              Helm Chart
            </span>
            <p className="text-sm text-on-surface-variant font-mono">
              {localConfig.chartPath}
            </p>
          </div>
        )}

        {localConfig.method === "docker" && "dockerfilePath" in localConfig && (
          <div className="p-3 rounded-lg bg-surface-variant/30">
            <span className="text-sm font-medium text-on-surface">
              Dockerfile
            </span>
            <p className="text-sm text-on-surface-variant font-mono">
              {localConfig.dockerfilePath}
            </p>
          </div>
        )}

        {localConfig.method === "manifests" && "directory" in localConfig && (
          <div className="p-3 rounded-lg bg-surface-variant/30">
            <span className="text-sm font-medium text-on-surface">
              Manifests Directory
            </span>
            <p className="text-sm text-on-surface-variant font-mono">
              {localConfig.directory}
            </p>
          </div>
        )}

        {/* Managed Services Summary */}
        {localConfig.managedServices && (
          <div className="p-3 rounded-lg bg-surface-variant/30">
            <span className="text-sm font-medium text-on-surface">
              Managed Services
            </span>
            <div className="flex gap-2 mt-1">
              {localConfig.managedServices.postgres?.enabled && (
                <span className="px-2 py-0.5 text-xs rounded bg-secondary-container text-on-secondary-container">
                  PostgreSQL
                </span>
              )}
              {localConfig.managedServices.redis?.enabled && (
                <span className="px-2 py-0.5 text-xs rounded bg-secondary-container text-on-secondary-container">
                  Redis
                </span>
              )}
              {localConfig.managedServices.opensearch?.enabled && (
                <span className="px-2 py-0.5 text-xs rounded bg-secondary-container text-on-secondary-container">
                  OpenSearch
                </span>
              )}
              {!localConfig.managedServices.postgres?.enabled &&
                !localConfig.managedServices.redis?.enabled &&
                !localConfig.managedServices.opensearch?.enabled && (
                  <span className="text-sm text-on-surface-variant">None</span>
                )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
