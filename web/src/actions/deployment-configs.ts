"use server";

/**
 * Deployment Configurations Actions
 *
 * Server actions for managing project deployment configurations.
 * Handles authentication and authorization before delegating to models layer.
 */

import { revalidatePath } from "next/cache";
import { getUserTeamIds } from "@/lib/team-auth";
import { getProjects } from "@/models/projects";
import {
  getProjectDeploymentConfigs,
  getDeploymentConfigByProjectAndEnv,
  upsertDeploymentConfig,
  initializeProjectDeploymentConfigs,
  type EnvironmentName,
  type DeploymentStrategy,
  type CIProvider,
  type DeploymentConfig,
} from "@/models/deployment-configs";

// Re-export types for use in components
export type {
  EnvironmentName,
  DeploymentStrategy,
  CIProvider,
  DeploymentConfig,
};

export interface DeploymentConfigResult {
  success: boolean;
  message: string;
  data?: Awaited<ReturnType<typeof getProjectDeploymentConfigs>>;
}

export interface SingleConfigResult {
  success: boolean;
  message: string;
  data?: Awaited<ReturnType<typeof getDeploymentConfigByProjectAndEnv>>;
}

/**
 * Fetch all deployment configs for a project
 */
export async function fetchProjectDeploymentConfigs(
  projectId: string,
): Promise<DeploymentConfigResult> {
  try {
    // Verify user has access to this project
    const userTeamIds = await getUserTeamIds();
    const projects = await getProjects({
      ids: [projectId],
      teamIds: userTeamIds,
    });

    if (projects.length === 0) {
      return {
        success: false,
        message: "Project not found or you do not have access to it",
      };
    }

    const configs = await getProjectDeploymentConfigs(projectId);

    // If no configs exist, initialize them
    if (configs.length === 0) {
      await initializeProjectDeploymentConfigs(projectId);
      const newConfigs = await getProjectDeploymentConfigs(projectId);
      return {
        success: true,
        message: "Deployment configurations initialized",
        data: newConfigs,
      };
    }

    return {
      success: true,
      message: "Deployment configurations fetched successfully",
      data: configs,
    };
  } catch (error) {
    console.error("Error fetching deployment configs:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unknown error fetching deployment configurations",
    };
  }
}

/**
 * Fetch a single deployment config by project and environment
 */
export async function fetchDeploymentConfig(
  projectId: string,
  environmentName: EnvironmentName,
): Promise<SingleConfigResult> {
  try {
    // Verify user has access to this project
    const userTeamIds = await getUserTeamIds();
    const projects = await getProjects({
      ids: [projectId],
      teamIds: userTeamIds,
    });

    if (projects.length === 0) {
      return {
        success: false,
        message: "Project not found or you do not have access to it",
      };
    }

    const config = await getDeploymentConfigByProjectAndEnv(
      projectId,
      environmentName,
    );

    if (!config) {
      // Initialize configs if they don't exist
      await initializeProjectDeploymentConfigs(projectId);
      const newConfig = await getDeploymentConfigByProjectAndEnv(
        projectId,
        environmentName,
      );
      return {
        success: true,
        message: "Deployment configuration initialized",
        data: newConfig ?? undefined,
      };
    }

    return {
      success: true,
      message: "Deployment configuration fetched successfully",
      data: config,
    };
  } catch (error) {
    console.error("Error fetching deployment config:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unknown error fetching deployment configuration",
    };
  }
}

/**
 * Form data interface for deployment config updates
 */
export interface DeploymentConfigFormData {
  projectId: string;
  environmentName: EnvironmentName;
  enabled: boolean;
  deploymentStrategy: DeploymentStrategy;
  ciProvider: CIProvider;
  triggerBranch: string;
  autoDeploy: boolean;
  requireApproval: boolean;
  config: DeploymentConfig;
}

/**
 * Save deployment configuration
 * Handles form submission from the settings page
 */
