import Link from "next/link";
import { GlassCard } from "@tetrastack/react-glass-components";
import { Spec, LegacyTask } from "./types";
import { formatSpecName } from "@/lib/spec-formatting";

export type { Spec, LegacyTask as Task };

export interface TasksListProps {
  tasks: LegacyTask[];
}

function TaskItem({ task }: { task: LegacyTask }) {
  const content = (
    <div className="py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span
          className={`w-2 h-2 rounded-full ${
            task.status === "completed"
              ? "bg-green-500"
              : task.status === "in_progress"
                ? "bg-yellow-500"
                : "bg-gray-400"
          }`}
        />
        <div>
          <p
            className={`text-on-surface ${task.status === "completed" ? "line-through opacity-60" : ""}`}
          >
            {task.title}
          </p>
          <div className="flex items-center gap-2 text-on-surface-variant text-sm">
            <span>
              {task.project} · {task.assignee}
            </span>
            {task.spec && (
              <>
                <span>·</span>
                <span className="text-primary">{formatSpecName(task.spec.name)}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`px-2 py-1 text-xs rounded ${
            task.priority === "high"
              ? "bg-error-container text-on-error-container"
              : task.priority === "medium"
                ? "bg-secondary-container text-on-secondary-container"
                : "bg-surface text-on-surface-variant"
          }`}
        >
          {task.priority}
        </span>
        <span className="text-on-surface-variant text-sm">{task.dueDate}</span>
      </div>
    </div>
  );

  if (task.projectSlug) {
    return (
      <Link
        href={`/tasks/${task.projectSlug}/${task.id}`}
        className="block hover:bg-surface-variant/30 -mx-4 px-4 transition-colors"
      >
        {content}
      </Link>
    );
  }

  return content;
}

function TaskSection({
  title,
  description,
  tasks,
}: {
  title: string;
  description: string;
  tasks: LegacyTask[];
}) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-on-surface">{title}</h3>
        <p className="text-on-surface-variant text-sm">{description}</p>
      </div>
      <div className="divide-y divide-outline/50">
        {tasks.length === 0 ? (
          <div className="py-4 text-center text-on-surface-variant text-sm">
            No tasks
          </div>
        ) : (
          tasks.map((task) => <TaskItem key={task.id} task={task} />)
        )}
      </div>
    </div>
  );
}

export function TasksList({ tasks }: TasksListProps) {
  const featureTasks = tasks.filter((task) => task.type === "feature");
  const platformTasks = tasks.filter((task) => task.type === "platform");

  return (
    <GlassCard>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-on-surface">Tasks</h2>
        <p className="text-on-surface-variant text-sm">
          Track work across your projects
        </p>
      </div>

      <div className="space-y-6">
        <TaskSection
          title="Feature Tasks"
          description="Tasks linked to feature specifications"
          tasks={featureTasks}
        />

        <TaskSection
          title="Platform Work"
          description="Infrastructure and maintenance tasks"
          tasks={platformTasks}
        />
      </div>
    </GlassCard>
  );
}
