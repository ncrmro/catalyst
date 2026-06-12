"use client";

import { GlassCard } from "@tetrastack/react-glass-components";
import Link from "next/link";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { PullRequest } from "@/types/reports";

interface PullRequestCardProps {
  pr: PullRequest;
  projectSlug: string;
}

export function PullRequestCard({ pr, projectSlug }: PullRequestCardProps) {
  return (
    <GlassCard>
      <Link
        href={`/projects/${projectSlug}/prs/${pr.number}`}
        className="block hover:opacity-80 transition-opacity"
      >
        <div className="flex items-start justify-between gap-4">
          {/* PR Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  pr.status === "draft"
                    ? "bg-surface-variant text-on-surface-variant"
                    : pr.status === "changes_requested"
                      ? "bg-error/10 text-error"
                      : "bg-success/10 text-success"
                }`}
              >
                {pr.status === "draft" && "Draft"}
                {pr.status === "changes_requested" && "Changes Requested"}
                {pr.status === "ready" && "Ready"}
              </span>

              {/* Priority Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                  pr.priority === "high"
                    ? "bg-error/10 text-error"
                    : pr.priority === "low"
                      ? "bg-surface-variant text-on-surface-variant"
                      : "bg-primary/10 text-primary"
                }`}
              >
                {pr.priority.charAt(0).toUpperCase() + pr.priority.slice(1)}
              </span>

              {/* Preview Environment Badge */}
              {pr.previewUrl && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    pr.previewStatus === "running"
                      ? "bg-success/10 text-success"
                      : pr.previewStatus === "failed"
                        ? "bg-error/10 text-error"
                        : pr.previewStatus === "deploying"
                          ? "bg-primary/10 text-primary"
                          : "bg-surface-variant text-on-surface-variant"
                  }`}
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                    />
                  </svg>
                  {pr.previewStatus === "running" && "Preview Ready"}
                  {pr.previewStatus === "deploying" && "Deploying..."}
                  {pr.previewStatus === "failed" && "Deploy Failed"}
                  {pr.previewStatus === "pending" && "Preview Pending"}
                </span>
              )}

              {/* Repository */}
              <span className="text-xs text-on-surface-variant">
                {pr.repository}
              </span>
            </div>

            <h3 className="text-base font-semibold text-on-surface mb-1">
              #{pr.number}: {pr.title}
            </h3>

            <div className="flex items-center gap-4 text-sm text-on-surface-variant">
              <div className="flex items-center gap-2">
                {pr.author_avatar && (
                  <UserAvatar
                    src={pr.author_avatar}
                    alt={pr.author}
                    size={20}
                    unoptimized
                  />
                )}
                <span>{pr.author}</span>
              </div>
              <span>
                Updated {new Date(pr.updated_at).toLocaleDateString()}
              </span>
              {pr.previewUrl && (
                <a
                  href={pr.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-primary hover:text-primary/80"
                  onClick={(e) => e.stopPropagation()}
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  View Preview
                </a>
              )}
            </div>
          </div>

          {/* External Link */}
          <a
            href={pr.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 p-2 hover:bg-surface-variant rounded-lg transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <svg
              className="w-5 h-5 text-on-surface-variant"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </Link>
    </GlassCard>
  );
}
