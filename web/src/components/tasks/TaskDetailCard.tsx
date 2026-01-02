import { GlassCard } from "@tetrastack/react-glass-components";
import Link from "next/link";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import type { Task } from "./types";

export interface TaskDetailCardProps {
	task: Task;
	projectSlug: string;
	projectName: string;
}

export function TaskDetailCard({
	task,
	projectSlug,
	projectName,
}: TaskDetailCardProps) {
	return (
		<GlassCard>
			{/* Header with Breadcrumb and Back Button */}
			<div className="flex items-center justify-between mb-6">
				<nav className="flex items-center gap-2 text-sm text-on-surface-variant uppercase">
					<Link href="/projects" className="hover:text-on-surface">
						Projects
					</Link>
					<span>/</span>
					<Link
						href={`/projects/${projectSlug}`}
						className="hover:text-on-surface"
					>
						{projectName}
					</Link>
					<span>/</span>
					<Link
						href={`/tasks/${projectSlug}`}
						className="hover:text-on-surface"
					>
						Tasks
					</Link>
					<span>/</span>
					<span className="text-on-surface">{task.id}</span>
				</nav>
				<Link
					href={`/projects/${projectSlug}`}
					className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
				>
					Back to Project
				</Link>
			</div>

			{/* Title Section */}
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-on-surface">
					{task.spec && (
						<Link
							href={task.spec.href}
							className="text-primary hover:underline"
						>
							{task.spec.href.split("/").pop()}
						</Link>
					)}
					{task.spec && ": "}
					{task.title}
				</h1>
				<p className="text-on-surface-variant mt-1">
					{projectName} · {task.type} task
				</p>
			</div>

			{/* Goal Section */}
			<div className="mb-6">
				<h2 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
					Goal
				</h2>
				<p className="text-on-surface">
					{task.description || "No description provided."}
				</p>
				{task.type === "platform" && task.platformContext && (
					<div className="mt-3 p-3 bg-surface-variant/50 rounded-lg">
						<p className="text-sm text-on-surface-variant italic">
							<span className="font-medium">Context:</span>{" "}
							{task.platformContext}
						</p>
					</div>
				)}
			</div>

			{/* Details Section */}
			<div className="mb-6">
				<h2 className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
					Details
				</h2>
				<div className="grid grid-cols-2 gap-6">
					<div>
						<p className="text-xs text-on-surface-variant mb-2">Status</p>
						<StatusBadge status={task.status.replace("_", " ")} />
					</div>
					<div>
						<p className="text-xs text-on-surface-variant mb-2">Priority</p>
						<PriorityBadge priority={task.priority} />
					</div>
				</div>
			</div>
		</GlassCard>
	);
}
