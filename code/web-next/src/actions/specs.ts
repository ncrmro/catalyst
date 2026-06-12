"use server";

/**
 * Server actions for fetching project specifications from repository
 */

import { fetchProjectById } from "@/actions/projects";
import { listDirectory } from "@/actions/version-control-provider";
import { updateFile } from "@/actions/vcs";
import type { Spec } from "@/lib/pr-spec-matching";
import { buildSpecUrl } from "@/lib/spec-url";

/**
 * Error information returned when specs cannot be fetched
 */
export interface SpecsError {
  type: "access_denied" | "not_found" | "error";
  message: string;
}

/**
 * Result of fetching project specs
 */
export interface SpecsResult {
  specs: Spec[];
  error?: SpecsError;
}

/**
 * Fetch specs for a project from its repository's specs/ directory
 *
 * @param projectId - The project ID
 * @param projectSlug - The project slug (for building href)
 * @returns SpecsResult with specs array and optional error info
 */
export async function fetchProjectSpecs(
  projectId: string,
  projectSlug: string,
): Promise<SpecsResult> {
  const project = await fetchProjectById(projectId);
  if (!project) return { specs: [] };

  const repo = project.repositories[0]?.repo;
  if (!repo) return { specs: [] };

  const specsResult = await listDirectory(repo.fullName, "specs");
  if (!specsResult.success) {
    // Check if it's a 403/permission error
    const isAccessDenied =
      specsResult.error?.includes("403") ||
      specsResult.error?.includes("Forbidden") ||
      specsResult.error?.includes("Not Found");

    return {
      specs: [],
      error: {
        type: isAccessDenied ? "access_denied" : "error",
        message: specsResult.error || "Failed to fetch specs",
      },
    };
  }

  // Filter to only directories that start with 3 digits (e.g., 001-feature, 009-projects)
  // This excludes non-spec directories like .templates
  const specPattern = /^\d{3}-/;
  const specDirs = specsResult.entries.filter(
    (e) => e.type === "dir" && specPattern.test(e.name),
  );

  return {
    specs: specDirs.map((dir) => ({
      id: dir.name,
      name: dir.name,
      href: buildSpecUrl(projectSlug, repo.name, dir.name),
    })),
  };
}

/**
 * Update a spec file content
 */
export async function updateSpec(
  projectId: string,
  specPath: string,
  content: string,
  message: string = "docs: update spec",
) {
  const project = await fetchProjectById(projectId);
  if (!project) throw new Error("Project not found");

  const repo = project.repositories[0]?.repo;
  if (!repo) throw new Error("Project repository not found");

  const [owner, repoName] = repo.fullName.split("/");

  return await updateFile({
    owner,
    repo: repoName,
    path: specPath,
    content,
    message,
    branch: "main", // TODO: Add defaultBranch to repos table
  });
}

/**
 * Create a new spec folder and initial spec.md file
 */
export async function createSpec(
  projectId: string,
  specName: string,
  initialContent: string = "# New Specification\n\n## Summary\n\n",
) {
  const project = await fetchProjectById(projectId);
  if (!project) throw new Error("Project not found");

  const repo = project.repositories[0]?.repo;
  if (!repo) throw new Error("Project repository not found");

  const [owner, repoName] = repo.fullName.split("/");

  // Path for the new spec.md
  const specPath = `specs/${specName}/spec.md`;

  return await updateFile({
    owner,
    repo: repoName,
    path: specPath,
    content: initialContent,
    message: `docs: create spec ${specName}`,
    branch: "main", // TODO: Add defaultBranch to repos table
  });
}
