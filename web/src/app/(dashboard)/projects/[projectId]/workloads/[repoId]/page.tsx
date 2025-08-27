import { fetchProjectById } from '@/actions/projects'
import { WorkloadManager } from '@/components/workloads/workload-manager'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

interface WorkloadsPageProps {
  params: Promise<{
    projectId: string
    repoId: string
  }>
}

export async function generateMetadata({ params }: WorkloadsPageProps): Promise<Metadata> {
  const { projectId, repoId } = await params
  const project = await fetchProjectById(projectId)
  
  if (!project) {
    return {
      title: 'Workloads - Catalyst',
      description: 'Manage project workloads in Catalyst.',
    }
  }

  const repo = project.repositories.find(r => r.id === repoId)
  const repoName = repo?.name || 'Repository'
  
  return {
    title: `${repoName} Workloads - ${project.full_name} - Catalyst`,
    description: `Manage workloads for ${repoName} in ${project.full_name}.`,
  }
}

export default async function WorkloadsPage({ params }: WorkloadsPageProps) {
  const { projectId, repoId } = await params
  
  let project
  let error: string | null = null

  try {
    project = await fetchProjectById(projectId)
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch project'
    project = null
  }

  if (error || !project) {
    notFound()
  }

  const repo = project.repositories.find(r => r.id === repoId)
  if (!repo) {
    notFound()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/projects/${projectId}`}
          className="inline-flex items-center text-primary hover:opacity-80 mb-4"
        >
          ← Back to {project.full_name}
        </Link>
        
        <div className="bg-surface border border-outline rounded-lg p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-on-surface">
                {repo.name} Workloads
              </h1>
              <p className="text-on-surface-variant mt-1">
                Define and manage deployable workloads for this repository
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-on-surface-variant">
            <span>Project: {project.full_name}</span>
            <span>•</span>
            <span>Repository: {repo.full_name}</span>
            <span>•</span>
            <a 
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:opacity-80"
            >
              View on GitHub →
            </a>
          </div>
        </div>
      </div>

      {/* Workload Manager */}
      <WorkloadManager
        projectId={projectId}
        repoId={repoId}
        repoName={repo.name}
      />
    </div>
  )
}