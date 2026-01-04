"use client";

import { cn } from "@/lib/utils";
import type { EnvironmentConfig } from "@/types/environment-config";

interface DeploymentMethodFormProps {
  config: EnvironmentConfig;
  onChange?: (updates: Partial<EnvironmentConfig>) => void;
  readOnly?: boolean;
}

export function DeploymentMethodForm({
  config,
  onChange,
  readOnly = false,
}: DeploymentMethodFormProps) {
  const handleMethodChange = (method: EnvironmentConfig["method"]) => {
    if (readOnly || !onChange) return;

    // Create base config for new method
    const baseConfig = {
      method,
      managedServices: config.managedServices,
      envVars: config.envVars,
      projectType: config.projectType,
      packageManager: config.packageManager,
      devCommand: config.devCommand,
      workdir: config.workdir,
      autoDetect: config.autoDetect,
      confidence: config.confidence,
      detectedAt: config.detectedAt,
      overriddenAt: config.overriddenAt,
    };

    switch (method) {
      case "helm":
        onChange({
          ...baseConfig,
          method: "helm",
          chartPath: "./charts/app",
          valuesPath: "./charts/app/values.yaml",
        } as EnvironmentConfig);
        break;
      case "docker":
        onChange({
          ...baseConfig,
          method: "docker",
          dockerfilePath: "Dockerfile",
          context: ".",
        } as EnvironmentConfig);
        break;
      case "manifests":
        onChange({
          ...baseConfig,
          method: "manifests",
          directory: "./k8s",
        } as EnvironmentConfig);
        break;
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    if (readOnly || !onChange) return;
    onChange({ ...config, [key]: value } as EnvironmentConfig);
  };

  return (
    <div className="space-y-4">
      {/* Method Selection */}
      <div className="grid gap-2">
        <label className="text-sm font-medium text-on-surface">
          Deployment Method
        </label>
        <div className="grid grid-cols-3 gap-4">
          {(["helm", "docker", "manifests"] as const).map((method) => (
            <div
              key={method}
              className={cn(
                "rounded-lg border p-4 transition-colors",
                readOnly
                  ? "cursor-default"
                  : "cursor-pointer hover:bg-muted/50",
                config.method === method
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-input",
              )}
              onClick={() => handleMethodChange(method)}
            >
              <div className="font-medium capitalize">{method}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {method === "helm" && "Deploy using Helm charts"}
                {method === "docker" && "Build and deploy Docker image"}
                {method === "manifests" && "Apply Kubernetes manifests"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Method-specific fields */}
      {config.method === "helm" && "chartPath" in config && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-on-surface">
              Chart Path
            </label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              value={config.chartPath}
              onChange={(e) => handleFieldChange("chartPath", e.target.value)}
              disabled={readOnly}
              placeholder="./charts/app"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-on-surface">
              Values File
            </label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              value={config.valuesPath || ""}
              onChange={(e) => handleFieldChange("valuesPath", e.target.value)}
              disabled={readOnly}
              placeholder="./charts/app/values.yaml"
            />
          </div>
        </div>
      )}

      {config.method === "docker" && "dockerfilePath" in config && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-on-surface">
              Dockerfile Path
            </label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              value={config.dockerfilePath}
              onChange={(e) =>
                handleFieldChange("dockerfilePath", e.target.value)
              }
              disabled={readOnly}
              placeholder="Dockerfile"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium text-on-surface">
              Build Context
            </label>
            <input
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              value={config.context}
              onChange={(e) => handleFieldChange("context", e.target.value)}
              disabled={readOnly}
              placeholder="."
            />
          </div>
        </div>
      )}

      {config.method === "manifests" && "directory" in config && (
        <div className="grid gap-2">
          <label className="text-sm font-medium text-on-surface">
            Manifests Directory
          </label>
          <input
            type="text"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
            value={config.directory}
            onChange={(e) => handleFieldChange("directory", e.target.value)}
            disabled={readOnly}
            placeholder="./k8s"
          />
          <p className="text-xs text-muted-foreground">
            Directory containing Kubernetes manifest files (YAML/JSON)
          </p>
        </div>
      )}
    </div>
  );
}
