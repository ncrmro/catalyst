import { test as base } from "@playwright/test";
import { ProjectsPage } from "../page-objects/projects-page";
import { loginWithDevPassword } from "../helpers";

import {
  db,
  projectEnvironments,
  projects,
  repos,
  projectsRepos,
  teams,
} from "@/db";
import { eq } from "drizzle-orm";
import { seedUser } from "@/lib/seed";
import { generateSlug } from "@/lib/slug";

/**
 * Fixture options for environment setup tests
 */
type EnvironmentSetupOptions = {
  /**
   * Whether to pre-seed environments for the project
   * - true: Create pre-seeded environments (testing the case where environments already exist)
   * - false: Ensure no environments exist (testing the fresh setup flow)
   */
  withEnvironments: boolean;

  /**
   * Whether to create projects during setup
   * - true: Ensure the user has at least one project (default behavior)
   * - false: Do not create any projects, test empty state
   */
  withProjects: boolean;
};

/**
 * Seed a project with environments
 */
async function seedProjectEnvironments(projectId: string) {
  try {
    console.log(`Seeding environments for project ${projectId}`);
    const repoId = await findProjectPrimaryRepoId(projectId);
    console.log(`Found primary repo ID: ${repoId}`);

    // Create some environments for the project
    const result = await db
      .insert(projectEnvironments)
      .values({
        projectId,
        repoId,
        environment: "preview",
        latestDeployment: "deploy-preview-123",
      })
      .returning();

    // Insert the second environment separately
    await db.insert(projectEnvironments).values({
      projectId,
      repoId,
      environment: "staging",
      latestDeployment: "deploy-staging-456",
    });

    console.log(`Created environments: ${JSON.stringify(result)}`);

    // Verify environments were created
    const createdEnvironments = await db.query.projectEnvironments.findMany({
      where: eq(projectEnvironments.projectId, projectId),
    });
    console.log(
      `Verified environments: ${JSON.stringify(createdEnvironments)}`,
    );

    return true;
  } catch (error) {
    console.error("Error seeding project environments:", error);
    return false;
  }
}

/**
 * Find the primary repository ID for a project
 */
async function findProjectPrimaryRepoId(projectId: string): Promise<string> {
  // Query to find the related repositories
  const projectRelations = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: {
      repositories: {
        with: {
          repo: true,
        },
        where: (projectRepos) => eq(projectRepos.isPrimary, true),
      },
    },
  });

  if (!projectRelations?.repositories?.length) {
    throw new Error(`No primary repository found for project ${projectId}`);
  }

  return projectRelations.repositories[0].repo.id;
}

/**
 * Ensure a project has no environments
 */
async function clearProjectEnvironments(projectId: string) {
  if (!projectId) return;
  await db
    .delete(projectEnvironments)
    .where(eq(projectEnvironments.projectId, projectId));
}

/**
 * Create a project from empty state
 */
async function createFirstProject(
  teamId: string,
  uniqueSuffix: string,
): Promise<{ id: string; slug: string } | null> {
  try {
    // Create a repository first
    const [repo] = await db
      .insert(repos)
      .values({
        githubId: Math.floor(Math.random() * 1000000) + 1001,
        name: `first-project-${uniqueSuffix}`,
        fullName: `ncrmro/catalyst`,
        description: "First project created from empty state",
        url: `https://github.com/ncrmro/catalyst`,
        isPrivate: false,
        language: "TypeScript",
        stargazersCount: 0,
        forksCount: 0,
        openIssuesCount: 0,
        ownerLogin: "user",
        ownerType: "User",
        ownerAvatarUrl: "https://github.com/identicons/user.png",
        teamId,
        pushedAt: new Date(),
      })
      .returning();

    // Then create a project
    const projectName = `first-project-${uniqueSuffix}`;
    const [project] = await db
      .insert(projects)
      .values({
        name: projectName,
        slug: generateSlug(projectName),
        fullName: `user/first-project-${uniqueSuffix}`,
        description: "First project created from empty state",
        ownerLogin: "user",
        ownerType: "User",
        ownerAvatarUrl: "https://github.com/identicons/user.png",
        teamId,
        previewEnvironmentsCount: 0,
      })
      .returning();

    // Connect the project and repo
    await db.insert(projectsRepos).values({
      projectId: project.id,
      repoId: repo.id,
      isPrimary: true,
    });

    return { id: project.id, slug: project.slug };
  } catch (error) {
    console.error("Error creating first project:", error);
    return null;
  }
}

