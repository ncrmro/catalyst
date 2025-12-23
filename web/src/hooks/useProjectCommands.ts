'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCommandPalette, type Command } from '@tetrastack/react-command-palette';

export interface Project {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
}

export function useProjectCommands(projects: Project[]) {
  const router = useRouter();
  const { setCommands } = useCommandPalette();

  useEffect(() => {
    const projectCommands: Command[] = projects.map((project) => ({
      id: `project-${project.id}`,
      label: project.name,
      description: project.description || `View ${project.name}`,
      group: 'Projects',
      keywords: ['project', 'navigate', project.slug],
      action: () => {
        // Show nested commands for this project
        const nestedCommands: Command[] = [
          {
            id: `back-to-projects`,
            label: '← Back to Projects',
            group: 'Navigation',
            action: () => {
              setCommands(projectCommands);
            },
          },
          {
            id: `view-project-${project.id}`,
            label: `View ${project.name}`,
            description: 'Go to project overview',
            group: project.name,
            action: () => {
              router.push(`/projects/${project.slug}`);
            },
          },
          {
            id: `create-env-${project.id}`,
            label: 'Create Environment',
            description: `Create a new environment for ${project.name}`,
            group: project.name,
            action: () => {
              router.push(`/projects/${project.slug}?action=create-environment`);
            },
          },
          {
            id: `view-environments-${project.id}`,
            label: 'View Environments',
            description: `See all environments for ${project.name}`,
            group: project.name,
            action: () => {
              router.push(`/projects/${project.slug}#environments`);
            },
          },
        ];
        setCommands(nestedCommands);
      },
    }));

    // Add global navigation commands
    const globalCommands: Command[] = [
      {
        id: 'navigate-home',
        label: 'Home',
        description: 'Go to home page',
        group: 'Navigation',
        keywords: ['home', 'dashboard'],
        action: () => router.push('/'),
      },
      {
        id: 'navigate-projects',
        label: 'All Projects',
        description: 'View all projects',
        group: 'Navigation',
        keywords: ['projects', 'list'],
        action: () => router.push('/projects'),
      },
      {
        id: 'create-project',
        label: 'Create Project',
        description: 'Create a new project',
        group: 'Actions',
        keywords: ['create', 'new', 'project'],
        action: () => router.push('/projects/create'),
      },
      {
        id: 'navigate-environments',
        label: 'Environments',
        description: 'View all environments',
        group: 'Navigation',
        keywords: ['environments', 'env'],
        action: () => router.push('/environments'),
      },
      {
        id: 'navigate-pull-requests',
        label: 'Pull Requests',
        description: 'View pull requests',
        group: 'Navigation',
        keywords: ['pr', 'pull request'],
        action: () => router.push('/pull-requests'),
      },
    ];

    const allCommands = [...globalCommands, ...projectCommands];
    setCommands(allCommands);
  }, [projects, router, setCommands]);
}
