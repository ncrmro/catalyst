import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface DeploymentConfig {
  method: "helm" | "docker" | "manifests";
  helm?: {
    chartPath: string;
    valuesPath?: string;
  };
  docker?: {
    dockerfilePath: string;
    context?: string;
  };
  manifests?: {
    directory: string;
  };
  managedServices: {
    postgres: boolean;
    redis: boolean;
    opensearch: boolean;
  };
}

export interface DeploymentConfigFormProps {
  initialConfig?: Partial<DeploymentConfig>;
  onSubmit?: (config: DeploymentConfig) => void;
  onBack?: () => void;
}

const DEFAULT_CONFIG: DeploymentConfig = {
  method: "helm",
  helm: {
    chartPath: "./charts/app",
    valuesPath: "",
  },
  docker: {
    dockerfilePath: "./Dockerfile",
    context: ".",
  },
  manifests: {
    directory: "./k8s",
  },
  managedServices: {
    postgres: false,
    redis: false,
    opensearch: false,
  },
};

export function DeploymentConfigForm({
  initialConfig,
  onSubmit,
  onBack,
}: DeploymentConfigFormProps) {
  const [config, setConfig] = useState<DeploymentConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
    managedServices: {
      ...DEFAULT_CONFIG.managedServices,
      ...initialConfig?.managedServices,
    },
  });

  const handleMethodChange = (method: DeploymentConfig["method"]) => {
    setConfig((prev) => ({ ...prev, method }));
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
                  {config.method === "helm" && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-1">
                          Chart Path
                        </label>
                        <input
                          type="text"
                          value={config.helm?.chartPath || ""}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              helm: {
                                ...prev.helm,
                                chartPath: e.target.value,
                              },
                            }))
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
                          value={config.helm?.valuesPath || ""}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              helm: {
                                ...prev.helm,
                                chartPath: prev.helm?.chartPath || "",
                                valuesPath: e.target.value,
                              },
                            }))
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
                  {config.method === "docker" && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-on-surface mb-1">
                          Dockerfile Path
                        </label>
                        <input
                          type="text"
                          value={config.docker?.dockerfilePath || ""}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              docker: {
                                ...prev.docker,
                                dockerfilePath: e.target.value,
                                context: prev.docker?.context || ".",
                              },
                            }))
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
                          value={config.docker?.context || ""}
                          onChange={(e) =>
                            setConfig((prev) => ({
                              ...prev,
                              docker: {
                                ...prev.docker,
                                dockerfilePath:
                                  prev.docker?.dockerfilePath || "./Dockerfile",
                                context: e.target.value,
                              },
                            }))
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
                  {config.method === "manifests" && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-on-surface mb-1">
                        Manifests Directory
                      </label>
                      <input
                        type="text"
                        value={config.manifests?.directory || ""}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            manifests: { directory: e.target.value },
                          }))
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
                config.managedServices.postgres
                  ? "border-primary bg-primary/5"
                  : "border-outline/50 hover:border-outline",
              )}
            >
              <input
                type="checkbox"
                checked={config.managedServices.postgres}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    managedServices: {
                      ...prev.managedServices,
                      postgres: e.target.checked,
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
                config.managedServices.redis
                  ? "border-primary bg-primary/5"
                  : "border-outline/50 hover:border-outline",
              )}
            >
              <input
                type="checkbox"
                checked={config.managedServices.redis}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    managedServices: {
                      ...prev.managedServices,
                      redis: e.target.checked,
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
                config.managedServices.opensearch
                  ? "border-primary bg-primary/5"
                  : "border-outline/50 hover:border-outline",
              )}
            >
              <input
                type="checkbox"
                checked={config.managedServices.opensearch}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    managedServices: {
                      ...prev.managedServices,
                      opensearch: e.target.checked,
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
