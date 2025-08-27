/**
 * @jest-environment node
 */

import { describe, expect, it } from '@jest/globals';
import { projectEnvironments } from '@/db';

describe('Project Environments Table Schema', () => {
  it('should have correct table structure and properties', () => {
    // Test that the table is defined and has the expected properties
    expect(projectEnvironments).toBeDefined();
    
    // Check that the table has the required columns
    const tableColumns = Object.keys(projectEnvironments);
    
    // Expected columns from our schema definition
    const expectedColumns = [
      'id',
      'projectId', 
      'repoId',
      'environment',
      'latestDeployment',
      'createdAt',
      'updatedAt',
    ];
    
    expectedColumns.forEach(column => {
      expect(tableColumns).toContain(column);
    });
  });

  it('should have correct column properties', () => {
    // Test that required columns exist and are correctly defined
    expect(projectEnvironments.id).toBeDefined();
    expect(projectEnvironments.projectId).toBeDefined();
    expect(projectEnvironments.repoId).toBeDefined();
    expect(projectEnvironments.environment).toBeDefined();
    expect(projectEnvironments.latestDeployment).toBeDefined();
    expect(projectEnvironments.createdAt).toBeDefined();
    expect(projectEnvironments.updatedAt).toBeDefined();

    // Test that the schema structure makes sense for the business logic
    // This validates that the table can be used to:
    // 1. Store environments for project-repo combinations
    // 2. Track latest deployments
    // 3. Maintain creation and update timestamps
    expect(typeof projectEnvironments.id).toBe('object');
    expect(typeof projectEnvironments.projectId).toBe('object');
    expect(typeof projectEnvironments.repoId).toBe('object');
    expect(typeof projectEnvironments.environment).toBe('object');
  });
});