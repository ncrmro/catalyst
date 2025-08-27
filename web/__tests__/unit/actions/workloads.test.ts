/**
 * @jest-environment node
 */

import {
  fetchWorkloads,
  fetchWorkloadById,
  createWorkload,
  updateWorkload,
  deleteWorkload,
  type CreateWorkloadData,
  type UpdateWorkloadData,
  type WorkloadData
} from '@/actions/workloads'

// Mock the database module
jest.mock('@/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }
}))

// Mock revalidatePath
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn()
}))

import { db } from '@/db'

const mockDb = db as jest.Mocked<typeof db>

const mockWorkloadData: WorkloadData = {
  id: 'workload-1',
  projectId: 'project-1',
  repoId: 'repo-1',
  name: 'frontend',
  description: 'Frontend application',
  rootPath: 'apps/frontend',
  deploymentType: 'dockerfile',
  dockerfilePath: './Dockerfile',
  helmChartPath: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01')
}

describe('Workload Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('fetchWorkloads', () => {
    it('should fetch workloads for a project and repository', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([mockWorkloadData])
      }

      mockDb.select.mockReturnValue(mockSelect)

      const result = await fetchWorkloads('project-1', 'repo-1')

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'workload-1',
        name: 'frontend',
        deploymentType: 'dockerfile'
      })
      expect(mockDb.select).toHaveBeenCalled()
    })

    it('should handle fetch error', async () => {
      mockDb.select.mockImplementation(() => {
        throw new Error('Database error')
      })

      await expect(fetchWorkloads('project-1', 'repo-1')).rejects.toThrow('Failed to fetch workloads')
    })
  })

  describe('fetchWorkloadById', () => {
    it('should fetch a workload by ID', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockWorkloadData])
      }

      mockDb.select.mockReturnValue(mockSelect)

      const result = await fetchWorkloadById('workload-1')

      expect(result).toMatchObject({
        id: 'workload-1',
        name: 'frontend',
        deploymentType: 'dockerfile'
      })
    })

    it('should return null if workload not found', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      }

      mockDb.select.mockReturnValue(mockSelect)

      const result = await fetchWorkloadById('nonexistent')

      expect(result).toBeNull()
    })
  })

  describe('createWorkload', () => {
    it('should create a new workload', async () => {
      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockWorkloadData])
      }

      mockDb.insert.mockReturnValue(mockInsert)

      const createData: CreateWorkloadData = {
        projectId: 'project-1',
        repoId: 'repo-1',
        name: 'frontend',
        description: 'Frontend application',
        rootPath: 'apps/frontend',
        deploymentType: 'dockerfile',
        dockerfilePath: './Dockerfile'
      }

      const result = await createWorkload(createData)

      expect(result).toMatchObject({
        id: 'workload-1',
        name: 'frontend',
        deploymentType: 'dockerfile'
      })
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('should handle create error', async () => {
      mockDb.insert.mockImplementation(() => {
        throw new Error('Database error')
      })

      const createData: CreateWorkloadData = {
        projectId: 'project-1',
        repoId: 'repo-1',
        name: 'frontend',
        deploymentType: 'dockerfile'
      }

      await expect(createWorkload(createData)).rejects.toThrow('Failed to create workload')
    })
  })

  describe('updateWorkload', () => {
    it('should update an existing workload', async () => {
      const updatedWorkload = { ...mockWorkloadData, name: 'updated-frontend' }
      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedWorkload])
      }

      mockDb.update.mockReturnValue(mockUpdate)

      const updateData: UpdateWorkloadData = {
        name: 'updated-frontend'
      }

      const result = await updateWorkload('workload-1', updateData)

      expect(result).toMatchObject({
        id: 'workload-1',
        name: 'updated-frontend',
        deploymentType: 'dockerfile'
      })
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should throw error if workload not found during update', async () => {
      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([])
      }

      mockDb.update.mockReturnValue(mockUpdate)

      const updateData: UpdateWorkloadData = {
        name: 'updated-frontend'
      }

      await expect(updateWorkload('nonexistent', updateData)).rejects.toThrow('Failed to update workload')
    })
  })

  describe('deleteWorkload', () => {
    it('should delete an existing workload', async () => {
      // Mock fetchWorkloadById
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockWorkloadData])
      }

      const mockDelete = {
        where: jest.fn().mockResolvedValue(undefined)
      }

      mockDb.select.mockReturnValue(mockSelect)
      mockDb.delete.mockReturnValue(mockDelete)

      await deleteWorkload('workload-1')

      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should throw error if workload not found during delete', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([])
      }

      mockDb.select.mockReturnValue(mockSelect)

      await expect(deleteWorkload('nonexistent')).rejects.toThrow('Failed to delete workload')
    })
  })

  describe('deployment type validation', () => {
    it('should handle dockerfile deployment type', async () => {
      const dockerfileWorkload = {
        ...mockWorkloadData,
        deploymentType: 'dockerfile',
        dockerfilePath: './custom/Dockerfile',
        helmChartPath: null
      }

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([dockerfileWorkload])
      }

      mockDb.select.mockReturnValue(mockSelect)

      const result = await fetchWorkloadById('workload-1')

      expect(result?.deploymentType).toBe('dockerfile')
      expect(result?.dockerfilePath).toBe('./custom/Dockerfile')
      expect(result?.helmChartPath).toBeNull()
    })

    it('should handle helm deployment type', async () => {
      const helmWorkload = {
        ...mockWorkloadData,
        deploymentType: 'helm',
        dockerfilePath: null,
        helmChartPath: './chart'
      }

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([helmWorkload])
      }

      mockDb.select.mockReturnValue(mockSelect)

      const result = await fetchWorkloadById('workload-1')

      expect(result?.deploymentType).toBe('helm')
      expect(result?.dockerfilePath).toBeNull()
      expect(result?.helmChartPath).toBe('./chart')
    })
  })
})