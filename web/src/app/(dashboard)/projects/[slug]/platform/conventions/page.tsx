import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import {
	detectConventionDrift,
	scaffoldProjectConventions,
} from "@/actions/conventions";
import { fetchProjectBySlug } from "@/actions/projects";
import {
	type ConventionRule,
	ConventionStatus,
} from "@/components/platform/ConventionStatus";
import { getProjectConventionRules } from "@/models/conventions";

interface ConventionPageProps {
	params: Promise<{
		slug: string;
	}>;
}

export default async function ConventionPage({ params }: ConventionPageProps) {
	const { slug } = await params;
	const project = await fetchProjectBySlug(slug);

	if (!project) {
		notFound();
	}

	// Fetch rules and drift report
	const rules = await getProjectConventionRules(project.id);
	const driftReport = await detectConventionDrift(project.id);

	// Map to UI component props
	const uiRules: ConventionRule[] = rules.map((rule) => {
		// Find matching issue if any
		const issue = driftReport?.issues.find((i) => i.ruleId === rule.id);
		return {
			id: rule.id,
			name: rule.ruleName,
			type: rule.ruleType as ConventionRule["type"],
			status: issue ? (issue.severity === "error" ? "fail" : "warn") : "pass",
			message: issue?.message || "Compliant",
		};
	});

	// Server Action wrapper for scaffolding
	async function handleFix() {
		"use server";
		if (project) {
			await scaffoldProjectConventions(project.id);
			revalidatePath(`/projects/${slug}/platform/conventions`);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold text-on-surface">Conventions</h1>
				<form action={handleFix}>
					<button
						type="submit"
						className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors"
					>
						Scaffold / Fix All
					</button>
				</form>
			</div>

			<ConventionStatus
				projectName={project.name}
				complianceScore={driftReport?.score ?? 0}
				rules={uiRules}
			/>
		</div>
	);
}
