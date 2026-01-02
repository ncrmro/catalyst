import Link from "next/link";
import { notFound } from "next/navigation";
import { getClusters } from "@/actions/clusters";
import { getNamespaces } from "@/actions/namespaces";
import { listPodsInNamespace, type PodInfo } from "@/lib/k8s-pods";
import { PodCard } from "./_components/PodCard";

interface PageProps {
	params: Promise<{
		clusterName: string;
		namespaceName: string;
	}>;
}

export default async function NamespaceDetailPage({ params }: PageProps) {
	const { clusterName, namespaceName } = await params;
	const decodedClusterName = decodeURIComponent(clusterName);
	const decodedNamespaceName = decodeURIComponent(namespaceName);

	// Verify cluster exists
	const clusters = await getClusters();
	const cluster = clusters.find((c) => c.name === decodedClusterName);

	if (!cluster) {
		notFound();
		return;
	}

	// Verify namespace exists
	let namespaceExists = false;
	try {
		const namespaces = await getNamespaces(decodedClusterName);
		namespaceExists = namespaces.some((ns) => ns.name === decodedNamespaceName);
	} catch (err) {
		console.error("Failed to verify namespace:", err);
	}

	if (!namespaceExists) {
		notFound();
		return;
	}

	let pods: PodInfo[] = [];
	let error: string | null = null;

	try {
		pods = await listPodsInNamespace(decodedNamespaceName, decodedClusterName);
	} catch (err) {
		console.error("Failed to load pods:", err);
		error = err instanceof Error ? err.message : "Unknown error occurred";
	}

	return (
		<div className="py-8">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="mb-8">
					<div className="flex items-center gap-4 mb-4">
						<Link
							href={`/platform/clusters/${encodeURIComponent(decodedClusterName)}/namespaces`}
							className="text-primary hover:text-primary-variant text-sm"
						>
							← Back to Namespaces
						</Link>
					</div>
					<h1 className="text-3xl font-bold text-on-background catalyst-title">
						Namespace: {decodedNamespaceName}
					</h1>
					<p className="mt-2 text-on-surface-variant">
						Resources in the {decodedNamespaceName} namespace on{" "}
						{decodedClusterName}
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
							Failed to load pods
						</h2>
						<p className="text-on-error-container">{error}</p>
					</div>
				) : (
					<>
						<div className="mb-6">
							<div className="flex justify-between items-center">
								<h2 className="text-xl font-semibold text-on-surface">Pods</h2>
								<p className="text-sm text-on-surface-variant">
									Found {pods.length} pod{pods.length !== 1 ? "s" : ""}
								</p>
							</div>
						</div>

						<div className="flex flex-col gap-4">
							{pods.map((pod) => (
								<PodCard key={pod.name} pod={pod} />
							))}
						</div>

						{pods.length === 0 && (
							<div className="text-center py-12">
								<p className="text-lg text-on-surface-variant">
									No pods found in this namespace
								</p>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
}
