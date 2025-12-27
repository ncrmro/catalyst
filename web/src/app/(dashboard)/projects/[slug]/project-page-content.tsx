import { Task, ASSIGNEES } from "@/components/tasks/types";
import { TasksSection } from "@/components/tasks/TasksSection";
import { AgentChat } from "@/components/chat/AgentChat";

// Mock task fixtures - uses actual project slugs: "catalyst" and "meze"
// Tasks are grouped by spec for display
const taskFixtures: Task[] = [
  // catalyst feature tasks - 009-projects
  {
    id: "task-1",
    title: "Design project creation wizard UI",
    status: "completed",
    priority: "high",
    type: "feature",
    project: "catalyst",
    projectSlug: "catalyst",
    assignee: ASSIGNEES.copilot,
    dueDate: "2024-01-10",
    spec: {
      id: "spec-009",
      name: "009-projects",
      href: "/projects/catalyst/spec/009-projects",
    },
    description: "Design the step-by-step wizard UI for creating new projects.",
  },
  {
    id: "task-2",
    title: "Implement project creation form validation",
    status: "in_progress",
    priority: "high",
    type: "feature",
    project: "catalyst",
    projectSlug: "catalyst",
    assignee: ASSIGNEES.claude,
    dueDate: "2024-01-15",
    spec: {
      id: "spec-009",
      name: "009-projects",
      href: "/projects/catalyst/spec/009-projects",
    },
    description:
      "Add form validation for project name, slug, and repository selection.",
  },
  {
    id: "task-3",
    title: "Add project settings page",
    status: "todo",
    priority: "medium",
    type: "feature",
    project: "catalyst",
    projectSlug: "catalyst",
    assignee: ASSIGNEES.bill,
    dueDate: "2024-01-20",
    spec: {
      id: "spec-009",
      name: "009-projects",
      href: "/projects/catalyst/spec/009-projects",
    },
    description: "Build the project settings page for configuration updates.",
  },
  {
    id: "task-4",
    title: "Implement project deletion with confirmation",
    status: "todo",
    priority: "low",
    type: "feature",
    project: "catalyst",
    projectSlug: "catalyst",
    assignee: ASSIGNEES.claude,
    dueDate: "2024-01-25",
    spec: {
      id: "spec-009",
      name: "009-projects",
      href: "/projects/catalyst/spec/009-projects",
    },
    description: "Add project deletion with confirmation dialog and cleanup.",
  },
  // catalyst feature tasks - 001-auth-system
  {
    id: "task-5",
    title: "Implement GitHub OAuth flow",
    status: "completed",
    priority: "high",
    type: "feature",
    project: "catalyst",
    projectSlug: "catalyst",
    assignee: ASSIGNEES.claude,
    dueDate: "2024-01-08",
    spec: {
      id: "spec-001",
      name: "001-auth-system",
      href: "/projects/catalyst/spec/001-auth-system",
    },
    description: "Implement complete GitHub OAuth authentication flow.",
  },
  {
    id: "task-6",
    title: "Add session management",
    status: "in_progress",
    priority: "high",
    type: "feature",
    project: "catalyst",
    projectSlug: "catalyst",
    assignee: ASSIGNEES.copilot,
    dueDate: "2024-01-12",
    spec: {
      id: "spec-001",
      name: "001-auth-system",
      href: "/projects/catalyst/spec/001-auth-system",
    },
    description: "Implement session management with NextAuth.js.",
  },
  // meze feature tasks - 002-recipe-import
  {
    id: "task-7",
    title: "Build URL parser for recipe websites",
    status: "completed",
    priority: "high",
    type: "feature",
    project: "meze",
    projectSlug: "meze",
    assignee: ASSIGNEES.claude,
    dueDate: "2024-01-10",
    spec: {
      id: "spec-002",
      name: "002-recipe-import",
      href: "/projects/meze/spec/002-recipe-import",
    },
    description: "Parse recipe data from popular cooking websites.",
  },
  {
    id: "task-8",
    title: "Add ingredient extraction logic",
    status: "in_progress",
    priority: "high",
    type: "feature",
    project: "meze",
    projectSlug: "meze",
    assignee: ASSIGNEES.copilot,
    dueDate: "2024-01-15",
    spec: {
      id: "spec-002",
      name: "002-recipe-import",
      href: "/projects/meze/spec/002-recipe-import",
    },
    description:
      "Extract and normalize ingredient lists from imported recipes.",
  },
  {
    id: "task-9",
    title: "Create recipe import preview UI",
    status: "todo",
    priority: "medium",
    type: "feature",
    project: "meze",
    projectSlug: "meze",
    assignee: ASSIGNEES.bill,
    dueDate: "2024-01-18",
    spec: {
      id: "spec-002",
      name: "002-recipe-import",
      href: "/projects/meze/spec/002-recipe-import",
    },
    description: "Show preview of imported recipe before saving.",
  },
  // meze feature tasks - 003-meal-planning
  {
    id: "task-10",
    title: "Design meal planning calendar UI",
    status: "todo",
    priority: "medium",
    type: "feature",
    project: "meze",
    projectSlug: "meze",
    assignee: ASSIGNEES.copilot,
    dueDate: "2024-01-22",
    spec: {
      id: "spec-003",
      name: "003-meal-planning",
      href: "/projects/meze/spec/003-meal-planning",
    },
    description: "Weekly meal planner with drag-and-drop interface.",
  },
  // catalyst task without spec
  {
    id: "task-11",
    title: "Update README documentation",
    status: "todo",
    priority: "low",
    type: "feature",
    project: "catalyst",
    projectSlug: "catalyst",
    assignee: ASSIGNEES.bill,
    dueDate: "2024-01-30",
    description: "Update project README with latest setup instructions.",
  },
  // catalyst platform tasks
  {
    id: "task-12",
    title: "Configure Kubernetes manifests",
    status: "in_progress",
    priority: "high",
    type: "platform",
    project: "catalyst",
    projectSlug: "catalyst",
    assignee: ASSIGNEES.claude,
    dueDate: "2024-01-20",
    spec: {
      id: "spec-010",
      name: "010-k8s-setup",
      href: "/projects/catalyst/spec/010-k8s-setup",
    },
    description: "Set up Kubernetes deployment manifests for production.",
    platformContext: "Infrastructure / Kubernetes",
  },
  {
    id: "task-13",
    title: "Set up CI/CD pipeline",
    status: "todo",
    priority: "high",
    type: "platform",
    project: "catalyst",
    projectSlug: "catalyst",
    assignee: ASSIGNEES.copilot,
    dueDate: "2024-01-22",
    spec: {
      id: "spec-010",
      name: "010-k8s-setup",
      href: "/projects/catalyst/spec/010-k8s-setup",
    },
    description: "Configure GitHub Actions for automated deployments.",
    platformContext: "Infrastructure / CI/CD",
  },
  {
    id: "task-14",
    title: "Add monitoring dashboards",
    status: "todo",
    priority: "medium",
    type: "platform",
    project: "catalyst",
    projectSlug: "catalyst",
    assignee: ASSIGNEES.bill,
    dueDate: "2024-01-25",
    description: "Set up Grafana dashboards for application monitoring.",
    platformContext: "Observability / Monitoring",
  },
  // meze platform tasks
  {
    id: "task-15",
    title: "Configure database migrations",
    status: "completed",
    priority: "high",
    type: "platform",
    project: "meze",
    projectSlug: "meze",
    assignee: ASSIGNEES.claude,
    dueDate: "2024-01-08",
    description: "Set up Drizzle ORM migrations for production database.",
    platformContext: "Database / Migrations",
  },
];

interface ProjectPageContentProps {
  project: {
    slug: string;
    name: string;
    fullName: string;
  };
}

export function ProjectPageContent({ project }: ProjectPageContentProps) {
  return (
    <>
      {/* Feature Tasks Section */}
      <TasksSection
        tasks={taskFixtures}
        projectSlug={project.slug}
        title="Feature Tasks"
        type="feature"
        specsLink={`/specs/${project.slug}`}
        tasksLink={`/tasks/${project.slug}`}
      />

      {/* Platform Tasks Section */}
      <TasksSection
        tasks={taskFixtures}
        projectSlug={project.slug}
        title="Platform Tasks"
        type="platform"
        tasksLink={`/tasks/${project.slug}?type=platform`}
      />

      {/* Agent Chat Section */}
      <AgentChat projectSlug={project.slug} tasks={taskFixtures} />
    </>
  );
}
