import Link from "next/link";
import type { EnvironmentCR } from "@/types/crd";

interface EnvironmentRowProps {
	environment: EnvironmentCR;
	projectSlug: string;
	className?: string;
}

export function EnvironmentRow({
	environment,
	projectSlug,
	className,
}: EnvironmentRowProps) {
	const { metadata, spec, status } = environment;

	return (
		<Link
			href={`/projects/${projectSlug}/env/${metadata.name}`}
			className={`block px-6 py-3 hover:bg-surface/50 transition-colors ${className ?? ""}`}
		>
			<div className="flex items-center gap-4">
				<div className="flex-1 min-w-0">
					<h3 className="font-medium text-on-surface">{metadata.name}</h3>
					<div className="text-sm text-on-surface-variant flex gap-2">
						<span className="capitalize">{spec.type}</span>
						{status?.url && (
							<span className="text-primary truncate max-w-[200px]">
								{status.url}
							</span>
						)}
					</div>
				</div>
				<span
					className={`px-2 py-0.5 text-xs rounded-full shrink-0 ${
						status?.phase === "Ready"
							? "bg-success-container text-on-success-container"
							: "bg-surface-variant text-on-surface-variant"
					}`}
				>
					{status?.phase || "Pending"}
				</span>

				<svg
					className="w-4 h-4 text-on-surface-variant flex-shrink-0"
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
			</div>
		</Link>
	);
}
