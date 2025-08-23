import { Project } from '@/actions/projects';
import Image from 'next/image';
import { EnvironmentBadge } from './environment-badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function ProjectCard({ project }: { project: Project }) {
  const primaryRepo = project.repositories.find(repo => repo.primary) || project.repositories[0];
  const otherRepos = project.repositories.filter(repo => !repo.primary);

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Image 
              src={project.owner.avatar_url} 
              alt={`${project.owner.login} avatar`}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full"
            />
            <div>
              <h3 className="text-lg font-semibold text-card-foreground">{project.full_name}</h3>
              {project.description && (
                <p className="text-muted-foreground text-sm mt-1">{project.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="bg-muted text-primary-foreground-container px-2 py-1 rounded-full text-xs font-medium">
              {project.preview_environments_count} previews
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Environments */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Environments</h4>
          <div className="space-y-2">
            {project.environments.map((env) => (
              <EnvironmentBadge key={env.id} environment={env} />
            ))}
          </div>
        </div>

        {/* Repositories */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
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
                <span className="bg-muted text-primary-foreground-container px-1.5 py-0.5 rounded text-xs">
                  primary
                </span>
              </div>
            )}
            {otherRepos.slice(0, 2).map((repo) => (
              <div key={repo.id} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 bg-muted-foreground rounded-full"></span>
                <a 
                  href={repo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-card-foreground"
                >
                  {repo.name}
                </a>
              </div>
            ))}
            {otherRepos.length > 2 && (
              <div className="text-xs text-muted-foreground ml-4">
                +{otherRepos.length - 2} more repositories
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
            <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}