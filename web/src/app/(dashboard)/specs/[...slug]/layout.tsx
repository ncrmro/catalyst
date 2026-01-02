import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { fetchProjectBySlug } from "@/actions/projects";
import { PageHeader } from "@/components/ui/page-header";
import { parseSpecSlug } from "@/lib/spec-url";
import { SpecAgentChat } from "./_components/SpecAgentChat";
import { SpecTabNav } from "./_components/SpecTabNav";

interface SpecLayoutProps {
	children: ReactNode;
	params: Promise<{
		slug: string[];
	}>;
}

export default async function SpecLayout({
	children,
	params,
}: SpecLayoutProps) {
	const { slug } = await params;
	const { projectSlug, repoSlug, specSlug } = parseSpecSlug(slug);

	// Validate project exists
	const project = await fetchProjectBySlug(projectSlug);
	if (!project) {
		notFound();
	}

	// Show repo in breadcrumbs only when different from project
	const breadcrumbs =
		projectSlug === repoSlug
			? [
					{ label: "Projects", href: "/projects" },
					{ label: project.name, href: `/projects/${projectSlug}` },
					{ label: specSlug },
				]
			: [
					{ label: "Projects", href: "/projects" },
					{ label: project.name, href: `/projects/${projectSlug}` },
					{ label: repoSlug },
					{ label: specSlug },
				];

	return (
		<div className="space-y-6">
			{/* Glass Header with Breadcrumbs */}
			<PageHeader breadcrumbs={breadcrumbs}>
				<SpecTabNav
					projectSlug={projectSlug}
					repoSlug={repoSlug}
					specSlug={specSlug}
				/>
			</PageHeader>

			{/* Tab Content (Tasks/Spec) */}
			{children}

			{/* Agent Chat - Below content */}
			<SpecAgentChat
				projectSlug={projectSlug}
				repoSlug={repoSlug}
				specSlug={specSlug}
			/>
		</div>
	);
}
