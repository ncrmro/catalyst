/**
 * Self-deployment seeding for Catalyst
 *
 * When SEED_SELF_DEPLOY=true, this creates:
 * 1. Catalyst project in the database
 * 2. Development and production environment records
 * 3. Kubernetes Environment CRs with appropriate deploymentMode
 */

import { db, projects, projectEnvironments, repos, projectsRepos } from "@/db";
import { eq, and } from "drizzle-orm";
import { generateSlug } from "@/lib/slug";
import {
  createEnvironmentClient,
  type EnvironmentInput,
} from "@catalyst/kubernetes-client";
import type { DeploymentConfig } from "@/types/deployment";

// Use 'default' namespace since Environment CRs are watched there
const CATALYST_SYSTEM_NAMESPACE = "default";

/**
 * Default deployment configuration for Catalyst self-deployment
 */
const CATALYST_DEPLOYMENT_CONFIG: DeploymentConfig = {
  method: "manifests",
  manifests: {
    directory: ".k3s-vm/manifests",
  },
  managedServices: {
    postgres: true,
    redis: false,
    opensearch: false,
  },
};

/**
 * Create or find the Catalyst project for a team
 */
async function ensureCatalystProject(teamId: string) {
  // Check if project already exists for this team
  const [existingProject] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.fullName, "ncrmro/catalyst"),
        eq(projects.teamId, teamId),
      ),
    )
    .limit(1);

  if (existingProject) {
    console.log("Catalyst project already exists for team:", teamId);
    return existingProject;
  }

  // Create repo if it doesn't exist
  await db
    .insert(repos)
    .values({
      githubId: 756437234,
      name: "catalyst",
      fullName: "ncrmro/catalyst",
      description: "Platform for managing deployments and infrastructure",
      url: "https://github.com/ncrmro/catalyst",
      isPrivate: false,
      language: "TypeScript",
      ownerLogin: "ncrmro",
      ownerType: "User",
      ownerAvatarUrl: "https://avatars.githubusercontent.com/u/8276365?v=4",
      teamId,
    })
    .onConflictDoNothing();

  // Get the repo
  const [catalystRepo] = await db
    .select()
    .from(repos)
    .where(eq(repos.fullName, "ncrmro/catalyst"))
    .limit(1);

  // Create project
  const [project] = await db
    .insert(projects)
    .values({
      name: "Catalyst",
      slug: generateSlug("Catalyst"),
      fullName: "ncrmro/catalyst",
      description: "Platform for managing deployments and infrastructure",
      ownerLogin: "ncrmro",
      ownerType: "User",
      ownerAvatarUrl: "https://avatars.githubusercontent.com/u/8276365?v=4",
      teamId,
    })
    .returning();

  // Link repo to project
  if (catalystRepo && project) {
    await db
      .insert(projectsRepos)
      .values({
        projectId: project.id,
        repoId: catalystRepo.id,
        isPrimary: true,
      })
      .onConflictDoNothing();
  }

  console.log("Created Catalyst project for team:", teamId);
  return project;
}

/**
 * Create development and production environment records in the database
 */
async function ensureEnvironmentRecords(projectId: string, repoId: string) {
  const environments = [
    {
      environment: "development",
      subType: "development" as const,
      deploymentConfig: CATALYST_DEPLOYMENT_CONFIG,
    },
    {
      environment: "production",
      subType: "production" as const,
      deploymentConfig: CATALYST_DEPLOYMENT_CONFIG,
    },
  ];

  const createdEnvs = [];

  for (const env of environments) {
    // Check if exists
    const [existing] = await db
      .select()
      .from(projectEnvironments)
      .where(
        and(
          eq(projectEnvironments.projectId, projectId),
          eq(projectEnvironments.environment, env.environment),
        ),
      )
      .limit(1);

    if (existing) {
      console.log(`Environment ${env.environment} already exists`);
      createdEnvs.push(existing);
      continue;
    }

    // Create environment record
    const [created] = await db
      .insert(projectEnvironments)
      .values({
        projectId,
        repoId,
        environment: env.environment,
        subType: env.subType,
        deploymentConfig: env.deploymentConfig,
      })
      .returning();

    console.log(`Created environment record: ${env.environment}`);
    createdEnvs.push(created);
  }

  return createdEnvs;
}

