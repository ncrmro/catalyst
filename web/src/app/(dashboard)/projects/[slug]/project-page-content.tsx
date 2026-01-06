import { AgentChat } from "@/components/chat/AgentChat";
import { GitAccessBanner } from "@/components/git-access-banner";
import type { Spec, PRsBySpec } from "@/lib/pr-spec-matching";
import type { Issue } from "@/types/reports";
import { splitIssuesByType } from "@/lib/issue-spec-matching";
import { TasksSectionCard } from "./_components/TasksSectionCard";
import type { SpecsError } from "@/actions/specs";

interface ProjectPageContentProps {
  project: {
    id: string;
    slug: string;
    name: string;
    fullName: string;
  };
  specs: Spec[];
  specsError?: SpecsError;
  featurePRs: PRsBySpec;
  platformPRs: PRsBySpec;
  issues: Issue[];
}

export function ProjectPageContent({
  project,
  specs,
  specsError,
  featurePRs,
  platformPRs,
  issues,
}: ProjectPageContentProps) {
  // Split issues between feature and platform categories
  const { featureIssues, platformIssues } = splitIssuesByType(issues);

  // Extract repo slug from fullName (format: "owner/repo")
  const repoSlug = project.fullName.split("/")[1] || project.slug;

  return (
    <>
      {specsError && (
        <GitAccessBanner
          repoName={project.fullName}
          errorType={specsError.type}
        />
      )}

      <TasksSectionCard
        title="Feature Tasks"
        specs={specs}
        prsBySpec={featurePRs}
        issues={featureIssues}
        projectSlug={project.slug}
        repoSlug={repoSlug}
      />

      <TasksSectionCard
        title="Platform Tasks"
        specs={specs}
        prsBySpec={platformPRs}
        issues={platformIssues}
        projectSlug={project.slug}
        repoSlug={repoSlug}
        showAllSpecs={false}
      />

      {/* Agent Chat Section */}
      <AgentChat projectSlug={project.slug} />
    </>
  );
}
