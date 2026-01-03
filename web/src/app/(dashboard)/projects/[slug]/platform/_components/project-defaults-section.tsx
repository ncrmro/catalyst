"use client";

import { useState, useReducer } from "react";
import { useRouter } from "next/navigation";
import { EntityCard } from "@/components/ui/entity-card";
import { updateProjectConfig } from "@/actions/project-config";
import { cn } from "@/lib/utils";
import type {
  ProjectConfig,
  ResourceConfig,
  ManagedServicesConfig,
  ImageConfig,
} from "@/types/project-config";

// Action Types
type Action =
  | { type: "SET_CONFIG"; payload: ProjectConfig }
  | { type: "UPDATE_IMAGE"; payload: Partial<ImageConfig> }
  | { type: "UPDATE_MANAGED_SERVICES"; payload: Partial<ManagedServicesConfig> }
  | { type: "UPDATE_RESOURCES"; payload: Partial<ResourceConfig> };

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

interface ProjectDefaultsSectionProps {
  projectId: string;
  initialConfig?: ProjectConfig | null;
}

export function ProjectDefaultsSection({
  projectId,
  initialConfig,
}: ProjectDefaultsSectionProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(
    configReducer,
    initialConfig || DEFAULT_CONFIG,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Collapse state for each section
  const [imageExpanded, setImageExpanded] = useState(false);
  const [resourcesExpanded, setResourcesExpanded] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);

  const handleSave = async () => {
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

  const config = state;
  const imageConfig = config.defaultImage;
  const resourcesConfig = config.defaultResources || DEFAULT_CONFIG.defaultResources!;
  const servicesConfig = config.defaultManagedServices || DEFAULT_CONFIG.defaultManagedServices!;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-on-surface">
            Project Defaults
          </h2>
          <p className="text-sm text-on-surface-variant">
            Default configuration inherited by all environments
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Save Defaults"}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-md bg-error/10 text-error border border-error/20">
          {error}
        </div>
      )}

      {/* Image Configuration */}
      <EntityCard
        title="Image Configuration"
        subtitle="Configure how Docker images are built and tagged"
        expandable
        expanded={imageExpanded}
        onToggle={() => setImageExpanded(!imageExpanded)}
        expandedContent={
          <ImageConfigFormInline
            config={imageConfig}
            onChange={(updates) =>
              dispatch({ type: "UPDATE_IMAGE", payload: updates })
            }
          />
        }
      />

      {/* Resource Limits */}
      <EntityCard
        title="Resource Limits"
        subtitle="Set CPU, memory, and replica defaults"
        expandable
        expanded={resourcesExpanded}
        onToggle={() => setResourcesExpanded(!resourcesExpanded)}
        expandedContent={
          <ResourcesConfigFormInline
            config={resourcesConfig}
            onChange={(updates) =>
              dispatch({ type: "UPDATE_RESOURCES", payload: updates })
            }
          />
        }
      />

      {/* Managed Services */}
      <EntityCard
        title="Managed Services"
        subtitle="Enable PostgreSQL, Redis, or other services"
        expandable
        expanded={servicesExpanded}
        onToggle={() => setServicesExpanded(!servicesExpanded)}
        expandedContent={
          <ManagedServicesFormInline
            config={servicesConfig}
            onChange={(updates) =>
              dispatch({ type: "UPDATE_MANAGED_SERVICES", payload: updates })
            }
          />
        }
      />
    </div>
  );
}

// Inline form components (simplified versions)

