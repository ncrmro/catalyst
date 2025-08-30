import { db, repos, projects, projectsRepos } from '@/db';
import { getUserPrimaryTeamId } from '@/lib/team-auth';
import { eq } from 'drizzle-orm';

/**
 * Seed projects for the current user's team (for E2E testing)
 * This ensures that E2E test users have access to projects in their own teams
 */
export async function seedProjectsForCurrentUser() {
  try {
    // Get the current user's primary team
    const teamId = await getUserPrimaryTeamId();
    
    if (!teamId) {
      console.warn('No team found for current user, cannot seed projects');
      return { success: false, message: 'No team found for current user' };
    }

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
    const uniqueSuffix = `${Math.floor(Math.random() * 1000000)}`;

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
        teamId,
        repositoriesCount: insertedRepos.length,
        projectsCount: insertedProjects.length,
        relationshipsCount: projectRepoData.length
      }
    };

  } catch (error) {
    console.error('Error seeding projects for current user:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error during seeding' 
    };
  }
}
