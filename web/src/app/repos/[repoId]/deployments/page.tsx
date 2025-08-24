import { fetchGitHubRepos } from '@/actions/repos.github';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import DashboardLayout from '@/components/dashboard-layout';
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { DeploymentConfigForm } from '@/components/repos/deployment-config-form';

export const metadata: Metadata = {
  title: "Deployment Configuration - Catalyst",
  description: "Configure deployment settings for production, staging, and preview environments.",
};

interface DeploymentPageProps {
  params: Promise<{ repoId: string }>;
}

export default async function DeploymentPage({ params }: DeploymentPageProps) {
  // Authentication check
  let session;
  if (process.env.MOCKED === '1') {
    session = {
      user: {
        name: "Test User",
        email: "test@example.com"
      },
      userId: "test-user-1",
      accessToken: "mock-token"
    };
  } else {
    session = await auth();
    
    if (!session?.user) {
      redirect("/login");
    }
  }

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

  return (
    <DashboardLayout user={session.user}>
      <div className="space-y-6">
        {/* Header Section */}
        <div>
          <div className="flex items-center gap-4 mb-4">
            <Image 
              src={repo.owner.avatar_url} 
              alt={`${repo.owner.login} avatar`}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full"
            />
            <div>
              <h1 className="text-3xl font-bold text-on-background">Deployment Configuration</h1>
              <p className="text-on-surface-variant">
                Configure deployment settings for <span className="font-semibold">{repo.full_name}</span>
              </p>
            </div>
          </div>
          <p className="text-on-surface-variant">
            Set up Docker, Kubernetes, and deployment configurations for production, staging, and preview environments.
          </p>
        </div>

        {/* Repository Info Card */}
        <div className="bg-surface border border-outline rounded-lg p-6">
          <div className="flex items-center gap-4">
            <Image 
              src={repo.owner.avatar_url} 
              alt={`${repo.owner.login} avatar`}
              width={48}
              height={48}
              className="w-12 h-12 rounded-full"
            />
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-on-surface">{repo.full_name}</h2>
              {repo.description && (
                <p className="text-on-surface-variant">{repo.description}</p>
              )}
              <div className="flex items-center gap-4 text-sm text-on-surface-variant mt-2">
                {repo.language && (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-primary rounded-full"></span>
                    {repo.language}
                  </span>
                )}
                <span>⭐ {repo.stargazers_count}</span>
                <span>🍴 {repo.forks_count}</span>
                {repo.private && (
                  <span className="bg-secondary-container text-on-secondary-container text-xs px-2 py-1 rounded-full">
                    Private
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Deployment Configuration Form */}
        <DeploymentConfigForm repo={repo} />
      </div>
    </DashboardLayout>
  );
}