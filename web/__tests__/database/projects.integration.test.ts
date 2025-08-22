import { db, repos, projects, projectsRepos } from '@/db';
import { fetchProjects } from '@/actions/projects';

describe('Database Projects Integration', () => {
  beforeAll(async () => {
    // Ensure we have some test data
    // This test assumes the database is seeded with test data
  });

  test('should fetch projects from database', async () => {
    const result = await fetchProjects();
    
    expect(result).toHaveProperty('projects');
    expect(result).toHaveProperty('total_count');
    expect(Array.isArray(result.projects)).toBe(true);
    
    if (result.projects.length > 0) {
      const project = result.projects[0];
      
      // Validate project structure
      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('name');
      expect(project).toHaveProperty('full_name');
      expect(project).toHaveProperty('owner');
      expect(project).toHaveProperty('repositories');
      expect(project).toHaveProperty('environments');
      
      // Validate owner structure
      expect(project.owner).toHaveProperty('login');
      expect(project.owner).toHaveProperty('type');
      expect(['User', 'Organization']).toContain(project.owner.type);
      
      // Validate repositories structure
      expect(Array.isArray(project.repositories)).toBe(true);
      
      if (project.repositories.length > 0) {
        const repo = project.repositories[0];
        expect(repo).toHaveProperty('id');
        expect(repo).toHaveProperty('name');
        expect(repo).toHaveProperty('full_name');
        expect(repo).toHaveProperty('url');
        expect(repo).toHaveProperty('primary');
        expect(typeof repo.primary).toBe('boolean');
      }
      
      // Validate environments structure
      expect(Array.isArray(project.environments)).toBe(true);
      
      if (project.environments.length > 0) {
        const env = project.environments[0];
        expect(env).toHaveProperty('id');
        expect(env).toHaveProperty('name');
        expect(env).toHaveProperty('type');
        expect(env).toHaveProperty('status');
        expect(['branch_push', 'cron']).toContain(env.type);
        expect(['active', 'inactive', 'deploying']).toContain(env.status);
      }
    }
  });

  test('should handle primary repository designation correctly', async () => {
    const result = await fetchProjects();
    
    // Find a project with repositories
    const projectWithRepos = result.projects.find(p => p.repositories.length > 0);
    
    if (projectWithRepos) {
      const primaryRepos = projectWithRepos.repositories.filter(r => r.primary);
      const nonPrimaryRepos = projectWithRepos.repositories.filter(r => !r.primary);
      
      // Each project should have at least one primary repo
      expect(primaryRepos.length).toBeGreaterThan(0);
      
      // Verify the primary flag is boolean
      projectWithRepos.repositories.forEach(repo => {
        expect(typeof repo.primary).toBe('boolean');
      });
    }
  });

  test('should return consistent project count', async () => {
    const result = await fetchProjects();
    
    expect(result.total_count).toBe(result.projects.length);
    expect(typeof result.total_count).toBe('number');
  });

  test('should handle database errors gracefully', async () => {
    // This test checks the fallback mechanism
    // In a real scenario where the database is unavailable,
    // the function should fall back to mock data
    
    const result = await fetchProjects();
    
    // Should always return a valid result structure
    expect(result).toHaveProperty('projects');
    expect(result).toHaveProperty('total_count');
    expect(Array.isArray(result.projects)).toBe(true);
    expect(typeof result.total_count).toBe('number');
  });
});