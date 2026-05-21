import {
  db,
  repos,
  projects,
  projectsRepos,
  users,
  teams,
  teamsMemberships,
  projectEnvironments,
} from "@/db";
import type { InferSelectModel } from "drizzle-orm";
import { eq, and } from "drizzle-orm";
import type { TestInfo } from "@playwright/test";
import { getMockProjects, getMockReposData } from "@/mocks/github";
import { generateSlug } from "@/lib/slug";
import { seedSelfDeploy } from "@/lib/seed-self-deploy";

/**
 * Get user details from a dev password used in authentication
 * This is based on the same logic used in auth.ts for the password provider
 */
export function getUserDetailsFromPassword(password: string) {
  // Parse password to extract base type and optional suffix
  const passwordMatch = password.match(/^(password|admin)(?:-(.*))?$/);
  if (!passwordMatch) {
    return null;
  }

  const [, baseType, suffix] = passwordMatch;
  const isAdmin = baseType === "admin";

  // For backward compatibility, use original emails for legacy passwords
  const isLegacy = suffix === undefined;
  const userSuffix = isLegacy ? (isAdmin ? "admin" : "user") : suffix;

  return {
    id: `dev-${isAdmin ? "admin" : "user"}-${userSuffix}`,
    email: isLegacy
      ? isAdmin
        ? "admin@example.com"
        : "bob@alice.com"
      : isAdmin
        ? `admin-${userSuffix}@example.com`
        : `user-${userSuffix}@example.com`,
    name: isLegacy
      ? isAdmin
        ? "Test Admin"
        : "Bob Alice"
      : isAdmin
        ? `Test Admin ${userSuffix}`
        : `Test User ${userSuffix}`,
    isAdmin,
    image: "https://avatars.githubusercontent.com/u/67470890?s=200&v=4",
  };
}

/**
 * Create a user with a personal team
 * This is useful for both development seeding and E2E tests
 */
export async function createUserWithTeam(params: {
  email: string;
  name?: string | null;
  image?: string | null;
  admin?: boolean;
}) {
  const { email, name = null, image = null, admin = false } = params;

  const createdUser = await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(users)
      .values({
        email,
        name,
        image,
        admin,
      })
      .returning();

    const teamName = name ?? email.split("@")[0];

    const [team] = await tx
      .insert(teams)
      .values({
        name: teamName,
        description: "Personal team",
        ownerId: newUser.id,
      })
      .returning();

    await tx.insert(teamsMemberships).values({
      teamId: team.id,
      userId: newUser.id,
      role: "owner",
    });

    return { user: newUser, team };
  });

  return createdUser;
}

/**
 * Create catalyst and meze projects for a team
 * Used for development and demo purposes
 */
