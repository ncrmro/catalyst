"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ProjectWithRelations } from "@/types/projects";

/** Result type for environment configuration actions */
export interface EnvironmentResult {
	success: boolean;
	message: string;
	environmentId?: string;
	environmentType?: string;
	projectId?: string;
}

export interface EnvironmentsFormProps {
	project: ProjectWithRelations;
	/** Action callback for form submission - passed from server component */
	onSubmit: (formData: FormData) => Promise<EnvironmentResult>;
	/** Optional callback for wizard back navigation */
	onBack?: () => void;
	/** Hide the header section when used in wizard context */
	hideHeader?: boolean;
	/** Custom submit button text */
	submitButtonText?: string;
	/** Custom cancel button text */
	cancelButtonText?: string;
}

// Client component to handle form submission and feedback
export function EnvironmentsForm({
	project,
	onSubmit,
	onBack,
	hideHeader = false,
	submitButtonText = "Create Environment",
	cancelButtonText = "Cancel",
}: EnvironmentsFormProps) {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [selectedEnvType, setSelectedEnvType] = useState<
		"deployment" | "development"
	>("development");
	const [deploymentSubType, setDeploymentSubType] = useState<
		"production" | "staging"
	>("production");

	const handleSubmit = async (formData: FormData) => {
		setIsSubmitting(true);
		setError(null);

		try {
			// Add deploymentSubType to formData if deployment is selected
			if (selectedEnvType === "deployment") {
				formData.append("deploymentSubType", deploymentSubType);
			}

			// Submit through the action callback passed from parent
			const result = await onSubmit(formData);

			if (result.success) {
				// Redirect back to project page on success
				router.push(`/projects/${project.slug}`);
				router.refresh(); // Ensure the project page shows the new environment
			} else {
				setError(result.message);
				setIsSubmitting(false);
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Failed to configure environment",
			);
			setIsSubmitting(false);
		}
	};

	return (
		<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			{/* Header Card - hidden when used in wizard context */}
			{!hideHeader && (
				<Card className="mb-6 p-6">
					<Link
						href="/projects"
						className="inline-flex items-center text-primary hover:opacity-80 mb-4"
					>
						← Back to Projects
					</Link>
					<div className="prose prose-sm dark:prose-invert max-w-none">
						<h1 className="text-3xl font-bold text-on-background mb-2">
							Create Environment
						</h1>
						<p className="text-on-surface-variant">
							Start with a <strong>Development Environment</strong> to
							experiment safely. Deployment environments require approvals and
							access controls.
						</p>
					</div>
				</Card>
			)}

			{/* Error message */}
			{error && (
				<div className="mb-6 p-4 bg-error-container text-on-error-container rounded-lg border border-error">
					<p className="font-semibold mb-1">Error</p>
					<p>{error}</p>
				</div>
			)}

			{/* Environment Configuration Form */}
			<Card className="p-6">
				<form action={handleSubmit}>
					<input type="hidden" name="projectId" value={project.id} />

					<div className="space-y-4">
						{/* Development Environment Option */}
						<div
							onClick={() => setSelectedEnvType("development")}
							className={cn(
								"border rounded-lg p-5 cursor-pointer transition-all",
								selectedEnvType === "development"
									? "border-primary bg-primary/5 ring-2 ring-primary"
									: "border-outline/50 hover:border-outline hover:bg-surface/50",
							)}
						>
							<div className="flex items-start gap-4">
								<input
									type="radio"
									name="environmentType"
									value="development"
									checked={selectedEnvType === "development"}
									onChange={() => setSelectedEnvType("development")}
									className="mt-1"
								/>
								<div className="flex-1 prose prose-sm dark:prose-invert max-w-none">
									<div className="flex items-center gap-2 mb-1">
										<h3 className="text-base font-semibold text-on-surface m-0">
											Development
										</h3>
										<span className="px-2 py-0.5 text-xs rounded-full bg-success-container text-on-success-container">
											Recommended
										</span>
									</div>
									<p className="text-sm text-on-surface-variant m-0">
										Isolated environments for testing and experimentation.
									</p>
								</div>
							</div>
						</div>

						{/* Deployment Environment Option */}
						<div
							onClick={() => setSelectedEnvType("deployment")}
							className={cn(
								"border rounded-lg p-5 cursor-pointer transition-all",
								selectedEnvType === "deployment"
									? "border-primary bg-primary/5 ring-2 ring-primary"
									: "border-outline/50 hover:border-outline hover:bg-surface/50",
							)}
						>
							<div className="flex items-start gap-4">
								<input
									type="radio"
									name="environmentType"
									value="deployment"
									checked={selectedEnvType === "deployment"}
									onChange={() => setSelectedEnvType("deployment")}
									className="mt-1"
								/>
								<div className="flex-1 prose prose-sm dark:prose-invert max-w-none">
									<h3 className="text-base font-semibold text-on-surface m-0 mb-1">
										Deployment
									</h3>
									<p className="text-sm text-on-surface-variant m-0">
										Production and staging with access controls and approvals.
									</p>

									{/* Sub-selection: Production vs Staging */}
									{selectedEnvType === "deployment" && (
										<div className="mt-4 pl-4 border-l-2 border-primary/30 space-y-2">
											{/* Production Sub-option */}
											<label
												className={cn(
													"flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
													deploymentSubType === "production"
														? "bg-primary/10"
														: "hover:bg-surface/50",
												)}
											>
												<input
													type="radio"
													name="deploymentSubType"
													value="production"
													checked={deploymentSubType === "production"}
													onChange={() => setDeploymentSubType("production")}
													className="mt-0.5"
												/>
												<div>
													<div className="flex items-center gap-2">
														<span className="font-medium text-sm text-on-surface">
															Production
														</span>
														<span className="px-1.5 py-0.5 text-xs rounded bg-error-container/20 text-error">
															Live
														</span>
													</div>
													<p className="text-xs text-on-surface-variant mt-0.5 m-0">
														Customer-facing with strict controls
													</p>
												</div>
											</label>

											{/* Staging Sub-option */}
											<label
												className={cn(
													"flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
													deploymentSubType === "staging"
														? "bg-primary/10"
														: "hover:bg-surface/50",
												)}
											>
												<input
													type="radio"
													name="deploymentSubType"
													value="staging"
													checked={deploymentSubType === "staging"}
													onChange={() => setDeploymentSubType("staging")}
													className="mt-0.5"
												/>
												<div>
													<div className="flex items-center gap-2">
														<span className="font-medium text-sm text-on-surface">
															Staging
														</span>
														<span className="px-1.5 py-0.5 text-xs rounded bg-secondary-container/50 text-on-secondary-container">
															Pre-Production
														</span>
													</div>
													<p className="text-xs text-on-surface-variant mt-0.5 m-0">
														QA and stakeholder review
													</p>
												</div>
											</label>
										</div>
									)}
								</div>
							</div>
						</div>
					</div>

					{/* Submit Button */}
					<div className="flex items-center justify-between mt-6">
						{onBack ? (
							<button
								type="button"
								onClick={onBack}
								className="px-4 py-2 text-sm font-medium text-on-surface bg-surface border border-outline rounded-md hover:bg-secondary-container hover:text-on-secondary-container transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
							>
								{cancelButtonText}
							</button>
						) : (
							<Link
								href={`/projects/${project.slug}`}
								className="px-4 py-2 text-sm font-medium text-on-surface bg-surface border border-outline rounded-md hover:bg-secondary-container hover:text-on-secondary-container transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
							>
								{cancelButtonText}
							</Link>
						)}

						<button
							type="submit"
							disabled={isSubmitting}
							className={cn(
								"px-6 py-2 text-sm font-medium text-on-primary bg-primary border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
								isSubmitting
									? "opacity-70 cursor-not-allowed"
									: "hover:opacity-90",
							)}
						>
							{isSubmitting ? "Creating..." : submitButtonText}
						</button>
					</div>
				</form>
			</Card>
		</div>
	);
}