function ImageConfigFormInline({
  config,
  onChange,
}: {
  config: ImageConfig;
  onChange: (updates: Partial<ImageConfig>) => void;
}) {
  const handleRegistryChange = (
    key: keyof ImageConfig["registry"],
    value: string,
  ) => {
    onChange({
      registry: { ...config.registry, [key]: value },
    });
  };

  const handleBuildChange = (
    key: keyof NonNullable<ImageConfig["build"]>,
    value: string,
  ) => {
    onChange({
      build: { ...config.build!, [key]: value },
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <label className="text-sm font-medium text-on-surface">
          Registry URL
        </label>
        <input
          type="text"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          placeholder="e.g. ghcr.io/my-org"
          value={config.registry.url}
          onChange={(e) => handleRegistryChange("url", e.target.value)}
        />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium text-on-surface">
          Build Method
        </label>
        <div className="grid grid-cols-3 gap-4">
          {(["dockerfile", "buildpack", "prebuilt"] as const).map((method) => (
            <div
              key={method}
              className={cn(
                "cursor-pointer rounded-lg border p-4 hover:bg-muted/50",
                config.build?.method === method
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-input",
              )}
              onClick={() => handleBuildChange("method", method)}
            >
              <div className="font-medium capitalize">{method}</div>
            </div>
          ))}
        </div>
      </div>

      {config.build?.method === "dockerfile" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-on-surface">
              Dockerfile Path
            </label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={config.build.dockerfilePath}
              onChange={(e) =>
                handleBuildChange("dockerfilePath", e.target.value)
              }
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-on-surface">
              Build Context
            </label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={config.build.context}
              onChange={(e) => handleBuildChange("context", e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ResourcesConfigFormInline({
  config,
  onChange,
}: {
  config: ResourceConfig;
  onChange: (updates: Partial<ResourceConfig>) => void;
}) {
  const requests = config.requests ?? { cpu: "100m", memory: "128Mi" };
  const limits = config.limits ?? { cpu: "500m", memory: "512Mi" };

  const handleRequestChange = (key: "cpu" | "memory", value: string) => {
    onChange({
      requests: { ...requests, [key]: value },
    });
  };

  const handleLimitChange = (key: "cpu" | "memory", value: string) => {
    onChange({
      limits: { ...limits, [key]: value },
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-on-surface">
            Requests (Guaranteed)
          </h3>
          <div className="grid gap-2">
            <label className="text-sm text-muted-foreground">CPU</label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={requests.cpu}
              onChange={(e) => handleRequestChange("cpu", e.target.value)}
              placeholder="e.g. 100m"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-muted-foreground">Memory</label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={requests.memory}
              onChange={(e) => handleRequestChange("memory", e.target.value)}
              placeholder="e.g. 128Mi"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium text-on-surface">
            Limits (Maximum)
          </h3>
          <div className="grid gap-2">
            <label className="text-sm text-muted-foreground">CPU</label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={limits.cpu}
              onChange={(e) => handleLimitChange("cpu", e.target.value)}
              placeholder="e.g. 500m"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm text-muted-foreground">Memory</label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={limits.memory}
              onChange={(e) => handleLimitChange("memory", e.target.value)}
              placeholder="e.g. 512Mi"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-on-surface">
          Default Replicas
        </label>
        <input
          type="number"
          min={1}
          className="flex h-10 w-full max-w-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={config.replicas ?? 1}
          onChange={(e) =>
            onChange({ replicas: parseInt(e.target.value) || 1 })
          }
        />
      </div>
    </div>
  );
}

function ManagedServicesFormInline({
  config,
  onChange,
}: {
  config: ManagedServicesConfig;
  onChange: (updates: Partial<ManagedServicesConfig>) => void;
}) {
  const toggleService = (service: "postgres" | "redis", enabled: boolean) => {
    const currentServiceConfig =
      config[service] ||
      (service === "postgres"
        ? { version: "16", storageSize: "1Gi", database: "app", enabled: false }
        : { version: "7", storageSize: "256Mi", enabled: false });

    onChange({
      [service]: {
        ...currentServiceConfig,
        enabled,
      },
    });
  };

  const updateServiceConfig = (
    service: "postgres" | "redis",
    key: string,
    value: string,
  ) => {
    if (!config[service]) return;

    onChange({
      [service]: {
        ...config[service]!,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Postgres */}
      <div
        className={cn(
          "rounded-lg border p-4",
          config.postgres?.enabled
            ? "border-primary/50 bg-primary/5"
            : "border-input",
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface">PostgreSQL</span>
            <span className="text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded">
              Database
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={config.postgres?.enabled || false}
              onChange={(e) => toggleService("postgres", e.target.checked)}
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {config.postgres?.enabled && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Version
              </label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={config.postgres.version}
                onChange={(e) =>
                  updateServiceConfig("postgres", "version", e.target.value)
                }
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Storage
              </label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={config.postgres.storageSize}
                onChange={(e) =>
                  updateServiceConfig("postgres", "storageSize", e.target.value)
                }
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Database Name
              </label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={config.postgres.database}
                onChange={(e) =>
                  updateServiceConfig("postgres", "database", e.target.value)
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Redis */}
      <div
        className={cn(
          "rounded-lg border p-4",
          config.redis?.enabled
            ? "border-primary/50 bg-primary/5"
            : "border-input",
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface">Redis</span>
            <span className="text-xs bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded">
              Cache
            </span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={config.redis?.enabled || false}
              onChange={(e) => toggleService("redis", e.target.checked)}
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {config.redis?.enabled && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Version
              </label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={config.redis.version}
                onChange={(e) =>
                  updateServiceConfig("redis", "version", e.target.value)
                }
              />
            </div>
            <div className="grid gap-2">
              <label className="text-xs font-medium text-muted-foreground">
                Storage
              </label>
              <input
                type="text"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={config.redis.storageSize}
                onChange={(e) =>
                  updateServiceConfig("redis", "storageSize", e.target.value)
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