export async function createCatalystAndMezeProjects(teamId: string) {
  console.log("Creating catalyst and meze projects for team:", teamId);

  // Insert repos (skip if already exists)
  await db
    .insert(repos)
    .values({
      githubId: 756437234,
      name: "catalyst",
      fullName: "ncrmro/catalyst",
      description: "Platform for managing deployments and infrastructure",
      url: "https://github.com/ncrmro/catalyst",
      isPrivate: false,
      language: "TypeScript",
      ownerLogin: "ncrmro",
      ownerType: "User",
      ownerAvatarUrl: "https://avatars.githubusercontent.com/u/8276365?v=4",
      teamId,
    })
    .onConflictDoNothing();

  await db
    .insert(repos)
    .values({
      githubId: 756437235,
      name: "meze",
      fullName: "ncrmro/meze",
      description: "Modern recipe management and meal planning application",
      url: "https://github.com/ncrmro/meze",
      isPrivate: false,
      language: "TypeScript",
      ownerLogin: "ncrmro",
      ownerType: "User",
      ownerAvatarUrl: "https://avatars.githubusercontent.com/u/8276365?v=4",
      teamId,
    })
    .onConflictDoNothing();

  // Query to get the actual repos for this team
  const [catalystRepo] = await db
    .select()
    .from(repos)
    .where(and(eq(repos.fullName, "ncrmro/catalyst"), eq(repos.teamId, teamId)))
    .limit(1);

  const [mezeRepo] = await db
    .select()
    .from(repos)
    .where(and(eq(repos.fullName, "ncrmro/meze"), eq(repos.teamId, teamId)))
    .limit(1);

  // Insert projects (skip if already exists)
  await db
    .insert(projects)
    .values({
      name: "Catalyst",
      slug: generateSlug("Catalyst"),
      fullName: "ncrmro/catalyst",
      description: "Platform for managing deployments and infrastructure",
      ownerLogin: "ncrmro",
      ownerType: "User",
      ownerAvatarUrl: "https://avatars.githubusercontent.com/u/8276365?v=4",
      teamId,
    })
    .onConflictDoNothing();

  await db
    .insert(projects)
    .values({
      name: "Meze",
      slug: generateSlug("Meze"),
      fullName: "ncrmro/meze",
      description: "Modern recipe management and meal planning application",
      ownerLogin: "ncrmro",
      ownerType: "User",
      ownerAvatarUrl: "https://avatars.githubusercontent.com/u/8276365?v=4",
      teamId,
    })
    .onConflictDoNothing();

  // Query to get the actual projects for this team
  const [catalystProject] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.fullName, "ncrmro/catalyst"),
        eq(projects.teamId, teamId),
      ),
    )
    .limit(1);

  const [mezeProject] = await db
    .select()
    .from(projects)
    .where(
      and(eq(projects.fullName, "ncrmro/meze"), eq(projects.teamId, teamId)),
    )
    .limit(1);

  // Link repos to projects (always attempt, skip if already linked)
  if (catalystRepo && catalystProject) {
    await db
      .insert(projectsRepos)
      .values({
        projectId: catalystProject.id,
        repoId: catalystRepo.id,
        isPrimary: true,
      })
      .onConflictDoNothing();
    console.log("Linked catalyst repo to project");
  }

  if (mezeRepo && mezeProject) {
    await db
      .insert(projectsRepos)
      .values({
        projectId: mezeProject.id,
        repoId: mezeRepo.id,
        isPrimary: true,
      })
      .onConflictDoNothing();
    console.log("Linked meze repo to project");
  }

  return { catalystProject, mezeProject, catalystRepo, mezeRepo };
}

/**
 * Generate repositories for a team
 * Used by both E2E tests and development seeding
 */
export async function createTeamRepos(teamId: string, uniqueSuffix: string) {
  const repoData = [
    {
      githubId: Math.floor(Math.random() * 1000000) + 1001, // Random ID to avoid conflicts
      name: `foo-frontend-${uniqueSuffix}`,
      fullName: `ncrmro/catalyst`,
      description: "Frontend application for the foo project",
      url: `https://github.com/ncrmro/catalyst`,
      isPrivate: false,
      language: "TypeScript",
      stargazersCount: 42,
      forksCount: 8,
      openIssuesCount: 3,
      ownerLogin: "jdoe",
      ownerType: "User",
      ownerAvatarUrl: "https://github.com/identicons/jdoe.png",
      teamId,
      pushedAt: new Date("2024-01-21T14:30:00Z"),
    },
    {
      githubId: Math.floor(Math.random() * 1000000) + 1002,
      name: `foo-backend-${uniqueSuffix}`,
      fullName: `jdoe/foo-backend-${uniqueSuffix}`,
      description: "Backend API for the foo project",
      url: `https://github.com/jdoe/foo-backend-${uniqueSuffix}`,
      isPrivate: false,
      language: "Python",
      stargazersCount: 35,
      forksCount: 5,
      openIssuesCount: 7,
      ownerLogin: "jdoe",
      ownerType: "User",
      ownerAvatarUrl: "https://github.com/identicons/jdoe.png",
      teamId,
      pushedAt: new Date("2024-01-21T12:15:00Z"),
    },
    {
      githubId: Math.floor(Math.random() * 1000000) + 1003,
      name: `bar-api-${uniqueSuffix}`,
      fullName: `jdoe/bar-api-${uniqueSuffix}`,
      description: "API service for the bar project",
      url: `https://github.com/jdoe/bar-api-${uniqueSuffix}`,
      isPrivate: false,
      language: "Python",
      stargazersCount: 28,
      forksCount: 3,
      openIssuesCount: 5,
      ownerLogin: "jdoe",
      ownerType: "User",
      ownerAvatarUrl: "https://github.com/identicons/jdoe.png",
      teamId,
      pushedAt: new Date("2024-01-21T10:45:00Z"),
    },
  ];

  return await db.insert(repos).values(repoData).returning();
}

