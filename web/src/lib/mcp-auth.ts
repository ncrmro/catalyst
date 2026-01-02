import { auth } from "@/auth";
import { fetchUserTeams } from "@/actions/teams";
import { fetchProjects } from "@/actions/projects";

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
    full_name: string;
  }>;
}

// Static API key for authorization
const STATIC_API_KEY = process.env.MCP_API_KEY || "catalyst-mcp-key-2024";

/**
 * Validate API key from request (not a server action)
 */
export function validateApiKey(authHeader: string | null): boolean {
  if (!authHeader) return false;

  const token = authHeader.replace("Bearer ", "");
  return token === STATIC_API_KEY;
}

/**
 * Get authenticated user with teams and projects for MCP context
 */
export async function getAuthenticatedUser(): Promise<McpUser | null> {
  "use server";

  try {
    const session = await auth();
    if (!session?.user) {
      return null;
    }

    // Fetch user's teams and projects
    const [teams, projectsData] = await Promise.all([
      fetchUserTeams(),
      fetchProjects(),
    ]);

    return {
      id: session.user.id,
      email: session.user.email || null,
      name: session.user.name || null,
      teams: teams.map((team) => ({
        id: team.id,
        name: team.name,
        role: team.role,
      })),
      projects: projectsData.projects.map((project) => ({
        id: project.id,
        name: project.name,
        full_name: project.fullName,
      })),
    };
  } catch (error) {
    console.error("Error getting authenticated user:", error);
    return null;
  }
}
