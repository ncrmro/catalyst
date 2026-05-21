"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ApplicationLayoutNav } from "@tetrastack/react-glass-components";

export function PlatformNav() {
  const pathname = usePathname();

  const options = [
    { value: "overview", label: "Overview", href: "/platform" },
    {
      value: "environments",
      label: "Environments",
      href: "/platform/environments",
    },
    { value: "billing", label: "Billing", href: "/platform/billing" },
    {
      value: "cloud-accounts",
      label: "Cloud Accounts",
      href: "/platform/cloud-accounts",
    },
  ];

  let activeValue = "overview";
  if (pathname.startsWith("/platform/cloud-accounts")) {
    activeValue = "cloud-accounts";
  } else if (pathname.startsWith("/platform/billing")) {
    activeValue = "billing";
  } else if (pathname.startsWith("/platform/environments")) {
    activeValue = "environments";
  } else if (
    pathname === "/platform" ||
    pathname.startsWith("/platform/clusters")
  ) {
    activeValue = "overview";
  }

  return (
    <ApplicationLayoutNav
      options={options}
      activeValue={activeValue}
      linkComponent={Link}
      ariaLabel="Platform navigation"
    />
  );
}
