"use server";

import { getProjects } from "@/models/projects";
import { revalidatePath } from "next/cache";
import { getUserTeamIds } from "@/lib/team-auth";
import { createProjectCR, createEnvironmentCR } from "@/lib/k8s-operator";
import { generateNameUnchecked } from "@/lib/name-generator";
import type { EnvironmentType } from "@/types/crd";

/**
 * Server actions for creating and managing project environments
 */

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
    const projectId = formData.get("projectId") as string;
    const environmentType = formData.get("environmentType") as string;
    const deploymentSubType = formData.get("deploymentSubType") as
      | string
      | null;

    if (!projectId || !environmentType) {
      return {
        success: false,
        message:
          "Missing required fields: projectId and environmentType are required",
      };
    }

    // Validate that the environment type is one of the allowed values
    const validEnvironmentTypes: EnvironmentType[] = [
      "deployment",
      "development",
    ];
    if (!validEnvironmentTypes.includes(environmentType as EnvironmentType)) {
      return {
        success: false,
        message: `Invalid environment type: ${environmentType}. Must be one of: ${validEnvironmentTypes.join(", ")}`,
      };
    }
    const validatedEnvType = environmentType as EnvironmentType;

    // Check if the user has access to this project
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

    // Ensure the Project CR exists (idempotent)
    // We do this to ensure the operator knows about the project
    try {
      await createProjectCR("default", sanitizedProjectName, {
        source: {
          repositoryUrl: primaryRepo.repo.url,
          branch: "main",
        },
        deployment: {
          type: "manifest",
          path: "./",
        },
      });
    } catch (e) {
      console.error("Failed to ensure K8s Project CR:", e);
      // Continue, as it might already exist or be managed elsewhere
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

    // Create the Environment CR directly
    // We bypass the database check and creation as requested
    await createEnvironmentCR("default", environmentName, {
      projectRef: {
        name: sanitizedProjectName,
      },
      type: validatedEnvType,
      source: {
        commitSha: "HEAD", // TODO: Get actual commit SHA
        branch: "main", // TODO: Get actual branch
      },
      config: {
        envVars: [],
      },
    });

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
