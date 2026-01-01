"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";

interface SpecPageNavProps {
  projectName: string;
  projectSlug: string;
  repoSlug: string;
  specSlug: string;
}

type TabValue = "tasks" | "spec";

export function SpecPageNav({
  projectName,
  projectSlug,
  repoSlug,
  specSlug,
}: SpecPageNavProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentTab = (searchParams.get("tab") as TabValue) || "tasks";

  const createTabHref = (tab: TabValue) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    // Remove chat param when switching tabs
    params.delete("chat");
    return `${pathname}?${params.toString()}`;
  };

  return (
    <nav className="flex items-center justify-between px-4 py-3 border-b border-outline/30">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href={`/projects/${projectSlug}`}
          className="text-on-surface-variant hover:text-on-surface transition-colors"
        >
          {projectName}
        </Link>
        <ChevronRight />
        <span className="text-on-surface-variant">{repoSlug}</span>
        <ChevronRight />
        <span className="text-on-surface-variant">Specs</span>
        <ChevronRight />
        <span className="text-on-surface font-medium">{specSlug}</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-surface-variant/50 rounded-lg p-1">
        <TabButton
          href={createTabHref("tasks")}
          active={currentTab === "tasks"}
        >
          Tasks
        </TabButton>
        <TabButton href={createTabHref("spec")} active={currentTab === "spec"}>
          Spec
        </TabButton>
      </div>
    </nav>
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

function ChevronRight() {
  return (
    <svg
      className="w-4 h-4 text-on-surface-variant/50"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}
