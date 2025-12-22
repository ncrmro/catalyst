"use client";

import Image from "next/image";
import Link from "next/link";
import type { ProjectWithRelations } from "@/models/projects";

export function ProjectCard({ project }: { project: ProjectWithRelations }) {
  return (
    <Link
      href={`/projects/${project.slug}`}
      className="flex items-center gap-4 p-4 hover:bg-surface/50 transition-colors"
      data-testid={`project-card-${project.fullName}`}
    >
      {/* Avatar */}
      <Image
        src={project.ownerAvatarUrl || ""}
        alt={`${project.ownerLogin} avatar`}
        width={48}
        height={48}
        className="w-12 h-12 rounded-full shrink-0"
      />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-lg font-semibold text-on-surface truncate">
          {project.fullName}
        </h3>
        {project.description && (
          <p className="text-on-surface-variant text-sm mt-1 truncate">
            {project.description}
          </p>
        )}
      </div>

      {/* Updated date */}
      <div className="hidden sm:block text-xs text-on-surface-variant shrink-0">
        {new Date(project.updatedAt).toLocaleDateString()}
      </div>

      {/* Arrow indicator */}
      <div className="text-on-surface-variant shrink-0">
        <svg
          className="w-5 h-5"
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
