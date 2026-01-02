"use client";

import { useEffect, useState } from "react";

interface ContainerInfo {
	name: string;
	image: string;
	ready: boolean;
	restartCount: number;
}

interface PodInfo {
	name: string;
	namespace: string;
	status: string;
	labels?: { [key: string]: string };
	creationTimestamp?: string;
	containers: ContainerInfo[];
	nodeName?: string;
	restartCount: number;
}

interface EnvironmentPodsListProps {
	namespace: string;
}

/**
 * Displays a list of pods in the environment namespace.
 * Fetches pods on mount and provides a refresh button.
 */
export function EnvironmentPodsList({ namespace }: EnvironmentPodsListProps) {
	const [pods, setPods] = useState<PodInfo[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const fetchPods = async () => {
		setLoading(true);
		setError(null);
		try {
			const response = await fetch(`/api/environments/${namespace}/pods`);
			const data = await response.json();
			if (data.error && !data.pods) {
				setError(data.error);
			} else {
				setPods(data.pods || []);
			}
		} catch (err) {
			setError("Failed to fetch pods");
			console.error("Error fetching pods:", err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchPods();
	}, [fetchPods]);

	if (loading) {
		return (
			<div className="space-y-3 animate-pulse">
				{[1, 2].map((i) => (
					<div key={i} className="h-20 bg-surface-container rounded-lg" />
				))}
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center py-8 text-center">
				<p className="text-sm text-error mb-4">{error}</p>
				<button
					onClick={fetchPods}
					className="text-sm text-primary hover:text-primary/80 transition-colors"
				>
					Try again
				</button>
			</div>
		);
	}

	if (pods.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-8 text-center">
				<div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-4">
					<svg
						className="w-6 h-6 text-on-surface-variant"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
						/>
					</svg>
				</div>
				<h4 className="text-lg font-medium text-on-surface mb-2">No Pods</h4>
				<p className="text-sm text-on-surface-variant">
					No pods are running in this environment yet.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between mb-2">
				<span className="text-sm text-on-surface-variant">
					{pods.length} pod{pods.length !== 1 ? "s" : ""}
				</span>
				<button
					onClick={fetchPods}
					className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
				>
					<svg
						className="w-4 h-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
					Refresh
				</button>
			</div>

			{pods.map((pod) => (
				<PodCard key={pod.name} pod={pod} />
			))}
		</div>
	);
}

function PodCard({ pod }: { pod: PodInfo }) {
	const statusColor = getStatusColor(pod.status);

	return (
		<div className="bg-surface-container rounded-lg p-4">
			<div className="flex items-center justify-between mb-3">
				<span className="font-medium text-on-surface font-mono text-sm truncate">
					{pod.name}
				</span>
				<span
					className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}
				>
					<span
						className={`w-1.5 h-1.5 rounded-full ${
							pod.status === "Running"
								? "bg-success"
								: pod.status === "Pending"
									? "bg-primary animate-pulse"
									: "bg-error"
						}`}
					/>
					{pod.status}
				</span>
			</div>

			{pod.containers.length > 0 && (
				<div className="space-y-2">
					{pod.containers.map((container, index) => (
						<div
							key={index}
							className="flex items-center justify-between text-xs"
						>
							<div className="flex items-center gap-2">
								<span
									className={`w-2 h-2 rounded-full ${
										container.ready ? "bg-success" : "bg-error"
									}`}
								/>
								<span className="text-on-surface-variant">
									{container.name}
								</span>
							</div>
							<span className="text-on-surface-variant font-mono truncate max-w-[200px]">
								{container.image.split("/").pop()}
							</span>
						</div>
					))}
				</div>
			)}

			{pod.restartCount > 0 && (
				<div className="mt-2 text-xs text-on-surface-variant">
					{pod.restartCount} restart{pod.restartCount !== 1 ? "s" : ""}
				</div>
			)}
		</div>
	);
}

function getStatusColor(status: string): string {
	switch (status) {
		case "Running":
			return "bg-success/10 text-success";
		case "Pending":
			return "bg-primary/10 text-primary";
		case "Succeeded":
			return "bg-success/10 text-success";
		case "Failed":
			return "bg-error/10 text-error";
		default:
			return "bg-surface-variant text-on-surface-variant";
	}
}
