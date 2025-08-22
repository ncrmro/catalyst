import { fetchGitHubRepos } from '@/actions/repos.github';
import { fetchProjects } from '@/actions/projects';
import { ConnectRepoForm } from '@/components/repos/connect-repo-form';
import { notFound } from 'next/navigation';

interface ConnectRepoPageProps {
  params: Promise<{ repoId: string }>;
}

export default async function ConnectRepoPage({ params }: ConnectRepoPageProps) {
  const { repoId } = await params;
  
  // Fetch repo data and find the specific repo
  const reposData = await fetchGitHubRepos();
  const allRepos = [
    ...reposData.user_repos,
    ...Object.values(reposData.org_repos).flat()
  ];
  
  const repo = allRepos.find(r => r.id.toString() === repoId);
  
  if (!repo) {
    notFound();
  }

  // Fetch existing projects
  const projectsData = await fetchProjects();

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Connect Repository</h1>
          <p className="mt-4 text-lg text-gray-600">
            Connect <span className="font-semibold">{repo.full_name}</span> to a project
          </p>
        </div>

        <div className="bg-white shadow-sm border rounded-lg p-6 mb-8">
          <div className="flex items-center gap-4">
            <img 
              src={repo.owner.avatar_url} 
              alt={`${repo.owner.login} avatar`}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{repo.full_name}</h2>
              {repo.description && (
                <p className="text-gray-600">{repo.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-2">
                {repo.language && (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    {repo.language}
                  </span>
                )}
                <span>⭐ {repo.stargazers_count}</span>
                <span>🍴 {repo.forks_count}</span>
              </div>
            </div>
          </div>
        </div>

        <ConnectRepoForm repo={repo} existingProjects={projectsData.projects} />
      </div>
    </div>
  );
}