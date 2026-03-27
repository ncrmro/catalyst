"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ApplicationLayoutNav } from "@tetrastack/react-glass-components";

const NAV_OPTIONS = [
  { value: "projects", label: "PROJECTS", href: "/projects" },
  { value: "platform", label: "PLATFORM", href: "/platform" },
  { value: "account", label: "ACCOUNT", href: "/account" },
];

function getActiveNav(pathname: string) {
  const match = NAV_OPTIONS.find(({ href }) =>
    pathname === "/" ? href === "/projects" : pathname.startsWith(href),
  );
  return match?.value ?? "projects";
}

/**
 * Check if we're in a nested route that has its own navigation
 * (e.g., /projects/[slug] has ProjectNav)
 */
function isNestedRoute(pathname: string): boolean {
  // Match patterns like /projects/something, /platform/something
  const nestedPatterns = [
    /^\/projects\/[^/]+/, // /projects/[slug]
  ];
  return nestedPatterns.some((pattern) => pattern.test(pathname));
}

export function AppNav() {
  const pathname = usePathname();
  const activeValue = getActiveNav(pathname);
  const hideOnMobile = isNestedRoute(pathname);

  return (
    <div className={hideOnMobile ? "hidden md:block" : undefined}>
      <ApplicationLayoutNav
        linkComponent={Link}
        options={NAV_OPTIONS}
        activeValue={activeValue}
      />
    </div>
  );
}
