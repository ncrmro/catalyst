"use server";

/**
 * Server actions for fetching project specifications from repository
 */

import { fetchProjectById } from "@/actions/projects";
import { updateFile } from "@/actions/vcs";
import { listDirectory } from "@/actions/version-control-provider";
import type { Spec } from "@/lib/pr-spec-matching";

/**
 * Fetch specs for a project from its repository's specs/ directory
 *
 * @param projectId - The project ID
 * @param projectSlug - The project slug (for building href)
 * @returns Array of specs with id, name, and href
 */
export async function fetchProjectSpecs(
	projectId: string,
	projectSlug: string,
): Promise<Spec[]> {
	const project = await fetchProjectById(projectId);
	if (!project) return [];

	const repo = project.repositories[0]?.repo;
	if (!repo) return [];

	const specsResult = await listDirectory(repo.fullName, "specs");
	if (!specsResult.success) return [];

	// Filter to only directories that start with 3 digits (e.g., 001-feature, 009-projects)
	// This excludes non-spec directories like .templates
	const specPattern = /^\d{3}-/;
	const specDirs = specsResult.entries.filter(
		(e) => e.type === "dir" && specPattern.test(e.name),
	);

	return specDirs.map((dir) => ({
		id: dir.name,
		name: dir.name,
		href: `/projects/${projectSlug}/spec/${dir.name}`,
	}));
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
