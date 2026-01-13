"use server";

import { auth } from "@/auth";
import { createProjects } from "@/models/projects";
import { getUserPrimaryTeamId } from "@/lib/team-auth";
import { checkGitHubConnection } from "@/actions/account";
import { fetchGitHubRepos } from "@/actions/repos.github";
import { upsertRepos, getRepos } from "@/models/repos";
import { createProjectRepoLinks, setPrimaryRepo } from "@/models/project-repos";
import type { CreateProjectFormData } from "./create-project-form";
import type { GitHubRepo } from "@/mocks/github";

interface CreateProjectResult {
  success: boolean;
  project?: {
    id: string;
    slug: string;
    name: string;
  };
  error?: string;
}

export async function createProject(
  data: CreateProjectFormData,
): Promise<CreateProjectResult> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      success: false,
      error: "You must be signed in to create a project",
    };
  }

  // Get user's primary team
  const teamId = await getUserPrimaryTeamId();
  if (!teamId) {
    return {
      success: false,
      error: "You must belong to a team to create a project",
    };
  }

  // Get GitHub username for ownerLogin
  const githubStatus = await checkGitHubConnection();
  const ownerLogin = githubStatus.username || session.user.name || "user";

  try {
    const [project] = await createProjects({
      name: data.name,
      slug: data.slug,
      fullName: `${ownerLogin}/${data.slug}`,
      description: data.description || null,
      ownerLogin,
      ownerType: "User",
      teamId,
    });

    // Handle repository linking
    if (data.repoUrls && data.repoUrls.length > 0) {
      try {
        // Fetch available repos to get details
        const reposData = await fetchGitHubRepos();
        let availableRepos: GitHubRepo[] = [];

        if (reposData.github_integration_enabled) {
          availableRepos = [
            ...reposData.user_repos,
            ...Object.values(reposData.org_repos).flat(),
          ];
        } else if ("user_repos" in reposData) {
          // Even if integration is disabled/failed, we might have DB repos
          // fetchGitHubRepos returns ReposData | ReposDataWithReason
          // ReposDataWithReason also has user_repos structure if it fell back to DB
          availableRepos = [
            ...reposData.user_repos,
            ...Object.values(reposData.org_repos).flat(),
          ];
        }

        const reposToLink: GitHubRepo[] = [];

        for (const url of data.repoUrls) {
          const repo = availableRepos.find(
            (r) => r.html_url.toLowerCase() === url.toLowerCase(),
          );
          if (repo) {
            reposToLink.push(repo);
          } else {
            console.warn(`Repository not found for URL: ${url}`);
            // TODO: Handle manual URLs that aren't in the user's list
            // We might need to fetch them individually if public
          }
        }

        if (reposToLink.length > 0) {
          // Upsert repos to database
          const reposToUpsert = reposToLink.map((repo) => ({
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
          }));

          await upsertRepos(reposToUpsert);

          // Fetch the repos again to get their IDs (both inserted and existing)
          // upsertRepos might return empty if using onConflictDoNothing and repos exist
          const savedRepos = await getRepos({
            githubIds: reposToUpsert.map((r) => r.githubId),
          });

          // Link repos to project
          if (savedRepos.length > 0) {
            await createProjectRepoLinks(
              savedRepos.map((repo) => ({
                projectId: project.id,
                repoId: repo.id,
                repoFullName: repo.fullName,
                isPrimary: false, // Will set primary separately
              })),
            );

            // Set the first one as primary
            // Find the ID of the first repo in the input list that was successfully saved
            // We match by name/fullName to be sure
            const firstRepoUrl = data.repoUrls[0];
            const primaryRepo = savedRepos.find(
              (r) =>
                r.url.toLowerCase() === firstRepoUrl.toLowerCase() ||
                reposToLink.find(
                  (ol) =>
                    ol.html_url.toLowerCase() === firstRepoUrl.toLowerCase(),
                )?.name === r.name,
            );

            if (primaryRepo) {
              await setPrimaryRepo(project.id, primaryRepo.id);
            } else {
              // Fallback to first saved repo
              await setPrimaryRepo(project.id, savedRepos[0].id);
            }
          }
        }
      } catch (repoError) {
        console.error("Failed to link repositories:", repoError);
        // We don't fail the whole project creation if repo linking fails,
        // but we log it. The user will see the project but no repos.
      }
    }

    return {
      success: true,
      project: {
        id: project.id,
        slug: project.slug,
        name: project.name,
      },
    };
  } catch (error) {
    console.error("Failed to create project:", error);

    // Check for unique constraint violation
    if (error instanceof Error && error.message.includes("unique")) {
      return {
        success: false,
        error: "A project with this slug already exists in your team",
      };
    }

    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create project",
    };
  }
}
