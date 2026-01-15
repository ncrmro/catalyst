import { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  fetchProjectBySlug,
  fetchProjectPullRequests,
  fetchProjectIssues,
} from "@/actions/projects";
import { fetchProjectSpecs } from "@/actions/specs";
import { matchPRToSpec } from "@/lib/pr-spec-matching";
import { matchIssueToSpec } from "@/lib/issue-spec-matching";
import { parseSpecSlug } from "@/lib/spec-url";
import { SpecTasksTab } from "./_components/SpecTasksTab";
import { SpecContentTab } from "./_components/SpecContentTab";

interface SpecPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export async function generateMetadata({
  params,
}: SpecPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { projectSlug, specSlug, fileName } = parseSpecSlug(slug);

  const title = fileName 
    ? `${fileName} - ${specSlug} - ${projectSlug} - Catalyst`
    : `${specSlug} - ${projectSlug} - Catalyst`;

  return {
    title,
    description: `Specification: ${specSlug}${fileName ? ` / ${fileName}` : ""}`,
  };
}

export default async function SpecPage({
  params,
}: SpecPageProps) {
  const { slug } = await params;
  const { projectSlug, repoSlug, specSlug, fileName } = parseSpecSlug(slug);

  const project = await fetchProjectBySlug(projectSlug);
  if (!project) {
    notFound();
  }

  // Fetch specs, PRs, and issues in parallel
  const [specsResult, allPRs, allIssues] = await Promise.all([
    fetchProjectSpecs(project.id, projectSlug),
    fetchProjectPullRequests(project.id),
    fetchProjectIssues(project.id),
  ]);

  const specs = specsResult.specs;

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

  // Filter issues for this spec
  const openIssues = allIssues.filter((issue) => {
    if (issue.state !== "open") return false;
    const matchedSpec = matchIssueToSpec(issue.title, specIds);
    return matchedSpec === specSlug;
  });

  const closedIssues = allIssues.filter((issue) => {
    if (issue.state !== "closed") return false;
    const matchedSpec = matchIssueToSpec(issue.title, specIds);
    return matchedSpec === specSlug;
  });

  if (fileName) {
    return (
      <SpecContentTab
        projectId={project.id}
        projectSlug={projectSlug}
        repoSlug={repoSlug}
        specSlug={specSlug}
        fileName={fileName}
      />
    );
  }

  return (
    <SpecTasksTab
      openPRs={openPRs}
      mergedPRs={mergedPRs}
      openIssues={openIssues}
      closedIssues={closedIssues}
      projectSlug={projectSlug}
    />
  );
}
