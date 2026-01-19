/**
 * Project CR Synchronization
 *
 * Synchronizes project configuration from database (source of truth) to Kubernetes Project CR.
 * This ensures the operator has the correct configuration to deploy environments.
 */

import { db } from "@/db";
import { projects, teamsMemberships, githubUserTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getProjects } from "@/models/projects";
import { getEnvironments } from "@/models/environments";
import { createProjectCR, updateProjectCR } from "./k8s-operator";
import {
  generateTeamNamespace,
  sanitizeNamespaceComponent,
} from "./namespace-utils";
import { ensureTeamNamespace } from "@catalyst/kubernetes-client";
import { getClusterConfig } from "./k8s-client";
import type {
  ProjectCRSpec,
  SourceConfig,
  EnvironmentTemplate,
} from "@/types/crd";
import type { EnvironmentConfig } from "@/types/environment-config";

/**
 * Get GitHub installation ID for a team
 *
 * Looks up team members' GitHub tokens to find an installation ID.
 * The installation ID is needed for the operator to fetch fresh tokens
 * for git operations via the credential helper.
 *
 * @param teamId The team ID to get the installation ID for
 * @returns Installation ID or undefined if not found
 */
async function getGitHubInstallationIdForTeam(
  teamId: string,
): Promise<string | undefined> {
  // Find team members who have GitHub tokens with installation IDs
  const teamMembers = await db
    .select({
      userId: teamsMemberships.userId,
      installationId: githubUserTokens.installationId,
    })
    .from(teamsMemberships)
    .leftJoin(
      githubUserTokens,
      eq(teamsMemberships.userId, githubUserTokens.userId),
    )
    .where(eq(teamsMemberships.teamId, teamId));

  // Return the first installation ID found
  for (const member of teamMembers) {
    if (member.installationId) {
      return member.installationId;
    }
  }

  return undefined;
}

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
    // 1. Fetch project from database (source of truth) with team info
    const projectsQuery = await getProjects({ ids: [projectId] });
    const project = projectsQuery[0];

    if (!project) {
      return { success: false, error: "Project not found" };
    }

    // Get team information - need to fetch with team relation
    const projectWithTeam = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      with: {
        team: true,
        repositories: {
          with: {
            repo: true,
          },
        },
      },
    });

    if (!projectWithTeam?.team) {
      return { success: false, error: "Project team not found" };
    }

    const teamName = projectWithTeam.team.name;

    // 2. Build sources array from project repositories
    const sources: SourceConfig[] = projectWithTeam.repositories.map(
      (rel, idx) => ({
        name: rel.isPrimary ? "primary" : `source-${idx}`,
        repositoryUrl: rel.repo.url,
        branch: "main", // TODO: Get default branch from GitHub API
      }),
    );

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

    // 4. Ensure team namespace exists
    const kubeConfig = await getClusterConfig();
    if (!kubeConfig) {
      return { success: false, error: "No cluster config available" };
    }

    const teamNamespace = generateTeamNamespace(teamName);
    await ensureTeamNamespace(kubeConfig, teamName);

    // 5. Get GitHub installation ID for the team
    const githubInstallationId = await getGitHubInstallationIdForTeam(
      projectWithTeam.team.id,
    );

    // 6. Create or update Project CR in team namespace
    const sanitizedName = projectWithTeam.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");
    const spec: ProjectCRSpec = {
      githubInstallationId,
      sources,
      templates,
      resources: {
        defaultQuota: {
          cpu: "2",
          memory: "4Gi",
        },
      },
    };

    // Try create first in team namespace with labels
    const projectLabels = {
      "catalyst.dev/team": sanitizeNamespaceComponent(teamName),
      "catalyst.dev/project": sanitizeNamespaceComponent(projectWithTeam.name),
    };
    const createResult = await createProjectCR(
      teamNamespace,
      sanitizedName,
      spec,
      projectLabels,
    );

    // If it already exists, update it
    if (createResult.isExisting) {
      const updateResult = await updateProjectCR(
        teamNamespace,
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
