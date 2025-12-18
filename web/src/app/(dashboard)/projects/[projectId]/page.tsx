import { fetchProjectById } from '@/actions/projects';
import { GlassCard } from '@tetrastack/react-glass-components';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { EnvironmentsSection } from './environments-section';

interface ProjectPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { projectId } = await params;
  const project = await fetchProjectById(projectId);

  return {
    title: project ? `${project.fullName} - Catalyst` : 'Project - Catalyst',
    description: project?.description || 'Project overview and environments.',
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;

  const project = await fetchProjectById(projectId);

  if (!project) {
    notFound();
  }

  // Mock specs data
  const specs = [
    { id: '001', name: '001-environments', status: 'in-progress' },
    { id: '003', name: '003-vsc-providers', status: 'planned' },
    { id: '006', name: '006-user-agent-interfaces', status: 'planned' },
  ];

  return (
    <>
      <EnvironmentsSection projectId={projectId} />

      {/* Specs Section */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-on-surface">Specs</h2>
        </div>
        <div className="divide-y divide-outline/50 -mx-6">
          {specs.map((spec) => (
            <div key={spec.id} className="flex items-center gap-4 px-6 py-3 hover:bg-surface/50 transition-colors cursor-pointer">
              <div className="flex-1">
                <h3 className="font-medium text-on-surface">{spec.name}</h3>
              </div>
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                spec.status === 'in-progress'
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'bg-surface-variant text-on-surface-variant'
              }`}>
                {spec.status}
              </span>
              <svg className="w-4 h-4 text-on-surface-variant" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          ))}
        </div>
      </GlassCard>
    </>
  );
}
