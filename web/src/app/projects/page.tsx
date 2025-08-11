import { fetchProjects } from '@/actions/projects';
import Image from 'next/image';

interface ProjectEnvironment {
  id: string;
  name: string;
  type: 'branch_push' | 'cron';
  branch?: string;
  cron_schedule?: string;
  status: 'active' | 'inactive' | 'deploying';
  url?: string;
  last_deployed?: string;
}

interface ProjectRepo {
  id: number;
  name: string;
  full_name: string;
  url: string;
  primary: boolean;
}

interface Project {
  id: string;
  name: string;
  full_name: string;
  description: string | null;
  owner: {
    login: string;
    type: 'User' | 'Organization';
    avatar_url: string;
  };
  repositories: ProjectRepo[];
  environments: ProjectEnvironment[];
  preview_environments_count: number;
  created_at: string;
  updated_at: string;
}

function EnvironmentBadge({ environment }: { environment: ProjectEnvironment }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'deploying':
        return 'bg-yellow-100 text-yellow-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'branch_push' ? '🔄' : '⏰';
  };

  const getTypeDescription = (env: ProjectEnvironment) => {
    if (env.type === 'branch_push') {
      return env.branch ? `on ${env.branch}` : 'branch push';
    } else {
      return env.cron_schedule ? `cron: ${env.cron_schedule}` : 'scheduled';
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(environment.status)}`}>
        {getTypeIcon(environment.type)}
        {environment.name}
      </span>
      <span className="text-gray-500 text-xs">
        {getTypeDescription(environment)}
      </span>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const primaryRepo = project.repositories.find(repo => repo.primary) || project.repositories[0];
  const otherRepos = project.repositories.filter(repo => !repo.primary);

  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
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
            <h3 className="text-lg font-semibold text-gray-900">{project.full_name}</h3>
            {project.description && (
              <p className="text-gray-600 text-sm mt-1">{project.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
            {project.preview_environments_count} previews
          </span>
        </div>
      </div>

      {/* Environments */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Environments</h4>
        <div className="space-y-2">
          {project.environments.map((env) => (
            <EnvironmentBadge key={env.id} environment={env} />
          ))}
        </div>
      </div>

      {/* Repositories */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Repositories ({project.repositories.length})
        </h4>
        <div className="space-y-1">
          {primaryRepo && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <a 
                href={primaryRepo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {primaryRepo.name}
              </a>
              <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-xs">
                primary
              </span>
            </div>
          )}
          {otherRepos.slice(0, 2).map((repo) => (
            <div key={repo.id} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              <a 
                href={repo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-gray-800"
              >
                {repo.name}
              </a>
            </div>
          ))}
          {otherRepos.length > 2 && (
            <div className="text-xs text-gray-500 ml-4">
              +{otherRepos.length - 2} more repositories
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Created {new Date(project.created_at).toLocaleDateString()}</span>
          <span>Updated {new Date(project.updated_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}

export default async function ProjectsPage() {
  let projectsData;
  let error: string | null = null;

  try {
    projectsData = await fetchProjects();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch projects';
    projectsData = null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Projects</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
              <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Projects</h2>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!projectsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="mt-4 text-lg text-gray-600">
            Manage your deployment projects and environments
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {projectsData.total_count} projects with environments and preview deployments
          </p>
        </div>

        {/* Projects Grid */}
        {projectsData.projects.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projectsData.projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-3xl">🚀</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Create your first project to get started with automated deployments and environment management.
            </p>
            <div className="mt-6">
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                Create Project
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}