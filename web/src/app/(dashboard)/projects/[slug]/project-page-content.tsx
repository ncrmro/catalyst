"use client";

import { useCallback } from "react";
import { useCachedResource } from "@/lib/use-cached-resource";
import { fetchProjectDashboardData } from "@/actions/projects";
import { dashboardDataSchema } from "@/schemas/project-data";
import { AgentChat } from "@/components/chat/AgentChat";
import { GitAccessBanner } from "@/components/git-access-banner";
import { WorkItemsSection } from "@/components/tasks/WorkItemsSection";
import { ProjectPageSkeleton } from "./_components/project-page-skeleton";
import type { SpecsError } from "@/actions/specs";
import type { Spec } from "@/actions/specs";
import { z } from "zod";
import { 
  categorizePR, 
  categorizeBranch, 
  WorkItem, 
  WorkItemPR, 
  WorkItemBranch,
  WorkItemIssue
} from "@/lib/work-categorization";

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

  const { specsResult, pullRequests, issues, branches = [] } = data;
  const specs = specsResult.specs as Spec[];
  const specsError = specsResult.error as SpecsError | undefined;
  const specIds = specs.map(s => s.id);

  // Convert and categorize PRs
  const workItemsPR: WorkItemPR[] = pullRequests.map((pr) => {
    const { category, specId } = categorizePR({ 
      title: pr.title, 
      headBranch: pr.headBranch || "" 
    }, specIds);

    return {
      kind: "pr",
      id: String(pr.id),
      number: pr.number,
      title: pr.title,
      author: pr.author,
      authorAvatar: pr.author_avatar, // Map from API snake_case to WorkItem camelCase
      repository: pr.repository,
      url: pr.url,
      headBranch: pr.headBranch || "",
      status: pr.status as "draft" | "ready" | "changes_requested",
      updatedAt: pr.updated_at ? new Date(pr.updated_at) : new Date(),
      category,
      specId,
      previewUrl: pr.previewUrl,
    };
  });

  // Filter branches that already have an open PR
  // We don't have defaultBranch in project data yet, assuming 'main'
  const defaultBranch = "main";
  const openPRBranches = new Set(pullRequests.map(pr => pr.headBranch).filter(Boolean));
  
  const workItemsBranch: WorkItemBranch[] = branches
    .filter(branch => !openPRBranches.has(branch.name) && branch.name !== defaultBranch)
    .map(branch => {
      const { category, specId } = categorizeBranch({ 
        name: branch.name, 
        lastCommitMessage: branch.lastCommitMessage || "" 
      }, specIds);
      
      return {
        kind: "branch",
        id: branch.name,
        name: branch.name,
        repository: project.name, // Approximate, or we need repo name from branch if available
        url: "", // Construct URL if needed or let component handle it
        lastCommitMessage: branch.lastCommitMessage || "",
        lastCommitAuthor: branch.lastCommitAuthor || "unknown",
        lastCommitDate: branch.lastCommitDate ? new Date(branch.lastCommitDate) : new Date(),
        category,
        specId,
      };
    });

  // Convert and categorize Issues
  const workItemsIssue: WorkItemIssue[] = issues.map(issue => {
    const { category, specId } = categorizePR({ 
      title: issue.title, 
      headBranch: "" // Issues don't have head branches
    }, specIds);

    return {
      kind: "issue",
      id: String(issue.id),
      number: issue.number,
      title: issue.title,
      repository: issue.repository,
      url: issue.url,
      state: issue.state as "open" | "closed",
      updatedAt: issue.updated_at ? new Date(issue.updated_at) : new Date(),
      category,
      specId,
    };
  });

  const allWorkItems: WorkItem[] = [...workItemsPR, ...workItemsBranch, ...workItemsIssue];

  const featureTasks = allWorkItems.filter(item => item.category === "feature");
  const platformTasks = allWorkItems.filter(item => item.category === "platform");

  // Sort by updated date (newest first)
  const sortByDate = (a: WorkItem, b: WorkItem) => {
    const dateA = a.kind === "pr" ? a.updatedAt : a.kind === "issue" ? a.updatedAt : a.lastCommitDate;
    const dateB = b.kind === "pr" ? b.updatedAt : b.kind === "issue" ? b.updatedAt : b.lastCommitDate;
    return dateB.getTime() - dateA.getTime();
  };

  featureTasks.sort(sortByDate);
  platformTasks.sort(sortByDate);

  return (
    <>
      {specsError && (
        <GitAccessBanner
          repoName={project.fullName}
          errorType={specsError.type}
        />
      )}

      <WorkItemsSection
        title="Feature Tasks"
        items={featureTasks}
        specs={specs}
        projectSlug={project.slug}
        specsLink={`/projects/${project.slug}/specs`}
      />

      <WorkItemsSection
        title="Platform Tasks"
        items={platformTasks}
        specs={specs}
        projectSlug={project.slug}
      />

      {/* Agent Chat Section */}
      <AgentChat projectSlug={project.slug} />
    </>
  );
}