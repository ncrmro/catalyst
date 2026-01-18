"use server";

import { z } from "zod";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getProjects } from "@/models/projects";
import { revalidatePath } from "next/cache";
import { getUserTeamIds } from "@/lib/team-auth";
import { createEnvironmentCR } from "@/lib/k8s-operator";
import { generateNameUnchecked } from "@/lib/name-generator";
import {
  generateProjectNamespace,
  sanitizeNamespaceComponent,
} from "@/lib/namespace-utils";
import { ensureProjectNamespace } from "@catalyst/kubernetes-client";
import { getClusterConfig } from "@/lib/k8s-client";
import type { EnvironmentType } from "@/types/crd";

/**
 * Server actions for creating and managing project environments
 */

const CreateEnvironmentSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  environmentType: z.enum(["deployment", "development"]),
  deploymentSubType: z.string().nullable().optional(),
  branch: z
    .string()
    .nullable()
    .transform((val) => val ?? "main"),
});

export interface EnvironmentResult {
  success: boolean;
  message: string;
  environmentId?: string;
  environmentType?: string;
  projectId?: string;
}

/**
 * Create a new environment for a project
 *
 * @param formData Form data containing projectId and environmentType
 * @returns Result object with status and created environment details
 */
export async function createProjectEnvironment(
  formData: FormData,
): Promise<EnvironmentResult> {
  try {
    // Validate and parse form data
    const parseResult = CreateEnvironmentSchema.safeParse({
      projectId: formData.get("projectId"),
      environmentType: formData.get("environmentType"),
      deploymentSubType: formData.get("deploymentSubType"),
      branch: formData.get("branch"),
    });

    if (!parseResult.success) {
      return {
        success: false,
        message: parseResult.error.issues[0]?.message || "Invalid form data",
      };
    }

    const { projectId, environmentType, deploymentSubType, branch } =
      parseResult.data;
    const validatedEnvType = environmentType as EnvironmentType;

    // Check if the user has access to this project
    const userTeamIds = await getUserTeamIds();
    const projectsResult = await getProjects({
      ids: [projectId],
      teamIds: userTeamIds,
    });

    if (projectsResult.length === 0) {
      return {
        success: false,
        message: "Project not found or you do not have access to it",
      };
    }

    const project = projectsResult[0];

    // Get team information to generate proper namespace
    const projectWithTeam = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      with: {
        team: true,
      },
    });

    if (!projectWithTeam?.team) {
      return {
        success: false,
        message: "Project team not found",
      };
    }

    const teamName = projectWithTeam.team.name;

    // Get the primary repository ID for this project
    if (!project.repositories || project.repositories.length === 0) {
      return {
        success: false,
        message: "Project has no primary repository configured",
      };
    }

    const primaryRepo = project.repositories.find((r) => r.isPrimary);
    if (!primaryRepo) {
      return {
        success: false,
        message: "Project has repositories but none are marked as primary",
      };
    }

    const sanitizedProjectName = project.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");

    // Sync project configuration to K8s Project CR
    // This ensures the operator has the correct configuration from the database
    const { syncProjectToK8s } = await import("@/lib/sync-project-cr");
    const syncResult = await syncProjectToK8s(projectId);

    if (!syncResult.success) {
      return {
        success: false,
        message: `Failed to sync Project to K8s: ${syncResult.error || "Unknown error"}`,
      };
    }

    // Generate environment name based on type
    let environmentName: string;
    if (validatedEnvType === "development") {
      // Generate random name for development environments
      const randomName = generateNameUnchecked();
      environmentName = `dev-${randomName.name}`;
    } else {
      // Use deploymentSubType (production or staging) as the name for deployment environments
      environmentName = deploymentSubType || "production";
    }

    // Ensure project namespace exists
    const kubeConfig = await getClusterConfig();
    if (!kubeConfig) {
      return {
        success: false,
        message: "No cluster config available",
      };
    }

    const projectNamespace = generateProjectNamespace(
      teamName,
      sanitizedProjectName,
    );
    await ensureProjectNamespace(kubeConfig, teamName, sanitizedProjectName);

    // Create the Environment CR in project namespace with hierarchy labels
    const environmentLabels = {
      "catalyst.dev/team": sanitizeNamespaceComponent(teamName),
      "catalyst.dev/project": sanitizeNamespaceComponent(sanitizedProjectName),
      "catalyst.dev/environment": sanitizeNamespaceComponent(environmentName),
    };
    const envResult = await createEnvironmentCR(
      projectNamespace,
      environmentName,
      {
        projectRef: {
          name: sanitizedProjectName,
        },
        type: validatedEnvType,
        sources: [
          {
            name: "primary",
            commitSha: "HEAD", // TODO: Get actual commit SHA
            branch: branch,
          },
        ],
        config: {
          envVars: [],
        },
      },
      environmentLabels,
    );

    // Check if Environment creation failed
    if (!envResult.success) {
      return {
        success: false,
        message: `Failed to create Environment CR: ${envResult.error || "Unknown error"}`,
      };
    }

    // Revalidate the projects and environments pages (routes use slugs, not IDs)
    revalidatePath(`/projects/${project.slug}`);
    revalidatePath(`/environments/${project.slug}`);

    // Return success
    return {
      success: true,
      message: `Successfully created ${environmentType} environment: ${environmentName}`,
      environmentId: environmentName, // Using name as ID since we don't have DB ID
      environmentType,
      projectId,
    };
  } catch (error) {
    console.error("Error creating project environment:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unknown error creating environment",
    };
  }
}

/**
 * Handle form submission and redirect back to the project page
 * This is the handler used by the form action in the UI
 */
export async function configureProjectEnvironments(
  formData: FormData,
): Promise<EnvironmentResult> {
  try {
    const projectId = formData.get("projectId") as string;
    const environmentType = formData.get("environmentType") as string;

    if (!projectId || !environmentType) {
      throw new Error("Missing required fields");
    }

    // Create the environment
    return await createProjectEnvironment(formData);
  } catch (error) {
    console.error("Error in configureProjectEnvironments:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unknown error configuring environment",
    };
  }
}
