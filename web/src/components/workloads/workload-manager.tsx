'use client'

import { useState, useEffect } from 'react'
import { fetchWorkloads, type WorkloadData } from '@/actions/workloads'
import { WorkloadForm, WorkloadCard } from './workload-form'

interface WorkloadManagerProps {
  projectId: string
  repoId: string
  repoName: string
}

export function WorkloadManager({ projectId, repoId, repoName }: WorkloadManagerProps) {
  const [workloads, setWorkloads] = useState<WorkloadData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingWorkload, setEditingWorkload] = useState<WorkloadData | null>(null)

  const loadWorkloads = async () => {
    try {
      setLoading(true)
      const data = await fetchWorkloads(projectId, repoId)
      setWorkloads(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workloads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkloads()
  }, [projectId, repoId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingWorkload(null)
    loadWorkloads()
  }

  const handleEdit = (workload: WorkloadData) => {
    setEditingWorkload(workload)
    setShowForm(true)
  }

  const handleDelete = () => {
    loadWorkloads()
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingWorkload(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-error-container border border-error rounded-lg p-6">
        <p className="text-on-error-container">{error}</p>
        <button
          onClick={loadWorkloads}
          className="mt-2 text-sm text-error hover:opacity-80"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-on-surface">Workloads</h3>
          <p className="text-sm text-on-surface-variant">
            Define deployable workloads for {repoName}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Add Workload
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-surface border border-outline rounded-lg p-6">
          <h4 className="text-lg font-medium text-on-surface mb-4">
            {editingWorkload ? 'Edit Workload' : 'Add New Workload'}
          </h4>
          <WorkloadForm
            projectId={projectId}
            repoId={repoId}
            workload={editingWorkload || undefined}
            onSuccess={handleFormSuccess}
            onCancel={handleCancel}
          />
        </div>
      )}

      {workloads.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {workloads.map((workload) => (
            <WorkloadCard
              key={workload.id}
              workload={workload}
              onEdit={() => handleEdit(workload)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="bg-surface border border-outline rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-surface-variant rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-on-surface-variant text-2xl">🚀</span>
            </div>
            <h4 className="text-lg font-medium text-on-surface mb-2">No workloads defined</h4>
            <p className="text-on-surface-variant mb-4">
              Create workloads to define deployable units within this repository. 
              Perfect for monorepos with multiple applications or services.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Create First Workload
            </button>
          </div>
        )
      )}
    </div>
  )
}