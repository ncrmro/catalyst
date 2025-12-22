import Link from 'next/link';
import { GlassCard } from '@tetrastack/react-glass-components';
import { listEnvironmentCRs } from '@/lib/k8s-operator';
import { fetchProjectById } from '@/actions/projects';

interface EnvironmentsSectionProps {
  projectId: string;
}

export async function EnvironmentsSection({ projectId }: EnvironmentsSectionProps) {
  const project = await fetchProjectById(projectId);
  if (!project) return null;

  const sanitizedProjectName = project.name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");

  const k8sEnvironments = await listEnvironmentCRs("default");
  
  // Filter environments for this project
  const environments = k8sEnvironments.filter(
    env => env.spec.projectRef.name === sanitizedProjectName
  );

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-on-surface">Environments</h2>
      </div>

      <div className="divide-y divide-outline/50 -mx-6">
        {environments.length > 0 ? (
          environments.map((env) => (
            <div key={env.metadata.name} className="px-6 py-3">
              <div className="flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-on-surface">{env.metadata.name}</h3>
                  <div className="text-sm text-on-surface-variant flex gap-2">
                    <span className="capitalize">{env.spec.type}</span>
                    {env.status?.url && (
                      <a 
                        href={env.status.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate max-w-[200px]"
                      >
                        {env.status.url}
                      </a>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full shrink-0 ${
                  env.status?.phase === 'Ready' 
                    ? 'bg-success-container text-on-success-container' 
                    : 'bg-surface-variant text-on-surface-variant'
                }`}>
                  {env.status?.phase || 'Pending'}
                </span>
                
                {env.status?.url && (
                   <a
                    href={env.status.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-xs font-medium text-on-surface-variant bg-surface hover:bg-surface/80 border border-outline rounded-lg transition-colors shrink-0"
                  >
                    Open
                  </a>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="px-6 py-8 text-center text-on-surface-variant">
            No active environments found in cluster.
          </div>
        )}
      </div>

      {/* Add Environment Button */}
      <div className="mt-4 pt-4 border-t border-outline/50 -mx-6 px-6">
        <Link
          href={`/environments/${projectId}`}
          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-on-primary bg-primary rounded-lg hover:opacity-90 transition-opacity"
        >
          Add Environment
        </Link>
      </div>
    </GlassCard>
  );
}

