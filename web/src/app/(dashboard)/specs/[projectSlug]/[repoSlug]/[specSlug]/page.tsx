import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  fetchProjectBySlug,
  fetchProjectPullRequests,
} from "@/actions/projects";
import { fetchProjectSpecs } from "@/actions/specs";
import { matchPRToSpec } from "@/lib/pr-spec-matching";
import { SpecTasksTab } from "./_components/SpecTasksTab";
import { SpecContentTab } from "./_components/SpecContentTab";

interface SpecPageProps {
  params: Promise<{
    projectSlug: string;
    repoSlug: string;
    specSlug: string;
  }>;
  searchParams: Promise<{
    tab?: string;
  }>;
}

export async function generateMetadata({
  params,
}: SpecPageProps): Promise<Metadata> {
  const { projectSlug, specSlug } = await params;

  return {
    title: `${specSlug} - ${projectSlug} - Catalyst`,
    description: `Specification: ${specSlug}`,
  };
}

export default async function SpecPage({
  params,
  searchParams,
}: SpecPageProps) {
  const { projectSlug, specSlug } = await params;
  const { tab = "tasks" } = await searchParams;

  const project = await fetchProjectBySlug(projectSlug);
  if (!project) {
    notFound();
  }

  // Fetch specs and PRs
  const [specs, allPRs] = await Promise.all([
    fetchProjectSpecs(project.id, projectSlug),
    fetchProjectPullRequests(project.id),
  ]);

  // Validate spec exists
  const spec = specs.find((s) => s.id === specSlug);
  if (!spec) {
    notFound();
  }

  // Filter PRs for this spec
  const specIds = specs.map((s) => s.id);
  const openPRs = allPRs.filter((pr) => {
    const matchedSpec = matchPRToSpec(pr.title, specIds);
    return matchedSpec === specSlug;
  });

  // TODO: Fetch merged PRs (last 10) - requires vcs-provider update
  const mergedPRs: typeof allPRs = [];

  if (tab === "spec") {
    return (
      <SpecContentTab
        projectId={project.id}
        projectSlug={projectSlug}
        specSlug={specSlug}
      />
    );
  }

  return (
    <SpecTasksTab
      openPRs={openPRs}
      mergedPRs={mergedPRs}
      projectSlug={projectSlug}
    />
  );
}
