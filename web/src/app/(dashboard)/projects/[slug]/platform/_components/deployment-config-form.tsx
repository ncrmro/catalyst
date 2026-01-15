"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProjectConfig } from "@/actions/project-config";
import { ImageConfigForm } from "./forms/image-config-form";
import { ResourcesConfigForm } from "./forms/resources-config-form";
import { ManagedServicesForm } from "./forms/managed-services-form";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  ProjectConfig,
  ResourceConfig,
  ManagedServicesConfig,
} from "@/types/project-config";
import type {
  ProjectType,
  PackageManager,
  DetectionConfidence,
  EnvironmentConfig,
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

// Action Types
type Action =
  | { type: "SET_CONFIG"; payload: ProjectConfig }
  | { type: "UPDATE_IMAGE"; payload: Partial<ProjectConfig["defaultImage"]> }
  | { type: "UPDATE_MANAGED_SERVICES"; payload: Partial<ManagedServicesConfig> }
  | { type: "UPDATE_RESOURCES"; payload: Partial<ResourceConfig> };

// Reducer
function configReducer(state: ProjectConfig, action: Action): ProjectConfig {
  switch (action.type) {
    case "SET_CONFIG":
      return action.payload;
    case "UPDATE_IMAGE":
      return {
        ...state,
        defaultImage: { ...state.defaultImage, ...action.payload },
      };
    case "UPDATE_MANAGED_SERVICES":
      return {
        ...state,
        defaultManagedServices: {
          ...(state.defaultManagedServices ||
            DEFAULT_CONFIG.defaultManagedServices!),
          ...action.payload,
        },
      };
    case "UPDATE_RESOURCES":
      return {
        ...state,
        defaultResources: {
          ...(state.defaultResources || DEFAULT_CONFIG.defaultResources!),
          ...action.payload,
        },
      };
    default:
      return state;
  }
}

const DEFAULT_CONFIG: ProjectConfig = {
  version: "v1",
  defaultImage: {
    registry: { url: "" },
    build: {
      method: "dockerfile",
      dockerfilePath: "Dockerfile",
      context: ".",
    },
    tag: {
      pattern: "{project}:{sha}",
    },
  },
  defaultManagedServices: {
    postgres: {
      enabled: false,
      version: "16",
      storageSize: "1Gi",
      database: "app",
    },
    redis: { enabled: false, version: "7", storageSize: "256Mi" },
  },
  defaultResources: {
    requests: { cpu: "100m", memory: "128Mi" },
    limits: { cpu: "500m", memory: "512Mi" },
    replicas: 1,
  },
};

interface DeploymentConfigFormProps {
  projectId: string;
  projectConfig?: ProjectConfig | null;
  environmentConfig?: EnvironmentConfig | null;
  onSave?: () => void;
}

export function DeploymentConfigForm({
  projectId,
  projectConfig,
  environmentConfig,
  onSave,
}: DeploymentConfigFormProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(
    configReducer,
    projectConfig || DEFAULT_CONFIG,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Get auto-detection info from environment config (production/staging)
  const hasSuccessfulDetection =
    environmentConfig &&
    environmentConfig.autoDetect !== false &&
    environmentConfig.projectType &&
    environmentConfig.projectType !== "unknown";

  // Detection ran but couldn't identify project type
  const hasFailedDetection =
    environmentConfig &&
    environmentConfig.autoDetect !== false &&
    environmentConfig.projectType === "unknown" &&
    environmentConfig.detectedAt;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await updateProjectConfig(projectId, state);
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

  return (
    <div className="space-y-6">
      {/* Auto-Detection Status - Failed */}
      {hasFailedDetection && environmentConfig && (
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
      {hasSuccessfulDetection && environmentConfig && (
        <div className="p-4 rounded-lg border border-primary/30 bg-primary/5">
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
                  {getProjectTypeLabel(environmentConfig.projectType!)}
                </span>
                {environmentConfig.packageManager && (
                  <span className="text-sm text-on-surface-variant">
                    with{" "}
                    {formatPackageManager(environmentConfig.packageManager)}
                  </span>
                )}
                {environmentConfig.confidence && (
                  <span
                    className={cn(
                      "px-2 py-0.5 text-xs rounded-full",
                      getConfidenceBadgeClasses(environmentConfig.confidence),
                    )}
                  >
                    {environmentConfig.confidence} confidence
                  </span>
                )}
              </div>
              {environmentConfig.devCommand && (
                <p className="text-sm text-on-surface-variant mt-1">
                  Dev command:{" "}
                  <code className="px-1.5 py-0.5 bg-surface rounded text-xs font-mono">
                    {environmentConfig.devCommand}
                  </code>
                </p>
              )}
            </div>
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

      {/* Advanced Options - Collapsed by Default */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-on-surface">
          Advanced Options
        </h4>

        {/* Image Configuration */}
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
            <span>Image Configuration</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <ImageConfigForm
              config={state.defaultImage}
              onChange={(updates) =>
                dispatch({ type: "UPDATE_IMAGE", payload: updates })
              }
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Resource Limits */}
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
            <span>Resource Limits</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <ResourcesConfigForm
              config={
                state.defaultResources || DEFAULT_CONFIG.defaultResources!
              }
              onChange={(updates) =>
                dispatch({ type: "UPDATE_RESOURCES", payload: updates })
              }
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Managed Services */}
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
            <ManagedServicesForm
              config={
                state.defaultManagedServices ||
                DEFAULT_CONFIG.defaultManagedServices!
              }
              onChange={(updates) =>
                dispatch({ type: "UPDATE_MANAGED_SERVICES", payload: updates })
              }
            />
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
