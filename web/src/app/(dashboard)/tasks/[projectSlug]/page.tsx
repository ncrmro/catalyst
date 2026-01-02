import { GlassCard } from "@tetrastack/react-glass-components";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchProjectBySlug } from "@/actions/projects";
import { ASSIGNEES, type Task } from "@/components/tasks/types";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { StatusBadge } from "@/components/ui/status-badge";

interface TasksPageProps {
	params: Promise<{
		projectSlug: string;
	}>;
}

// Mock task fixtures - in real app, fetch from database
// Uses actual project slugs: "catalyst" and "meze"
const taskFixtures: Task[] = [
	// catalyst feature tasks
	{
		id: "task-1",
		title: "Implement user authentication flow",
		status: "in_progress",
		priority: "high",
		type: "feature",
		project: "catalyst",
		projectSlug: "catalyst",
		assignee: ASSIGNEES.claude,
		dueDate: "2024-01-15",
		spec: {
			id: "spec-001",
			name: "SPEC-001: Auth System",
			href: "/projects/catalyst/spec/001-auth-system",
		},
		description:
			"Implement complete auth flow including login, logout, session management.",
	},
	{
		id: "task-2",
		title: "Add project creation wizard",
		status: "todo",
		priority: "medium",
		type: "feature",
		project: "catalyst",
		projectSlug: "catalyst",
		assignee: ASSIGNEES.bill,
		dueDate: "2024-01-25",
		spec: {
			id: "spec-009",
			name: "SPEC-009: Projects",
			href: "/projects/catalyst/spec/009-projects",
		},
		description: "Build step-by-step wizard for creating new projects.",
	},
	{
		id: "task-3",
		title: "Build environment deployment UI",
		status: "completed",
		priority: "high",
		type: "feature",
		project: "catalyst",
		projectSlug: "catalyst",
		assignee: ASSIGNEES.copilot,
		dueDate: "2024-01-10",
	},
	// meze feature tasks
	{
		id: "task-4",
		title: "Recipe import from URLs",
		status: "in_progress",
		priority: "high",
		type: "feature",
		project: "meze",
		projectSlug: "meze",
		assignee: ASSIGNEES.claude,
		dueDate: "2024-01-18",
		spec: {
			id: "spec-002",
			name: "SPEC-002: Recipe Import",
			href: "/projects/meze/spec/002-recipe-import",
		},
		description: "Parse and import recipes from popular cooking websites.",
	},
	{
		id: "task-5",
		title: "Meal planning calendar",
		status: "todo",
		priority: "medium",
		type: "feature",
		project: "meze",
		projectSlug: "meze",
		assignee: ASSIGNEES.copilot,
		dueDate: "2024-01-22",
		spec: {
			id: "spec-003",
			name: "SPEC-003: Meal Planning",
			href: "/projects/meze/spec/003-meal-planning",
		},
		description: "Weekly meal planner with drag-and-drop interface.",
	},
	{
		id: "task-6",
		title: "Shopping list generation",
		status: "completed",
		priority: "high",
		type: "feature",
		project: "meze",
		projectSlug: "meze",
		assignee: ASSIGNEES.bill,
		dueDate: "2024-01-08",
		description: "Generate shopping lists from selected recipes.",
	},
	// Platform tasks
	{
		id: "task-7",
		title: "Update Kubernetes manifests",
		status: "in_progress",
		priority: "medium",
		type: "platform",
		project: "catalyst",
		projectSlug: "catalyst",
		assignee: ASSIGNEES.copilot,
		dueDate: "2024-01-20",
		description: "Migrate K8s manifests to v2 API version for cluster upgrade.",
		platformContext:
			"Cluster upgrade to K8s 1.29 deprecated several v1beta1 APIs.",
	},
];

export async function generateMetadata({
	params,
}: TasksPageProps): Promise<Metadata> {
	const { projectSlug } = await params;
	const project = await fetchProjectBySlug(projectSlug);

	return {
		title: project ? `Tasks - ${project.name} - Catalyst` : "Tasks - Catalyst",
		description: "View and manage project tasks",
	};
}

export default async function TasksPage({ params }: TasksPageProps) {
	const { projectSlug } = await params;
	const project = await fetchProjectBySlug(projectSlug);

	if (!project) {
		notFound();
	}

	// Filter tasks for this project
	const projectTasks = taskFixtures.filter(
		(task) => task.projectSlug === projectSlug,
	);
	const featureTasks = projectTasks.filter((task) => task.type === "feature");
	const platformTasks = projectTasks.filter((task) => task.type === "platform");

	return (
		<div className="space-y-4">
			{/* Header with Breadcrumb, Back Button, and Title */}
			<GlassCard>
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
							{project.name}
						</Link>
						<span>/</span>
						<span className="text-on-surface">Tasks</span>
					</nav>
					<Link
						href={`/projects/${projectSlug}`}
						className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
					>
						Back to Project
					</Link>
				</div>
				<div>
					<h1 className="text-2xl font-bold text-on-surface">Tasks</h1>
					<p className="text-on-surface-variant mt-1">
						{project.name} · {projectTasks.length} tasks
					</p>
				</div>
			</GlassCard>

			{/* Feature Tasks */}
			<GlassCard>
				<h2 className="text-lg font-semibold text-on-surface mb-4">
					Feature Tasks
				</h2>
				{featureTasks.length === 0 ? (
					<p className="text-on-surface-variant text-sm">No feature tasks</p>
				) : (
					<div className="divide-y divide-outline/50">
						{featureTasks.map((task) => (
							<TaskRow key={task.id} task={task} projectSlug={projectSlug} />
						))}
					</div>
				)}
			</GlassCard>

			{/* Platform Tasks */}
			<GlassCard>
				<h2 className="text-lg font-semibold text-on-surface mb-4">
					Platform Work
				</h2>
				{platformTasks.length === 0 ? (
					<p className="text-on-surface-variant text-sm">No platform tasks</p>
				) : (
					<div className="divide-y divide-outline/50">
						{platformTasks.map((task) => (
							<TaskRow key={task.id} task={task} projectSlug={projectSlug} />
						))}
					</div>
				)}
			</GlassCard>
		</div>
	);
}

function TaskRow({ task, projectSlug }: { task: Task; projectSlug: string }) {
	return (
		<Link
			href={`/tasks/${projectSlug}/${task.id}`}
			className="block py-4 hover:bg-surface-variant/30 -mx-4 px-4 transition-colors first:rounded-t-lg last:rounded-b-lg"
		>
			<div className="flex items-center justify-between gap-4">
				<div className="flex-1 min-w-0">
					<p className="text-on-surface font-medium truncate">
						{task.spec && (
							<span className="text-primary">
								{task.spec.href.split("/").pop()}:{" "}
							</span>
						)}
						{task.title}
					</p>
				</div>
				<div className="flex items-center gap-4 shrink-0">
					<PriorityBadge priority={task.priority} size="sm" />
					<StatusBadge status={task.status.replace("_", " ")} size="sm" />
				</div>
			</div>
		</Link>
	);
}
