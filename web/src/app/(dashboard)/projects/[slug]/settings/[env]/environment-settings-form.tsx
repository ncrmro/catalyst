"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@tetrastack/react-glass-components";
import {
  saveDeploymentConfig,
  type EnvironmentName,
  type DeploymentStrategy,
  type CIProvider,
  type DeploymentConfig,
} from "@/actions/deployment-configs";
import type { ProjectWithRelations } from "@/models/projects";
import { GitHubActionsGuide } from "./github-actions-guide";

interface EnvironmentSettingsFormProps {
  project: ProjectWithRelations;
  environmentName: EnvironmentName;
  initialConfig?: {
    id: string;
    enabled: boolean;
    deploymentStrategy: string;
    ciProvider: string;
    triggerBranch: string;
    autoDeploy: boolean;
    requireApproval: boolean;
    config: DeploymentConfig | null;
  };
}

const environmentLabels: Record<EnvironmentName, string> = {
  production: "Production",
  staging: "Staging",
  preview: "Preview",
};

const environmentDescriptions: Record<EnvironmentName, string> = {
  production:
    "Your live, customer-facing environment. Configure with care as changes affect real users.",
  staging:
    "A production-like environment for final testing before release. Ideal for QA and stakeholder reviews.",
  preview:
    "Ephemeral environments created for each pull request. Automatically cleaned up when PR is closed.",
};

const defaultBranches: Record<EnvironmentName, string> = {
  production: "main",
  staging: "develop",
  preview: "*",
};

