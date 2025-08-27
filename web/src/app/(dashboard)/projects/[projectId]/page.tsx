import { fetchProjectById, fetchProjectPullRequests, fetchProjectIssues, type Project } from '@/actions/projects';
import { type PullRequest, type Issue } from '@/actions/reports';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

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

function getTypeColor(type: 'bug' | 'feature' | 'improvement' | 'idea') {
  switch (type) {
    case 'bug':
      return 'bg-error-container text-on-error-container';
    case 'feature':
      return 'bg-primary-container text-on-primary-container';
    case 'improvement':
      return 'bg-secondary-container text-on-secondary-container';
    case 'idea':
      return 'bg-tertiary-container text-on-tertiary-container';
    default:
      return 'bg-surface-variant text-on-surface-variant';
  }
}

function PullRequestCard({ pr }: { pr: PullRequest }) {
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

function IssueCard({ issue }: { issue: Issue }) {
  return (
    <div className="bg-surface border border-outline rounded-lg p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-on-surface">#{issue.number}</span>
          <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(issue.priority)}`}>
            {issue.priority} priority
          </span>
          <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(issue.type)}`}>
            {issue.type}
          </span>
          <span className="px-2 py-1 text-xs rounded-full bg-surface-variant text-on-surface-variant">
            {issue.effort_estimate} effort
          </span>
        </div>
      </div>

      <a 
        href={issue.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-lg font-semibold text-primary hover:opacity-80 mb-2 block"
      >
        {issue.title}
      </a>

      <div className="text-sm text-on-surface-variant mb-3">
        Repository: <span className="font-medium">{issue.repository}</span>
      </div>

      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {issue.labels.map((label) => (
            <span key={label} className="px-2 py-1 text-xs rounded-full bg-primary-container text-on-primary-container">
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-on-surface-variant">
        <span>Created {new Date(issue.created_at).toLocaleDateString()}</span>
        <span>Updated {new Date(issue.updated_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

interface ProjectPageProps {
  params: Promise<{
    projectId: string;
  }>;
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { projectId } = await params;
  const project = await fetchProjectById(projectId);
  
  return {
    title: project ? `${project.full_name} - Catalyst` : 'Project - Catalyst',
    description: project?.description || 'Project details, pull requests, and issues in Catalyst.',
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { projectId } = await params;
  
  let project: Project | null;
  let pullRequests: PullRequest[];
  let issues: Issue[];
  let error: string | null = null;

  try {
    [project, pullRequests, issues] = await Promise.all([
      fetchProjectById(projectId),
      fetchProjectPullRequests(projectId),
      fetchProjectIssues(projectId)
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch project data';
    project = null;
    pullRequests = [];
    issues = [];
  }

  if (error || !project) {
    notFound();
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
          <Link
            href="/projects"
            className="inline-flex items-center text-primary hover:opacity-80 mb-4"
          >
            ← Back to Projects
          </Link>
          <div className="bg-surface border border-outline rounded-lg p-8 shadow-sm">
            <div className="flex items-start gap-4 mb-6">
              <Image 
                src={project.owner.avatar_url} 
                alt={`${project.owner.login} avatar`}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full"
              />
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-on-surface mb-2">{project.full_name}</h1>
                {project.description && (
                  <p className="text-lg text-on-surface-variant mb-4">{project.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-on-surface-variant">
                  <span>Owner: {project.owner.login} ({project.owner.type})</span>
                  <span>•</span>
                  <span>{project.repositories.length} repositories</span>
                  <span>•</span>
                  <span>{project.preview_environments_count} preview environments</span>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-primary-container rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-on-primary-container">{pullRequests.length}</div>
                <div className="text-sm text-on-primary-container">Open Pull Requests</div>
              </div>
              <div className="bg-secondary-container rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-on-secondary-container">{issues.length}</div>
                <div className="text-sm text-on-secondary-container">Priority Issues</div>
              </div>
              <div className="bg-tertiary-container rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-on-tertiary-container">{project.environments.length}</div>
                <div className="text-sm text-on-tertiary-container">Active Environments</div>
              </div>
            </div>
          </div>
        </div>

        {/* Repositories Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-on-surface mb-6">Repositories</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {project.repositories.map((repo) => (
              <div key={repo.id} className="bg-surface border border-outline rounded-lg p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full ${repo.primary ? 'bg-primary' : 'bg-on-surface-variant'}`}></span>
                  <a 
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:opacity-80"
                  >
                    {repo.name}
                  </a>
                  {repo.primary && (
                    <span className="bg-primary-container text-on-primary-container px-1.5 py-0.5 rounded text-xs">
                      primary
                    </span>
                  )}
                </div>
                <p className="text-sm text-on-surface-variant mb-3">{repo.full_name}</p>
                <div className="flex gap-2">
                  <Link
                    href={`/projects/${project.id}/workloads/${repo.id}`}
                    className="text-xs text-primary hover:opacity-80 px-2 py-1 border border-primary rounded"
                  >
                    Manage Workloads
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pull Requests Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-on-surface mb-6">Open Pull Requests</h2>
          {pullRequests.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {pullRequests.map((pr) => (
                <PullRequestCard key={pr.id} pr={pr} />
              ))}
            </div>
          ) : (
            <div className="bg-surface border border-outline rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-on-surface-variant text-2xl">✅</span>
              </div>
              <h3 className="text-lg font-medium text-on-surface mb-2">No open pull requests</h3>
              <p className="text-on-surface-variant">All pull requests across project repositories have been merged or closed.</p>
            </div>
          )}
        </div>

        {/* Priority Issues Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-on-surface mb-6">Priority Issues</h2>
          {issues.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          ) : (
            <div className="bg-surface border border-outline rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-on-surface-variant text-2xl">🎯</span>
              </div>
              <h3 className="text-lg font-medium text-on-surface mb-2">No priority issues</h3>
              <p className="text-on-surface-variant">No high-priority issues found across project repositories.</p>
            </div>
          )}
        </div>

        {/* Environments Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-on-surface mb-6">Environments</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {project.environments.map((env) => (
              <div key={env.id} className="bg-surface border border-outline rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-on-surface">{env.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    env.status === 'active' ? 'bg-success-container text-on-success-container' :
                    env.status === 'deploying' ? 'bg-warning-container text-on-warning-container' :
                    'bg-surface-variant text-on-surface-variant'
                  }`}>
                    {env.status}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant mb-2">
                  Type: {env.type === 'branch_push' ? `Branch: ${env.branch}` : `Cron: ${env.cron_schedule}`}
                </p>
                {env.url && (
                  <a 
                    href={env.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:opacity-80"
                  >
                    View Environment →
                  </a>
                )}
                {env.last_deployed && (
                  <p className="text-xs text-on-surface-variant mt-2">
                    Last deployed: {new Date(env.last_deployed).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }