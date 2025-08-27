import { db, repos, projects, projectsRepos } from '@/db';
import { fetchProjects } from '@/actions/projects';

describe('Database Projects Integration - Repository Management', () => {
  test('should handle primary repository designation correctly', async () => {
    const result = await fetchProjects();
    
    // Find a project with repositories
    const projectWithRepos = result.projects.find((p: any) => p.repositories.length > 0);
    
    if (!projectWithRepos) {
      console.log('Skipping: No projects with repositories found for primary repo test');
      return;
    }

    const primaryRepos = projectWithRepos.repositories.filter((r: any) => r.primary);
    
    // Each project should have at least one primary repo
    expect(primaryRepos.length).toBeGreaterThan(0);
    
    // Verify the primary flag is boolean for all repos
    projectWithRepos.repositories.forEach((repo: any) => {
      expect(typeof repo.primary).toBe('boolean');
    });
  });

  test('should ensure all repositories have required primary field', async () => {
    const result = await fetchProjects();
    
    // Test all projects with repositories
    const projectsWithRepos = result.projects.filter((p: any) => p.repositories.length > 0);
    
    if (projectsWithRepos.length === 0) {
      console.log('Skipping: No projects with repositories found');
      return;
    }

    projectsWithRepos.forEach((project: any) => {
      project.repositories.forEach((repo: any) => {
        expect(repo).toHaveProperty('primary');
        expect(typeof repo.primary).toBe('boolean');
      });
    });
  });
});