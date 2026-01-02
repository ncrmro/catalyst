import { GlassCard } from "@tetrastack/react-glass-components";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchProjectBySlug } from "@/actions/projects";

interface DevPageProps {
	params: Promise<{
		slug: string;
	}>;
}

export async function generateMetadata({
	params,
}: DevPageProps): Promise<Metadata> {
	const { slug } = await params;
	const project = await fetchProjectBySlug(slug);

	return {
		title: project ? `Dev - ${project.fullName} - Catalyst` : "Dev - Catalyst",
		description: "Development tools and settings for this project.",
	};
}

export default async function DevPage({ params }: DevPageProps) {
	const { slug } = await params;

	const project = await fetchProjectBySlug(slug);

	if (!project) {
		notFound();
	}

	return (
		<GlassCard>
			<h2 className="text-lg font-semibold text-on-surface mb-4">
				Development
			</h2>
			<div className="text-center py-8">
				<div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4 border border-outline">
					<svg
						className="w-8 h-8 text-on-surface-variant"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={1.5}
							d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
						/>
					</svg>
				</div>
				<h3 className="text-lg font-medium text-on-surface mb-2">
					Development Tools Coming Soon
				</h3>
				<p className="text-on-surface-variant text-sm max-w-md mx-auto">
					This section will contain development tools, local environment setup,
					and debugging utilities.
				</p>
			</div>
		</GlassCard>
	);
}
