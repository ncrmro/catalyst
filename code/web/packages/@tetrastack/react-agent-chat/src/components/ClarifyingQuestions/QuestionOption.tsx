"use client";

import type { QuestionOption as QuestionOptionType } from "../../types";

export interface QuestionOptionProps {
  option: QuestionOptionType;
  isSelected: boolean;
  isMultiSelect: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Individual option button for a clarifying question
 *
 * Renders as radio (single-select) or checkbox (multi-select) semantically.
 * Unstyled by default - consumers provide styles via className or CSS.
 */
export function QuestionOption({
  option,
  isSelected,
  isMultiSelect,
  onClick,
  className,
}: QuestionOptionProps) {
  return (
    <button
      type="button"
      role={isMultiSelect ? "checkbox" : "radio"}
      aria-checked={isSelected}
      onClick={onClick}
      data-question-option
      data-selected={isSelected}
      className={className}
    >
      <span data-option-label>{option.label}</span>
      {option.description && (
        <span data-option-description>{option.description}</span>
      )}
    </button>
  );
}
