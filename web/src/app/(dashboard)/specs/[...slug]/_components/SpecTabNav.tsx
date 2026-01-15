"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildSpecUrl } from "@/lib/spec-url";

interface SpecTabNavProps {
  projectSlug: string;
  repoSlug: string;
  specSlug: string;
}

export function SpecTabNav({
  projectSlug,
  repoSlug,
  specSlug,
}: SpecTabNavProps) {
  const pathname = usePathname();
  const baseSpecUrl = buildSpecUrl(projectSlug, repoSlug, specSlug);

  // Exact match for tasks (index)
  const isTasks = pathname === baseSpecUrl;
  
  // Prefix match for spec files (any file under the spec path)
  const isSpec = pathname.startsWith(`${baseSpecUrl}/`);

  return (
    <div className="flex items-center gap-1 bg-surface-variant/50 rounded-lg p-1">
      <TabButton href={baseSpecUrl} active={isTasks}>
        Tasks
      </TabButton>
      <TabButton
        href={buildSpecUrl(projectSlug, repoSlug, specSlug, { file: "spec.md" })}
        active={isSpec}
      >
        Spec
      </TabButton>
    </div>
  );
}

function TabButton({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
        active
          ? "bg-surface text-on-surface shadow-sm"
          : "text-on-surface-variant hover:text-on-surface"
      }`}
    >
      {children}
    </Link>
  );
}
