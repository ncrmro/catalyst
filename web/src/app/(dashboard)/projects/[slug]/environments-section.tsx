import { GlassCard } from "@tetrastack/react-glass-components";
import Link from "next/link";
import { fetchProjectById } from "@/actions/projects";
import { EnvironmentRow } from "@/components/environment-row";
import { listEnvironmentCRs } from "@/lib/k8s-operator";

interface EnvironmentsSectionProps {
	projectId: string;
	projectSlug: string;
}

export async function EnvironmentsSection({
	projectId,
	projectSlug,
}: EnvironmentsSectionProps) {
	const project = await fetchProjectById(projectId);
	if (!project) return null;

	const sanitizedProjectName = project.name
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "-");

	const k8sEnvironments = await listEnvironmentCRs("default");

	// Filter environments for this project
	const environments = k8sEnvironments.filter(
		(env) => env.spec.projectRef.name === sanitizedProjectName,
	);

	// Split environments by type
	const deploymentEnvs = environments.filter(
		(env) => env.spec.type === "deployment",
	);
	const developmentEnvs = environments.filter(
		(env) => env.spec.type === "development",
	);

	return (
		<GlassCard>
			<div className="flex items-center justify-between mb-4">
				<h2 className="text-lg font-semibold text-on-surface">Environments</h2>
				<Link
					href={`/environments/${project.slug}`}
					className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-on-primary bg-primary rounded-lg hover:opacity-90 transition-opacity"
				>
					Add Environment
				</Link>
			</div>

			{/* Deployment Environments */}
			<div className="mb-6">
				<h3 className="text-sm font-medium text-on-surface-variant mb-2 px-0">
					Deployment Environments
				</h3>
				<div className="divide-y divide-outline/50 -mx-6">
					{deploymentEnvs.length > 0 ? (
						deploymentEnvs.map((env) => (
							<EnvironmentRow
								key={env.metadata.name}
								environment={env}
								projectSlug={projectSlug}
							/>
						))
					) : (
						<div className="px-6 py-4 text-center text-on-surface-variant text-sm">
							No deployment environments
						</div>
					)}
				</div>
			</div>

			{/* Development Environments */}
			<div>
				<h3 className="text-sm font-medium text-on-surface-variant mb-2 px-0">
					Development Environments
				</h3>
				<div className="divide-y divide-outline/50 -mx-6">
					{developmentEnvs.length > 0 ? (
						developmentEnvs.map((env) => (
							<EnvironmentRow
								key={env.metadata.name}
								environment={env}
								projectSlug={projectSlug}
							/>
						))
					) : (
						<div className="px-6 py-4 text-center text-on-surface-variant text-sm">
							No development environments
						</div>
					)}
				</div>
			</div>
		</GlassCard>
	);
}
