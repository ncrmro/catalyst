'use client';

import { useEffect, useState } from 'react';
import { useProjectCommands, type Project } from '@/hooks/useProjectCommands';

export function ProjectCommandsInitializer() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    // Fetch projects for command palette
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        if (data.projects) {
          setProjects(data.projects);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch projects for command palette:', err);
      });
  }, []);

  useProjectCommands(projects);

  return null;
}
