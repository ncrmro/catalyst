'use client'

import { useState } from 'react'
import { createWorkload, updateWorkload, deleteWorkload, type CreateWorkloadData, type UpdateWorkloadData, type WorkloadData } from '@/actions/workloads'

interface WorkloadFormProps {
  projectId: string
  repoId: string
  workload?: WorkloadData
  onSuccess?: () => void
  onCancel?: () => void
}

export function WorkloadForm({ projectId, repoId, workload, onSuccess, onCancel }: WorkloadFormProps) {
  const [formData, setFormData] = useState({
    name: workload?.name || '',
    description: workload?.description || '',
    rootPath: workload?.rootPath || '.',
    deploymentType: workload?.deploymentType || 'dockerfile' as 'dockerfile' | 'helm',
    dockerfilePath: workload?.dockerfilePath || './Dockerfile',
    helmChartPath: workload?.helmChartPath || './chart',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (workload) {
        const updateData: UpdateWorkloadData = {
          name: formData.name,
          description: formData.description || undefined,
          rootPath: formData.rootPath,
          deploymentType: formData.deploymentType,
          dockerfilePath: formData.deploymentType === 'dockerfile' ? formData.dockerfilePath : undefined,
          helmChartPath: formData.deploymentType === 'helm' ? formData.helmChartPath : undefined,
        }
        await updateWorkload(workload.id, updateData)
      } else {
        const createData: CreateWorkloadData = {
          projectId,
          repoId,
          name: formData.name,
          description: formData.description || undefined,
          rootPath: formData.rootPath,
          deploymentType: formData.deploymentType,
          dockerfilePath: formData.deploymentType === 'dockerfile' ? formData.dockerfilePath : undefined,
          helmChartPath: formData.deploymentType === 'helm' ? formData.helmChartPath : undefined,
        }
        await createWorkload(createData)
      }
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-error-container border border-error rounded-lg p-4">
          <p className="text-on-error-container">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-on-surface mb-2">
          Workload Name
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., frontend, api, worker"
          required
          className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
        <p className="text-xs text-on-surface-variant mt-1">
          A unique name for this deployable workload
        </p>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-on-surface mb-2">
          Description (Optional)
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of this workload"
          rows={3}
          className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      <div>
        <label htmlFor="rootPath" className="block text-sm font-medium text-on-surface mb-2">
          Root Path
        </label>
        <input
          type="text"
          id="rootPath"
          value={formData.rootPath}
          onChange={(e) => setFormData(prev => ({ ...prev, rootPath: e.target.value }))}
          placeholder="."
          required
          className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
        <p className="text-xs text-on-surface-variant mt-1">
          Path within the repository where this workload is located (e.g., &quot;apps/frontend&quot;, &quot;services/api&quot;)
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-on-surface mb-2">
          Deployment Type
        </label>
        <div className="flex space-x-4">
          {(['dockerfile', 'helm'] as const).map((type) => (
            <label key={type} className="flex items-center">
              <input
                type="radio"
                name="deploymentType"
                value={type}
                checked={formData.deploymentType === type}
                onChange={(e) => setFormData(prev => ({ ...prev, deploymentType: e.target.value as 'dockerfile' | 'helm' }))}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded-full border-2 mr-2 ${
                formData.deploymentType === type
                  ? 'border-primary bg-primary'
                  : 'border-outline'
              }`}>
                {formData.deploymentType === type && (
                  <div className="w-2 h-2 bg-on-primary rounded-full m-0.5"></div>
                )}
              </div>
              <span className="text-sm text-on-surface">
                {type === 'dockerfile' ? 'Docker' : 'Helm Chart'}
              </span>
            </label>
          ))}
        </div>
      </div>

      {formData.deploymentType === 'dockerfile' && (
        <div>
          <label htmlFor="dockerfilePath" className="block text-sm font-medium text-on-surface mb-2">
            Dockerfile Path
          </label>
          <input
            type="text"
            id="dockerfilePath"
            value={formData.dockerfilePath}
            onChange={(e) => setFormData(prev => ({ ...prev, dockerfilePath: e.target.value }))}
            placeholder="./Dockerfile"
            className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <p className="text-xs text-on-surface-variant mt-1">
            Path to Dockerfile relative to the root path
          </p>
        </div>
      )}

      {formData.deploymentType === 'helm' && (
        <div>
          <label htmlFor="helmChartPath" className="block text-sm font-medium text-on-surface mb-2">
            Helm Chart Path
          </label>
          <input
            type="text"
            id="helmChartPath"
            value={formData.helmChartPath}
            onChange={(e) => setFormData(prev => ({ ...prev, helmChartPath: e.target.value }))}
            placeholder="./chart"
            className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
          <p className="text-xs text-on-surface-variant mt-1">
            Path to Helm chart directory relative to the root path
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-on-surface-variant border border-outline rounded-md hover:bg-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : (workload ? 'Update Workload' : 'Create Workload')}
        </button>
      </div>
    </form>
  )
}

interface WorkloadCardProps {
  workload: WorkloadData
  onEdit?: () => void
  onDelete?: () => void
}

export function WorkloadCard({ workload, onEdit, onDelete }: WorkloadCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this workload?')) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteWorkload(workload.id)
      onDelete?.()
    } catch (error) {
      console.error('Error deleting workload:', error)
      alert('Failed to delete workload')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="bg-surface border border-outline rounded-lg p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-on-surface">{workload.name}</h3>
          {workload.description && (
            <p className="text-sm text-on-surface-variant mt-1">{workload.description}</p>
          )}
        </div>
        <div className="flex space-x-2">
          {onEdit && (
            <button
              onClick={onEdit}
              className="text-sm text-primary hover:opacity-80 px-2 py-1 rounded"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-sm text-error hover:opacity-80 px-2 py-1 rounded disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-on-surface-variant">Root Path:</span>
          <code className="text-on-surface bg-surface-variant px-2 py-1 rounded">{workload.rootPath}</code>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-on-surface-variant">Deployment:</span>
          <span className={`px-2 py-1 text-xs rounded-full ${
            workload.deploymentType === 'dockerfile' 
              ? 'bg-primary-container text-on-primary-container' 
              : 'bg-secondary-container text-on-secondary-container'
          }`}>
            {workload.deploymentType === 'dockerfile' ? 'Docker' : 'Helm Chart'}
          </span>
        </div>
        {workload.deploymentType === 'dockerfile' && workload.dockerfilePath && (
          <div className="flex items-center justify-between">
            <span className="text-on-surface-variant">Dockerfile:</span>
            <code className="text-on-surface bg-surface-variant px-2 py-1 rounded">{workload.dockerfilePath}</code>
          </div>
        )}
        {workload.deploymentType === 'helm' && workload.helmChartPath && (
          <div className="flex items-center justify-between">
            <span className="text-on-surface-variant">Chart Path:</span>
            <code className="text-on-surface bg-surface-variant px-2 py-1 rounded">{workload.helmChartPath}</code>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-outline text-xs text-on-surface-variant">
        Created {workload.createdAt.toLocaleDateString()}
        {workload.updatedAt.getTime() !== workload.createdAt.getTime() && (
          <span> • Updated {workload.updatedAt.toLocaleDateString()}</span>
        )}
      </div>
    </div>
  )
}