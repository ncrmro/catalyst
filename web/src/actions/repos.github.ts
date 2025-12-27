"use server";

import { auth } from "@/auth";
import { Octokit } from "@octokit/rest";
import { getUserTeamIds } from "@/lib/team-auth";
import { getRepos, upsertRepos } from "@/models/repos";
import { getProjects } from "@/models/projects";
import { fetchDatabaseRepos } from "./repos.connected";
import {
  getMockReposData,
  GitHubRepo,
  GitHubOrganization,
  ReposData,
  ReposDataFailed,
  ReposDataWithReason,
} from "@/mocks/github";
import { GITHUB_CONFIG } from "@/lib/vcs-providers";

/**
 * Server action to fetch repositories for the current user from the database
 * and optionally from GitHub if the integration is enabled
 */

/**
 * Fetch real GitHub repositories for the current user and organizations
 * Falls back to GITHUB_PAT if user doesn't have OAuth token
 */
async function fetchRealGitHubRepos(): Promise<ReposData | ReposDataFailed> {
  const session = await auth();

  // Try OAuth token first, then fall back to PAT for development
  const token = session?.accessToken || GITHUB_CONFIG.PAT;

  if (!token) {
    return { github_integration_enabled: false, reason: "no_access_token" };
  }

  const octokit = new Octokit({
    auth: token,
  });

  try {
    // Fetch user repositories
    const userReposResponse = await octokit.rest.repos.listForAuthenticatedUser(
      {
        per_page: 100,
        sort: "updated",
      },
    );

    // Fetch user organizations
    const orgsResponse = await octokit.rest.orgs.listForAuthenticatedUser({
      per_page: 100,
    });

    // Fetch repositories for each organization
    const orgRepos: Record<string, GitHubRepo[]> = {};

    for (const org of orgsResponse.data) {
      try {
        const orgReposResponse = await octokit.rest.repos.listForOrg({
          org: org.login,
          per_page: 100,
          sort: "updated",
        });
        orgRepos[org.login] = orgReposResponse.data as GitHubRepo[];
      } catch (error) {
        // If we can't access org repos (permissions), skip it
        console.warn(
          `Could not fetch repos for org ${org.login}:`,
          error instanceof Error ? error.message : "Unknown error",
        );
        orgRepos[org.login] = [];
      }
    }

    return {
      user_repos: userReposResponse.data as GitHubRepo[],
      organizations: orgsResponse.data as GitHubOrganization[],
      org_repos: orgRepos,
      github_integration_enabled: true,
    };
  } catch (error) {
    console.error("Error fetching GitHub repositories:", error);
    // Return empty data with github_integration_enabled flag set to false
    return { github_integration_enabled: false, reason: "error" };
  }
}

/**
 * Merge database repositories with GitHub repositories, prioritizing database info
 */
function mergeRepositories(
  dbRepos: GitHubRepo[],
  githubRepos: GitHubRepo[],
): GitHubRepo[] {
  // Create a map of database repositories by GitHub ID
  const dbReposMap = new Map<number, GitHubRepo>();
  dbRepos.forEach((repo) => {
    if (repo.id) {
      dbReposMap.set(repo.id, repo);
    }
  });

  // Merge GitHub repositories with database repositories
  const mergedRepos = githubRepos.map((githubRepo) => {
    const dbRepo = dbReposMap.get(githubRepo.id);
    if (dbRepo) {
      // Remove this repo from the map to track which db repos were processed
      dbReposMap.delete(githubRepo.id);

      // Merge the repositories, prioritizing database information
      return {
        ...githubRepo,
        connection: dbRepo.connection,
        database_id: dbRepo.database_id,
        teamId: dbRepo.teamId,
      };
    }
    return githubRepo;
  });

  // Add any remaining database repositories that weren't found in GitHub
  dbReposMap.forEach((remainingDbRepo) => {
    mergedRepos.push(remainingDbRepo);
  });

  return mergedRepos;
}

/**
 * Organize repositories by owner for a consistent structure
 */
function organizeRepositoriesByOwner(repos: GitHubRepo[]): {
  user_repos: GitHubRepo[];
  organizations: GitHubOrganization[];
  org_repos: Record<string, GitHubRepo[]>;
} {
  const userRepos: GitHubRepo[] = [];
  const orgRepos: Record<string, GitHubRepo[]> = {};
  const organizations = new Map<string, GitHubOrganization>();

  repos.forEach((repo) => {
    if (repo.owner.type === "User") {
      userRepos.push(repo);
    } else {
      const orgLogin = repo.owner.login;
      if (!orgRepos[orgLogin]) {
        orgRepos[orgLogin] = [];

        // Add organization if it doesn't exist
        if (!organizations.has(orgLogin)) {
          organizations.set(orgLogin, {
            login: orgLogin,
            id: repo.owner.login.hashCode(), // Generate a stable ID
            avatar_url: repo.owner.avatar_url,
            description: null,
          });
        }
      }
      orgRepos[orgLogin].push(repo);
    }
  });

  return {
    user_repos: userRepos,
    organizations: Array.from(organizations.values()),
    org_repos: orgRepos,
  };
}

