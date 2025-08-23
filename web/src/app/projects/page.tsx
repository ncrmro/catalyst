import { fetchProjects, ProjectsData } from '@/actions/projects';
import Link from 'next/link';
import { ProjectCard } from '@/components/projects/project-card';
import { auth } from "@/auth";
import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard-layout";

export const metadata: Metadata = {
  title: "Projects - Catalyst",
  description: "Manage your deployment projects and environments in Catalyst.",
};

export default async function ProjectsPage() {
  // Since authentication is now handled globally in the root layout,
  // we can get the session directly without checking
  // In mocked mode, create a mock session for testing
  let session;
  if (process.env.MOCKED === '1') {
    session = {
      user: {
        name: "Test User",
        email: "test@example.com"
      },
      userId: "test-user-1",
      accessToken: "mock-token"
    };
  } else {
    // We know we're authenticated at this point due to global auth check
    session = await auth();
  }

  // At this point, we should always have a session due to global auth check
  if (!session?.user) {
    throw new Error("Session should be available after global auth check");
  }
  let projectsData: ProjectsData | null;
  let error: string | null = null;

  try {
    projectsData = await fetchProjects();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch projects';
    projectsData = null;
  }

  if (error) {
    return (
      <DashboardLayout user={session.user}>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-on-background mb-4">Projects</h1>
          <div className="bg-error-container border border-error rounded-lg p-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-center w-12 h-12 bg-error rounded-full mx-auto mb-4">
              <span className="text-on-error text-xl">⚠️</span>
            </div>
            <h2 className="text-lg font-semibold text-on-error-container mb-2">Error Loading Projects</h2>
            <p className="text-on-error-container">{error}</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!projectsData) {
    return (
      <DashboardLayout user={session.user}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-on-surface-variant">Loading projects...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={session.user}>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-on-background">Projects</h1>
          <p className="mt-4 text-lg text-on-surface-variant">
            Manage your deployment projects and environments
          </p>
          <p className="text-sm text-on-surface-variant mt-2">
            {projectsData.total_count} projects with environments and preview deployments
          </p>
        </div>

        {/* Projects Grid */}
        {projectsData.projects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projectsData.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-outline">
              <span className="text-on-surface-variant text-3xl">🚀</span>
            </div>
            <h3 className="text-lg font-medium text-on-surface mb-2">No projects found</h3>
            <p className="text-on-surface-variant max-w-md mx-auto">
              Create your first project to get started with automated deployments and environment management.
            </p>
            <div className="mt-6">
              <Link
                href="/projects/create"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-on-primary bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Create Project
              </Link>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}