import { fetchProjectBySlug } from "@/actions/projects";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { Task, ASSIGNEES } from "@/components/tasks/types";
import { TaskDetailCard } from "@/components/tasks/TaskDetailCard";

interface TaskPageProps {
  params: Promise<{
    projectSlug: string;
    taskId: string;
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
      "Implement complete auth flow including login, logout, session management. Should integrate with GitHub OAuth and support team-based access control.",
    createdAt: "2024-01-01",
    updatedAt: "2024-01-10",
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
    description:
      "Build step-by-step wizard for creating new projects with repo selection, environment config, and deployment settings.",
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
    description: "Build the UI for deploying environments from the dashboard.",
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
    createdAt: "2024-01-02",
    updatedAt: "2024-01-15",
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
    createdAt: "2024-01-01",
    updatedAt: "2024-01-08",
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
      "Cluster upgrade to K8s 1.29 deprecated several v1beta1 APIs. This work ensures continued compatibility.",
    createdAt: "2024-01-05",
    updatedAt: "2024-01-12",
  },
];

function getTask(id: string): Task | undefined {
  return taskFixtures.find((task) => task.id === id);
}

export async function generateMetadata({
  params,
}: TaskPageProps): Promise<Metadata> {
  const { projectSlug, taskId } = await params;
  const project = await fetchProjectBySlug(projectSlug);
  const task = getTask(taskId);

  return {
    title: task
      ? `${task.title} - ${project?.fullName || projectSlug} - Catalyst`
      : "Task - Catalyst",
    description: task?.description || "View task details",
  };
}

export default async function TaskPage({ params }: TaskPageProps) {
  const { projectSlug, taskId } = await params;
  const project = await fetchProjectBySlug(projectSlug);

  if (!project) {
    notFound();
  }

  const task = getTask(taskId);

  if (!task) {
    notFound();
  }

  return (
    <TaskDetailCard
      task={task}
      projectSlug={projectSlug}
      projectName={project.name}
    />
  );
}
