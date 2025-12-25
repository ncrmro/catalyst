"use server";

/**
 * Server action to fetch commits from project repositories
 * Fetches commits across all repositories in a project for timeline view
 */

import { auth } from "@/auth";
import { providerRegistry, type Commit } from "@/lib/vcs-providers";
import { getProjects } from "@/models/projects";
import { getUserTeamIds } from "@/lib/team-auth";

export interface CommitTimelineFilters {
  projectId?: string;
  author?: string;
  since?: Date;
  until?: Date;
  repoFullName?: string;
}

export interface CommitWithRepo extends Commit {
  projectId?: string;
  projectName?: string;
}

export interface CommitsResult {
  commits: CommitWithRepo[];
  totalCount: number;
}

/**
 * Fetch commits from all repositories in accessible projects
 * Follows the bulk operation pattern - fetches from multiple repos at once
 */
export async function fetchProjectCommits(
  filters: CommitTimelineFilters = {},
  options: { perPage?: number; page?: number } = {},
): Promise<CommitsResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return { commits: [], totalCount: 0 };
  }

  const perPage = options.perPage || 30;
  const page = options.page || 1;

  try {
    // Get user's team IDs for authorization
    const teamIds = await getUserTeamIds(session.user.id);

    // Get projects user has access to
    const projectsParams = filters.projectId
      ? { ids: [filters.projectId] }
      : { teamIds };

    const projects = await getProjects(projectsParams);

    if (projects.length === 0) {
      return { commits: [], totalCount: 0 };
    }

    // Get VCS provider client
    const provider = providerRegistry.getDefault();
    const client = await provider.authenticate(session.user.id);

    // Collect all repos from all projects
    const allCommits: CommitWithRepo[] = [];

    // Fetch commits from each repository
    for (const project of projects) {
      if (!project.repositories || project.repositories.length === 0) {
        continue;
      }

      for (const projectRepo of project.repositories) {
        const repo = projectRepo.repo;

        // Apply repository filter if specified
        if (filters.repoFullName && repo.fullName !== filters.repoFullName) {
          continue;
        }

        try {
          const [owner, repoName] = repo.fullName.split("/");

          const commits = await provider.listCommits(client, owner, repoName, {
            since: filters.since,
            until: filters.until,
            author: filters.author,
            perPage: perPage * 2, // Fetch more to allow filtering/sorting
          });

          // Add project context to each commit
          const commitsWithContext = commits.map((commit) => ({
            ...commit,
            projectId: project.id,
            projectName: project.name,
          }));

          allCommits.push(...commitsWithContext);
        } catch (error) {
          console.error(
            `Error fetching commits from ${repo.fullName}:`,
            error instanceof Error ? error.message : "Unknown error",
          );
          // Continue with other repos even if one fails
        }
      }
    }

    // Sort all commits by date (newest first)
    allCommits.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Apply pagination
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedCommits = allCommits.slice(startIndex, endIndex);

    return {
      commits: paginatedCommits,
      totalCount: allCommits.length,
    };
  } catch (error) {
    console.error("Error fetching project commits:", error);
    return { commits: [], totalCount: 0 };
  }
}

/**
 * Get unique authors from commits (for filter dropdown)
 */
export async function fetchCommitAuthors(): Promise<string[]> {
  const session = await auth();

  if (!session?.user?.id) {
    return [];
  }

  try {
    // Get user's team IDs for authorization
    const teamIds = await getUserTeamIds(session.user.id);

    // Get projects user has access to
    const projects = await getProjects({ teamIds });

    if (projects.length === 0) {
      return [];
    }

    // Get VCS provider client
    const provider = providerRegistry.getDefault();
    const client = await provider.authenticate(session.user.id);

    const authors = new Set<string>();

    // Fetch recent commits from each repository to get authors
    for (const project of projects) {
      if (!project.repositories || project.repositories.length === 0) {
        continue;
      }

      for (const projectRepo of project.repositories) {
        const repo = projectRepo.repo;

        try {
          const [owner, repoName] = repo.fullName.split("/");

          const commits = await provider.listCommits(client, owner, repoName, {
            perPage: 100, // Get recent commits
          });

          commits.forEach((commit) => {
            if (commit.author) {
              authors.add(commit.author);
            }
          });
        } catch (error) {
          console.error(
            `Error fetching commits from ${repo.fullName}:`,
            error instanceof Error ? error.message : "Unknown error",
          );
          // Continue with other repos
        }
      }
    }

    return Array.from(authors).sort();
  } catch (error) {
    console.error("Error fetching commit authors:", error);
    return [];
  }
}

// Re-export Commit type for components
export type { Commit } from "@/lib/vcs-providers";