/**
 * Generate projects for a team with the given repos
 * Used by both E2E tests and development seeding
 */
export async function createTeamProjects(
  teamId: string,
  uniqueSuffix: string,
  insertedRepos: InferSelectModel<typeof repos>[],
) {
  // Insert sample projects for this team
  const projectData = [
    {
      name: `foo-${uniqueSuffix}`,
      slug: generateSlug(`foo-${uniqueSuffix}`),
      fullName: `jdoe/foo-${uniqueSuffix}`,
      description:
        "A comprehensive web application with frontend and backend components",
      ownerLogin: "jdoe",
      ownerType: "User",
      ownerAvatarUrl: "https://github.com/identicons/jdoe.png",
      teamId,
      previewEnvironmentsCount: 7,
    },
    {
      name: `bar-${uniqueSuffix}`,
      slug: generateSlug(`bar-${uniqueSuffix}`),
      fullName: `jdoe/bar-${uniqueSuffix}`,
      description: "A microservices project with API-first architecture",
      ownerLogin: "jdoe",
      ownerType: "User",
      ownerAvatarUrl: "https://github.com/identicons/jdoe.png",
      teamId,
      previewEnvironmentsCount: 3,
    },
  ];

  const insertedProjects = await db
    .insert(projects)
    .values(projectData)
    .returning();

  // Create project-repo relationships
  const projectRepoData = [
    // foo project repos
    {
      projectId: insertedProjects[0].id,
      repoId: insertedRepos[0].id, // foo-frontend
      isPrimary: true,
    },
    {
      projectId: insertedProjects[0].id,
      repoId: insertedRepos[1].id, // foo-backend
      isPrimary: false,
    },
    // bar project repos
    {
      projectId: insertedProjects[1].id,
      repoId: insertedRepos[2].id, // bar-api
      isPrimary: true,
    },
  ];

  await db.insert(projectsRepos).values(projectRepoData);

  return {
    projects: insertedProjects,
    relationships: projectRepoData,
  };
}
/**
 * Multipurpose seeding function that can:
 * 1. Create a user if it doesn't exist (with default admin or regular user settings)
 * 2. Find or create a team for the user
 * 3. Optionally seed projects and repositories for the user's team
 *
 * Can be used by:
 * - E2E tests (by passing a password)
 * - Development seeding (by passing email/user info directly)
 * - Scripts (for CLI-based seeding)
 */
