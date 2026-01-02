import Link from "next/link";
import { notFound } from "next/navigation";
import { getClusters } from "@/actions/clusters";
import { getNamespaces, type NamespaceInfo } from "@/actions/namespaces";
import { Card } from "@/components/ui/card";

interface NamespaceCardProps {
	namespace: NamespaceInfo;
	clusterName: string;
}

function NamespaceCard({ namespace, clusterName }: NamespaceCardProps) {
	const age = namespace.creationTimestamp
		? Math.floor(
				(Date.now() - new Date(namespace.creationTimestamp).getTime()) /
					(1000 * 60 * 60 * 24),
			)
		: 0;

	const isCatalystNamespace =
		namespace.labels &&
		(namespace.labels["catalyst/team"] || namespace.labels["catalyst/project"]);

	return (
		<Link
			href={`/platform/clusters/${encodeURIComponent(clusterName)}/namespaces/${encodeURIComponent(namespace.name)}`}
			className="block"
		>
			<Card className="hover:shadow-md transition-shadow cursor-pointer">
				<div className="flex justify-between items-start mb-4">
					<h3 className="text-xl font-semibold text-on-surface">
						{namespace.name}
					</h3>
					{isCatalystNamespace && (
						<span className="text-xs bg-primary-container text-on-primary-container px-2 py-1 rounded">
							Catalyst
						</span>
					)}
				</div>

				<div className="grid grid-cols-1 gap-2">
					<div>
						<p className="text-sm text-on-surface-variant">Age</p>
						<p className="text-sm text-on-surface">
							{age > 0 ? `${age} days` : "Less than 1 day"}
						</p>
					</div>

					{namespace.labels && Object.keys(namespace.labels).length > 0 && (
						<div>
							<p className="text-sm text-on-surface-variant">Labels</p>
							<div className="flex flex-wrap gap-1 mt-1">
								{Object.entries(namespace.labels)
									.slice(0, 3)
									.map(([key, value]) => (
										<span
											key={key}
											className="text-xs bg-secondary-container text-on-secondary-container px-2 py-1 rounded"
											title={`${key}: ${value}`}
										>
											{key.includes("/") ? key.split("/")[1] : key}: {value}
										</span>
									))}
								{Object.keys(namespace.labels).length > 3 && (
									<span className="text-xs text-on-surface-variant">
										+{Object.keys(namespace.labels).length - 3} more
									</span>
								)}
							</div>
						</div>
					)}
				</div>
			</Card>
		</Link>
	);
}

interface PageProps {
	params: Promise<{
		clusterName: string;
	}>;
}

export default async function ClusterNamespacesPage({ params }: PageProps) {
	const { clusterName } = await params;
	const decodedClusterName = decodeURIComponent(clusterName);

	// Verify cluster exists
	const clusters = await getClusters();
	const cluster = clusters.find((c) => c.name === decodedClusterName);

	if (!cluster) {
		notFound();
		return;
	}

	let namespaces: NamespaceInfo[] = [];
	let error: string | null = null;

	try {
		namespaces = await getNamespaces(decodedClusterName);
	} catch (err) {
		console.error("Failed to load namespaces:", err);
		error = err instanceof Error ? err.message : "Unknown error occurred";
	}

	return (
		<div className="py-8">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="mb-8">
					<div className="flex items-center gap-4 mb-4">
						<Link
							href="/platform"
							className="text-primary hover:text-primary-variant text-sm"
						>
							← Back to Platform
						</Link>
					</div>
					<h1 className="text-3xl font-bold text-on-background catalyst-title">
						Namespaces - {decodedClusterName}
					</h1>
					<p className="mt-2 text-on-surface-variant">
						Browse and manage namespaces in this Kubernetes cluster
					</p>
					{cluster.endpoint && (
						<p className="mt-1 text-sm text-on-surface-variant font-mono">
							{cluster.endpoint}
						</p>
					)}
				</div>

				{error ? (
					<div className="bg-error-container border border-error rounded-lg p-6 text-center">
						<h2 className="text-lg font-semibold text-on-error-container mb-2">
							Failed to load namespaces
						</h2>
						<p className="text-on-error-container">{error}</p>
					</div>
				) : (
					<>
						<div className="mb-6">
							<div className="flex justify-between items-center">
								<p className="text-sm text-on-surface-variant">
									Found {namespaces.length} namespace
									{namespaces.length !== 1 ? "s" : ""}
								</p>
							</div>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							{namespaces.map((namespace) => (
								<NamespaceCard
									key={namespace.name}
									namespace={namespace}
									clusterName={decodedClusterName}
								/>
							))}
						</div>

						{namespaces.length === 0 && (
							<div className="text-center py-12">
								<p className="text-lg text-on-surface-variant">
									No namespaces found in this cluster
								</p>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
