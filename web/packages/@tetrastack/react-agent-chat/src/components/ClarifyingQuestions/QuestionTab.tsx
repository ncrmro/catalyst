"use client";

export interface QuestionTabProps {
  index: number;
  header: string;
  isActive: boolean;
  isAnswered: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Tab header for a single question in a multi-question interface
 *
 * Shows the question's short header with visual indicators for
 * active and answered states.
 */
export function QuestionTab({
  index,
  header,
  isActive,
  isAnswered,
  onClick,
  className,
}: QuestionTabProps) {
  return (
    <button
      type="button"
      role="tab"
      id={`question-tab-${index}`}
      aria-selected={isActive}
      aria-controls={`question-panel-${index}`}
      tabIndex={isActive ? 0 : -1}
      onClick={onClick}
      data-question-tab
      data-active={isActive}
      data-answered={isAnswered}
      className={className}
    >
      <span data-tab-header>{header}</span>
      {isAnswered && (
        <span data-tab-checkmark aria-label="Answered">
          ✓
        </span>
      )}
    </button>
  );
}