export async function seedUser(options: {
  // Either provide a password OR email+details
  password?: string;
  email?: string;
  name?: string;
  image?: string;
  admin?: boolean;
  // Test info (for E2E tests)
  testInfo?: TestInfo;
  // Whether to create projects for this user
  createProjects?: boolean;
}) {
  try {
    let userDetails;

    // Determine user details either from password or direct params
    if (options.password) {
      userDetails = getUserDetailsFromPassword(options.password);
      if (!userDetails) {
        console.warn("Invalid password format, cannot determine user details");
        return { success: false, message: "Invalid password format" };
      }
    } else if (options.email) {
      userDetails = {
        email: options.email,
        name: options.name || options.email.split("@")[0],
        isAdmin: options.admin || false,
        image:
          options.image ||
          "https://avatars.githubusercontent.com/u/67470890?s=200&v=4",
      };
    } else {
      return {
        success: false,
        message: "Either password or email must be provided",
      };
    }

    // Check if user already exists
    let user;
    let team;

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, userDetails.email))
      .limit(1);

    if (existingUser) {
      user = existingUser;

      // Find user's team
      const [teamMembership] = await db
        .select({
          teamId: teams.id,
        })
        .from(teamsMemberships)
        .innerJoin(teams, eq(teamsMemberships.teamId, teams.id))
        .where(eq(teamsMemberships.userId, user.id))
        .limit(1);

      if (teamMembership) {
        const [existingTeam] = await db
          .select()
          .from(teams)
          .where(eq(teams.id, teamMembership.teamId))
          .limit(1);

        team = existingTeam;
      } else {
        // User exists but no team - create team
        const result = await createUserWithTeam({
          email: userDetails.email,
          name: userDetails.name,
          image: userDetails.image,
          admin: userDetails.isAdmin,
        });
        team = result.team;
      }
    } else {
      // Create new user with team
      const result = await createUserWithTeam({
        email: userDetails.email,
        name: userDetails.name,
        image: userDetails.image,
        admin: userDetails.isAdmin,
      });
      user = result.user;
      team = result.team;
    }

    // If projects requested and user has a team, check/create projects
    if (options.createProjects && team) {
      // Check if projects already exist for this team
      const existingProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.teamId, team.id))
        .limit(1);

      if (existingProjects.length > 0) {
        console.log(
          "Projects already exist for user team, skipping project creation",
        );
        return {
          success: true,
          message: "User exists with team and projects",
          data: { userId: user.id, userEmail: user.email, teamId: team.id },
        };
      }

      // Generate unique suffix for this user's projects
      let uniqueSuffix = "";
      if (options.testInfo) {
        uniqueSuffix = `${options.testInfo.workerIndex}-${Date.now()}`;
      } else {
        uniqueSuffix = `${user.email?.split("@")[0] || "user"}-${Math.floor(Math.random() * 1000000)}`;
      }

      // Create repos and projects
      const insertedRepos = await createTeamRepos(team.id, uniqueSuffix);
      const projectResult = await createTeamProjects(
        team.id,
        uniqueSuffix,
        insertedRepos,
      );

      return {
        success: true,
        message: "User created/found and projects seeded successfully",
        data: {
          userId: user.id,
          userEmail: user.email,
          teamId: team.id,
          uniqueSuffix,
          repositoriesCount: insertedRepos.length,
          projectsCount: projectResult.projects.length,
          relationshipsCount: projectResult.relationships.length,
        },
      };
    }

    // User created/found but no projects requested or needed
    return {
      success: true,
      message: "User created/found successfully",
      data: { userId: user.id, userEmail: user.email, teamId: team?.id },
    };
  } catch (error) {
    console.error("Error in seedUser:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Unknown error during seeding",
    };
  }
}

/**
 * Seed mock data from YAML into the database
 * Creates repos, projects, and environments based on YAML mock data
 */
