import { db, repos, projects, projectsRepos, teams } from '@/db';

/**
 * Seed the database with sample data for development and testing
 */
export async function seedDatabase() {
  // For E2E testing, we need to ensure that seeded projects are accessible to test users
  // We'll either use an existing team or create/use a dedicated E2E team
  
  // Check if we have any teams available
  const existingTeams = await db.select().from(teams).limit(1);
  
  let teamId: string;
  
  if (existingTeams.length === 0) {
    throw new Error('Cannot seed database: No teams found. Please create at least one team first.');
  } else {
    // Use the first available team - this ensures compatibility with existing E2E test users
    teamId = existingTeams[0].id;
    console.log(`Using existing team for seeded data: ${teamId}`);
  }

  // Insert sample repositories
  const repoData = [
    {
      githubId: 1001,
      name: 'foo-frontend',
      fullName: 'jdoe/foo-frontend',
      description: 'Frontend application for the foo project',
      url: 'https://github.com/jdoe/foo-frontend',
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
      githubId: 1002,
      name: 'foo-backend',
      fullName: 'jdoe/foo-backend',
      description: 'Backend API for the foo project',
      url: 'https://github.com/jdoe/foo-backend',
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
      githubId: 1003,
      name: 'foo-shared',
      fullName: 'jdoe/foo-shared',
      description: 'Shared utilities for the foo project',
      url: 'https://github.com/jdoe/foo-shared',
      isPrivate: false,
      language: 'JavaScript',
      stargazersCount: 18,
      forksCount: 3,
      openIssuesCount: 1,
      ownerLogin: 'jdoe',
      ownerType: 'User',
      ownerAvatarUrl: 'https://github.com/identicons/jdoe.png',
      teamId,
      pushedAt: new Date('2024-01-20T16:45:00Z'),
    },
    {
      githubId: 2001,
      name: 'bar-api',
      fullName: 'jdoe/bar-api',
      description: 'API for the bar microservices project',
      url: 'https://github.com/jdoe/bar-api',
      isPrivate: true,
      language: 'Go',
      stargazersCount: 23,
      forksCount: 4,
      openIssuesCount: 2,
      ownerLogin: 'jdoe',
      ownerType: 'User',
      ownerAvatarUrl: 'https://github.com/identicons/jdoe.png',
      teamId,
      pushedAt: new Date('2024-01-21T10:20:00Z'),
    },
    {
      githubId: 2002,
      name: 'bar-web',
      fullName: 'jdoe/bar-web',
      description: 'Web interface for the bar project',
      url: 'https://github.com/jdoe/bar-web',
      isPrivate: true,
      language: 'React',
      stargazersCount: 31,
      forksCount: 6,
      openIssuesCount: 5,
      ownerLogin: 'jdoe',
      ownerType: 'User',
      ownerAvatarUrl: 'https://github.com/identicons/jdoe.png',
      teamId,
      pushedAt: new Date('2024-01-21T09:30:00Z'),
    },
    {
      githubId: 3001,
      name: 'baz-service',
      fullName: 'awesome-org/baz-service',
      description: 'Core service for the baz platform',
      url: 'https://github.com/awesome-org/baz-service',
      isPrivate: true,
      language: 'Java',
      stargazersCount: 89,
      forksCount: 15,
      openIssuesCount: 12,
      ownerLogin: 'awesome-org',
      ownerType: 'Organization',
      ownerAvatarUrl: 'https://github.com/identicons/awesome-org.png',
      teamId,
      pushedAt: new Date('2024-01-20T18:00:00Z'),
    },
  ];

  const insertedRepos = await db.insert(repos).values(repoData).returning();

  // Insert sample projects
  const projectData = [
    {
      name: 'foo',
      fullName: 'jdoe/foo',
      description: 'A sample project with multiple environments and repositories',
      ownerLogin: 'jdoe',
      ownerType: 'User',
      ownerAvatarUrl: 'https://github.com/identicons/jdoe.png',
      teamId,
      previewEnvironmentsCount: 7,
      createdAt: new Date('2023-11-15T10:00:00Z'),
      updatedAt: new Date('2024-01-21T14:30:00Z'),
    },
    {
      name: 'bar',
      fullName: 'jdoe/bar',
      description: 'A microservices project with automated deployments',
      ownerLogin: 'jdoe',
      ownerType: 'User',
      ownerAvatarUrl: 'https://github.com/identicons/jdoe.png',
      teamId,
      previewEnvironmentsCount: 3,
      createdAt: new Date('2023-10-20T15:30:00Z'),
      updatedAt: new Date('2024-01-21T11:45:00Z'),
    },
    {
      name: 'baz',
      fullName: 'awesome-org/baz',
      description: 'Enterprise platform with advanced deployment strategies',
      ownerLogin: 'awesome-org',
      ownerType: 'Organization',
      ownerAvatarUrl: 'https://github.com/identicons/awesome-org.png',
      teamId,
      previewEnvironmentsCount: 12,
      createdAt: new Date('2023-08-10T08:15:00Z'),
      updatedAt: new Date('2024-01-20T19:20:00Z'),
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
    {
      projectId: insertedProjects[0].id,
      repoId: insertedRepos[2].id, // foo-shared
      isPrimary: false,
    },
    // bar project repos
    {
      projectId: insertedProjects[1].id,
      repoId: insertedRepos[3].id, // bar-api
      isPrimary: true,
    },
    {
      projectId: insertedProjects[1].id,
      repoId: insertedRepos[4].id, // bar-web
      isPrimary: false,
    },
    // baz project repos
    {
      projectId: insertedProjects[2].id,
      repoId: insertedRepos[5].id, // baz-service
      isPrimary: true,
    },
  ];

  await db.insert(projectsRepos).values(projectRepoData);

  console.log('Database seeded successfully!');
  console.log(`Inserted ${insertedRepos.length} repositories`);
  console.log(`Inserted ${insertedProjects.length} projects`);
  console.log(`Created ${projectRepoData.length} project-repo relationships`);
}