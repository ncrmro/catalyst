import { GlassCard } from "@tetrastack/react-glass-components";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
	fetchProjectBySlug,
	fetchProjectIssues,
	fetchProjectPullRequests,
} from "@/actions/projects";
import { WorkItemsList } from "@/components/work-items/WorkItemsList";

interface WorkPageProps {
	params: Promise<{
		slug: string;
	}>;
}

export async function generateMetadata({
	params,
}: WorkPageProps): Promise<Metadata> {
	const { slug } = await params;
	const project = await fetchProjectBySlug(slug);

	return {
		title: project
			? `Work - ${project.fullName} - Catalyst`
			: "Work - Catalyst",
	};
}

export default async function WorkPage({ params }: WorkPageProps) {
	const { slug } = await params;
	const project = await fetchProjectBySlug(slug);

	if (!project) {
		notFound();
	}

	// Fetch PRs and Issues in parallel
	const [prs, issues] = await Promise.all([
		fetchProjectPullRequests(project.id),
		fetchProjectIssues(project.id),
	]);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-on-surface">Work Items</h1>
					<p className="text-sm text-on-surface-variant mt-1">
						Pull requests and issues for {project.fullName}
					</p>
				</div>
			</div>

			<GlassCard>
				<WorkItemsList
					prs={prs}
					issues={issues}
					projectSlug={slug}
					emptyMessage="No open pull requests or issues found."
				/>
			</GlassCard>
		</div>
	);
}