export async function seedMockDataFromYaml() {
  try {
    console.log("📋 Loading YAML mock data...");
    const mockProjects = getMockProjects();
    const mockReposData = getMockReposData();

    if (mockProjects.length === 0) {
      return { success: false, message: "No mock projects found in YAML data" };
    }

    // Get all teams to seed projects for each
    const allTeams = await db.select().from(teams);
    if (allTeams.length === 0) {
      return {
        success: false,
        message: "No teams found for seeding mock projects",
      };
    }

    console.log(`📋 Seeding for ${allTeams.length} teams`);

    const allRepos = [
      ...mockReposData.user_repos,
      ...Object.values(mockReposData.org_repos).flat(),
    ];

    let totalProjectsCreated = 0;
    let totalReposCreated = 0;

    // Seed for each team
    for (const team of allTeams) {
      console.log(`📋 Seeding for team: ${team.name} (${team.id})`);

      // Seed repositories from YAML for this team
      console.log("📋 Seeding repositories from YAML...");
      for (const mockRepo of allRepos) {
        try {
          const [repo] = await db
            .insert(repos)
            .values({
              githubId: mockRepo.id + allTeams.indexOf(team) * 1000000, // Make unique per team
              name: mockRepo.name,
              fullName: mockRepo.full_name,
              description: mockRepo.description,
              url: mockRepo.html_url,
              isPrivate: mockRepo.private,
              language: mockRepo.language,
              ownerLogin: mockRepo.owner.login,
              ownerType: mockRepo.owner.type,
              ownerAvatarUrl: mockRepo.owner.avatar_url,
              teamId: team.id,
              stargazersCount: mockRepo.stargazers_count,
              forksCount: mockRepo.forks_count,
              openIssuesCount: mockRepo.open_issues_count,
              createdAt: new Date(
                mockRepo.created_at || "2023-10-15T14:30:00Z",
              ),
              updatedAt: new Date(mockRepo.updated_at),
              pushedAt: mockRepo.pushed_at
                ? new Date(mockRepo.pushed_at)
                : null,
            })
            .onConflictDoNothing()
            .returning();

          if (repo) {
            totalReposCreated++;
            console.log(
              `✅ Seeded repo: ${mockRepo.full_name} for team ${team.name}`,
            );
          }
        } catch (error) {
          console.warn(
            `⚠️ Failed to seed repo ${mockRepo.full_name} for team ${team.name}:`,
            error,
          );
        }
      }

      // Seed projects from YAML for this team
      console.log("📋 Seeding projects from YAML...");
      for (const mockProject of mockProjects) {
        try {
          const [project] = await db
            .insert(projects)
            .values({
              id: `${mockProject.id}-${team.id}`,
              name: mockProject.name,
              slug: generateSlug(mockProject.name),
              fullName: mockProject.primary_repo,
              description: mockProject.description,
              ownerLogin: mockProject.team,
              ownerType: "User",
              ownerAvatarUrl:
                "https://avatars.githubusercontent.com/u/8276365?v=4",
              teamId: team.id,
              previewEnvironmentsCount: mockProject.environments.length,
              createdAt: new Date("2023-10-15T14:30:00Z"),
              updatedAt: new Date("2024-01-22T16:45:00Z"),
            })
            .onConflictDoNothing()
            .returning();

          if (project) {
            totalProjectsCreated++;
            console.log(
              `✅ Seeded project: ${mockProject.name} for team ${team.name}`,
            );

            // Link primary repo to project first so we can use it for environments
            const primaryRepo = allRepos.find(
              (r) => r.full_name === mockProject.primary_repo,
            );
            let repoRecord = null;

            if (primaryRepo) {
              try {
                // Find the repo for this specific team
                [repoRecord] = await db
                  .select()
                  .from(repos)
                  .where(
                    and(
                      eq(repos.fullName, primaryRepo.full_name),
                      eq(repos.teamId, team.id),
                    ),
                  )
                  .limit(1);

                if (repoRecord) {
                  await db
                    .insert(projectsRepos)
                    .values({
                      projectId: project.id,
                      repoId: repoRecord.id,
                      isPrimary: true,
                    })
                    .onConflictDoNothing();

                  console.log(
                    `  ✅ Linked primary repo: ${primaryRepo.full_name} for team ${team.name}`,
                  );
                }
              } catch (error) {
                console.warn(
                  `  ⚠️ Failed to link primary repo ${primaryRepo.full_name} for team ${team.name}:`,
                  error,
                );
              }
            }

            // Seed project environments (requires both projectId and repoId)
            if (repoRecord) {
              for (const env of mockProject.environments) {
                try {
                  await db
                    .insert(projectEnvironments)
                    .values({
                      projectId: project.id,
                      repoId: repoRecord.id,
                      environment: env.name,
                      createdAt: new Date("2023-10-15T14:30:00Z"),
                      updatedAt: new Date("2024-01-22T16:45:00Z"),
                    })
                    .onConflictDoNothing();

                  console.log(
                    `  ✅ Seeded environment: ${env.name} for team ${team.name}`,
                  );
                } catch (error) {
                  console.warn(
                    `  ⚠️ Failed to seed environment ${env.name} for team ${team.name}:`,
                    error,
                  );
                }
              }
            } else {
              console.warn(
                `  ⚠️ Cannot create environments for ${mockProject.name} in team ${team.name}: no primary repo found`,
              );
            }
          } else {
            console.warn(
              `⚠️ Project ${mockProject.name} for team ${team.name} was not created (likely already exists)`,
            );
          }
        } catch (error) {
          console.error(
            `❌ Failed to seed project ${mockProject.name} for team ${team.name}:`,
            error,
          );
        }
      }
    }

    return {
      success: true,
      message: `Mock data seeded: ${totalProjectsCreated} projects, ${totalReposCreated} repositories for ${allTeams.length} teams`,
      data: {
        projectsCount: totalProjectsCreated,
        repositoriesCount: totalReposCreated,
        teamsCount: allTeams.length,
      },
    };
  } catch (error) {
    console.error("❌ Error seeding mock data from YAML:", error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Unknown error seeding mock data",
    };
  }
}

