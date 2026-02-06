"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ApplicationLayoutNav } from "@tetrastack/react-glass-components";

interface ProjectNavProps {
  slug: string;
}

export function ProjectNav({ slug }: ProjectNavProps) {
  const pathname = usePathname();
  const basePath = `/projects/${slug}`;

  const options = [
    { value: "features", label: "Features", href: basePath },
    { value: "platform", label: "Platform", href: `${basePath}/platform` },
    {
      value: "conventions",
      label: "Conventions",
      href: `${basePath}/platform/conventions`,
    },
    { value: "secrets", label: "Secrets", href: `${basePath}/secrets` },
  ];

  // Determine active value based on pathname
  let activeValue = "features";
  if (pathname.startsWith(`${basePath}/secrets`)) {
    activeValue = "secrets";
  } else if (pathname.startsWith(`${basePath}/platform/conventions`)) {
    activeValue = "conventions";
  } else if (pathname.startsWith(`${basePath}/platform`)) {
    activeValue = "platform";
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