// Helper to generate a stable hash for org IDs
declare global {
  interface String {
    hashCode(): number;
  }
}

// Add hashCode method to String prototype if it doesn't exist
if (!String.prototype.hashCode) {
  String.prototype.hashCode = function (): number {
    let hash = 0;
    for (let i = 0; i < this.length; i++) {
      const char = this.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };
}

/**
 * Fetch repositories for the current user from the database and optionally from GitHub
 */
export async function fetchGitHubRepos(): Promise<
  ReposData | ReposDataWithReason
> {
  // Check if we should return mocked data
  const mocked = process.env.MOCKED === "1";

  console.log(
    "Environment check - MOCKED:",
    mocked,
    "GITHUB_REPOS_MODE:",
    GITHUB_CONFIG.REPOS_MODE,
  );

  if (GITHUB_CONFIG.REPOS_MODE === "mocked" || mocked) {
    console.log("Returning mocked repos data");
    const mockData = getMockReposData();

    // In E2E testing environment, ensure mocked repos are created in the database
    // to support project manifest and other features that require real repo records
    try {
      // Get the user's team IDs
      const userTeamIds = await getUserTeamIds();

      if (userTeamIds.length > 0) {
        // Get the first team to associate repos with
        const userProjects = await getProjects({ teamIds: [userTeamIds[0]] });

        if (userProjects.length > 0) {
          const teamId = userTeamIds[0];

          // Check if we've already created these mock repos for this team
          const existingRepos = await getRepos({ teamIds: [teamId] });

          if (existingRepos.length < 3) {
            console.log("Creating mock repos in database for e2e testing");

            // Prepare all repos to upsert
            const reposToUpsert = [];

            // Insert mock user repos first
            for (const repo of mockData.user_repos) {
              reposToUpsert.push({
                githubId: repo.id,
                name: repo.name,
                fullName: repo.full_name,
                description: repo.description || undefined,
                url: repo.html_url,
                isPrivate: repo.private,
                language: repo.language || undefined,
                stargazersCount: repo.stargazers_count,
                forksCount: repo.forks_count,
                openIssuesCount: repo.open_issues_count,
                ownerLogin: repo.owner.login,
                ownerType: repo.owner.type,
                ownerAvatarUrl: repo.owner.avatar_url,
                teamId,
                pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : undefined,
              });
            }

            // Insert org repos for key orgs
            for (const orgName of Object.keys(mockData.org_repos)) {
              for (const repo of mockData.org_repos[orgName]) {
                reposToUpsert.push({
                  githubId: repo.id,
                  name: repo.name,
                  fullName: repo.full_name,
                  description: repo.description || undefined,
                  url: repo.html_url,
                  isPrivate: repo.private,
                  language: repo.language || undefined,
                  stargazersCount: repo.stargazers_count,
                  forksCount: repo.forks_count,
                  openIssuesCount: repo.open_issues_count,
                  ownerLogin: repo.owner.login,
                  ownerType: repo.owner.type,
                  ownerAvatarUrl: repo.owner.avatar_url,
                  teamId,
                  pushedAt: repo.pushed_at
                    ? new Date(repo.pushed_at)
                    : undefined,
                });
              }
            }

            // Upsert all repos at once
            if (reposToUpsert.length > 0) {
              try {
                await upsertRepos(reposToUpsert);
              } catch (error) {
                console.warn("Failed to insert mock repos:", error);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to create mock repos in database:", error);
    }

    return mockData;
  }

  // Always fetch database repositories first
  const dbRepos = await fetchDatabaseRepos();

  // Check if GitHub integration is enabled and fetch GitHub repos if possible
  const githubData = await fetchRealGitHubRepos();

  if (githubData.github_integration_enabled === false) {
    // GitHub integration is not enabled - just use database repositories
    console.log(
      "GitHub integration not enabled, using only database repositories. Reason:",
      githubData.reason,
    );

    // Organize the database repositories by owner
    const organizedRepos = organizeRepositoriesByOwner(dbRepos);

    return {
      ...organizedRepos,
      github_integration_enabled: false,
      // Pass through the reason: "no_access_token" means user not connected,
      // "error" means there was an error connecting
      reason: githubData.reason,
    };
  }

  // Merge database and GitHub repositories
  const allGithubRepos = [
    ...githubData.user_repos,
    ...Object.values(githubData.org_repos).flat(),
  ];

  const mergedRepos = mergeRepositories(dbRepos, allGithubRepos);

  // Re-organize the merged repositories
  const organizedRepos = organizeRepositoriesByOwner(mergedRepos);

  return {
    ...organizedRepos,
    github_integration_enabled: true,
  };
}
