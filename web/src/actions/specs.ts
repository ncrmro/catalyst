"use server";

/**
 * Server actions for fetching spec files from GitHub repositories
 */

import { auth } from "@/auth";
import { getUserOctokit } from "@/lib/github";
import { fetchProjectById } from "./projects";

export interface SpecFile {
  name: string;
  path: string;
  content: string;
  sha: string;
  htmlUrl: string;
}

export interface SpecDirectory {
  name: string;
  path: string;
  files: Array<{
    name: string;
    path: string;
    type: "file" | "dir";
  }>;
}

/**
 * Fetch the content of a spec file from GitHub
 */
export async function fetchSpecContent(
  projectId: string,
  specPath: string,
): Promise<SpecFile | null> {
  const session = await auth();

  const project = await fetchProjectById(projectId);
  if (!project) {
    console.warn(`Project ${projectId} not found`);
    return null;
  }

  // Get the first repository for the project
  const repo = project.repositories[0]?.repo;
  if (!repo) {
    console.warn(`No repository found for project ${projectId}`);
    return null;
  }

  const [owner, repoName] = repo.fullName.split("/");
  if (!owner || !repoName) {
    console.warn(`Invalid repository name format: ${repo.fullName}`);
    return null;
  }

  try {
    const octokit = await getUserOctokit(session.user.id);

    // Fetch the spec.md file from the spec directory
    const filePath = `specs/${specPath}/spec.md`;

    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: repoName,
      path: filePath,
      ref: "main",
    });

    if (Array.isArray(data) || data.type !== "file") {
      console.warn(`${filePath} is not a file`);
      return null;
    }

    // Decode base64 content
    const content = Buffer.from(data.content, "base64").toString("utf-8");

    return {
      name: data.name,
      path: data.path,
      content,
      sha: data.sha,
      htmlUrl: data.html_url || "",
    };
  } catch (error) {
    console.error(`Error fetching spec content from ${specPath}:`, error);
    return null;
  }
}

/**
 * List all spec directories in a repository
 */
export async function listSpecs(
  projectId: string,
): Promise<SpecDirectory[] | null> {
  const session = await auth();

  const project = await fetchProjectById(projectId);
  if (!project) {
    console.warn(`Project ${projectId} not found`);
    return null;
  }

  // Get the first repository for the project
  const repo = project.repositories[0]?.repo;
  if (!repo) {
    console.warn(`No repository found for project ${projectId}`);
    return null;
  }

  const [owner, repoName] = repo.fullName.split("/");
  if (!owner || !repoName) {
    console.warn(`Invalid repository name format: ${repo.fullName}`);
    return null;
  }

  try {
    const octokit = await getUserOctokit(session.user.id);

    // Fetch the specs directory
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: repoName,
      path: "specs",
      ref: "main",
    });

    if (!Array.isArray(data)) {
      console.warn("specs is not a directory");
      return null;
    }

    // Filter to only directories (spec folders)
    const specDirs = data.filter((item) => item.type === "dir");

    const specs: SpecDirectory[] = [];

    for (const dir of specDirs) {
      try {
        // Fetch contents of each spec directory
        const { data: dirContents } = await octokit.rest.repos.getContent({
          owner,
          repo: repoName,
          path: dir.path,
          ref: "main",
        });

        if (Array.isArray(dirContents)) {
          specs.push({
            name: dir.name,
            path: dir.path,
            files: dirContents.map((file) => ({
              name: file.name,
              path: file.path,
              type: file.type as "file" | "dir",
            })),
          });
        }
      } catch (error) {
        console.warn(`Error fetching contents of ${dir.path}:`, error);
      }
    }

    return specs;
  } catch (error) {
    console.error("Error listing specs:", error);
    return null;
  }
}

/**
 * Fetch a specific file from a spec directory
 */
export async function fetchSpecFile(
  projectId: string,
  specPath: string,
  fileName: string,
): Promise<SpecFile | null> {
  const session = await auth();

  const project = await fetchProjectById(projectId);
  if (!project) {
    console.warn(`Project ${projectId} not found`);
    return null;
  }

  // Get the first repository for the project
  const repo = project.repositories[0]?.repo;
  if (!repo) {
    console.warn(`No repository found for project ${projectId}`);
    return null;
  }

  const [owner, repoName] = repo.fullName.split("/");
  if (!owner || !repoName) {
    console.warn(`Invalid repository name format: ${repo.fullName}`);
    return null;
  }

  try {
    const octokit = await getUserOctokit(session.user.id);
    const filePath = `specs/${specPath}/${fileName}`;

    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo: repoName,
      path: filePath,
      ref: "main",
    });

    if (Array.isArray(data) || data.type !== "file") {
      console.warn(`${filePath} is not a file`);
      return null;
    }

    // Decode base64 content
    const content = Buffer.from(data.content, "base64").toString("utf-8");

    return {
      name: data.name,
      path: data.path,
      content,
      sha: data.sha,
      htmlUrl: data.html_url || "",
    };
  } catch (error) {
    console.error(`Error fetching spec file ${fileName}:`, error);
    return null;
  }
}
