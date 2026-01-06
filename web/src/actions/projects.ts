"use server";

/**
 * Server action to fetch projects data for the current user and organizations
 */

import { getProjects } from "@/models/projects";
import { auth } from "@/auth";
import { getUserTeamIds } from "@/lib/team-auth";
import {
  fetchPullRequests,
  fetchIssues,
  fetchPullRequestById,
  getVCSClient,
  getProvider,
} from "@/lib/vcs-providers";
import type { PullRequest, Issue } from "@/types/reports";
import { Branch } from "@/lib/vcs-providers";
import { db } from "@/db";
import { pullRequestPods } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Fetch projects data from database using Drizzle's relational queries
 * Returns data directly as it comes from the database
 */
export async function fetchProjects() {
  // Get user's team IDs for authorization
  const userTeamIds = await getUserTeamIds();

  // Fetch projects with related repositories and environments
  const projectsWithRelations = await getProjects({
    teamIds: userTeamIds,
  });

  return {
    projects: projectsWithRelations,
    total_count: projectsWithRelations.length,
  };
}

/**
 * Fetch individual project by ID
 * Returns data directly as it comes from the database
 */
export async function fetchProjectById(projectId: string) {
  // Get user's team IDs for authorization
  const userTeamIds = await getUserTeamIds();

  // Fetch the project with its relations
  const projects = await getProjects({
    ids: [projectId],
  });

  const projectData = projects.length > 0 ? projects[0] : null;

  if (!projectData) {
    return null;
  }

  // Check if user has access to this project through team membership
  if (projectData.teamId && !userTeamIds.includes(projectData.teamId)) {
    return null; // User doesn't have access to this project
  }

  return projectData;
}

/**
 * Fetch individual project by slug
 * Slug is unique per team, so we filter by user's teams
 */
export async function fetchProjectBySlug(slug: string) {
  // Get user's team IDs for authorization
  const userTeamIds = await getUserTeamIds();

  if (userTeamIds.length === 0) {
    return null;
  }

  // Fetch the project with its relations, scoped to user's teams
  const projects = await getProjects({
    slugs: [slug],
    teamIds: userTeamIds,
  });

  return projects.length > 0 ? projects[0] : null;
}

/**
 * Fetch pull requests for a specific project across all its repositories
 * Enriched with preview environment data
 */
export async function fetchProjectPullRequests(
  projectId: string,
): Promise<PullRequest[]> {
  try {
    const project = await fetchProjectById(projectId);
    if (!project) {
      return [];
    }

    // Extract repositories from the project data
    const repositories = project.repositories.map((relation) => ({
      id: relation.repo.githubId,
      name: relation.repo.name,
      full_name: relation.repo.fullName,
      url: relation.repo.url,
    }));

    // Fetch real pull requests from GitHub API
    console.log("Fetching real pull requests for project", project.slug);
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      console.warn("No user ID found for fetching project pull requests");
      return [];
    }
    const repoNames = repositories.map((r) => r.full_name);
    const prs = await fetchPullRequests(userId, repoNames);

    // Enrich PRs with preview environment data
    return enrichPullRequestsWithPreviewEnvs(prs);
  } catch (error) {
    console.error("Error fetching project pull requests:", error);
    return [];
  }
}

/**
 * Enrich pull requests with preview environment data
 */
