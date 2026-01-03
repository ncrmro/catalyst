"use client";

export interface ClarifyingQuestionsSkeletonProps {
  className?: string;
}

/**
 * Loading skeleton for clarifying questions while streaming
 */
export function ClarifyingQuestionsSkeleton({
  className,
}: ClarifyingQuestionsSkeletonProps) {
  return (
    <div
      data-clarifying-questions-skeleton
      aria-label="Loading questions..."
      className={className}
    >
      <div data-skeleton-tabs>
        <div data-skeleton-tab />
        <div data-skeleton-tab />
      </div>
      <div data-skeleton-content>
        <div data-skeleton-question />
        <div data-skeleton-options>
          <div data-skeleton-option />
          <div data-skeleton-option />
          <div data-skeleton-option />
        </div>
      </div>
    </div>
  );
}
