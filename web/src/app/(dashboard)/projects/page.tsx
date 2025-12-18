import { fetchProjects } from '@/actions/projects';
import Link from 'next/link';
import { ProjectCard } from '@/components/projects/project-card';
import { Metadata } from "next";
import { GlassCard } from '@tetrastack/react-glass-components';

export const metadata: Metadata = {
  title: "Projects - Catalyst",
  description: "Manage your deployment projects and environments in Catalyst.",
};

export default async function ProjectsPage() {
  let projectsData = null;
  let error: string | null = null;

  try {
    projectsData = await fetchProjects();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch projects';
  }

  if (error) {
    return (
      <div className="space-y-6">
        <GlassCard>
          <h1 className="text-2xl font-bold text-on-surface">Projects</h1>
          <p className="text-on-surface-variant mt-1">Manage your deployment projects and environments</p>
        </GlassCard>
        <GlassCard variant="error">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 bg-error rounded-full shrink-0">
              <span className="text-on-error text-xl">!</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-on-error-container">Error Loading Projects</h2>
              <p className="text-on-error-container">{error}</p>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (!projectsData) {
    return (
      <div className="space-y-6">
        <GlassCard>
          <h1 className="text-2xl font-bold text-on-surface">Projects</h1>
          <p className="text-on-surface-variant mt-1">Manage your deployment projects and environments</p>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-on-surface-variant">Loading projects...</p>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-on-surface">Projects</h1>
            <p className="text-on-surface-variant mt-1">
              Manage your deployment projects and environments
            </p>
          </div>
          <Link
            href="/projects/create"
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-on-primary bg-primary hover:opacity-90 transition-opacity"
          >
            Create Project
          </Link>
        </div>
      </GlassCard>

      {/* Projects List */}
      {projectsData.projects.length > 0 ? (
        <GlassCard padded={false}>
          <div className="divide-y divide-outline/50">
            {projectsData.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </GlassCard>
      ) : (
        <GlassCard>
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-outline">
              <svg className="w-12 h-12 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-on-surface mb-2">No projects found</h3>
            <p className="text-on-surface-variant max-w-md mx-auto">
              Create your first project to get started with automated deployments and environment management.
            </p>
            <div className="mt-6">
              <Link
                href="/projects/create"
                className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-on-primary bg-primary hover:opacity-90 transition-opacity"
              >
                Create Project
              </Link>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}