export function EnvironmentSettingsForm({
  project,
  environmentName,
  initialConfig,
}: EnvironmentSettingsFormProps) {
  const router = useRouter();

  // Form state
  const [enabled, setEnabled] = useState(initialConfig?.enabled ?? false);
  const [deploymentStrategy, setDeploymentStrategy] =
    useState<DeploymentStrategy>(
      (initialConfig?.deploymentStrategy as DeploymentStrategy) ?? "docker",
    );
  const [ciProvider, setCiProvider] = useState<CIProvider>(
    (initialConfig?.ciProvider as CIProvider) ?? "internal",
  );
  const [triggerBranch, setTriggerBranch] = useState(
    initialConfig?.triggerBranch ?? defaultBranches[environmentName],
  );
  const [autoDeploy, setAutoDeploy] = useState(
    initialConfig?.autoDeploy ?? environmentName === "preview",
  );
  const [requireApproval, setRequireApproval] = useState(
    initialConfig?.requireApproval ?? environmentName === "production",
  );

  // Config details
  const [dockerfilePath, setDockerfilePath] = useState(
    initialConfig?.config?.dockerfilePath ?? "./Dockerfile",
  );
  const [dockerImage, setDockerImage] = useState(
    initialConfig?.config?.dockerImage ?? "",
  );
  const [helmChartPath, setHelmChartPath] = useState(
    initialConfig?.config?.helmChartPath ?? "./charts/app",
  );
  const [helmValuesPath, setHelmValuesPath] = useState(
    initialConfig?.config?.helmValuesPath ?? "",
  );
  const [kubernetesManifestPath, setKubernetesManifestPath] = useState(
    initialConfig?.config?.kubernetesManifestPath ?? "./k8s",
  );
  const [resourcesCpu, setResourcesCpu] = useState(
    initialConfig?.config?.resources?.cpu ?? "500m",
  );
  const [resourcesMemory, setResourcesMemory] = useState(
    initialConfig?.config?.resources?.memory ?? "512Mi",
  );
  const [resourcesReplicas, setResourcesReplicas] = useState(
    initialConfig?.config?.resources?.replicas ?? 1,
  );

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const config: DeploymentConfig = {
        dockerfilePath:
          deploymentStrategy === "docker" ? dockerfilePath : undefined,
        dockerImage:
          deploymentStrategy === "docker" && dockerImage
            ? dockerImage
            : undefined,
        helmChartPath:
          deploymentStrategy === "helm" ? helmChartPath : undefined,
        helmValuesPath:
          deploymentStrategy === "helm" && helmValuesPath
            ? helmValuesPath
            : undefined,
        kubernetesManifestPath:
          deploymentStrategy === "kubernetes"
            ? kubernetesManifestPath
            : undefined,
        resources: {
          cpu: resourcesCpu,
          memory: resourcesMemory,
          replicas: resourcesReplicas,
        },
      };

      const result = await saveDeploymentConfig({
        projectId: project.id,
        environmentName,
        enabled,
        deploymentStrategy,
        ciProvider,
        triggerBranch,
        autoDeploy,
        requireApproval,
        config,
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        router.refresh();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save configuration",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <GlassCard>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-on-surface mb-2">
              {environmentLabels[environmentName]} Environment
            </h2>
            <p className="text-on-surface-variant">
              {environmentDescriptions[environmentName]}
            </p>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <span className="text-sm font-medium text-on-surface">
              {enabled ? "Enabled" : "Disabled"}
            </span>
            <div
              className={`relative w-11 h-6 rounded-full transition-colors ${
                enabled ? "bg-primary" : "bg-surface-variant"
              }`}
              onClick={() => setEnabled(!enabled)}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  enabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
          </label>
        </div>
      </GlassCard>

      {/* Error/Success Messages */}
      {error && (
        <div className="p-4 bg-error-container text-on-error-container rounded-lg border border-error">
          <p className="font-semibold mb-1">Error</p>
          <p>{error}</p>
        </div>
      )}
      {success && (
        <div className="p-4 bg-success-container text-on-success-container rounded-lg border border-success">
          <p>Configuration saved successfully!</p>
        </div>
      )}

      {/* CI Provider Selection */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-on-surface mb-4">
          CI/CD Provider
        </h3>
        <p className="text-sm text-on-surface-variant mb-4">
          Choose who handles building and deploying your application.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Internal (Catalyst) */}
          <label
            className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              ciProvider === "internal"
                ? "border-primary bg-primary-container/20"
                : "border-outline hover:bg-surface-variant/30"
            }`}
          >
            <input
              type="radio"
              name="ciProvider"
              value="internal"
              checked={ciProvider === "internal"}
              onChange={(e) => setCiProvider(e.target.value as CIProvider)}
              className="mt-1 w-4 h-4 text-primary"
            />
            <div className="flex-1">
              <div className="font-semibold text-on-surface mb-1">
                Catalyst (Internal)
              </div>
              <p className="text-sm text-on-surface-variant">
                We handle building and deploying your app. Just push code and
                we&apos;ll take care of the rest.
              </p>
            </div>
          </label>

          {/* GitHub Actions */}
          <label
            className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              ciProvider === "github_actions"
                ? "border-primary bg-primary-container/20"
                : "border-outline hover:bg-surface-variant/30"
            }`}
          >
            <input
              type="radio"
              name="ciProvider"
              value="github_actions"
              checked={ciProvider === "github_actions"}
              onChange={(e) => setCiProvider(e.target.value as CIProvider)}
              className="mt-1 w-4 h-4 text-primary"
            />
            <div className="flex-1">
              <div className="font-semibold text-on-surface mb-1">
                GitHub Actions
              </div>
              <p className="text-sm text-on-surface-variant">
                Build in GitHub Actions and push to our registry, or deploy
                directly to your cluster.
              </p>
            </div>
          </label>

          {/* GitLab CI */}
          <label
            className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              ciProvider === "gitlab_ci"
                ? "border-primary bg-primary-container/20"
                : "border-outline hover:bg-surface-variant/30"
            }`}
          >
            <input
              type="radio"
              name="ciProvider"
              value="gitlab_ci"
              checked={ciProvider === "gitlab_ci"}
              onChange={(e) => setCiProvider(e.target.value as CIProvider)}
              className="mt-1 w-4 h-4 text-primary"
            />
            <div className="flex-1">
              <div className="font-semibold text-on-surface mb-1">
                GitLab CI
              </div>
              <p className="text-sm text-on-surface-variant">
                Use GitLab CI/CD pipelines for building and deploying.
              </p>
            </div>
          </label>

          {/* External */}
          <label
            className={`flex items-start gap-4 p-4 border-2 rounded-lg cursor-pointer transition-colors ${
              ciProvider === "external"
                ? "border-primary bg-primary-container/20"
                : "border-outline hover:bg-surface-variant/30"
            }`}
          >
            <input
              type="radio"
              name="ciProvider"
              value="external"
              checked={ciProvider === "external"}
              onChange={(e) => setCiProvider(e.target.value as CIProvider)}
              className="mt-1 w-4 h-4 text-primary"
            />
            <div className="flex-1">
              <div className="font-semibold text-on-surface mb-1">
                External / Manual
              </div>
              <p className="text-sm text-on-surface-variant">
                You handle CI/CD through your own tooling. We&apos;ll provide
                the deployment target.
              </p>
            </div>
          </label>
        </div>
      </GlassCard>

      {/* GitHub Actions Guide (shown when GitHub Actions is selected) */}
      {ciProvider === "github_actions" && (
        <GitHubActionsGuide
          project={project}
          environmentName={environmentName}
          deploymentStrategy={deploymentStrategy}
        />
      )}

      {/* Deployment Strategy */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-on-surface mb-4">
          Deployment Strategy
        </h3>
        <p className="text-sm text-on-surface-variant mb-4">
          How should your application be deployed to Kubernetes?
        </p>

        <div className="space-y-4">
          {/* Strategy Selection */}
          <div className="flex flex-wrap gap-4">
            <label
              className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                deploymentStrategy === "docker"
                  ? "bg-primary text-on-primary"
                  : "bg-surface-variant text-on-surface-variant hover:bg-surface-variant/70"
              }`}
            >
              <input
                type="radio"
                name="deploymentStrategy"
                value="docker"
                checked={deploymentStrategy === "docker"}
                onChange={(e) =>
                  setDeploymentStrategy(e.target.value as DeploymentStrategy)
                }
                className="sr-only"
              />
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13.983 11.078h2.119a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.119a.185.185 0 00-.185.185v1.888c0 .102.083.185.185.185m-2.954-5.43h2.118a.186.186 0 00.186-.186V3.574a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.186m0 2.716h2.118a.187.187 0 00.186-.186V6.29a.186.186 0 00-.186-.185h-2.118a.185.185 0 00-.185.185v1.887c0 .102.082.185.185.186m-2.93 0h2.12a.186.186 0 00.184-.186V6.29a.185.185 0 00-.185-.185H8.1a.185.185 0 00-.185.185v1.887c0 .102.083.185.185.186m-2.964 0h2.119a.186.186 0 00.185-.186V6.29a.185.185 0 00-.185-.185H5.136a.186.186 0 00-.186.185v1.887c0 .102.084.185.186.186m5.893 2.715h2.118a.186.186 0 00.186-.185V9.006a.186.186 0 00-.186-.186h-2.118a.185.185 0 00-.185.185v1.888c0 .102.082.185.185.185m-2.93 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.185.185 0 00-.184.185v1.888c0 .102.083.185.185.185m-2.964 0h2.119a.185.185 0 00.185-.185V9.006a.185.185 0 00-.185-.186h-2.119a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-2.92 0h2.12a.185.185 0 00.184-.185V9.006a.185.185 0 00-.184-.186h-2.12a.186.186 0 00-.186.186v1.887c0 .102.084.185.186.185m-.038 2.715h2.118a.186.186 0 00.186-.185v-1.888a.185.185 0 00-.186-.185H2.136a.186.186 0 00-.186.185v1.888c0 .102.084.185.186.185" />
              </svg>
              Docker
            </label>

            <label
              className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                deploymentStrategy === "helm"
                  ? "bg-primary text-on-primary"
                  : "bg-surface-variant text-on-surface-variant hover:bg-surface-variant/70"
              }`}
            >
              <input
                type="radio"
                name="deploymentStrategy"
                value="helm"
                checked={deploymentStrategy === "helm"}
                onChange={(e) =>
                  setDeploymentStrategy(e.target.value as DeploymentStrategy)
                }
                className="sr-only"
              />
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4c5.3 0 9.6 4.3 9.6 9.6s-4.3 9.6-9.6 9.6S2.4 17.3 2.4 12 6.7 2.4 12 2.4z" />
              </svg>
              Helm Chart
            </label>

            <label
              className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                deploymentStrategy === "kubernetes"
                  ? "bg-primary text-on-primary"
                  : "bg-surface-variant text-on-surface-variant hover:bg-surface-variant/70"
              }`}
            >
              <input
                type="radio"
                name="deploymentStrategy"
                value="kubernetes"
                checked={deploymentStrategy === "kubernetes"}
                onChange={(e) =>
                  setDeploymentStrategy(e.target.value as DeploymentStrategy)
                }
                className="sr-only"
              />
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10.204 14.35l.007.01-.999 2.413a5.171 5.171 0 01-2.075-2.597l2.578-.437.004.005a.44.44 0 01.485.606zm3.59 0a.44.44 0 01.485-.606l.004-.005 2.577.437a5.18 5.18 0 01-2.074 2.597l-.999-2.413.007-.01z" />
              </svg>
              Kubernetes Manifests
            </label>
          </div>

          {/* Docker Configuration */}
          {deploymentStrategy === "docker" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-outline">
              <div>
                <label
                  htmlFor="dockerfilePath"
                  className="block text-sm font-medium text-on-surface mb-2"
                >
                  Dockerfile Path
                </label>
                <input
                  type="text"
                  id="dockerfilePath"
                  value={dockerfilePath}
                  onChange={(e) => setDockerfilePath(e.target.value)}
                  placeholder="./Dockerfile"
                  className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-on-surface-variant mt-1">
                  Path to Dockerfile relative to repository root
                </p>
              </div>
              <div>
                <label
                  htmlFor="dockerImage"
                  className="block text-sm font-medium text-on-surface mb-2"
                >
                  Pre-built Image (Optional)
                </label>
                <input
                  type="text"
                  id="dockerImage"
                  value={dockerImage}
                  onChange={(e) => setDockerImage(e.target.value)}
                  placeholder="ghcr.io/org/app:latest"
                  className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-on-surface-variant mt-1">
                  Use a pre-built image instead of building
                </p>
              </div>
            </div>
          )}

          {/* Helm Configuration */}
          {deploymentStrategy === "helm" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-outline">
              <div>
                <label
                  htmlFor="helmChartPath"
                  className="block text-sm font-medium text-on-surface mb-2"
                >
                  Helm Chart Path
                </label>
                <input
                  type="text"
                  id="helmChartPath"
                  value={helmChartPath}
                  onChange={(e) => setHelmChartPath(e.target.value)}
                  placeholder="./charts/app"
                  className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-on-surface-variant mt-1">
                  Path to Helm chart directory
                </p>
              </div>
              <div>
                <label
                  htmlFor="helmValuesPath"
                  className="block text-sm font-medium text-on-surface mb-2"
                >
                  Values File (Optional)
                </label>
                <input
                  type="text"
                  id="helmValuesPath"
                  value={helmValuesPath}
                  onChange={(e) => setHelmValuesPath(e.target.value)}
                  placeholder={`./charts/app/values-${environmentName}.yaml`}
                  className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <p className="text-xs text-on-surface-variant mt-1">
                  Environment-specific values file
                </p>
              </div>
            </div>
          )}

          {/* Kubernetes Configuration */}
          {deploymentStrategy === "kubernetes" && (
            <div className="pt-4 border-t border-outline">
              <label
                htmlFor="kubernetesManifestPath"
                className="block text-sm font-medium text-on-surface mb-2"
              >
                Manifests Path
              </label>
              <input
                type="text"
                id="kubernetesManifestPath"
                value={kubernetesManifestPath}
                onChange={(e) => setKubernetesManifestPath(e.target.value)}
                placeholder="./k8s"
                className="w-full max-w-md px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
              <p className="text-xs text-on-surface-variant mt-1">
                Path to directory containing Kubernetes manifest files
              </p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Branch & Trigger Settings */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-on-surface mb-4">
          Trigger Settings
        </h3>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="triggerBranch"
              className="block text-sm font-medium text-on-surface mb-2"
            >
              Trigger Branch
            </label>
            <input
              type="text"
              id="triggerBranch"
              value={triggerBranch}
              onChange={(e) => setTriggerBranch(e.target.value)}
              placeholder={defaultBranches[environmentName]}
              className="w-full max-w-md px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="text-xs text-on-surface-variant mt-1">
              {environmentName === "preview"
                ? 'Use "*" to trigger on all branches (for PR previews)'
                : `Branch that triggers ${environmentName} deployments`}
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t border-outline">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoDeploy}
                onChange={(e) => setAutoDeploy(e.target.checked)}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <div>
                <span className="font-medium text-on-surface">
                  Auto-deploy on push
                </span>
                <p className="text-xs text-on-surface-variant">
                  Automatically deploy when changes are pushed to the trigger
                  branch
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <div>
                <span className="font-medium text-on-surface">
                  Require approval
                </span>
                <p className="text-xs text-on-surface-variant">
                  Deployments require manual approval before proceeding
                </p>
              </div>
            </label>
          </div>
        </div>
      </GlassCard>

      {/* Resource Configuration */}
      <GlassCard>
        <h3 className="text-lg font-semibold text-on-surface mb-4">
          Resource Limits
        </h3>
        <p className="text-sm text-on-surface-variant mb-4">
          Configure the resources allocated to your application containers.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="resourcesCpu"
              className="block text-sm font-medium text-on-surface mb-2"
            >
              CPU Limit
            </label>
            <input
              type="text"
              id="resourcesCpu"
              value={resourcesCpu}
              onChange={(e) => setResourcesCpu(e.target.value)}
              placeholder="500m"
              className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="text-xs text-on-surface-variant mt-1">
              e.g., 500m, 1, 2
            </p>
          </div>

          <div>
            <label
              htmlFor="resourcesMemory"
              className="block text-sm font-medium text-on-surface mb-2"
            >
              Memory Limit
            </label>
            <input
              type="text"
              id="resourcesMemory"
              value={resourcesMemory}
              onChange={(e) => setResourcesMemory(e.target.value)}
              placeholder="512Mi"
              className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="text-xs text-on-surface-variant mt-1">
              e.g., 256Mi, 512Mi, 1Gi
            </p>
          </div>

          <div>
            <label
              htmlFor="resourcesReplicas"
              className="block text-sm font-medium text-on-surface mb-2"
            >
              Replicas
            </label>
            <input
              type="number"
              id="resourcesReplicas"
              value={resourcesReplicas}
              onChange={(e) =>
                setResourcesReplicas(parseInt(e.target.value, 10) || 1)
              }
              min={1}
              max={10}
              className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <p className="text-xs text-on-surface-variant mt-1">
              Number of pod replicas
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={() => router.push(`/projects/${project.slug}/settings`)}
          className="px-4 py-2 text-sm font-medium text-on-surface bg-surface border border-outline rounded-md hover:bg-surface-variant transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className={`px-6 py-2 text-sm font-medium text-on-primary bg-primary rounded-md transition-colors ${
            isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"
          }`}
        >
          {isSubmitting ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </form>
  );
}
