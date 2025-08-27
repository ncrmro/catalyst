import { describe, it, expect } from '@jest/globals';
import { projectEnvironments } from '../../src/db/schema';

describe('Project Environments Schema', () => {
  it('should export projectEnvironments table schema', () => {
    expect(projectEnvironments).toBeDefined();
    expect(typeof projectEnvironments).toBe('object');
  });

  it('should be importable from schema', () => {
    // This test verifies that the new table is properly exported
    // and can be used in other parts of the application
    expect(projectEnvironments).not.toBeNull();
    expect(projectEnvironments).not.toBeUndefined();
  });
});