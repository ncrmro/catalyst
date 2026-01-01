import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { fetchProjectBySlug } from "@/actions/projects";
import { SpecPageNav } from "./_components/SpecPageNav";
import { SpecAgentChat } from "./_components/SpecAgentChat";

interface SpecLayoutProps {
  children: ReactNode;
  params: Promise<{
    projectSlug: string;
    repoSlug: string;
    specSlug: string;
  }>;
}

export default async function SpecLayout({
  children,
  params,
}: SpecLayoutProps) {
  const { projectSlug, repoSlug, specSlug } = await params;

  // Validate project exists
  const project = await fetchProjectBySlug(projectSlug);
  if (!project) {
    notFound();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Navigation */}
      <SpecPageNav
        projectName={project.name}
        projectSlug={projectSlug}
        repoSlug={repoSlug}
        specSlug={specSlug}
      />

      {/* Agent Chat (expandable) */}
      <SpecAgentChat
        projectSlug={projectSlug}
        repoSlug={repoSlug}
        specSlug={specSlug}
      />

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
