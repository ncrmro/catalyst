'use server'

import { db } from '@/db'
import { projectWorkloads } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export interface WorkloadData {
  id: string
  projectId: string
  repoId: string
  name: string
  description: string | null
  rootPath: string
  deploymentType: 'dockerfile' | 'helm'
  dockerfilePath: string | null
  helmChartPath: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateWorkloadData {
  projectId: string
  repoId: string
  name: string
  description?: string
  rootPath?: string
  deploymentType: 'dockerfile' | 'helm'
  dockerfilePath?: string
  helmChartPath?: string
}

export interface UpdateWorkloadData {
  name?: string
  description?: string
  rootPath?: string
  deploymentType?: 'dockerfile' | 'helm'
  dockerfilePath?: string
  helmChartPath?: string
}

export async function fetchWorkloads(projectId: string, repoId: string): Promise<WorkloadData[]> {
  try {
    const workloads = await db
      .select()
      .from(projectWorkloads)
      .where(
        and(
          eq(projectWorkloads.projectId, projectId),
          eq(projectWorkloads.repoId, repoId)
        )
      )
      .orderBy(projectWorkloads.createdAt)

    return workloads.map(workload => ({
      ...workload,
      deploymentType: workload.deploymentType as 'dockerfile' | 'helm'
    }))
  } catch (error) {
    console.error('Error fetching workloads:', error)
    throw new Error('Failed to fetch workloads')
  }
}

export async function fetchWorkloadById(workloadId: string): Promise<WorkloadData | null> {
  try {
    const workload = await db
      .select()
      .from(projectWorkloads)
      .where(eq(projectWorkloads.id, workloadId))
      .limit(1)

    if (!workload[0]) return null
    
    return {
      ...workload[0],
      deploymentType: workload[0].deploymentType as 'dockerfile' | 'helm'
    }
  } catch (error) {
    console.error('Error fetching workload:', error)
    throw new Error('Failed to fetch workload')
  }
}

export async function createWorkload(data: CreateWorkloadData): Promise<WorkloadData> {
  try {
    const workload = await db
      .insert(projectWorkloads)
      .values({
        projectId: data.projectId,
        repoId: data.repoId,
        name: data.name,
        description: data.description || null,
        rootPath: data.rootPath || '.',
        deploymentType: data.deploymentType,
        dockerfilePath: data.dockerfilePath || (data.deploymentType === 'dockerfile' ? './Dockerfile' : null),
        helmChartPath: data.helmChartPath || (data.deploymentType === 'helm' ? './chart' : null),
      })
      .returning()

    revalidatePath(`/projects/${data.projectId}`)
    return {
      ...workload[0],
      deploymentType: workload[0].deploymentType as 'dockerfile' | 'helm'
    }
  } catch (error) {
    console.error('Error creating workload:', error)
    throw new Error('Failed to create workload')
  }
}

export async function updateWorkload(workloadId: string, data: UpdateWorkloadData): Promise<WorkloadData> {
  try {
    const workload = await db
      .update(projectWorkloads)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(projectWorkloads.id, workloadId))
      .returning()

    if (!workload[0]) {
      throw new Error('Workload not found')
    }

    revalidatePath(`/projects/${workload[0].projectId}`)
    return {
      ...workload[0],
      deploymentType: workload[0].deploymentType as 'dockerfile' | 'helm'
    }
  } catch (error) {
    console.error('Error updating workload:', error)
    throw new Error('Failed to update workload')
  }
}

export async function deleteWorkload(workloadId: string): Promise<void> {
  try {
    const workload = await fetchWorkloadById(workloadId)
    if (!workload) {
      throw new Error('Workload not found')
    }

    await db
      .delete(projectWorkloads)
      .where(eq(projectWorkloads.id, workloadId))

    revalidatePath(`/projects/${workload.projectId}`)
  } catch (error) {
    console.error('Error deleting workload:', error)
    throw new Error('Failed to delete workload')
  }
}