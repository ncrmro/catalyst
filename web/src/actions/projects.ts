"use server";

/**
 * Server action to fetch projects data for the current user and organizations
 */

import { getProjects } from "@/models/projects";
import { auth } from "@/auth";
import { Octokit } from "@octokit/rest";
import { getUserTeamIds } from "@/lib/team-auth";
import type { PullRequest, Issue } from "@/types/reports";
import { db } from "@/db";
import { pullRequestPods, pullRequests as pullRequestsTable } from "@/db/schema";
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
    console.log("Fetching real pull requests for project", projectId);
    const prs = await fetchRealPullRequests(repositories);

    // Enrich PRs with preview environment data
    return enrichPullRequestsWithPreviewEnvs(prs, repositories);
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
  repositories: { id: number; name: string; full_name: string; url: string }[],
): Promise<PullRequest[]> {
  // Fetch all preview environments for these repositories
  const repoFullNames = repositories.map((r) => r.full_name);
  
  const previewEnvs = await db
    .select({
      id: pullRequestPods.id,
      prNumber: pullRequestsTable.number,
      repoFullName: pullRequestsTable.repoId,
      publicUrl: pullRequestPods.publicUrl,
      status: pullRequestPods.status,
      branch: pullRequestPods.branch,
    })
    .from(pullRequestPods)
    .leftJoin(
      pullRequestsTable,
      eq(pullRequestPods.pullRequestId, pullRequestsTable.id),
    )
    .where(eq(pullRequestPods.source, "pull_request"));

  // Create a map for quick lookup
  const previewEnvMap = new Map<string, typeof previewEnvs[0]>();
  previewEnvs.forEach((env) => {
    if (env.prNumber && env.branch) {
      const key = `${env.branch}-${env.prNumber}`;
      previewEnvMap.set(key, env);
    }
  });

  // Enrich PRs with preview environment data
  return prs.map((pr) => {
    const key = `${pr.repository}-${pr.number}`;
    const previewEnv = previewEnvMap.get(key);

    return {
      ...pr,
      previewEnvironmentId: previewEnv?.id,
      previewUrl: previewEnv?.publicUrl,
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
    console.log("Fetching real issues for project", projectId);
    return await fetchRealIssues(repositories);
  } catch (error) {
    console.error("Error fetching project issues:", error);
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

    const session = await auth();
    if (!session?.accessToken) {
      console.warn("No GitHub access token found");
      return null;
    }

    const octokit = new Octokit({
      auth: session.accessToken,
    });

    const [owner, repoName] = repo.fullName.split("/");
    if (!owner || !repoName) {
      console.warn(`Invalid repository name format: ${repo.fullName}`);
      return null;
    }

    // Fetch PR from GitHub
    const { data: pr } = await octokit.rest.pulls.get({
      owner,
      repo: repoName,
      pull_number: prNumber,
    });

    // Fetch reviews to determine status
    let status: "draft" | "ready" | "changes_requested" = "ready";
    if (pr.draft) {
      status = "draft";
    } else {
      try {
        const { data: reviews } = await octokit.rest.pulls.listReviews({
          owner,
          repo: repoName,
          pull_number: prNumber,
        });

        if (reviews.some((review) => review.state === "CHANGES_REQUESTED")) {
          status = "changes_requested";
        }
      } catch (error) {
        console.warn(`Could not fetch reviews for PR ${prNumber}:`, error);
      }
    }

    // Determine priority
    const labels = pr.labels.map((label) =>
      typeof label === "string" ? label : label.name || "",
    );
    let priority: "high" | "medium" | "low" = "medium";
    if (
      labels.some(
        (label) =>
          label.toLowerCase().includes("urgent") ||
          label.toLowerCase().includes("critical"),
      )
    ) {
      priority = "high";
    } else if (
      labels.some(
        (label) =>
          label.toLowerCase().includes("minor") ||
          label.toLowerCase().includes("low"),
      )
    ) {
      priority = "low";
    }

    // Fetch preview environment if exists
    const previewEnv = await db.query.pullRequestPods.findFirst({
      where: and(
        eq(pullRequestPods.branch, pr.head.ref),
        eq(pullRequestPods.source, "pull_request"),
      ),
      with: {
        pullRequest: true,
      },
    });

    return {
      id: pr.id,
      title: pr.title,
      number: pr.number,
      author: pr.user?.login || "unknown",
      author_avatar: pr.user?.avatar_url || "",
      repository: repoName,
      url: pr.html_url,
      created_at: pr.created_at,
      updated_at: pr.updated_at,
      comments_count: pr.comments,
      priority,
      status,
      previewEnvironmentId: previewEnv?.id,
      previewUrl: previewEnv?.publicUrl || undefined,
      previewStatus: previewEnv?.status,
    };
  } catch (error) {
    console.error(`Error fetching PR ${prNumber}:`, error);
    return null;
  }
}

/**
 * Fetch real pull requests from GitHub API for given repositories
 */
async function fetchRealPullRequests(
  repositories: { id: number; name: string; full_name: string; url: string }[],
): Promise<PullRequest[]> {
  const session = await auth();

  if (!session?.accessToken) {
    console.warn("No GitHub access token found for fetching pull requests");
    return [];
  }

  const octokit = new Octokit({
    auth: session.accessToken,
  });

  const allPullRequests: PullRequest[] = [];

  for (const repo of repositories) {
    try {
      const [owner, repoName] = repo.full_name.split("/");
      if (!owner || !repoName) {
        console.warn(`Invalid repository name format: ${repo.full_name}`);
        continue;
      }

      const { data: prs } = await octokit.rest.pulls.list({
        owner,
        repo: repoName,
        state: "open",
        per_page: 100,
        sort: "updated",
        direction: "desc",
      });

      for (const pr of prs) {
        // Determine priority based on labels (simple heuristic)
        const labels = pr.labels.map((label) =>
          typeof label === "string" ? label : label.name || "",
        );
        let priority: "high" | "medium" | "low" = "medium";
        if (
          labels.some(
            (label) =>
              label.toLowerCase().includes("urgent") ||
              label.toLowerCase().includes("critical"),
          )
        ) {
          priority = "high";
        } else if (
          labels.some(
            (label) =>
              label.toLowerCase().includes("minor") ||
              label.toLowerCase().includes("low"),
          )
        ) {
          priority = "low";
        }

        // Determine status based on review state and draft status
        let status: "draft" | "ready" | "changes_requested" = "ready";
        if (pr.draft) {
          status = "draft";
        } else {
          // Check for requested changes in reviews (this is a simplified check)
          try {
            const { data: reviews } = await octokit.rest.pulls.listReviews({
              owner,
              repo: repoName,
              pull_number: pr.number,
            });

            if (
              reviews.some((review) => review.state === "CHANGES_REQUESTED")
            ) {
              status = "changes_requested";
            }
          } catch (error) {
            console.warn(`Could not fetch reviews for PR ${pr.number}:`, error);
          }
        }

        allPullRequests.push({
          id: pr.id,
          title: pr.title,
          number: pr.number,
          author: pr.user?.login || "unknown",
          author_avatar: pr.user?.avatar_url || "",
          repository: repoName,
          url: pr.html_url,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          comments_count: 0, // Comments count would need separate API calls for accurate count
          priority,
          status,
        });
      }
    } catch (error) {
      console.warn(
        `Could not fetch pull requests for repository ${repo.full_name}:`,
        error,
      );
    }
  }

  return allPullRequests;
}

/**
 * Fetch real issues from GitHub API for given repositories
 */
async function fetchRealIssues(
  repositories: { id: number; name: string; full_name: string; url: string }[],
): Promise<Issue[]> {
  const session = await auth();

  if (!session?.accessToken) {
    console.warn("No GitHub access token found for fetching issues");
    return [];
  }

  const octokit = new Octokit({
    auth: session.accessToken,
  });

  const allIssues: Issue[] = [];

  for (const repo of repositories) {
    try {
      const [owner, repoName] = repo.full_name.split("/");
      if (!owner || !repoName) {
        console.warn(`Invalid repository name format: ${repo.full_name}`);
        continue;
      }

      const { data: issues } = await octokit.rest.issues.listForRepo({
        owner,
        repo: repoName,
        state: "open",
        per_page: 100,
        sort: "updated",
        direction: "desc",
        // Only get issues, not pull requests
        filter: "all",
      });

      for (const issue of issues) {
        // Skip pull requests (they show up in issues API)
        if (issue.pull_request) {
          continue;
        }

        const labels = issue.labels.map((label) =>
          typeof label === "string" ? label : label.name || "",
        );

        // Determine priority based on labels
        let priority: "high" | "medium" | "low" = "medium";
        if (
          labels.some(
            (label) =>
              label.toLowerCase().includes("urgent") ||
              label.toLowerCase().includes("critical") ||
              label.toLowerCase().includes("high"),
          )
        ) {
          priority = "high";
        } else if (
          labels.some(
            (label) =>
              label.toLowerCase().includes("minor") ||
              label.toLowerCase().includes("low"),
          )
        ) {
          priority = "low";
        }

        // Determine effort estimate based on labels
        let effort_estimate: "small" | "medium" | "large" = "medium";
        if (
          labels.some(
            (label) =>
              label.toLowerCase().includes("small") ||
              label.toLowerCase().includes("quick"),
          )
        ) {
          effort_estimate = "small";
        } else if (
          labels.some(
            (label) =>
              label.toLowerCase().includes("large") ||
              label.toLowerCase().includes("epic"),
          )
        ) {
          effort_estimate = "large";
        }

        // Determine type based on labels
        let type: "bug" | "feature" | "improvement" | "idea" = "improvement";
        if (
          labels.some(
            (label) =>
              label.toLowerCase().includes("bug") ||
              label.toLowerCase().includes("defect"),
          )
        ) {
          type = "bug";
        } else if (
          labels.some(
            (label) =>
              label.toLowerCase().includes("feature") ||
              label.toLowerCase().includes("enhancement"),
          )
        ) {
          type = "feature";
        } else if (
          labels.some(
            (label) =>
              label.toLowerCase().includes("idea") ||
              label.toLowerCase().includes("proposal"),
          )
        ) {
          type = "idea";
        }

        allIssues.push({
          id: issue.id,
          title: issue.title,
          number: issue.number,
          repository: repoName,
          url: issue.html_url,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          labels,
          priority,
          effort_estimate,
          type,
          state: issue.state as "open" | "closed",
        });
      }
    } catch (error) {
      console.warn(
        `Could not fetch issues for repository ${repo.full_name}:`,
        error,
      );
    }
  }

  return allIssues;
}
