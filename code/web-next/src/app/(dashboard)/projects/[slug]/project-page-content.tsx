"use client";

import { useCallback } from "react";
import { useCachedResource } from "@/lib/use-cached-resource";
import { fetchProjectDashboardData } from "@/actions/projects";
import { dashboardDataSchema } from "@/schemas/project-data";
import { AgentChat } from "@/components/chat/AgentChat";
import { GitAccessBanner } from "@/components/git-access-banner";
import type { Spec } from "@/lib/pr-spec-matching";
import { groupPRsBySpecAndType } from "@/lib/pr-spec-matching";
import type { Issue } from "@/types/reports";
import { splitIssuesByType } from "@/lib/issue-spec-matching";
import { TasksSectionCard } from "./_components/TasksSectionCard";
import { ProjectPageSkeleton } from "./_components/project-page-skeleton";
import type { SpecsError } from "@/actions/specs";
import { z } from "zod";

type DashboardData = z.infer<typeof dashboardDataSchema>;

interface ProjectPageContentProps {
  project: {
    id: string;
    slug: string;
    name: string;
    fullName: string;
  };
  dashboardPromise: Promise<DashboardData>;
}

export function ProjectPageContent({
  project,
  dashboardPromise,
}: ProjectPageContentProps) {
  const fetcher = useCallback(
    () => fetchProjectDashboardData(project.id, project.slug),
    [project.id, project.slug],
  );

  const { data } = useCachedResource({
    key: `dashboard-data-${project.id}`,
    fetcher,
    initialPromise: dashboardPromise,
    schema: dashboardDataSchema,
    suspense: false, // Use standard SWR for instant hydration via layout effect
  });

  if (!data) {
    return <ProjectPageSkeleton />;
  }

  const { specsResult, pullRequests, issues } = data;
  const specs = specsResult.specs as Spec[];
  const specsError = specsResult.error as SpecsError | undefined;

  // Group PRs by type (feature vs platform/chore) and spec
  // We do this client-side now
  const { featurePRs, platformPRs } = groupPRsBySpecAndType(
    pullRequests,
    specs,
  );

  // Split issues between feature and platform categories
  const { featureIssues, platformIssues } = splitIssuesByType(
    issues as Issue[],
  );

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
