import Link from 'next/link';
import { GlassCard } from '@tetrastack/react-glass-components';

interface EnvironmentsSectionProps {
  projectId: string;
}

// Mock preview environments data
const mockPreviewEnvironments = [
  {
    id: '1',
    branch: '001-environments/pull-request-environment',
    slug: '001-environments--pull-request-environment',
    previewUrl: 'https://001-environments--pull-request-environment.catalyst.example.com',
    status: 'running' as const,
  },
  {
    id: '2',
    branch: '001-environments/web-shell',
    slug: '001-environments--web-shell',
    previewUrl: 'https://001-environments--web-shell.catalyst.example.com',
    status: 'running' as const,
  },
  {
    id: '3',
    branch: '003-vsc-providers/dev-environment-pr-comment',
    slug: '003-vsc-providers--dev-environment-pr-comment',
    previewUrl: 'https://003-vsc-providers--dev-environment-pr-comment.catalyst.example.com',
    status: 'running' as const,
  },
  {
    id: '4',
    branch: 'copilot/fix-ci',
    slug: 'copilot--fix-ci',
    previewUrl: 'https://copilot--fix-ci.catalyst.example.com',
    status: 'deploying' as const,
  },
];

function getStatusBadge(status: 'running' | 'deploying' | 'pending' | 'failed') {
  switch (status) {
    case 'running':
      return 'bg-success-container text-on-success-container';
    case 'deploying':
      return 'bg-secondary-container text-on-secondary-container';
    case 'pending':
      return 'bg-surface-variant text-on-surface-variant';
    case 'failed':
      return 'bg-error-container text-on-error-container';
  }
}

export function EnvironmentsSection({ projectId }: EnvironmentsSectionProps) {
  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-on-surface">Environments</h2>
      </div>

      <div className="divide-y divide-outline/50 -mx-6">
        {mockPreviewEnvironments.map((env) => (
          <div key={env.id} className="px-6 py-3">
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-on-surface truncate">{env.branch}</h3>
                <a
                  href={env.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-on-surface-variant hover:text-primary truncate block"
                >
                  {env.previewUrl}
                </a>
              </div>
              <span className={`px-2 py-0.5 text-xs rounded-full shrink-0 ${getStatusBadge(env.status)}`}>
                {env.status}
              </span>
              <a
                href={env.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 text-xs font-medium text-on-surface-variant bg-surface hover:bg-surface/80 border border-outline rounded-lg transition-colors shrink-0"
              >
                Preview
              </a>
              <Link
                href={`/projects/${projectId}/env/${env.slug}`}
                className="px-3 py-1 text-xs font-medium text-on-primary bg-primary hover:opacity-90 rounded-lg transition-opacity shrink-0"
              >
                Env
              </Link>
            </div>
          </div>
        ))}
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
