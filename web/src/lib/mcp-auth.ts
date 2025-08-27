'use server';

import { db } from '@/db';
import { users, teams, teamsMemberships, projects } from '@/db/schema';
import { asc, eq, inArray } from 'drizzle-orm';

export interface McpUser {
  id: string;
  email: string | null;
  name: string | null;
  teams: Array<{
    id: string;
    name: string;
    role: string;
  }>;
  projects: Array<{
    id: string;
    name: string;
    teamId: string;
  }>;
}

/**
 * Get the first user in the system with their teams and projects
 * This user will be used for MCP API key authentication
 */
export async function getFirstUser(): Promise<McpUser | null> {
  try {
    const [firstUser] = await db
      .select()
      .from(users)
      .orderBy(asc(users.id))
      .limit(1);
    
    if (!firstUser) {
      return null;
    }

    // Get user's teams
    const userTeams = await db
      .select({
        teamId: teams.id,
        teamName: teams.name,
        role: teamsMemberships.role,
      })
      .from(teamsMemberships)
      .innerJoin(teams, eq(teamsMemberships.teamId, teams.id))
      .where(eq(teamsMemberships.userId, firstUser.id));

    // Get projects for user's teams
    const teamIds = userTeams.map(team => team.teamId);
    const userProjects = teamIds.length > 0 ? await db
      .select({
        id: projects.id,
        name: projects.name,
        teamId: projects.teamId,
      })
      .from(projects)
      .where(inArray(projects.teamId, teamIds))
      : [];

    // Remove the redundant loop section since we're getting all projects in one query
    
    return {
      id: firstUser.id,
      email: firstUser.email,
      name: firstUser.name,
      teams: userTeams.map(team => ({
        id: team.teamId,
        name: team.teamName,
        role: team.role,
      })),
      projects: userProjects,
    };
  } catch (error) {
    console.error('Error fetching first user:', error);
    return null;
  }
}

/**
 * Validate an API key and return the associated user with teams and projects
 * For now, we use a static API key that belongs to the first user
 */
export async function validateApiKey(apiKey: string): Promise<McpUser | null> {
  // For static API key authentication, we'll use a configured key
  const validApiKey = process.env.MCP_API_KEY;
  
  if (!validApiKey) {
    console.warn('MCP_API_KEY environment variable not set');
    return null;
  }
  
  if (apiKey !== validApiKey) {
    return null;
  }
  
  // Return the first user with teams and projects for this API key
  return await getFirstUser();
}