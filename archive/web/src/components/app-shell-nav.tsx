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
