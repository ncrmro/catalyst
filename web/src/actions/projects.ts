"use server";

/**
 * Server action to fetch projects data for the current user and organizations
 */

import { getProjects } from "@/models/projects";
import { auth } from "@/auth";
import { getUserTeamIds } from "@/lib/team-auth";
import { type Branch } from "@/lib/vcs-providers";
import type { PullRequest, Issue } from "@/types/reports";
import { vcs } from "@/lib/vcs";
import { db } from "@/db";
import { pullRequestPods } from "@/db/schema";
import { eq, and } from "drizzle-orm";

import { fetchProjectSpecs } from "@/actions/specs";

/**
 * Fetch all dashboard data (specs, PRs, issues) in parallel
 * This allows for a single cached resource hook on the client
 */
export async function fetchProjectDashboardData(
  projectId: string,
  slug: string,
) {
  try {
    const [specsResult, pullRequests, issues] = await Promise.all([
      fetchProjectSpecs(projectId, slug).catch((e) => {
        console.error("Failed to fetch specs:", e);
        return {
          specs: [],
          error: { type: "error" as const, message: String(e) },
        };
      }),
      fetchProjectPullRequests(projectId).catch((e) => {
        console.error("Failed to fetch PRs:", e);
        return [];
      }),
      fetchProjectIssues(projectId).catch((e) => {
        console.error("Failed to fetch issues:", e);
        return [];
      }),
    ]);

    return {
      specsResult,
      pullRequests,
      issues,
    };
  } catch (error) {
    console.error("Error fetching project dashboard data:", error);
    return {
      specsResult: {
        specs: [],
        error: { type: "error", message: String(error) },
      },
      pullRequests: [],
      issues: [],
    };
  }
}

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

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      console.warn("No user ID found for fetching project pull requests");
      return [];
    }

    const scopedVcs = vcs.getScoped(userId);
    const prPromises = project.repositories.map(async (relation) => {
      try {
        const [owner, repoName] = relation.repo.fullName.split("/");
        if (!owner || !repoName) return [];

        const prs = await scopedVcs.pullRequests.list(owner, repoName, {
          state: "open",
        });

        // Convert to PullRequest type and enrich with required fields that might be missing
        return prs.map((pr) => ({
          id: parseInt(pr.id),
          title: pr.title,
          number: pr.number,
          author: pr.author,
          author_avatar: pr.authorAvatarUrl || "",
          repository: repoName,
          url: pr.htmlUrl,
          created_at: pr.createdAt.toISOString(),
          updated_at: pr.updatedAt.toISOString(),
          comments_count: 0, // Not available in list
          priority: "medium" as const, // Not available in list
          status: pr.draft ? ("draft" as const) : ("ready" as const),
          headBranch: pr.headRef,
          headSha: pr.headSha,
        }));
      } catch (error) {
        console.warn(
          `Could not fetch PRs for ${relation.repo.fullName}:`,
          error,
        );
        return [];
      }
    });

    const prResults = await Promise.all(prPromises);
    const prs = prResults.flat();

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
  // Optimization: In the future, we could filter by repo/branch if needed
  // but for now, fetching all PR pods is likely fine as the table shouldn't be huge
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

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) {
      console.warn("No user ID found for fetching project issues");
      return [];
    }

    const scopedVcs = vcs.getScoped(userId);
    const issuePromises = project.repositories.map(async (relation) => {
      try {
        const [owner, repoName] = relation.repo.fullName.split("/");
        if (!owner || !repoName) return [];

        const issues = await scopedVcs.issues.list(owner, repoName, {
          state: "open",
        });

        return issues.map((issue) => ({
          id: parseInt(issue.id),
          title: issue.title,
          number: issue.number,
          repository: repoName,
          url: issue.htmlUrl,
          created_at: issue.createdAt.toISOString(),
          updated_at: issue.updatedAt.toISOString(),
          labels: issue.labels,
          priority: "medium" as const, // Not available
          effort_estimate: "medium" as const, // Not available
          type: "improvement" as const, // Not available
          state: issue.state,
        }));
      } catch (error) {
        console.warn(
          `Could not fetch issues for ${relation.repo.fullName}:`,
          error,
        );
        return [];
      }
    });

    const results = await Promise.all(issuePromises);
    return results.flat();
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

    const scopedVcs = vcs.getScoped(userId);
    const allBranches: Branch[] = [];

    for (const relation of project.repositories) {
      const [owner, repoName] = relation.repo.fullName.split("/");
      if (!owner || !repoName) continue;

      const branches = await scopedVcs.branches.list(owner, repoName);
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

    const scopedVcs = vcs.getScoped(userId);
    const pr = await scopedVcs.pullRequests.get(owner, repoName, prNumber);

    if (!pr) {
      return null;
    }

    const enrichedPR: PullRequest = {
      id: parseInt(pr.id),
      title: pr.title,
      number: pr.number,
      author: pr.author,
      author_avatar: pr.authorAvatarUrl || "",
      repository: repoName,
      url: pr.htmlUrl,
      created_at: pr.createdAt.toISOString(),
      updated_at: pr.updatedAt.toISOString(),
      comments_count: 0, // Not available
      priority: "medium", // Not available
      status: pr.draft ? "draft" : "ready",
      body: pr.body || undefined,
      headBranch: pr.headRef,
      headSha: pr.headSha,
    };

    const expectedBranchName = `pr-${enrichedPR.repository}-${enrichedPR.number}`;
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
      ...enrichedPR,
      previewEnvironmentId: previewEnv?.id,
      previewUrl: previewEnv?.publicUrl ?? undefined,
      previewStatus: previewEnv?.status,
    };
  } catch (error) {
    console.error(`Error fetching PR ${prNumber}:`, error);
    return null;
  }
}

/**
 * Check if a project slug is available for the current user's teams
 */
export async function checkProjectSlugAvailable(
  slug: string,
): Promise<boolean> {
  try {
    const project = await fetchProjectBySlug(slug);
    return !project;
  } catch (error) {
    console.error("Error checking slug availability:", error);
    return false; // Assume not available on error to be safe
  }
}
