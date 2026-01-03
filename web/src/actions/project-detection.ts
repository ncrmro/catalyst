"use server";

import {
  detectProjectType,
  buildDetectionInput,
} from "@/lib/project-detection";
import { listDirectory, readFile } from "./version-control-provider";
import { db, projectEnvironments } from "@/db";
import { eq, and } from "drizzle-orm";
import type { EnvironmentConfig } from "@/types/environment-config";

/**
 * Run project auto-detection and save results to database.
 *
 * Checks if detection data already exists; if so, returns the cached config.
 * Otherwise, fetches repository structure via VCS provider, runs detection,
 * and upserts the result to the database.
 *
 * @param projectId - Project ID in database
 * @param repoId - Repository ID in database
 * @param repoFullName - Full repo name (e.g., "ncrmro/catalyst")
 * @param environmentName - Environment name ("production", "staging", "development")
 * @param workdir - Optional working directory for monorepos
 * @returns The detected or cached environment configuration
 */
export async function runProjectDetection(
  projectId: string,
  repoId: string,
  repoFullName: string,
  environmentName: string,
  workdir?: string,
): Promise<EnvironmentConfig> {
  // Check if detection already exists and has projectType
  const [existing] = await db
    .select({ config: projectEnvironments.config })
    .from(projectEnvironments)
    .where(
      and(
        eq(projectEnvironments.projectId, projectId),
        eq(projectEnvironments.repoId, repoId),
        eq(projectEnvironments.environment, environmentName),
      ),
    )
    .limit(1);

  // Return cached config if it has detection data
  if (existing?.config?.projectType) {
    return existing.config;
  }

  // Fetch root directory listing using existing VCS action
  const dirResult = await listDirectory(repoFullName, workdir || "", "main");
  if (!dirResult.success) {
    throw new Error(dirResult.error || "Failed to list directory");
  }

  const fileNames = dirResult.entries.map((e) => e.name);

  // Fetch package.json if exists
  let packageJsonContent: string | undefined;
  if (fileNames.includes("package.json")) {
    const filePath = workdir ? `${workdir}/package.json` : "package.json";
    const result = await readFile(repoFullName, filePath, "main");
    packageJsonContent = result.file?.content;
  }

  // Fetch Makefile if exists
  let makefileContent: string | undefined;
  if (fileNames.includes("Makefile")) {
    const filePath = workdir ? `${workdir}/Makefile` : "Makefile";
    const result = await readFile(repoFullName, filePath, "main");
    makefileContent = result.file?.content;
  }

  // Run detection logic
  const input = buildDetectionInput(fileNames, {
    packageJsonContent,
    makefileContent,
  });
  const detectionResult = detectProjectType(input, workdir);

  // Build config with detection results
  const config: EnvironmentConfig = {
    method: "docker",
    dockerfilePath: "Dockerfile",
    ...detectionResult,
  };

  // Upsert to database (insert or update on conflict)
  await db
    .insert(projectEnvironments)
    .values({
      id: crypto.randomUUID(),
      projectId,
      repoId,
      environment: environmentName,
      config,
    })
    .onConflictDoUpdate({
      target: [
        projectEnvironments.projectId,
        projectEnvironments.repoId,
        projectEnvironments.environment,
      ],
      set: { config, updatedAt: new Date() },
    });

  return config;
}
