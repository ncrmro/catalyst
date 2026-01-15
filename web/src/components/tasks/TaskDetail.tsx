"use client";

import Link from "next/link";
import { useState } from "react";
import { GlassCard } from "@tetrastack/react-glass-components";
import { Task, TaskStatus, TaskPriority, ASSIGNEES } from "./types";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriorityBadge } from "@/components/ui/priority-badge";
import { AssigneeBadge } from "@/components/ui/assignee-badge";
import { formatSpecName } from "@/lib/spec-formatting";

export interface TaskDetailProps {
  task: Task;
  onSave?: (task: Task) => void;
}

const STATUS_OPTIONS: TaskStatus[] = [
  "todo",
  "in_progress",
  "completed",
  "blocked",
];
const PRIORITY_OPTIONS: TaskPriority[] = ["low", "medium", "high", "critical"];
const ASSIGNEE_OPTIONS = Object.values(ASSIGNEES);

export function TaskDetail({ task, onSave }: TaskDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(task);

  const handleSave = () => {
    onSave?.(editedTask);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedTask(task);
    setIsEditing(false);
  };

  const updateField = <K extends keyof Task>(field: K, value: Task[K]) => {
    setEditedTask((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <GlassCard>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editedTask.title}
                onChange={(e) => updateField("title", e.target.value)}
                className="w-full text-2xl font-bold bg-transparent border-b border-outline focus:border-primary focus:outline-none text-on-surface"
              />
            ) : (
              <h1 className="text-2xl font-bold text-on-surface">
                {task.title}
              </h1>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-on-surface-variant text-sm">
                {task.project}
              </span>
              <span className="text-on-surface-variant">·</span>
              <span className="text-on-surface-variant text-sm capitalize">
                {task.type} task
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm rounded-lg border border-outline text-on-surface hover:bg-surface-variant transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 text-sm rounded-lg bg-primary text-on-primary hover:opacity-90 transition-opacity"
                >
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 text-sm rounded-lg border border-outline text-on-surface hover:bg-surface-variant transition-colors"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Status and Meta */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-on-surface mb-4">Details</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Status */}
          <div>
            <label className="block text-sm text-on-surface-variant mb-1">
              Status
            </label>
            {isEditing ? (
              <select
                value={editedTask.status}
                onChange={(e) =>
                  updateField("status", e.target.value as TaskStatus)
                }
                className="w-full px-2 py-1.5 rounded-lg bg-surface border border-outline text-on-surface focus:border-primary focus:outline-none"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status.replace("_", " ")}
                  </option>
                ))}
              </select>
            ) : (
              <StatusBadge status={task.status.replace("_", " ")} size="md" />
            )}
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm text-on-surface-variant mb-1">
              Priority
            </label>
            {isEditing ? (
              <select
                value={editedTask.priority}
                onChange={(e) =>
                  updateField("priority", e.target.value as TaskPriority)
                }
                className="w-full px-2 py-1.5 rounded-lg bg-surface border border-outline text-on-surface focus:border-primary focus:outline-none"
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            ) : (
              <PriorityBadge priority={task.priority} size="md" />
            )}
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm text-on-surface-variant mb-1">
              Assignee
            </label>
            {isEditing ? (
              <select
                value={editedTask.assignee.id}
                onChange={(e) => {
                  const assignee = ASSIGNEE_OPTIONS.find(
                    (a) => a.id === e.target.value,
                  );
                  if (assignee) updateField("assignee", assignee);
                }}
                className="w-full px-2 py-1.5 rounded-lg bg-surface border border-outline text-on-surface focus:border-primary focus:outline-none"
              >
                {ASSIGNEE_OPTIONS.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name} ({assignee.type === "ai" ? "AI" : "Human"})
                  </option>
                ))}
              </select>
            ) : (
              <AssigneeBadge assignee={task.assignee} size="md" />
            )}
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm text-on-surface-variant mb-1">
              Due Date
            </label>
            {isEditing ? (
              <input
                type="date"
                value={editedTask.dueDate}
                onChange={(e) => updateField("dueDate", e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-surface border border-outline text-on-surface focus:border-primary focus:outline-none"
              />
            ) : (
              <span className="text-on-surface">{task.dueDate}</span>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Spec Link (for feature tasks) */}
      {task.spec && (
        <GlassCard>
          <h2 className="text-lg font-semibold text-on-surface mb-2">
            Specification
          </h2>
          <Link
            href={task.spec.href}
            className="text-primary hover:underline inline-flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            {formatSpecName(task.spec.name)}
          </Link>
        </GlassCard>
      )}

      {/* Description */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-on-surface mb-2">
          {task.type === "feature" ? "Goal" : "Description"}
        </h2>
        {isEditing ? (
          <textarea
            value={editedTask.description || ""}
            onChange={(e) => updateField("description", e.target.value)}
            rows={4}
            className="w-full px-3 py-2 rounded-lg bg-surface border border-outline text-on-surface focus:border-primary focus:outline-none resize-none"
            placeholder="Describe the task goal..."
          />
        ) : (
          <p className="text-on-surface-variant">
            {task.description || "No description provided."}
          </p>
        )}
      </GlassCard>

      {/* Platform Context (for platform tasks) */}
      {task.type === "platform" && (
        <GlassCard>
          <h2 className="text-lg font-semibold text-on-surface mb-2">
            Why This Work Is Needed
          </h2>
          {isEditing ? (
            <textarea
              value={editedTask.platformContext || ""}
              onChange={(e) => updateField("platformContext", e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-outline text-on-surface focus:border-primary focus:outline-none resize-none"
              placeholder="Explain why this platform work is needed..."
            />
          ) : (
            <p className="text-on-surface-variant">
              {task.platformContext || "No context provided."}
            </p>
          )}
        </GlassCard>
      )}

      {/* Timestamps */}
      {(task.createdAt || task.updatedAt) && (
        <div className="flex gap-4 text-sm text-on-surface-variant">
          {task.createdAt && <span>Created: {task.createdAt}</span>}
          {task.updatedAt && <span>Updated: {task.updatedAt}</span>}
        </div>
      )}
    </div>
  );
}
