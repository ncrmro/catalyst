import { GlassCard } from "@tetrastack/react-glass-components";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchProjectBySlug } from "@/actions/projects";
import { EnvironmentRow } from "@/components/environment-row";
import { listEnvironmentCRs } from "@/lib/k8s-operator";

interface PlatformPageProps {
	params: Promise<{
		slug: string;
	}>;
}

export async function generateMetadata({
	params,
}: PlatformPageProps): Promise<Metadata> {
	const { slug } = await params;
	const project = await fetchProjectBySlug(slug);

	return {
		title: project
			? `Platform - ${project.fullName} - Catalyst`
			: "Platform - Catalyst",
		description: "Platform configuration and deployment environments.",
	};
}

export default async function PlatformPage({ params }: PlatformPageProps) {
	const { slug } = await params;

	const project = await fetchProjectBySlug(slug);

	if (!project) {
		notFound();
	}

	// Get environments from K8s
	const sanitizedProjectName = project.name
		.toLowerCase()
		.replace(/[^a-z0-9-]/g, "-");

	const k8sEnvironments = await listEnvironmentCRs("default");
	const environments = k8sEnvironments.filter(
		(env) => env.spec.projectRef.name === sanitizedProjectName,
	);

	const deploymentEnvironments = environments.filter(
		(env) => env.spec.type === "deployment",
	);
	const developmentEnvironments = environments.filter(
		(env) => env.spec.type === "development",
	);

	// Determine domain display based on environment
	const isLocalDev = process.env.NODE_ENV === "development";
	const ingressPort = process.env.INGRESS_PORT || "8080";
	const previewDomain = process.env.PREVIEW_DOMAIN || "preview.catalyst.dev";

	const domainDisplay = isLocalDev
		? `http://localhost:${ingressPort}/<env-name>/`
		: `*.<env-name>.${previewDomain}`;

	const domainLabel = isLocalDev ? "Local Path" : "Domain";
	const domainStatus = isLocalDev ? "Path-based" : "Auto-assigned";

	return (
		<>
			{/* Platform Overview */}
			<GlassCard>
				<div className="flex items-center justify-between mb-4">
					<div>
						<h2 className="text-lg font-semibold text-on-surface">
							Platform Configuration
						</h2>
						<p className="text-sm text-on-surface-variant mt-1">
							Manage deployment environments and infrastructure settings
						</p>
					</div>
					<Link
						href={`/projects/${slug}/configure`}
						className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-on-primary bg-primary rounded-lg hover:opacity-90 transition-opacity"
					>
						Configure
					</Link>
				</div>

				{/* Quick Stats */}
				<div className="grid grid-cols-3 gap-4 pt-4 border-t border-outline/30">
					<div className="text-center">
						<div className="text-2xl font-bold text-on-surface">
							{deploymentEnvironments.length}
						</div>
						<div className="text-sm text-on-surface-variant">
							Deployment Environments
						</div>
					</div>
					<div className="text-center">
						<div className="text-2xl font-bold text-on-surface">
							{developmentEnvironments.length}
						</div>
						<div className="text-sm text-on-surface-variant">
							Dev Environments
						</div>
					</div>
					<div className="text-center">
						<div className="text-2xl font-bold text-on-surface">
							{environments.filter((e) => e.status?.phase === "Ready").length}
						</div>
						<div className="text-sm text-on-surface-variant">Ready</div>
					</div>
				</div>
			</GlassCard>

			{/* Deployment Environments */}
			<GlassCard>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-on-surface">
						Deployment Environments
					</h2>
					<Link
						href={`/environments/${slug}`}
						className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary hover:underline"
					>
						Add Environment
					</Link>
				</div>

				<div className="divide-y divide-outline/50 -mx-6">
					{deploymentEnvironments.length > 0 ? (
						deploymentEnvironments.map((env) => (
							<EnvironmentRow
								key={env.metadata.name}
								environment={env}
								projectSlug={slug}
							/>
						))
					) : (
						<div className="px-6 py-8 text-center">
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
									d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
								/>
							</svg>
							<p className="text-on-surface-variant">
								No deployment environments configured
							</p>
							<p className="text-sm text-on-surface-variant/70 mt-1">
								Set up staging and production environments to deploy your
								application
							</p>
							<Link
								href={`/environments/${slug}`}
								className="inline-flex items-center mt-4 px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-lg hover:opacity-90 transition-opacity"
							>
								Create Environment
							</Link>
						</div>
					)}
				</div>
			</GlassCard>

			{/* Development Environments */}
			<GlassCard>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-on-surface">
						Development Environments
					</h2>
				</div>

				<div className="divide-y divide-outline/50 -mx-6">
					{developmentEnvironments.length > 0 ? (
						developmentEnvironments.map((env) => (
							<EnvironmentRow
								key={env.metadata.name}
								environment={env}
								projectSlug={slug}
							/>
						))
					) : (
						<div className="px-6 py-8 text-center">
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
									d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
							<p className="text-on-surface-variant">
								No development environments active
							</p>
							<p className="text-sm text-on-surface-variant/70 mt-1">
								Development environments are created automatically from pull
								requests
							</p>
						</div>
					)}
				</div>
			</GlassCard>

			{/* Infrastructure Settings */}
			<GlassCard>
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-on-surface">
						Infrastructure
					</h2>
				</div>

				<div className="space-y-4">
					<div className="flex items-center justify-between p-4 bg-surface-container rounded-lg">
						<div>
							<h3 className="font-medium text-on-surface">
								Kubernetes Cluster
							</h3>
							<p className="text-sm text-on-surface-variant">default</p>
						</div>
						<span className="px-2 py-1 text-xs rounded-full bg-success-container text-on-success-container">
							Connected
						</span>
					</div>

					<div className="flex items-center justify-between p-4 bg-surface-container rounded-lg">
						<div>
							<h3 className="font-medium text-on-surface">
								Container Registry
							</h3>
							<p className="text-sm text-on-surface-variant">
								GitHub Container Registry
							</p>
						</div>
						<span className="px-2 py-1 text-xs rounded-full bg-success-container text-on-success-container">
							Configured
						</span>
					</div>

					<div className="flex items-center justify-between p-4 bg-surface-container rounded-lg">
						<div>
							<h3 className="font-medium text-on-surface">{domainLabel}</h3>
							<p className="text-sm text-on-surface-variant font-mono">
								{domainDisplay}
							</p>
						</div>
						<span className="px-2 py-1 text-xs rounded-full bg-secondary-container text-on-secondary-container">
							{domainStatus}
						</span>
					</div>
				</div>
			</GlassCard>
		</>
	);
}
