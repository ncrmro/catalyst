/**
 * Project CR Synchronization
 *
 * Synchronizes project configuration from database (source of truth) to Kubernetes Project CR.
 * This ensures the operator has the correct configuration to deploy environments.
 */

import { getProjects } from "@/models/projects";
import { getEnvironments } from "@/models/environments";
import { createProjectCR, updateProjectCR } from "./k8s-operator";
import type {
  ProjectCRSpec,
  SourceConfig,
  EnvironmentTemplate,
} from "@/types/crd";
import type { EnvironmentConfig } from "@/types/environment-config";

/**
 * Convert environment config method to deployment type
 */
function configMethodToDeploymentType(
  method: EnvironmentConfig["method"],
): "helm" | "manifest" | "kustomize" | "docker-compose" {
  switch (method) {
    case "helm":
      return "helm";
    case "docker":
      return "manifest";
    case "manifests":
      return "manifest";
    default:
      return "manifest";
  }
}

/**
 * Convert environment config to template
 */
function environmentConfigToTemplate(
  config: EnvironmentConfig,
): EnvironmentTemplate {
  const baseTemplate: EnvironmentTemplate = {
    sourceRef: "primary",
    type: configMethodToDeploymentType(config.method),
    path: "./",
    values: {},
  };

  // Set path based on method
  if (config.method === "helm" && config.chartPath) {
    baseTemplate.path = config.chartPath;
  } else if (config.method === "manifests" && config.directory) {
    baseTemplate.path = config.directory;
  }

  // Add builds for docker method
  if (config.method === "docker") {
    baseTemplate.builds = [
      {
        name: "app",
        sourceRef: "primary",
        dockerfile: config.dockerfilePath || "Dockerfile",
        path: config.context || "./",
      },
    ];
  }

  return baseTemplate;
}

/**
 * Sync project configuration from database to Kubernetes Project CR
 *
 * @param projectId Database project ID
 * @returns Success status and optional error message
 */
export async function syncProjectToK8s(
  projectId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Fetch project from database (source of truth)
    const projects = await getProjects({ ids: [projectId] });
    const project = projects[0];

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // 2. Build sources array from project repositories
    const sources: SourceConfig[] = project.repositories.map((rel, idx) => ({
      name: rel.isPrimary ? "primary" : `source-${idx}`,
      repositoryUrl: rel.repo.url,
      branch: "main", // TODO: Get default branch from GitHub API
    }));

    // Ensure we have at least one source
    if (sources.length === 0) {
      return { success: false, error: "Project has no repositories" };
    }

    // 3. Build templates from detected configs
    const environments = await getEnvironments({ projectIds: [projectId] });
    const templates: Record<string, EnvironmentTemplate> = {};

    // Group by environment type (development/deployment)
    for (const env of environments) {
      if (!env.config) continue;

      // Determine template key
      const templateKey =
        env.environment === "development" ? "development" : "deployment";

      // Only use first detected config of this type as template
      if (!templates[templateKey]) {
        templates[templateKey] = environmentConfigToTemplate(env.config);
      }
    }

    // 4. Create or update Project CR
    const sanitizedName = project.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");
    const spec: ProjectCRSpec = {
      sources,
      templates,
      resources: {
        defaultQuota: {
          cpu: "2",
          memory: "4Gi",
        },
      },
    };

    // Try create first
    const createResult = await createProjectCR("default", sanitizedName, spec);

    // If it already exists, update it
    if (createResult.isExisting) {
      const updateResult = await updateProjectCR(
        "default",
        sanitizedName,
        spec,
      );
      return updateResult;
    }

    // Return create result
    return createResult;
  } catch (error) {
    console.error("Failed to sync project to K8s:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
