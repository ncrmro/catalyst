import { fetchProjectById } from '@/actions/projects';
import { GlassCard } from '@tetrastack/react-glass-components';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ProjectNav } from './project-nav';

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    projectId: string;
  }>;
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;

  const project = await fetchProjectById(projectId);

  if (!project) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <GlassCard>
        <div className="flex items-start gap-4">
          <Image
            src={project.ownerAvatarUrl || ''}
            alt={`${project.ownerLogin} avatar`}
            width={64}
            height={64}
            className="w-16 h-16 rounded-full shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-on-surface">{project.fullName}</h1>
            {project.description && (
              <p className="text-on-surface-variant mt-1">{project.description}</p>
            )}
          </div>
          {/* Navigation Tabs */}
          <ProjectNav projectId={projectId} />
        </div>
      </GlassCard>

      {/* Page Content */}
      {children}
    </div>
  );
}
