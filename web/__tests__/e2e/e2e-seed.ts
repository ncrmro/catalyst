import { db, repos, projects, projectsRepos, users, teams, teamsMemberships } from '@/db';
import { getUserPrimaryTeamId } from '@/lib/team-auth';
import { eq } from 'drizzle-orm';
import { TestInfo } from '@playwright/test';

/**
 * Get user details from a dev password used in authentication
 */
function getUserDetailsFromPassword(password: string) {
  // Parse password to extract base type and optional suffix
  const passwordMatch = password.match(/^(password|admin)(?:-(.*))?$/);
  if (!passwordMatch) {
    return null;
  }

  const [, baseType, suffix] = passwordMatch;
  const isAdmin = baseType === 'admin';

  // For backward compatibility, use original emails for legacy passwords
  const isLegacy = suffix === undefined;
  const userSuffix = isLegacy ? (isAdmin ? 'admin' : 'user') : suffix;

  return {
    id: `dev-${isAdmin ? 'admin' : 'user'}-${userSuffix}`,
    email: isLegacy
      ? isAdmin
        ? 'admin@example.com'
        : 'bob@alice.com'
      : isAdmin
        ? `admin-${userSuffix}@example.com`
        : `user-${userSuffix}@example.com`,
    name: isLegacy
      ? isAdmin
        ? 'Test Admin'
        : 'Bob Alice'
      : isAdmin
        ? `Test Admin ${userSuffix}`
        : `Test User ${userSuffix}`,
    isAdmin
  };
}

/**
 * Seed projects for a specific e2e test user
 * This ensures that E2E test users have access to projects in their own teams
 * 
 * @param password The dev password that was used to login (from generateUserCredentials)
 * @param testInfo Optional TestInfo object for additional context
 */
export async function seedProjectsForE2EUser(password: string, testInfo?: TestInfo) {
  try {
    // Get user details from password
    const userDetails = getUserDetailsFromPassword(password);
    if (!userDetails) {
      console.warn('Invalid password format, cannot determine user details');
      return { success: false, message: 'Invalid password format' };
    }

    // Find the user in the database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, userDetails.email))
      .limit(1);

    if (!user) {
      console.warn(`User with email ${userDetails.email} not found in database`);
      return { success: false, message: 'User not found in database' };
    }

    // Find the user's primary team
    const [teamMembership] = await db
      .select({
        teamId: teams.id
      })
      .from(teamsMemberships)
      .innerJoin(teams, eq(teamsMemberships.teamId, teams.id))
      .where(eq(teamsMemberships.userId, user.id))
      .limit(1);

    if (!teamMembership) {
      console.warn(`No team found for user ${user.email}`);
      return { success: false, message: 'No team found for user' };
    }

    const teamId = teamMembership.teamId;

    // Check if projects already exist for this team
    const existingProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.teamId, teamId))
      .limit(1);

    if (existingProjects.length > 0) {
      console.log('Projects already exist for user team, skipping seeding');
      return { success: true, message: 'Projects already exist for team' };
    }

    // Generate unique identifiers to avoid conflicts between test runs
    // Use testInfo worker index and timestamp if available
    let uniqueSuffix = '';
    if (testInfo) {
      uniqueSuffix = `${testInfo.workerIndex}-${Date.now()}`;
    } else {
      // Fallback to random number if testInfo not available
      uniqueSuffix = `${Math.floor(Math.random() * 1000000)}`;
    }

    // Insert sample repositories for this team
    const repoData = [
      {
        githubId: Math.floor(Math.random() * 1000000) + 1001, // Random ID to avoid conflicts
        name: `foo-frontend-${uniqueSuffix}`,
        fullName: `jdoe/foo-frontend-${uniqueSuffix}`,
        description: 'Frontend application for the foo project',
        url: `https://github.com/jdoe/foo-frontend-${uniqueSuffix}`,
        isPrivate: false,
        language: 'TypeScript',
        stargazersCount: 42,
        forksCount: 8,
        openIssuesCount: 3,
        ownerLogin: 'jdoe',
        ownerType: 'User',
        ownerAvatarUrl: 'https://github.com/identicons/jdoe.png',
        teamId,
        pushedAt: new Date('2024-01-21T14:30:00Z'),
      },
      {
        githubId: Math.floor(Math.random() * 1000000) + 1002,
        name: `foo-backend-${uniqueSuffix}`,
        fullName: `jdoe/foo-backend-${uniqueSuffix}`,
        description: 'Backend API for the foo project',
        url: `https://github.com/jdoe/foo-backend-${uniqueSuffix}`,
        isPrivate: false,
        language: 'Python',
        stargazersCount: 35,
        forksCount: 5,
        openIssuesCount: 7,
        ownerLogin: 'jdoe',
        ownerType: 'User',
        ownerAvatarUrl: 'https://github.com/identicons/jdoe.png',
        teamId,
        pushedAt: new Date('2024-01-21T12:15:00Z'),
      },
      {
        githubId: Math.floor(Math.random() * 1000000) + 1003,
        name: `bar-api-${uniqueSuffix}`,
        fullName: `jdoe/bar-api-${uniqueSuffix}`,
        description: 'API service for the bar project',
        url: `https://github.com/jdoe/bar-api-${uniqueSuffix}`,
        isPrivate: false,
        language: 'Python',
        stargazersCount: 28,
        forksCount: 3,
        openIssuesCount: 5,
        ownerLogin: 'jdoe',
        ownerType: 'User',
        ownerAvatarUrl: 'https://github.com/identicons/jdoe.png',
        teamId,
        pushedAt: new Date('2024-01-21T10:45:00Z'),
      },
    ];

    const insertedRepos = await db.insert(repos).values(repoData).returning();

    // Insert sample projects for this team
    const projectData = [
      {
        name: `foo-${uniqueSuffix}`,
        fullName: `jdoe/foo-${uniqueSuffix}`,
        description: 'A comprehensive web application with frontend and backend components',
        ownerLogin: 'jdoe',
        ownerType: 'User',
        ownerAvatarUrl: 'https://github.com/identicons/jdoe.png',
        teamId,
        previewEnvironmentsCount: 7,
      },
      {
        name: `bar-${uniqueSuffix}`,
        fullName: `jdoe/bar-${uniqueSuffix}`,
        description: 'A microservices project with API-first architecture',
        ownerLogin: 'jdoe',
        ownerType: 'User',
        ownerAvatarUrl: 'https://github.com/identicons/jdoe.png',
        teamId,
        previewEnvironmentsCount: 3,
      },
    ];

    const insertedProjects = await db.insert(projects).values(projectData).returning();

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
      success: true, 
      message: 'Projects seeded successfully',
      data: {
        userId: user.id,
        userEmail: user.email,
        teamId,
        uniqueSuffix,
        repositoriesCount: insertedRepos.length,
        projectsCount: insertedProjects.length,
        relationshipsCount: projectRepoData.length
      }
    };

  } catch (error) {
    console.error('Error seeding projects for e2e user:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error during seeding' 
    };
  }
}