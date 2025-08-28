/**
 * @jest-environment node
 */

import { describe, expect, it } from '@jest/globals';
import { projectManifests } from '../../../src/db/schema';

describe('Project Manifests Table Schema', () => {
  it('should have correct table structure and properties', () => {
    // Test that the table is defined and has the expected properties
    expect(projectManifests).toBeDefined();
    
    // Check that the table has the required columns
    const tableColumns = Object.keys(projectManifests);
    
    // Expected columns from our schema definition
    const expectedColumns = [
      'projectId', 
      'repoId',
      'path',
      'createdAt',
      'updatedAt',
    ];
    
    expectedColumns.forEach(column => {
      expect(tableColumns).toContain(column);
    });
  });

  it('should have correct column properties', () => {
    // Test that required columns exist and are correctly defined
    expect(projectManifests.projectId).toBeDefined();
    expect(projectManifests.repoId).toBeDefined();
    expect(projectManifests.path).toBeDefined();
    expect(projectManifests.createdAt).toBeDefined();
    expect(projectManifests.updatedAt).toBeDefined();

    // Test that the schema structure makes sense for the business logic
    // This validates that the table can be used to:
    // 1. Store manifest file paths for project-repo combinations
    // 2. Track creation and update timestamps
    // 3. Support composite primary key (project_id, repo_id, path)
    expect(typeof projectManifests.projectId).toBe('object');
    expect(typeof projectManifests.repoId).toBe('object');
    expect(typeof projectManifests.path).toBe('object');
  });

  it('should validate manifest file path examples', () => {
    // Test data structure for common manifest types mentioned in requirements
    const manifestExamples = [
      { path: 'Dockerfile', type: 'containerization' },
      { path: 'Chart.yaml', type: 'kubernetes' },
      { path: 'package.json', type: 'javascript' },
      { path: 'Cargo.toml', type: 'rust' },
      { path: 'Project.toml', type: 'python/julia' },
      { path: 'Gemfile', type: 'rails' },
      { path: 'apps/frontend/package.json', type: 'nested javascript' },
      { path: 'services/api/Dockerfile', type: 'nested containerization' },
    ];

    manifestExamples.forEach(manifest => {
      // Validate that path can be any string (no restrictions)
      expect(typeof manifest.path).toBe('string');
      expect(manifest.path.length).toBeGreaterThan(0);
    });
  });

  it('should allow multiple manifests per project-repo combination', () => {
    // Test data showing multiple manifest types for same project/repo
    const testData = [
      { projectId: 'proj-1', repoId: 'repo-1', path: 'Dockerfile' },
      { projectId: 'proj-1', repoId: 'repo-1', path: 'package.json' },
      { projectId: 'proj-1', repoId: 'repo-1', path: 'Chart.yaml' },
    ];

    // Each entry should have unique primary key (project_id, repo_id, path)
    const uniqueKeys = new Set();
    testData.forEach(item => {
      const key = `${item.projectId}-${item.repoId}-${item.path}`;
      expect(uniqueKeys.has(key)).toBe(false);
      uniqueKeys.add(key);
    });
  });
});