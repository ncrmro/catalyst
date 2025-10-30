"use server";

/**
 * Server action to fetch projects data for the current user and organizations
 */

import { getProjects, type ProjectWithRelations } from "@/models/projects";
import { auth } from "@/auth";
import { Octokit } from "@octokit/rest";
import { getUserTeamIds } from "@/lib/team-auth";
import type { PullRequest, Issue } from "@/types/reports";

// Re-export types for frontend components
export type { ProjectWithRelations } from "@/models/projects";

// Define type for simplified project repository format
export interface ProjectRepo {
  id: string;
  name: string;
  full_name: string;
  url: string;
  primary: boolean;
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
 * Fetch pull requests for a specific project across all its repositories
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
    return await fetchRealPullRequests(repositories);
  } catch (error) {
    console.error("Error fetching project pull requests:", error);
    return [];
  }
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
