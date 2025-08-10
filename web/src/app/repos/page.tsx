import { fetchGitHubRepos } from '@/actions/repos.github';
import Image from 'next/image';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  owner: {
    login: string;
    type: 'User' | 'Organization';
    avatar_url: string;
  };
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  updated_at: string;
}

interface GitHubOrganization {
  login: string;
  id: number;
  avatar_url: string;
  description: string | null;
}

function RepoCard({ repo }: { repo: GitHubRepo }) {
  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Image 
              src={repo.owner.avatar_url} 
              alt={`${repo.owner.login} avatar`}
              width={24}
              height={24}
              className="w-6 h-6 rounded-full"
            />
            <a 
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 font-semibold text-lg"
            >
              {repo.full_name}
            </a>
            {repo.private && (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                Private
              </span>
            )}
          </div>
          
          {repo.description && (
            <p className="text-gray-600 mb-3">{repo.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {repo.language && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                {repo.language}
              </span>
            )}
            <span>⭐ {repo.stargazers_count}</span>
            <span>🍴 {repo.forks_count}</span>
            <span>📋 {repo.open_issues_count} issues</span>
            <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrganizationSection({ 
  organization, 
  repos 
}: { 
  organization: GitHubOrganization;
  repos: GitHubRepo[];
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <Image 
          src={organization.avatar_url} 
          alt={`${organization.login} avatar`}
          width={32}
          height={32}
          className="w-8 h-8 rounded-full"
        />
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{organization.login}</h2>
          {organization.description && (
            <p className="text-gray-600 text-sm">{organization.description}</p>
          )}
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {repos.map((repo) => (
          <RepoCard key={repo.id} repo={repo} />
        ))}
      </div>
    </div>
  );
}

export default async function ReposPage() {
  let reposData;
  let error: string | null = null;

  try {
    reposData = await fetchGitHubRepos();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch repositories';
    reposData = null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">GitHub Repositories</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
              <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Repositories</h2>
              <p className="text-red-700">{error}</p>
              <div className="mt-4 text-sm text-red-600">
                <p>To view repositories, set NODE_ENV=mocked or GITHUB_REPOS_MODE=mocked in your environment.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!reposData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading repositories...</p>
        </div>
      </div>
    );
  }

  const totalRepos = reposData.user_repos.length + 
    Object.values(reposData.org_repos).reduce((sum, repos) => sum + repos.length, 0);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">GitHub Repositories</h1>
          <p className="mt-4 text-lg text-gray-600">
            Connected repositories from your account and organizations
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {totalRepos} repositories across {reposData.organizations.length + 1} accounts
          </p>
        </div>

        {/* User Repositories */}
        {reposData.user_repos.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Your Repositories</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {reposData.user_repos.map((repo) => (
                <RepoCard key={repo.id} repo={repo} />
              ))}
            </div>
          </div>
        )}

        {/* Organization Repositories */}
        {reposData.organizations.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-8">Organization Repositories</h2>
            {reposData.organizations.map((org) => {
              const orgRepos = reposData.org_repos[org.login] || [];
              if (orgRepos.length === 0) return null;
              
              return (
                <OrganizationSection 
                  key={org.id} 
                  organization={org} 
                  repos={orgRepos} 
                />
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {totalRepos === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-3xl">📁</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No repositories found</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Connect your GitHub account and grant access to organizations to see repositories here.
            </p>
            <div className="mt-6">
              <a
                href="/github"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Set up GitHub Integration
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}