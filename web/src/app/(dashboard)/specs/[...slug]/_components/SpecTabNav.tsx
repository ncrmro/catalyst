"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buildSpecUrl } from "@/lib/spec-url";

interface SpecTabNavProps {
  projectSlug: string;
  repoSlug: string;
  specSlug: string;
}

type TabValue = "tasks" | "spec";

export function SpecTabNav({
  projectSlug,
  repoSlug,
  specSlug,
}: SpecTabNavProps) {
  const searchParams = useSearchParams();
  const currentTab = (searchParams.get("tab") as TabValue) || "tasks";

  const createTabHref = (tab: TabValue) =>
    buildSpecUrl(projectSlug, repoSlug, specSlug, { tab });

  return (
    <div className="flex items-center gap-1 bg-surface-variant/50 rounded-lg p-1">
      <TabButton href={createTabHref("tasks")} active={currentTab === "tasks"}>
        Tasks
      </TabButton>
      <TabButton href={createTabHref("spec")} active={currentTab === "spec"}>
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
