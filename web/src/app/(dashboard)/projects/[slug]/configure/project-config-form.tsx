"use client";

import { useReducer, useState } from "react";
import { useRouter } from "next/navigation";
import { updateProjectConfig } from "@/actions/project-config";
import { EntityCard } from "@/components/ui/entity-card";
import type {
  ProjectConfig,
  ResourceConfig,
  ManagedServicesConfig,
} from "@/types/project-config";
import type { EnvironmentConfig } from "@/types/environment-config";
import { ImageConfigForm } from "./image-config-form";
import { ResourcesConfigForm } from "./resources-config-form";
import { ManagedServicesForm } from "./managed-services-form";
import { DevelopmentEnvironmentSection } from "./development-environment-section";

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

interface ProjectConfigFormProps {
  projectId: string;
  initialConfig?: ProjectConfig | null;
  developmentEnvironment?: {
    id: string;
    config: EnvironmentConfig | null;
  };
}

export function ProjectConfigForm({
  projectId,
  initialConfig,
  developmentEnvironment,
}: ProjectConfigFormProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(
    configReducer,
    initialConfig || DEFAULT_CONFIG,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Collapse state for each section (all collapsed by default)
  const [imageExpanded, setImageExpanded] = useState(false);
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateProjectConfig(projectId, state);
      if (!result.success) {
        setError(result.error || "Failed to update configuration");
        return;
      }
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-on-background">
            Project Configuration
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure how your application is built and deployed.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-on-surface bg-surface border border-outline rounded-md hover:bg-secondary-container transition-colors"
            onClick={() => router.back()}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-error/10 text-error border border-error/20">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Development Environment - always visible, not collapsible */}
        <DevelopmentEnvironmentSection
          environmentId={developmentEnvironment?.id}
          config={developmentEnvironment?.config}
        />

        {/* 2. Image Configuration - collapsible */}
        <EntityCard
          title="Image Configuration"
          subtitle="Configure how your Docker image is built and tagged"
          expandable
          expanded={imageExpanded}
          onToggle={() => setImageExpanded(!imageExpanded)}
          expandedContent={
            <ImageConfigForm
              config={state.defaultImage}
              onChange={(updates) =>
                dispatch({ type: "UPDATE_IMAGE", payload: updates })
              }
            />
          }
        />

        {/* 3. Resource Limits - collapsible */}
        <EntityCard
          title="Resource Limits"
          subtitle="Set CPU, memory, and replica defaults"
          expandable
          expanded={resourcesExpanded}
          onToggle={() => setResourcesExpanded(!resourcesExpanded)}
          expandedContent={
            <ResourcesConfigForm
              config={
                state.defaultResources || DEFAULT_CONFIG.defaultResources!
              }
              onChange={(updates) =>
                dispatch({ type: "UPDATE_RESOURCES", payload: updates })
              }
            />
          }
        />

        {/* 4. Managed Services - collapsible */}
        <EntityCard
          title="Managed Services"
          subtitle="Enable PostgreSQL, Redis, or other services"
          expandable
          expanded={servicesExpanded}
          onToggle={() => setServicesExpanded(!servicesExpanded)}
          expandedContent={
            <ManagedServicesForm
              config={
                state.defaultManagedServices ||
                DEFAULT_CONFIG.defaultManagedServices!
              }
              onChange={(updates) =>
                dispatch({ type: "UPDATE_MANAGED_SERVICES", payload: updates })
              }
            />
          }
        />
      </form>
    </div>
  );
}
