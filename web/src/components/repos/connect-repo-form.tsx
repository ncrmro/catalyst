'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { connectRepoToProject } from '@/actions/connect-repo';

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

interface Project {
  id: string;
  name: string;
  full_name: string;
  description: string | null;
}

interface ConnectRepoFormProps {
  repo: GitHubRepo;
  existingProjects: Project[];
}

export function ConnectRepoForm({ repo, existingProjects }: ConnectRepoFormProps) {
  const router = useRouter();
  const [connectionType, setConnectionType] = useState<'new' | 'existing'>('new');
  const [projectName, setProjectName] = useState(repo.name);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [description, setDescription] = useState(repo.description || '');
  const [isPrimary, setIsPrimary] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const result = await connectRepoToProject({
        repoId: repo.id,
        connectionType,
        projectName: connectionType === 'new' ? projectName : undefined,
        projectId: connectionType === 'existing' ? selectedProjectId : undefined,
        description: connectionType === 'new' ? description : undefined,
        isPrimary,
        repo, // Pass the full repo object for creating new projects
      });

      if (result.success) {
        router.push('/projects');
      } else {
        setError(result.error || 'Failed to connect repository');
      }
    } catch (err) {
      setError('Failed to connect repository to project. Please try again.');
      console.error('Error connecting repo:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow-sm border rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Connection Type Selection */}
        <div>
          <legend className="text-lg font-medium text-gray-900 mb-4">
            How would you like to connect this repository?
          </legend>
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="connectionType"
                value="new"
                checked={connectionType === 'new'}
                onChange={(e) => setConnectionType(e.target.value as 'new')}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-gray-900">Create a new project</div>
                <div className="text-sm text-gray-600">
                  Start a new project using this repository as the foundation
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="connectionType"
                value="existing"
                checked={connectionType === 'existing'}
                onChange={(e) => setConnectionType(e.target.value as 'existing')}
                className="mt-1"
                disabled={existingProjects.length === 0}
              />
              <div>
                <div className="font-medium text-gray-900">Add to existing project</div>
                <div className="text-sm text-gray-600">
                  {existingProjects.length === 0 
                    ? 'No existing projects available'
                    : 'Connect this repository to one of your existing projects'
                  }
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* New Project Form */}
        {connectionType === 'new' && (
          <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
            <h3 className="font-medium text-gray-900">New Project Details</h3>
            
            <div>
              <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-1">
                Project Name
              </label>
              <input
                type="text"
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Existing Project Selection */}
        {connectionType === 'existing' && existingProjects.length > 0 && (
          <div className="space-y-4 p-4 border rounded-lg bg-green-50">
            <h3 className="font-medium text-gray-900">Select Project</h3>
            
            <div>
              <label htmlFor="existingProject" className="block text-sm font-medium text-gray-700 mb-1">
                Choose an existing project
              </label>
              <select
                id="existingProject"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a project...</option>
                {existingProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.full_name} {project.description && `- ${project.description}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Repository Role */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Set as primary repository
            </span>
          </label>
          <p className="text-xs text-gray-600 mt-1">
            The primary repository will be used for main deployments and environments
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <button
            type="button"
            onClick={() => router.push('/repos')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting || (connectionType === 'existing' && !selectedProjectId)}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Connecting...' : 'Connect Repository'}
          </button>
        </div>
      </form>
    </div>
  );
}