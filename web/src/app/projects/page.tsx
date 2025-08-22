import { fetchProjects, ProjectsData } from '@/actions/projects';
import Link from 'next/link';
import { ProjectCard } from '@/components/projects/project-card';
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Projects - Catalyst",
  description: "Manage your deployment projects and environments in Catalyst.",
};

export default async function ProjectsPage() {
  const session = await auth();
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
          <h1 className="text-3xl font-bold text-foreground mb-4">Projects</h1>
          <div className="bg-destructive border border-error rounded-lg p-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-center w-12 h-12 bg-error rounded-full mx-auto mb-4">
              <span className="text-on-error text-xl">⚠️</span>
            </div>
            <h2 className="text-lg font-semibold text-destructive-foreground mb-2">Error Loading Projects</h2>
            <p className="text-destructive-foreground">{error}</p>
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
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout user={session.user}>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Manage your deployment projects and environments
          </p>
          <p className="text-sm text-muted-foreground mt-2">
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
            <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
              <span className="text-muted-foreground text-3xl">🚀</span>
            </div>
            <h3 className="text-lg font-medium text-card-foreground mb-2">No projects found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Create your first project to get started with automated deployments and environment management.
            </p>
            <div className="mt-6">
              <Button asChild>
                <Link href="/projects/create">
                  Create Project
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}