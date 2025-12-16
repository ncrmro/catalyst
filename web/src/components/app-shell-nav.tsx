"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ApplicationLayoutNav } from "../../packages/tetrastack-react-glass-components";

const NAV_OPTIONS = [
  { value: "projects", label: "Projects", href: "/projects" },
  { value: "compute", label: "Compute", href: "/compute" },
  { value: "account", label: "Account", href: "/account" },
];

function getActiveNav(pathname: string) {
  const match = NAV_OPTIONS.find(({ href }) =>
    pathname === "/" ? href === "/projects" : pathname.startsWith(href),
  );
  return match?.value ?? "projects";
}

export function AppNav() {
  const pathname = usePathname();
  const activeValue = getActiveNav(pathname);

  return (
    <ApplicationLayoutNav
      linkComponent={Link}
      options={NAV_OPTIONS}
      activeValue={activeValue}
    />
  );
}
