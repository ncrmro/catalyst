import { AgentChat } from "@/components/chat/AgentChat";
import type { Spec, PRsBySpec } from "@/lib/pr-spec-matching";
import type { Issue } from "@/types/reports";
import { splitIssuesByType } from "@/lib/issue-spec-matching";
import { TasksSectionCard } from "./_components/TasksSectionCard";
import { GitHubConnectionErrorBanner } from "@/components/github-connection-error-banner";

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
  hasGitHubError?: boolean;
  errorMessage?: string;
}

export function ProjectPageContent({
  project,
  specs,
  featurePRs,
  platformPRs,
  issues,
  hasGitHubError = false,
  errorMessage,
}: ProjectPageContentProps) {
  // Split issues between feature and platform categories
  const { featureIssues, platformIssues } = splitIssuesByType(issues);

  // Extract repo slug from fullName (format: "owner/repo")
  const repoSlug = project.fullName.split("/")[1] || project.slug;

  return (
    <>
      {hasGitHubError && (
        <GitHubConnectionErrorBanner errorMessage={errorMessage} />
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
