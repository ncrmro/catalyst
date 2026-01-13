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
import type { EnvironmentConfig } from "@/types/environment-config";
import type { ProjectConfig } from "@/types/project-config";

// Use 'default' namespace since Environment CRs are watched there
const CATALYST_SYSTEM_NAMESPACE = "default";

/**
 * Default project configuration for Catalyst self-deployment
 */
const CATALYST_PROJECT_CONFIG: ProjectConfig = {
  version: "v1",
  defaultImage: {
    registry: { url: "ghcr.io/ncrmro" },
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
      enabled: true,
      version: "16",
      storageSize: "1Gi",
      database: "catalyst",
    },
    redis: { enabled: false, version: "7", storageSize: "256Mi" },
  },
  defaultResources: {
    requests: { cpu: "250m", memory: "256Mi" },
    limits: { cpu: "1", memory: "1Gi" },
    replicas: 1,
  },
  development: {
    resources: {
      requests: { cpu: "100m", memory: "128Mi" },
      limits: { cpu: "500m", memory: "512Mi" },
      replicas: 1,
    },
  },
};

/**
 * Default environment configuration for Catalyst self-deployment.
 * Uses the manifests deployment method with the local K3s manifests directory.
 */
const CATALYST_ENVIRONMENT_CONFIG: EnvironmentConfig = {
  method: "manifests",
  directory: ".k3s-vm/manifests",
  managedServices: {
    postgres: { enabled: true },
    redis: { enabled: false },
    opensearch: { enabled: false },
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

  // Get the repo for this team
  const [catalystRepo] = await db
    .select()
    .from(repos)
    .where(
      and(
        eq(repos.fullName, "ncrmro/catalyst"),
        eq(repos.teamId, teamId),
      ),
    )
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
      projectConfig: CATALYST_PROJECT_CONFIG,
    })
    .returning();

  // Link repo to project
  if (catalystRepo && project) {
    await db
      .insert(projectsRepos)
      .values({
        projectId: project.id,
        repoId: catalystRepo.id,
        repoFullName: catalystRepo.fullName,
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
      config: CATALYST_ENVIRONMENT_CONFIG,
    },
    {
      environment: "production",
      subType: "production" as const,
      config: CATALYST_ENVIRONMENT_CONFIG,
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
        config: env.config,
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
      sources: [
        {
          name: "main",
          commitSha: "HEAD",
          branch: "main",
        },
      ],
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
      sources: [
        {
          name: "main",
          commitSha: "HEAD",
          branch: "main",
        },
      ],
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
