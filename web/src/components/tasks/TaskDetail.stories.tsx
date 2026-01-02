import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TaskDetail } from "./TaskDetail";
import { ASSIGNEES, type Task } from "./types";

const meta: Meta<typeof TaskDetail> = {
	title: "Components/Tasks/TaskDetail",
	component: TaskDetail,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TaskDetail>;

const featureTask: Task = {
	id: "task-1",
	title: "Implement user authentication flow",
	status: "in_progress",
	priority: "high",
	type: "feature",
	project: "catalyst-web",
	projectSlug: "catalyst-web",
	assignee: ASSIGNEES.claude,
	dueDate: "2024-01-15",
	spec: {
		id: "spec-001",
		name: "SPEC-001: Auth System",
		href: "/projects/catalyst-web/spec/001-auth-system",
	},
	description:
		"Implement complete auth flow including login, logout, session management. Should integrate with GitHub OAuth and support team-based access control.",
	createdAt: "2024-01-01",
	updatedAt: "2024-01-10",
};

const platformTask: Task = {
	id: "task-2",
	title: "Update Kubernetes manifests",
	status: "in_progress",
	priority: "medium",
	type: "platform",
	project: "catalyst-infra",
	projectSlug: "catalyst-infra",
	assignee: ASSIGNEES.copilot,
	dueDate: "2024-01-20",
	description: "Migrate K8s manifests to v2 API version for cluster upgrade.",
	platformContext:
		"Cluster upgrade to K8s 1.29 deprecated several v1beta1 APIs. This work ensures continued compatibility.",
	createdAt: "2024-01-05",
	updatedAt: "2024-01-12",
};

const humanAssignedTask: Task = {
	id: "task-3",
	title: "Add project creation wizard",
	status: "todo",
	priority: "medium",
	type: "feature",
	project: "catalyst-web",
	projectSlug: "catalyst-web",
	assignee: ASSIGNEES.bill,
	dueDate: "2024-01-25",
	spec: {
		id: "spec-009",
		name: "SPEC-009: Projects",
		href: "/projects/catalyst-web/spec/009-projects",
	},
	description:
		"Build step-by-step wizard for creating new projects with repo selection, environment config, and deployment settings.",
};

const blockedTask: Task = {
	id: "task-4",
	title: "Implement SSO integration",
	status: "blocked",
	priority: "critical",
	type: "feature",
	project: "catalyst-web",
	projectSlug: "catalyst-web",
	assignee: ASSIGNEES.claude,
	dueDate: "2024-01-18",
	spec: {
		id: "spec-002",
		name: "SPEC-002: Enterprise Auth",
		href: "/projects/catalyst-web/spec/002-enterprise-auth",
	},
	description:
		"Integrate with enterprise SSO providers (SAML, OIDC). Blocked waiting for security review.",
};

const completedTask: Task = {
	id: "task-5",
	title: "Set up CI/CD pipeline",
	status: "completed",
	priority: "high",
	type: "platform",
	project: "catalyst-infra",
	projectSlug: "catalyst-infra",
	assignee: ASSIGNEES.copilot,
	dueDate: "2024-01-10",
	description:
		"Configure GitHub Actions for automated testing, building, and deployment.",
	platformContext:
		"Manual deployments were error-prone and time-consuming. Automation improves reliability and developer experience.",
	createdAt: "2024-01-02",
	updatedAt: "2024-01-10",
};

export const FeatureTask: Story = {
	args: {
		task: featureTask,
	},
};

export const PlatformTask: Story = {
	args: {
		task: platformTask,
	},
};

export const HumanAssigned: Story = {
	args: {
		task: humanAssignedTask,
	},
};

export const BlockedTask: Story = {
	args: {
		task: blockedTask,
	},
};

export const CompletedTask: Story = {
	args: {
		task: completedTask,
	},
};

export const MinimalTask: Story = {
	args: {
		task: {
			id: "task-min",
			title: "Quick fix",
			status: "todo",
			priority: "low",
			type: "platform",
			project: "catalyst-web",
			projectSlug: "catalyst-web",
			assignee: ASSIGNEES.bill,
			dueDate: "2024-01-30",
		},
	},
};
