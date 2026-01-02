"use client";

import { Card } from "@/components/ui/card";
import type { ResourceConfig } from "@/types/project-config";

interface ResourcesConfigFormProps {
	config: ResourceConfig;
	onChange: (updates: Partial<ResourceConfig>) => void;
}

const DEFAULT_RESOURCES = {
	cpu: "100m",
	memory: "128Mi",
};

export function ResourcesConfigForm({
	config,
	onChange,
}: ResourcesConfigFormProps) {
	const requests = config.requests ?? DEFAULT_RESOURCES;
	const limits = config.limits ?? DEFAULT_RESOURCES;

	const handleRequestChange = (key: "cpu" | "memory", value: string) => {
		onChange({
			requests: { ...requests, [key]: value },
		});
	};

	const handleLimitChange = (key: "cpu" | "memory", value: string) => {
		onChange({
			limits: { ...limits, [key]: value },
		});
	};

	return (
		<Card className="p-6 space-y-6">
			<div>
				<h2 className="text-xl font-semibold text-on-surface mb-1">
					Default Resources
				</h2>
				<p className="text-sm text-on-surface-variant">
					Set the default compute resources allocated to your application
					containers.
				</p>
			</div>

			<div className="grid gap-6 sm:grid-cols-2">
				<div className="space-y-4">
					<h3 className="text-sm font-medium text-on-surface">
						Requests (Guaranteed)
					</h3>
					<div className="grid gap-2">
						<label className="text-sm text-muted-foreground">CPU</label>
						<input
							type="text"
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							value={requests.cpu}
							onChange={(e) => handleRequestChange("cpu", e.target.value)}
							placeholder="e.g. 100m"
						/>
					</div>
					<div className="grid gap-2">
						<label className="text-sm text-muted-foreground">Memory</label>
						<input
							type="text"
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							value={requests.memory}
							onChange={(e) => handleRequestChange("memory", e.target.value)}
							placeholder="e.g. 128Mi"
						/>
					</div>
				</div>

				<div className="space-y-4">
					<h3 className="text-sm font-medium text-on-surface">
						Limits (Maximum)
					</h3>
					<div className="grid gap-2">
						<label className="text-sm text-muted-foreground">CPU</label>
						<input
							type="text"
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							value={limits.cpu}
							onChange={(e) => handleLimitChange("cpu", e.target.value)}
							placeholder="e.g. 500m"
						/>
					</div>
					<div className="grid gap-2">
						<label className="text-sm text-muted-foreground">Memory</label>
						<input
							type="text"
							className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
							value={limits.memory}
							onChange={(e) => handleLimitChange("memory", e.target.value)}
							placeholder="e.g. 512Mi"
						/>
					</div>
				</div>
			</div>

			<div className="space-y-2">
				<label className="text-sm font-medium text-on-surface">
					Default Replicas
				</label>
				<input
					type="number"
					min={1}
					className="flex h-10 w-full max-w-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
					value={config.replicas ?? 1}
					onChange={(e) =>
						onChange({ replicas: parseInt(e.target.value, 10) || 1 })
					}
				/>
				<p className="text-xs text-muted-foreground">
					Number of pods to run by default.
				</p>
			</div>
		</Card>
	);
}
