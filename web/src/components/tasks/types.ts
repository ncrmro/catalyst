export interface Spec {
	id: string;
	name: string;
	href: string;
}

export type AssigneeType = "human" | "ai";

export interface Assignee {
	id: string;
	name: string;
	type: AssigneeType;
	avatarUrl?: string;
}

// Predefined assignees
export const ASSIGNEES: Record<string, Assignee> = {
	copilot: { id: "copilot", name: "Copilot", type: "ai" },
	claude: { id: "claude", name: "Claude", type: "ai" },
	bill: {
		id: "bill",
		name: "Bill",
		type: "human",
		avatarUrl: "/avatars/bill.png",
	},
};

export type TaskStatus = "todo" | "in_progress" | "completed" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type TaskType = "feature" | "platform";

export interface Task {
	id: string;
	title: string;
	status: TaskStatus;
	priority: TaskPriority;
	type: TaskType;
	project: string;
	projectSlug: string;
	assignee: Assignee;
	dueDate: string;
	spec?: Spec;
	description?: string;
	platformContext?: string;
	createdAt?: string;
	updatedAt?: string;
}

// Legacy Task type for backward compatibility with TasksList
export interface LegacyTask {
	id: string;
	title: string;
	status: "todo" | "in_progress" | "completed";
	priority: "low" | "medium" | "high";
	project: string;
	projectSlug?: string;
	assignee: string;
	dueDate: string;
	type: "feature" | "platform";
	spec?: Spec;
}
