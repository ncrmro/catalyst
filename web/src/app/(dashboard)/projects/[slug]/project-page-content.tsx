import { AgentChat } from "@/components/chat/AgentChat";
import { splitIssuesByType } from "@/lib/issue-spec-matching";
import type { PRsBySpec, Spec } from "@/lib/pr-spec-matching";
import type { Issue } from "@/types/reports";
import { TasksSectionCard } from "./_components/TasksSectionCard";

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
}

export function ProjectPageContent({
	project,
	specs,
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
