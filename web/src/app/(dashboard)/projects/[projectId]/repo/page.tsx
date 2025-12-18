import { fetchProjectById } from '@/actions/projects';
import { fetchProjectManifests, type ProjectManifest } from '@/actions/project-manifests';
import { ProjectManifestsForm } from '@/components/projects/project-manifests-form';
import { GlassCard } from '@tetrastack/react-glass-components';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

interface RepoPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export async function generateMetadata({ params }: RepoPageProps): Promise<Metadata> {
  const { projectId } = await params;
  const project = await fetchProjectById(projectId);

  return {
    title: project ? `Repositories - ${project.fullName} - Catalyst` : 'Repositories - Catalyst',
    description: 'Manage repositories and environment templates for this project.',
  };
}

export default async function RepoPage({ params }: RepoPageProps) {
  const { projectId } = await params;

  let project;
  let manifests: ProjectManifest[];

  try {
    [project, manifests] = await Promise.all([
      fetchProjectById(projectId),
      fetchProjectManifests(projectId)
    ]);
  } catch {
    notFound();
  }

  if (!project) {
    notFound();
  }

  const repositoriesForForm = project.repositories.map(repoConnection => ({
    id: repoConnection.repo.id,
    name: repoConnection.repo.name,
    full_name: repoConnection.repo.fullName,
    url: repoConnection.repo.url,
    primary: repoConnection.isPrimary
  }));

  return (
    <>
      {/* Repositories Section */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-on-surface mb-4">Repositories</h2>
        <div className="divide-y divide-outline/50 -mx-6">
          {project.repositories.map((repoConnection) => (
            <a
              key={repoConnection.repo.id}
              href={repoConnection.repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-6 py-3 hover:bg-surface/50 transition-colors"
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${repoConnection.isPrimary ? 'bg-primary' : 'bg-on-surface-variant'}`}></span>
              <span className="font-medium text-on-surface flex-1">{repoConnection.repo.name}</span>
              {repoConnection.isPrimary && (
                <span className="bg-primary-container text-on-primary-container px-2 py-0.5 rounded text-xs shrink-0">
                  primary
                </span>
              )}
              <svg className="w-4 h-4 text-on-surface-variant shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </div>
      </GlassCard>

      {/* Environment Templates Section */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-on-surface mb-2">Environment Templates</h2>
        <p className="text-on-surface-variant text-sm mb-4">
          Define Dockerfile paths, Helm charts, and other manifest files for deployment configuration.
        </p>
        <ProjectManifestsForm
          projectId={projectId}
          repositories={repositoriesForForm}
          manifests={manifests}
        />
      </GlassCard>
    </>
  );
}
