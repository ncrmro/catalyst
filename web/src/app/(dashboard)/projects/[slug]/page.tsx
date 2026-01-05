import {
  fetchProjectBySlug,
  fetchProjectPullRequestsWithStatus,
  fetchProjectIssuesWithStatus,
} from "@/actions/projects";
import { fetchProjectSpecs } from "@/actions/specs";
import { groupPRsBySpecAndType } from "@/lib/pr-spec-matching";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { ProjectPageContent } from "./project-page-content";

interface ProjectPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchProjectBySlug(slug);

  return {
    title: project ? `${project.fullName} - Catalyst` : "Project - Catalyst",
    description: project?.description || "Project overview and environments.",
  };
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;

  const project = await fetchProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  // TODO: Add caching for specs, PRs, and issues - consider unstable_cache or revalidate
  // Fetch specs, PRs, and issues in parallel for better performance
  const [specs, pullRequestsResult, issuesResult] = await Promise.all([
    fetchProjectSpecs(project.id, slug),
    fetchProjectPullRequestsWithStatus(project.id),
    fetchProjectIssuesWithStatus(project.id),
  ]);

  // Group PRs by type (feature vs platform/chore) and spec
  const { featurePRs, platformPRs } = groupPRsBySpecAndType(
    pullRequestsResult.data,
    specs,
  );

  // Determine if there's a GitHub error (from either PRs or issues)
  const hasGitHubError =
    pullRequestsResult.hasGitHubError || issuesResult.hasGitHubError;
  const errorMessage =
    pullRequestsResult.errorMessage || issuesResult.errorMessage;

  return (
    <ProjectPageContent
      project={{
        id: project.id,
        slug: project.slug,
        name: project.name,
        fullName: project.fullName,
      }}
      specs={specs}
      featurePRs={featurePRs}
      platformPRs={platformPRs}
      issues={issuesResult.data}
      hasGitHubError={hasGitHubError}
      errorMessage={errorMessage}
    />
  );
}
