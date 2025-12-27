import Link from "next/link";
import { GlassCard } from "@tetrastack/react-glass-components";
import { Task, TaskType } from "./types";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";

interface TasksBySpec {
  specId: string;
  specName: string;
  specHref: string;
  tasks: Task[];
}

export interface TasksSectionProps {
  /**
   * All tasks to display (will be filtered by type and projectSlug)
   */
  tasks: Task[];
  /**
   * Project slug to filter tasks by
   */
  projectSlug: string;
  /**
   * Section title (e.g., "Feature Tasks" or "Platform Tasks")
   */
  title: string;
  /**
   * Task type to filter by
   */
  type: TaskType;
  /**
   * Optional link to specs page
   */
  specsLink?: string;
  /**
   * Optional link to tasks page
   */
  tasksLink?: string;
}

/**
 * TasksSection - Displays tasks grouped by spec
 *
 * A unified component for displaying either feature or platform tasks,
 * grouped by their associated spec. Used on both the projects list page
 * and individual project pages.
 *
 * @example
 * ```tsx
 * <TasksSection
 *   tasks={allTasks}
 *   projectSlug="catalyst"
 *   title="Feature Tasks"
 *   type="feature"
 *   specsLink="/specs/catalyst"
 *   tasksLink="/tasks/catalyst"
 * />
 * ```
 */
export function TasksSection({
  tasks,
  projectSlug,
  title,
  type,
  specsLink,
  tasksLink,
}: TasksSectionProps) {
  // Filter to tasks of the specified type for this project
  const filteredTasks = tasks.filter(
    (task) => task.type === type && task.projectSlug === projectSlug,
  );

  // Group tasks by spec
  const tasksBySpec: TasksBySpec[] = [];
  const tasksWithoutSpec: Task[] = [];

  filteredTasks.forEach((task) => {
    if (task.spec) {
      const existingGroup = tasksBySpec.find((g) => g.specId === task.spec!.id);
      if (existingGroup) {
        existingGroup.tasks.push(task);
      } else {
        tasksBySpec.push({
          specId: task.spec.id,
          specName: task.spec.name,
          specHref: task.spec.href,
          tasks: [task],
        });
      }
    } else {
      tasksWithoutSpec.push(task);
    }
  });

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
        <div className="flex items-center gap-4">
          {specsLink && (
            <Link
              href={specsLink}
              className="text-sm text-primary hover:underline uppercase"
            >
              Specs
            </Link>
          )}
          {tasksLink && (
            <Link
              href={tasksLink}
              className="text-sm text-primary hover:underline uppercase"
            >
              Tasks
            </Link>
          )}
        </div>
      </div>

      {filteredTasks.length > 0 ? (
        <div className="space-y-4 -mx-6">
          {tasksBySpec.map((group) => (
            <div key={group.specId}>
              {/* Spec Header */}
              <Link
                href={group.specHref}
                className="flex items-center gap-2 px-6 py-2 bg-surface-container/50 hover:bg-surface-container transition-colors"
              >
                <span className="text-sm font-medium text-primary">
                  {group.specName}
                </span>
              </Link>
              {/* Tasks in this spec */}
              <div className="divide-y divide-outline/30">
                {group.tasks.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${projectSlug}/${task.id}`}
                    className="flex items-center justify-between gap-4 px-6 py-2.5 hover:bg-surface/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-on-surface-variant">•</span>
                      <p className="text-on-surface text-sm truncate">
                        {task.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge
                        status={task.status.replace("_", " ")}
                        size="sm"
                      />
                      <PriorityBadge priority={task.priority} size="sm" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          {/* Tasks without a spec */}
          {tasksWithoutSpec.length > 0 && (
            <div>
              <div className="px-6 py-2 bg-surface-container/50">
                <span className="text-sm font-medium text-on-surface-variant">
                  No Spec
                </span>
              </div>
              <div className="divide-y divide-outline/30">
                {tasksWithoutSpec.map((task) => (
                  <Link
                    key={task.id}
                    href={`/tasks/${projectSlug}/${task.id}`}
                    className="flex items-center justify-between gap-4 px-6 py-2.5 hover:bg-surface/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-on-surface-variant">•</span>
                      <p className="text-on-surface text-sm truncate">
                        {task.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge
                        status={task.status.replace("_", " ")}
                        size="sm"
                      />
                      <PriorityBadge priority={task.priority} size="sm" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <svg
            className="w-12 h-12 mx-auto text-on-surface-variant/50 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          <p className="text-on-surface-variant">No {type} tasks</p>
          <p className="text-sm text-on-surface-variant/70 mt-1">
            Tasks linked to specs will appear here
          </p>
        </div>
      )}
    </GlassCard>
  );
}
