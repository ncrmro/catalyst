"use client";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ImageConfig } from "@/types/project-config";

interface ImageConfigFormProps {
	config: ImageConfig;
	onChange: (updates: Partial<ImageConfig>) => void;
}

export function ImageConfigForm({ config, onChange }: ImageConfigFormProps) {
	const handleRegistryChange = (
		key: keyof ImageConfig["registry"],
		value: string,
	) => {
		onChange({
			registry: { ...config.registry, [key]: value },
		});
	};

	const handleBuildChange = (
		key: keyof NonNullable<ImageConfig["build"]>,
		value: string,
	) => {
		onChange({
			build: { ...config.build!, [key]: value },
		});
	};

	return (
		<Card className="p-6 space-y-6">
			<div>
				<h2 className="text-xl font-semibold text-on-surface mb-1">
					Image Configuration
				</h2>
				<p className="text-sm text-on-surface-variant">
					Configure how your application container image is built and stored.
				</p>
			</div>

			<div className="space-y-4">
				<div className="grid gap-2">
					<label className="text-sm font-medium text-on-surface">
						Registry URL
					</label>
					<input
						type="text"
						className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						placeholder="e.g. ghcr.io/my-org"
						value={config.registry.url}
						onChange={(e) => handleRegistryChange("url", e.target.value)}
					/>
					<p className="text-xs text-muted-foreground">
						The container registry where images will be pushed.
					</p>
				</div>

				<div className="grid gap-2">
					<label className="text-sm font-medium text-on-surface">
						Build Method
					</label>
					<div className="grid grid-cols-3 gap-4">
						{(["dockerfile", "buildpack", "prebuilt"] as const).map(
							(method) => (
								<div
									key={method}
									className={cn(
										"cursor-pointer rounded-lg border p-4 hover:bg-muted/50",
										config.build?.method === method
											? "border-primary bg-primary/5 ring-1 ring-primary"
											: "border-input",
									)}
									onClick={() => handleBuildChange("method", method)}
								>
									<div className="font-medium capitalize">{method}</div>
								</div>
							),
						)}
					</div>
				</div>

				{config.build?.method === "dockerfile" && (
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="grid gap-2">
							<label className="text-sm font-medium text-on-surface">
								Dockerfile Path
							</label>
							<input
								type="text"
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								value={config.build.dockerfilePath}
								onChange={(e) =>
									handleBuildChange("dockerfilePath", e.target.value)
								}
							/>
						</div>
						<div className="grid gap-2">
							<label className="text-sm font-medium text-on-surface">
								Build Context
							</label>
							<input
								type="text"
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								value={config.build.context}
								onChange={(e) => handleBuildChange("context", e.target.value)}
							/>
						</div>
					</div>
				)}
			</div>
		</Card>
	);
}
