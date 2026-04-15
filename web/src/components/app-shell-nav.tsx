"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ApplicationLayoutNav } from "@tetrastack/react-glass-components";

const BASE_NAV_OPTIONS = [
  { value: "projects", label: "PROJECTS", href: "/projects" },
  { value: "platform", label: "PLATFORM", href: "/platform" },
  { value: "account", label: "ACCOUNT", href: "/account" },
];

const BILLING_NAV_OPTION = {
  value: "billing",
  label: "BILLING",
  href: "/settings/billing",
};

function getActiveNav(pathname: string, options: typeof BASE_NAV_OPTIONS) {
  const match = options.find(({ href }) =>
    pathname === "/" ? href === "/projects" : pathname.startsWith(href),
  );
  return match?.value ?? "projects";
}

export function AppNav({ billingEnabled }: { billingEnabled?: boolean }) {
  const pathname = usePathname();
  const options = billingEnabled
    ? [...BASE_NAV_OPTIONS, BILLING_NAV_OPTION]
    : BASE_NAV_OPTIONS;
  const activeValue = getActiveNav(pathname, options);

  return (
    <ApplicationLayoutNav
      linkComponent={Link}
      options={options}
      activeValue={activeValue}
    />
  );
}