/**
 * Seed default users for development
 * For use by scripts/seed.js
 */
export async function seedDefaultUsers() {
  const results = [];

  // Check if we're in mocked mode
  const isMockedMode =
    process.env.GITHUB_REPOS_MODE === "mocked" || process.env.MOCKED === "1";

  // Check if self-deploy mode is enabled
  const isSelfDeployMode = process.env.SEED_SELF_DEPLOY === "true";

  // Create regular user
  results.push(
    await seedUser({
      email: "bob@alice.com",
      name: "Bob Alice",
      admin: false,
      createProjects: false, // We'll handle projects separately for mocked mode
    }),
  );

  // Create admin user
  results.push(
    await seedUser({
      email: "admin@example.com",
      name: "Test Admin",
      admin: true,
      createProjects: false, // We'll handle projects separately for mocked mode
    }),
  );

  // If self-deploy mode is enabled, create Catalyst self-deployment environments
  if (isSelfDeployMode) {
    console.log(
      "🚀 Self-deploy mode enabled, seeding Catalyst environments...",
    );
    for (const result of results) {
      if (result.success && result.data?.teamId) {
        const selfDeployResult = await seedSelfDeploy(result.data.teamId);
        results.push(selfDeployResult);
        if (selfDeployResult.success) {
          console.log(`✅ Self-deploy seeded for team: ${result.data.teamId}`);
        } else {
          console.warn(`⚠️ Self-deploy failed for team: ${result.data.teamId}`);
        }
      }
    }
    return {
      success: results.every((r) => r.success),
      message: "Default users and Catalyst self-deployment seeded",
      results,
    };
  }

  // If we're in mocked mode, seed the YAML mock data into the database
  if (isMockedMode) {
    console.log("📋 Seeding YAML mock data into database...");
    const mockSeedResult = await seedMockDataFromYaml();
    return {
      success: results.every((r) => r.success) && mockSeedResult.success,
      message: mockSeedResult.success
        ? "Default users and mock projects seeded from YAML"
        : "Users seeded but mock data failed",
      results: [...results, mockSeedResult],
    };
  } else {
    // Regular mode - create projects for all users
    console.log("🌱 Creating standard projects...");
    for (const result of results) {
      if (result.success && result.data?.teamId) {
        await createCatalystAndMezeProjects(result.data.teamId);
      }
    }
    return {
      success: results.every((r) => r.success),
      message: "Default users and standard projects seeded",
      results,
    };
  }
}
