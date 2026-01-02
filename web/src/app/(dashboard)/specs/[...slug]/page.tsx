import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	fetchProjectBySlug,
	fetchProjectIssues,
	fetchProjectPullRequests,
} from "@/actions/projects";
import { fetchProjectSpecs } from "@/actions/specs";
import { matchIssueToSpec } from "@/lib/issue-spec-matching";
import { matchPRToSpec } from "@/lib/pr-spec-matching";
import { parseSpecSlug } from "@/lib/spec-url";
import { SpecContentTab } from "./_components/SpecContentTab";
import { SpecTasksTab } from "./_components/SpecTasksTab";

interface SpecPageProps {
	params: Promise<{
		slug: string[];
	}>;
	searchParams: Promise<{
		tab?: string;
	}>;
}

export async function generateMetadata({
	params,
}: SpecPageProps): Promise<Metadata> {
	const { slug } = await params;
	const { projectSlug, specSlug } = parseSpecSlug(slug);

	return {
		title: `${specSlug} - ${projectSlug} - Catalyst`,
		description: `Specification: ${specSlug}`,
	};
}

export default async function SpecPage({
	params,
	searchParams,
}: SpecPageProps) {
	const { slug } = await params;
	const { projectSlug, specSlug } = parseSpecSlug(slug);
	const { tab = "tasks" } = await searchParams;

	const project = await fetchProjectBySlug(projectSlug);
	if (!project) {
		notFound();
	}

	// Fetch specs, PRs, and issues in parallel
	const [specs, allPRs, allIssues] = await Promise.all([
		fetchProjectSpecs(project.id, projectSlug),
		fetchProjectPullRequests(project.id),
		fetchProjectIssues(project.id),
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
			openIssues={openIssues}
			closedIssues={closedIssues}
			projectSlug={projectSlug}
		/>
	);
}
