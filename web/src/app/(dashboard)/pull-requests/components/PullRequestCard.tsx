import Image from 'next/image';
import { PullRequest } from '@/actions/reports';

interface PullRequestCardProps {
  pr: PullRequest;
}

function getPriorityColor(priority: 'high' | 'medium' | 'low') {
  switch (priority) {
    case 'high':
      return 'bg-error-container text-on-error-container';
    case 'medium':
      return 'bg-warning-container text-on-warning-container';
    case 'low':
      return 'bg-success-container text-on-success-container';
    default:
      return 'bg-surface-variant text-on-surface-variant';
  }
}

function getStatusColor(status: 'draft' | 'ready' | 'changes_requested') {
  switch (status) {
    case 'ready':
      return 'bg-success-container text-on-success-container';
    case 'changes_requested':
      return 'bg-warning-container text-on-warning-container';
    case 'draft':
      return 'bg-surface-variant text-on-surface-variant';
    default:
      return 'bg-surface-variant text-on-surface-variant';
  }
}

export function PullRequestCard({ pr }: PullRequestCardProps) {
  return (
    <div className="bg-surface border border-outline rounded-lg p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Image 
            src={pr.author_avatar} 
            alt={`${pr.author} avatar`}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full"
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-on-surface">#{pr.number}</span>
              <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(pr.priority)}`}>
                {pr.priority} priority
              </span>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(pr.status)}`}>
                {pr.status.replace('_', ' ')}
              </span>
            </div>
            <div className="text-sm text-on-surface-variant">
              by {pr.author} • {pr.comments_count} comments
            </div>
          </div>
        </div>
      </div>

      <a 
        href={pr.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-lg font-semibold text-primary hover:opacity-80 mb-2 block"
      >
        {pr.title}
      </a>

      <div className="text-sm text-on-surface-variant mb-3">
        Repository: <span className="font-medium">{pr.repository}</span>
      </div>

      <div className="flex items-center justify-between text-sm text-on-surface-variant">
        <span>Created {new Date(pr.created_at).toLocaleDateString()}</span>
        <span>Updated {new Date(pr.updated_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}