async function enrichPullRequestsWithPreviewEnvs(
  prs: PullRequest[],
): Promise<PullRequest[]> {
  // Fetch all preview environments for these repositories

  const previewEnvs = await db
    .select({
      id: pullRequestPods.id,
      branch: pullRequestPods.branch,
      publicUrl: pullRequestPods.publicUrl,
      status: pullRequestPods.status,
    })
    .from(pullRequestPods)
    .where(eq(pullRequestPods.source, "pull_request"));

  // Create a map for quick lookup using branch name (which contains repo and PR number)
  const previewEnvMap = new Map<string, (typeof previewEnvs)[0]>();
  previewEnvs.forEach((env) => {
    if (env.branch) {
      // Store by branch name since we can extract repo and PR number from it
      previewEnvMap.set(env.branch, env);
    }
  });

  // Enrich PRs with preview environment data
  return prs.map((pr) => {
    // Try to find preview env by matching branch pattern (typically: pr-{repo}-{number})
    // or by exact branch name from PR
    let previewEnv: (typeof previewEnvs)[0] | undefined;

    // Try multiple key formats to match preview environments
    const possibleKeys = [
      `pr-${pr.repository}-${pr.number}`, // Standard preview env branch pattern
      pr.repository, // In case branch name matches repo name
    ];

    for (const key of possibleKeys) {
      const env = previewEnvMap.get(key);
      if (env) {
        previewEnv = env;
        break;
      }
    }

    return {
      ...pr,
      previewEnvironmentId: previewEnv?.id,
      previewUrl: previewEnv?.publicUrl ?? undefined,
      previewStatus: previewEnv?.status,
    };
  });
}

/**
 * Fetch priority issues for a specific project across all its repositories
 */
export async function fetchProjectIssues(projectId: string): Promise<Issue[]> {
  try {
    const project = await fetchProjectById(projectId);
    if (!project) {
      return [];
    }

    // Extract repositories from the project data
    const repositories = project.repositories.map((relation) => ({
      id: relation.repo.githubId,
      name: relation.repo.name,
      full_name: relation.repo.fullName,
      url: relation.repo.url,
    }));

    // Fetch real issues from GitHub API
    console.log("Fetching real issues for project", project.slug);
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      console.warn("No user ID found for fetching project issues");
      return [];
    }
    const repoNames = repositories.map((r) => r.full_name);
    return await fetchIssues(userId, repoNames);
  } catch (error) {
    console.error("Error fetching project issues:", error);
    return [];
  }
}

/**
 * Fetch branches for a specific project across all its repositories
 */
export async function fetchProjectBranches(
  projectId: string,
): Promise<Branch[]> {
  try {
    const project = await fetchProjectById(projectId);
    if (!project) {
      return [];
    }

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      return [];
    }

    const client = await getVCSClient(userId);
    const provider = getProvider(client.providerId);

    const allBranches: Branch[] = [];

    for (const relation of project.repositories) {
      const [owner, repoName] = relation.repo.fullName.split("/");
      if (!owner || !repoName) continue;

      const branches = await provider.listBranches(client, owner, repoName);
      allBranches.push(...branches);
    }

    return allBranches;
  } catch (error) {
    console.error("Error fetching project branches:", error);
    return [];
  }
}

/**
 * Get a single pull request with preview environment details
 */
export async function getPullRequest(
  projectId: string,
  prNumber: number,
): Promise<PullRequest | null> {
  try {
    const project = await fetchProjectById(projectId);
    if (!project) {
      return null;
    }

    // Get the first repository (assuming single repo for now)
    const repo = project.repositories[0]?.repo;
    if (!repo) {
      return null;
    }

    const [owner, repoName] = repo.fullName.split("/");
    if (!owner || !repoName) {
      console.warn(`Invalid repository name format: ${repo.fullName}`);
      return null;
    }

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      console.warn("No user ID found for fetching single pull request");
      return null;
    }

    const pr = await fetchPullRequestById(userId, owner, repoName, prNumber);

    if (!pr) {
      return null;
    }

    const expectedBranchName = `pr-${pr.repository}-${pr.number}`;
    // Fetch preview environment if exists
    const previewEnv = await db.query.pullRequestPods.findFirst({
      where: and(
        eq(pullRequestPods.branch, expectedBranchName),
        eq(pullRequestPods.source, "pull_request"),
      ),
      with: {
        pullRequest: true,
      },
    });

    return {
      ...pr,
      previewEnvironmentId: previewEnv?.id,
      previewUrl: previewEnv?.publicUrl ?? undefined,
      previewStatus: previewEnv?.status,
    };
  } catch (error) {
    console.error(`Error fetching PR ${prNumber}:`, error);
    return null;
  }
}
