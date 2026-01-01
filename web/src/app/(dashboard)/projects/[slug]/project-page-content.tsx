import { AgentChat } from "@/components/chat/AgentChat";
import type { Spec, PRsBySpec } from "@/lib/pr-spec-matching";
import type { Issue } from "@/types/reports";
import { splitIssuesByType } from "@/lib/issue-spec-matching";
import { TasksSectionCard } from "./_components/TasksSectionCard";

interface ProjectPageContentProps {
  project: {
    id: string;
    slug: string;
    name: string;
    fullName: string;
  };
  specs: Spec[];
  featurePRs: PRsBySpec;
  platformPRs: PRsBySpec;
  issues: Issue[];
}

export function ProjectPageContent({
  project,
  specs,
  featurePRs,
  platformPRs,
  issues,
}: ProjectPageContentProps) {
  // Split issues between feature and platform categories
  const { featureIssues, platformIssues } = splitIssuesByType(issues);

  return (
    <>
      <TasksSectionCard
        title="Feature Tasks"
        specs={specs}
        prsBySpec={featurePRs}
        issues={featureIssues}
        projectSlug={project.slug}
      />

      <TasksSectionCard
        title="Platform Tasks"
        specs={specs}
        prsBySpec={platformPRs}
        issues={platformIssues}
        projectSlug={project.slug}
      />

      {/* Agent Chat Section */}
      <AgentChat projectSlug={project.slug} />
    </>
  );
}
