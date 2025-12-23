import { NextResponse } from 'next/server';
import { fetchProjects } from '@/actions/projects';

/**
 * GET /api/projects
 * Returns list of projects for the current user
 */
export async function GET() {
  try {
    const projectsData = await fetchProjects();
    return NextResponse.json(projectsData);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}
