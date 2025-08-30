import { db, repos, projects, projectsRepos, users, teams, teamsMemberships } from '@/db';
import { eq } from 'drizzle-orm';
import { TestInfo } from '@playwright/test';

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
    isAdmin,
    image: 'https://avatars.githubusercontent.com/u/67470890?s=200&v=4'
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

    const teamName = name ? `${name}'s Team` : `${email.split("@")[0]}'s Team`;

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
 * Generate repositories for a team
 * Used by both E2E tests and development seeding
 */
export async function createTeamRepos(teamId: string, uniqueSuffix: string) {
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

  return await db.insert(repos).values(repoData).returning();
}

/**
 * Generate projects for a team with the given repos
 * Used by both E2E tests and development seeding
 */
export async function createTeamProjects(teamId: string, uniqueSuffix: string, insertedRepos: any[]) {
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
    projects: insertedProjects,
    relationships: projectRepoData
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
        console.warn('Invalid password format, cannot determine user details');
        return { success: false, message: 'Invalid password format' };
      }
    } else if (options.email) {
      userDetails = {
        email: options.email,
        name: options.name || options.email.split('@')[0],
        isAdmin: options.admin || false,
        image: options.image || 'https://avatars.githubusercontent.com/u/67470890?s=200&v=4'
      };
    } else {
      return { success: false, message: 'Either password or email must be provided' };
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
          teamId: teams.id
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
          admin: userDetails.isAdmin
        });
        team = result.team;
      }
    } else {
      // Create new user with team
      const result = await createUserWithTeam({
        email: userDetails.email,
        name: userDetails.name,
        image: userDetails.image,
        admin: userDetails.isAdmin
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
        console.log('Projects already exist for user team, skipping project creation');
        return { 
          success: true, 
          message: 'User exists with team and projects',
          data: { userId: user.id, userEmail: user.email, teamId: team.id }
        };
      }
  
      // Generate unique suffix for this user's projects
      let uniqueSuffix = '';
      if (options.testInfo) {
        uniqueSuffix = `${options.testInfo.workerIndex}-${Date.now()}`;
      } else {
        uniqueSuffix = `${user.email.split('@')[0]}-${Math.floor(Math.random() * 1000000)}`;
      }
  
      // Create repos and projects
      const insertedRepos = await createTeamRepos(team.id, uniqueSuffix);
      const projectResult = await createTeamProjects(team.id, uniqueSuffix, insertedRepos);
  
      return { 
        success: true, 
        message: 'User created/found and projects seeded successfully',
        data: {
          userId: user.id,
          userEmail: user.email,
          teamId: team.id,
          uniqueSuffix,
          repositoriesCount: insertedRepos.length,
          projectsCount: projectResult.projects.length,
          relationshipsCount: projectResult.relationships.length
        }
      };
    }
    
    // User created/found but no projects requested or needed
    return { 
      success: true, 
      message: 'User created/found successfully',
      data: { userId: user.id, userEmail: user.email, teamId: team?.id }
    };
  } catch (error) {
    console.error('Error in seedUser:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error during seeding' 
    };
  }
}

/**
 * Seed default users for development
 * For use by scripts/seed.js
 */
export async function seedDefaultUsers() {
  const results = [];
  
  // Create regular user
  results.push(await seedUser({
    email: 'bob@alice.com',
    name: 'Bob Alice',
    admin: false,
    createProjects: true
  }));
  
  // Create admin user
  results.push(await seedUser({
    email: 'admin@example.com',
    name: 'Test Admin',
    admin: true,
    createProjects: true
  }));
  
  return {
    success: results.every(r => r.success),
    message: 'Default users seeded',
    results
  };
}