/**
 * Get the user's first team ID
 */
async function getUserTeamId(password: string): Promise<string | null> {
  try {
    // Get user details from the password
    const userDetails = getUserDetailsFromPassword(password);
    if (!userDetails) return null;

    // Find the user's teams
    const userTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.ownerId, userDetails.id))
      .limit(1);

    if (userTeams.length === 0) return null;
    return userTeams[0].id;
  } catch (error) {
    console.error("Error getting user team ID:", error);
    return null;
  }
}

/**
 * Get user details from a dev password
 * This is a duplicate of the function in seed.ts to avoid circular dependencies
 */
function getUserDetailsFromPassword(password: string) {
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
 * Extended test fixture that includes:
 * - Automatic login
 * - A ProjectsPage Page Object Model instance
 * - Configuration for environment and project presence or absence
 */
export const test = base.extend<{
  projectsPage: ProjectsPage;
  setupOptions: EnvironmentSetupOptions;
}>({
  // Default setup options
  setupOptions: {
    withEnvironments: true,
    withProjects: true,
  },

  // Auto-initialize the ProjectsPage POM and seed appropriate environment state
  projectsPage: async ({ page, setupOptions }, use, testInfo) => {
    // Generate a unique suffix for this test run
    const uniqueSuffix = `${testInfo.workerIndex}-${Date.now()}`;
    let projectId: string | null = null;

    // Perform login (without automatic seeding)
    const password = await loginWithDevPassword(page, testInfo);

    // Create and initialize the ProjectsPage POM
    const projectsPage = new ProjectsPage(page);

    // Create projects if needed
    if (setupOptions.withProjects) {
      // Use the seedUser function to create projects
      await seedUser({
        password,
        testInfo,
        createProjects: true,
      });
    }

    // Navigate to projects page
    await projectsPage.goto();

    // Check if we have projects without failing
    const hasProjects = await projectsPage.hasProjects();

    if (hasProjects) {
      // We have projects - navigate to the first one
      await projectsPage.clickProjectCard(0);

      // Get current project slug from URL
      const url = page.url();
      const projectSlug = url.split("/projects/")[1]?.split("/")[0];

      if (!projectSlug) {
        throw new Error("Could not determine project slug from URL");
      }

      // Look up the project ID from the slug for database operations
      const projectRecord = await db.query.projects.findFirst({
        where: eq(projects.slug, projectSlug),
      });

      if (!projectRecord) {
        throw new Error(`Could not find project with slug: ${projectSlug}`);
      }

      projectId = projectRecord.id;

      // Set up the environment state based on the setup options
      if (setupOptions.withEnvironments) {
        await seedProjectEnvironments(projectId);
      } else {
        await clearProjectEnvironments(projectId);
      }

      // Refresh the page to see the updated environment state
      await page.reload();
    } else if (setupOptions.withProjects) {
      // We expected projects but don't have any - try creating one manually
      const teamId = await getUserTeamId(password);
      if (teamId) {
        const createdProject = await createFirstProject(teamId, uniqueSuffix);
        if (createdProject) {
          projectId = createdProject.id;
          // Navigate to the newly created project using slug
          await page.goto(`/projects/${createdProject.slug}`);

          // Set up environments if needed
          if (setupOptions.withEnvironments) {
            await seedProjectEnvironments(createdProject.id);
            await page.reload();
          }
        }
      }
    }
    // If we don't have projects and don't want any, do nothing

    // Provide the initialized ProjectsPage to the test

    await use(projectsPage);

    // Clean up - not strictly necessary as the database is reset between test runs,
    // but good practice to ensure tests are isolated
    if (projectId) {
      await clearProjectEnvironments(projectId);
    }
  },
});

// Re-export expect so tests have it available
export { expect } from "@playwright/test";