export async function saveDeploymentConfig(
  formData: DeploymentConfigFormData,
): Promise<SingleConfigResult> {
  try {
    const {
      projectId,
      environmentName,
      enabled,
      deploymentStrategy,
      ciProvider,
      triggerBranch,
      autoDeploy,
      requireApproval,
      config,
    } = formData;

    // Verify user has access to this project
    const userTeamIds = await getUserTeamIds();
    const projects = await getProjects({
      ids: [projectId],
      teamIds: userTeamIds,
    });

    if (projects.length === 0) {
      return {
        success: false,
        message: "Project not found or you do not have access to it",
      };
    }

    const project = projects[0];

    // Upsert the configuration
    const savedConfig = await upsertDeploymentConfig({
      projectId,
      environmentName,
      enabled,
      deploymentStrategy,
      ciProvider,
      triggerBranch,
      autoDeploy,
      requireApproval,
      config,
    });

    // Revalidate project pages
    revalidatePath(`/projects/${project.slug}`);
    revalidatePath(`/projects/${project.slug}/settings`);

    return {
      success: true,
      message: `${environmentName} deployment configuration saved successfully`,
      data: savedConfig ? { ...savedConfig, project: project } : undefined,
    };
  } catch (error) {
    console.error("Error saving deployment config:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unknown error saving deployment configuration",
    };
  }
}

/**
 * Handle form submission from FormData
 * Converts FormData to typed object and saves
 */
export async function saveDeploymentConfigFromForm(
  formData: FormData,
): Promise<SingleConfigResult> {
  const projectId = formData.get("projectId") as string;
  const environmentName = formData.get("environmentName") as EnvironmentName;
  const enabled = formData.get("enabled") === "true";
  const deploymentStrategy = formData.get(
    "deploymentStrategy",
  ) as DeploymentStrategy;
  const ciProvider = formData.get("ciProvider") as CIProvider;
  const triggerBranch = (formData.get("triggerBranch") as string) || "main";
  const autoDeploy = formData.get("autoDeploy") === "true";
  const requireApproval = formData.get("requireApproval") === "true";

  // Build config object from form data
  const config: DeploymentConfig = {
    dockerfilePath: (formData.get("dockerfilePath") as string) || undefined,
    dockerBakeFile: (formData.get("dockerBakeFile") as string) || undefined,
    dockerImage: (formData.get("dockerImage") as string) || undefined,
    helmChartPath: (formData.get("helmChartPath") as string) || undefined,
    helmValuesPath: (formData.get("helmValuesPath") as string) || undefined,
    kubernetesManifestPath:
      (formData.get("kubernetesManifestPath") as string) || undefined,
    resources: {
      cpu: (formData.get("resourcesCpu") as string) || undefined,
      memory: (formData.get("resourcesMemory") as string) || undefined,
      replicas: formData.get("resourcesReplicas")
        ? parseInt(formData.get("resourcesReplicas") as string, 10)
        : undefined,
    },
  };

  return saveDeploymentConfig({
    projectId,
    environmentName,
    enabled,
    deploymentStrategy,
    ciProvider,
    triggerBranch,
    autoDeploy,
    requireApproval,
    config,
  });
}

/**
 * Enable or disable a deployment environment
 */
export async function toggleDeploymentEnvironment(
  projectId: string,
  environmentName: EnvironmentName,
  enabled: boolean,
): Promise<SingleConfigResult> {
  try {
    // Verify user has access to this project
    const userTeamIds = await getUserTeamIds();
    const projects = await getProjects({
      ids: [projectId],
      teamIds: userTeamIds,
    });

    if (projects.length === 0) {
      return {
        success: false,
        message: "Project not found or you do not have access to it",
      };
    }

    const project = projects[0];

    // Get existing config
    let config = await getDeploymentConfigByProjectAndEnv(
      projectId,
      environmentName,
    );

    if (!config) {
      // Initialize if doesn't exist
      await initializeProjectDeploymentConfigs(projectId);
      config = await getDeploymentConfigByProjectAndEnv(
        projectId,
        environmentName,
      );
    }

    if (!config) {
      return {
        success: false,
        message: "Failed to get deployment configuration",
      };
    }

    // Update enabled status
    const updatedConfig = await upsertDeploymentConfig({
      ...config,
      enabled,
    });

    // Revalidate project pages
    revalidatePath(`/projects/${project.slug}`);
    revalidatePath(`/projects/${project.slug}/settings`);

    return {
      success: true,
      message: `${environmentName} environment ${enabled ? "enabled" : "disabled"}`,
      data: updatedConfig ? { ...updatedConfig, project: project } : undefined,
    };
  } catch (error) {
    console.error("Error toggling deployment environment:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unknown error toggling deployment environment",
    };
  }
}
