import { Project } from '@/actions/projects';
import Image from 'next/image';
import { EnvironmentBadge } from './environment-badge';

export function ProjectCard({ project }: { project: Project }) {
  const primaryRepo = project.repositories.find(repo => repo.primary) || project.repositories[0];
  const otherRepos = project.repositories.filter(repo => !repo.primary);

  return (
    <div 
      className="bg-surface border border-outline rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
      data-testid={`project-card-${project.full_name}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Image 
            src={project.owner.avatar_url} 
            alt={`${project.owner.login} avatar`}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full"
          />
          <div>
            <h3 className="text-lg font-semibold text-on-surface">{project.full_name}</h3>
            {project.description && (
              <p className="text-on-surface-variant text-sm mt-1">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-on-surface-variant">
          <span className="bg-primary-container text-on-primary-container px-2 py-1 rounded-full text-xs font-medium">
            {project.preview_environments_count} previews
          </span>
        </div>
      </div>

      {/* Environments */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-on-surface-variant mb-2">Environments</h4>
        <div className="space-y-2">
          {project.environments.map((env) => (
            <EnvironmentBadge key={env.id} environment={env} />
          ))}
        </div>
      </div>

      {/* Repositories */}
      <div>
        <h4 className="text-sm font-medium text-on-surface-variant mb-2">
          Repositories ({project.repositories.length})
        </h4>
        <div className="space-y-1">
          {primaryRepo && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-primary rounded-full"></span>
              <a 
                href={primaryRepo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:opacity-80 font-medium"
              >
                {primaryRepo.name}
              </a>
              <span className="bg-primary-container text-on-primary-container px-1.5 py-0.5 rounded text-xs">
                primary
              </span>
            </div>
          )}
          {otherRepos.slice(0, 2).map((repo) => (
            <div key={repo.id} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-on-surface-variant rounded-full"></span>
              <a 
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-on-surface-variant hover:text-on-surface"
              >
                {repo.name}
              </a>
            </div>
          ))}
          {otherRepos.length > 2 && (
            <div className="text-xs text-on-surface-variant ml-4">
              +{otherRepos.length - 2} more repositories
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-outline">
        <div className="flex items-center justify-between text-xs text-on-surface-variant">
          <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
          <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}