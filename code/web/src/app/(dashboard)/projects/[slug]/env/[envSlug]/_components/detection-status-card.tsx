"use client";

import { cn } from "@/lib/utils";
import type {
  EnvironmentConfig,
  DetectionConfidence,
  ProjectType,
  PackageManager,
} from "@/types/environment-config";

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

interface DetectionStatusCardProps {
  config: EnvironmentConfig;
  onOverride?: () => void;
  onReEnableAutoDetect?: () => void;
}

export function DetectionStatusCard({
  config,
  onOverride,
  onReEnableAutoDetect,
}: DetectionStatusCardProps) {
  const hasDetection =
    config.autoDetect !== false &&
    config.projectType &&
    config.projectType !== "unknown";

  const isOverridden = config.autoDetect === false && config.overriddenAt;

  if (!hasDetection && !isOverridden) {
    return null;
  }

  if (hasDetection) {
    return (
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
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-on-surface">
                  Auto-detected: {getProjectTypeLabel(config.projectType!)}
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
              {config.workdir && (
                <p className="text-sm text-on-surface-variant mt-0.5">
                  Working directory:{" "}
                  <code className="px-1.5 py-0.5 bg-surface rounded text-xs font-mono">
                    {config.workdir}
                  </code>
                </p>
              )}
            </div>
          </div>
          {onOverride && (
            <button
              type="button"
              onClick={onOverride}
              className="px-3 py-1.5 text-sm font-medium text-on-surface-variant hover:text-on-surface border border-outline/50 rounded-md hover:bg-surface transition-colors"
            >
              Override
            </button>
          )}
        </div>
      </div>
    );
  }

  // Manual override notice
  return (
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
        {onReEnableAutoDetect && (
          <button
            type="button"
            onClick={onReEnableAutoDetect}
            className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80 border border-primary/50 rounded-md hover:bg-primary/5 transition-colors"
          >
            Re-enable auto-detect
          </button>
        )}
      </div>
    </div>
  );
}
