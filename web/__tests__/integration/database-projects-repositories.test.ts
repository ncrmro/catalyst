import { db, repos, projects, projectsRepos } from '@/db';
import { fetchProjects } from '@/actions/projects';

describe('Database Projects Integration - Repository Management', () => {
  test('should handle primary repository designation correctly', async () => {
    const result = await fetchProjects();
    
    // Test basic result structure
    expect(result).toHaveProperty('projects');
    expect(Array.isArray(result.projects)).toBe(true);
    
    // Find a project with repositories
    const projectWithRepos = result.projects.find((p: any) => p.repositories.length > 0);
    
    if (projectWithRepos) {
      const primaryRepos = projectWithRepos.repositories.filter((r: any) => r.primary);
      
      // Each project should have at least one primary repo
      expect(primaryRepos.length).toBeGreaterThan(0);
      
      // Verify the primary flag is boolean for all repos
      projectWithRepos.repositories.forEach((repo: any) => {
        expect(typeof repo.primary).toBe('boolean');
      });
    } else {
      console.log('Integration test: No projects with repositories found for primary repo test');
    }
  });

  test('should ensure all repositories have required primary field', async () => {
    const result = await fetchProjects();
    
    // Test basic result structure
    expect(result).toHaveProperty('projects');
    expect(Array.isArray(result.projects)).toBe(true);
    
    // Test all projects with repositories
    const projectsWithRepos = result.projects.filter((p: any) => p.repositories.length > 0);
    
    if (projectsWithRepos.length > 0) {
      projectsWithRepos.forEach((project: any) => {
        project.repositories.forEach((repo: any) => {
          expect(repo).toHaveProperty('primary');
          expect(typeof repo.primary).toBe('boolean');
        });
      });
    } else {
      console.log('Integration test: No projects with repositories found for primary field validation');
    }
  });
});