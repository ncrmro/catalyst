import { GlassCard } from "@tetrastack/react-glass-components";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchProjectBySlug } from "@/actions/projects";
import {
	listDirectory,
	type VCSEntry,
} from "@/actions/version-control-provider";

interface SpecDirectory {
	name: string;
	path: string;
	files: VCSEntry[];
}

interface SpecsPageProps {
	params: Promise<{
		"project-slug": string;
	}>;
}

export async function generateMetadata({
	params,
}: SpecsPageProps): Promise<Metadata> {
	const { "project-slug": slug } = await params;
	const project = await fetchProjectBySlug(slug);

	return {
		title: project
			? `Specs - ${project.fullName} - Catalyst`
			: "Specs - Catalyst",
		description: "Project specifications and documentation.",
	};
}

export default async function SpecsPage({ params }: SpecsPageProps) {
	const { "project-slug": slug } = await params;

	const project = await fetchProjectBySlug(slug);

	if (!project) {
		notFound();
	}

	// Get specs from the repository's specs/ directory
	let specs: SpecDirectory[] = [];
	const repo = project.repositories[0]?.repo;

	if (repo) {
		const specsResult = await listDirectory(repo.fullName, "specs");

		if (specsResult.success && specsResult.entries.length > 0) {
			// Each subdirectory in specs/ is a spec
			const specDirs = specsResult.entries.filter((e) => e.type === "dir");

			// Fetch files for each spec directory
			specs = await Promise.all(
				specDirs.map(async (dir) => {
					const filesResult = await listDirectory(repo.fullName, dir.path);
					return {
						name: dir.name,
						path: dir.path,
						files: filesResult.success ? filesResult.entries : [],
					};
				}),
			);
		}
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<div className="flex items-center gap-2 text-sm text-on-surface-variant mb-1">
						<Link href={`/projects/${slug}`} className="hover:text-primary">
							{project.fullName}
						</Link>
						<span>/</span>
						<span>Specs</span>
					</div>
					<h1 className="text-2xl font-bold text-on-surface">Specifications</h1>
				</div>
			</div>

			{/* Specs List */}
			<GlassCard>
				{!repo ? (
					<div className="text-center py-8">
						<svg
							className="w-12 h-12 mx-auto text-on-surface-variant/50 mb-3"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
							/>
						</svg>
						<p className="text-on-surface-variant">No repository linked</p>
						<p className="text-sm text-on-surface-variant/70 mt-1">
							Link a repository to this project to view specs
						</p>
					</div>
				) : specs.length > 0 ? (
					<div className="divide-y divide-outline/50 -mx-6">
						{specs.map((spec) => {
							const hasSpecFile = spec.files.some((f) => f.name === "spec.md");
							const fileCount = spec.files.filter((f) =>
								f.name.endsWith(".md"),
							).length;

							return (
								<Link
									key={spec.path}
									href={`/projects/${slug}/spec/${spec.name}`}
									className="flex items-center gap-4 px-6 py-4 hover:bg-surface/50 transition-colors"
								>
									<div className="flex-shrink-0">
										<div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
											<svg
												className="w-6 h-6 text-primary"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={1.5}
													d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
												/>
											</svg>
										</div>
									</div>
									<div className="flex-1 min-w-0">
										<h3 className="font-medium text-on-surface text-lg">
											{spec.name}
										</h3>
										<p className="text-sm text-on-surface-variant">
											{fileCount} markdown {fileCount === 1 ? "file" : "files"}
										</p>
									</div>
									{hasSpecFile ? (
										<span className="px-3 py-1 text-sm rounded-full bg-secondary-container text-on-secondary-container">
											has spec
										</span>
									) : (
										<span className="px-3 py-1 text-sm rounded-full bg-surface-variant text-on-surface-variant">
											no spec.md
										</span>
									)}
									<svg
										className="w-5 h-5 text-on-surface-variant flex-shrink-0"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 5l7 7-7 7"
										/>
									</svg>
								</Link>
							);
						})}
					</div>
				) : (
					<div className="text-center py-8">
						<svg
							className="w-12 h-12 mx-auto text-on-surface-variant/50 mb-3"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						<p className="text-on-surface-variant">No specs found</p>
						<p className="text-sm text-on-surface-variant/70 mt-1">
							Add a{" "}
							<code className="bg-surface-variant px-1.5 py-0.5 rounded">
								specs/
							</code>{" "}
							directory to your repository
						</p>
					</div>
				)}
			</GlassCard>
		</div>
	);
}
