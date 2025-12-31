import { PRTasksSection } from "@/components/work-items/PRTasksSection";
import { AgentChat } from "@/components/chat/AgentChat";
import type { Spec, PRsBySpec } from "@/lib/pr-spec-matching";

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
}

export function ProjectPageContent({
  project,
  specs,
  featurePRs,
  platformPRs,
}: ProjectPageContentProps) {
  return (
    <>
      {/* Feature Tasks Section */}
      <PRTasksSection
        title="Feature Tasks"
        specs={specs}
        prsBySpec={featurePRs}
        projectSlug={project.slug}
        specsLink={`/specs/${project.slug}`}
      />

      {/* Platform Tasks Section */}
      <PRTasksSection
        title="Platform Tasks"
        specs={specs}
        prsBySpec={platformPRs}
        projectSlug={project.slug}
      />

      {/* Agent Chat Section */}
      <AgentChat projectSlug={project.slug} />
    </>
  );
}
