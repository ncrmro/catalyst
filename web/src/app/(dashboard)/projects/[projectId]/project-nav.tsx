'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ApplicationLayoutNav } from '@tetrastack/react-glass-components';

interface ProjectNavProps {
  projectId: string;
}

export function ProjectNav({ projectId }: ProjectNavProps) {
  const pathname = usePathname();
  const basePath = `/projects/${projectId}`;

  const options = [
    { value: 'overview', label: 'Overview', href: basePath },
    { value: 'repo', label: 'Repo', href: `${basePath}/repo` },
    { value: 'dev', label: 'Dev', href: `${basePath}/dev` },
  ];

  // Determine active value based on pathname
  let activeValue = 'overview';
  if (pathname.startsWith(`${basePath}/repo`)) {
    activeValue = 'repo';
  } else if (pathname.startsWith(`${basePath}/dev`)) {
    activeValue = 'dev';
  }

  return (
    <ApplicationLayoutNav
      options={options}
      activeValue={activeValue}
      linkComponent={Link}
      ariaLabel="Project navigation"
    />
  );
}