/**
 * Create Kubernetes Environment CRs for development and production modes.
 * Includes retry logic for transient K8s connection issues.
 */
async function createEnvironmentCRs(): Promise<{
  success: boolean;
  error?: unknown;
}> {
  const maxRetries = 3;
  const retryDelayMs = 2000;

  // Development environment CR
  const devEnvInput: EnvironmentInput = {
    apiVersion: "catalyst.catalyst.dev/v1alpha1",
    kind: "Environment",
    metadata: {
      name: "catalyst-dev",
      namespace: CATALYST_SYSTEM_NAMESPACE,
    },
    spec: {
      projectRef: {
        name: "catalyst",
      },
      type: "development",
      deploymentMode: "development",
      source: {
        commitSha: "HEAD",
        branch: "main",
      },
      config: {
        envVars: [
          { name: "NODE_ENV", value: "development" },
          { name: "SEED_SELF_DEPLOY", value: "true" },
        ],
      },
    },
  };

  // Production environment CR
  const prodEnvInput: EnvironmentInput = {
    apiVersion: "catalyst.catalyst.dev/v1alpha1",
    kind: "Environment",
    metadata: {
      name: "catalyst-prod",
      namespace: CATALYST_SYSTEM_NAMESPACE,
    },
    spec: {
      projectRef: {
        name: "catalyst",
      },
      type: "deployment",
      deploymentMode: "production",
      source: {
        commitSha: "HEAD",
        branch: "main",
      },
      config: {
        envVars: [{ name: "NODE_ENV", value: "production" }],
        // Production uses pre-built image from GHCR
        image: "ghcr.io/ncrmro/catalyst:latest",
      },
    },
  };

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const envClient = await createEnvironmentClient(
        undefined,
        CATALYST_SYSTEM_NAMESPACE,
      );

      // Apply both environments (idempotent)
      console.log(
        `Creating/updating Environment CRs (attempt ${attempt}/${maxRetries})...`,
      );

      await envClient.apply(devEnvInput);
      console.log("Development Environment CR applied successfully");

      await envClient.apply(prodEnvInput);
      console.log("Production Environment CR applied successfully");

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Attempt ${attempt}/${maxRetries} failed: ${errorMsg}`);

      if (attempt < maxRetries) {
        console.log(`Retrying in ${retryDelayMs}ms...`);
        await new Promise((r) => setTimeout(r, retryDelayMs));
      } else {
        console.error(
          "Could not create Environment CRs after all retries:",
          errorMsg,
        );
        return { success: false, error };
      }
    }
  }

  return { success: false };
}

/**
 * Main function to seed Catalyst self-deployment
 */
export async function seedSelfDeploy(teamId: string) {
  console.log("Starting Catalyst self-deployment seeding...");

  try {
    // 1. Create/find Catalyst project
    const project = await ensureCatalystProject(teamId);
    if (!project) {
      return {
        success: false,
        message: "Failed to create Catalyst project",
      };
    }

    // 2. Get the primary repo for the project
    const [projectRepo] = await db
      .select()
      .from(projectsRepos)
      .where(
        and(
          eq(projectsRepos.projectId, project.id),
          eq(projectsRepos.isPrimary, true),
        ),
      )
      .limit(1);

    if (!projectRepo) {
      return {
        success: false,
        message: "Failed to find primary repo for Catalyst project",
      };
    }

    // 3. Create environment records in database
    const envRecords = await ensureEnvironmentRecords(
      project.id,
      projectRepo.repoId,
    );

    // 4. Create Kubernetes Environment CRs
    const k8sResult = await createEnvironmentCRs();

    if (!k8sResult.success) {
      console.error("❌ Failed to create Kubernetes Environment CRs");
      console.error(
        "   Environments will not appear in the UI until CRs are created.",
      );
      console.error("   Ensure K3s is running and the operator is healthy.");
    }

    return {
      success: k8sResult.success,
      message: k8sResult.success
        ? "Catalyst self-deployment seeded successfully"
        : "Catalyst seeded but K8s Environment CRs failed to create",
      data: {
        projectId: project.id,
        projectName: project.name,
        environmentsCount: envRecords.length,
        k8sCRsCreated: k8sResult.success,
      },
    };
  } catch (error) {
    console.error("Error seeding self-deployment:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error during seeding",
    };
  }
}
