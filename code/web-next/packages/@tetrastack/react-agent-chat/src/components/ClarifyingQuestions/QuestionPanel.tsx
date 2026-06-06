"use client";

import type { ClarifyingQuestion } from "../../types";
import { QuestionOption } from "./QuestionOption";

export interface QuestionPanelProps {
  question: ClarifyingQuestion;
  questionIndex: number;
  answer: string | string[] | undefined;
  otherText: string;
  showOther: boolean;
  onSelectOption: (label: string) => void;
  onSetOtherText: (text: string) => void;
  onConfirmOther: () => void;
  onToggleOther: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  isLastQuestion: boolean;
  className?: string;
  optionClassName?: string;
}

/**
 * Panel displaying a single question with its options
 *
 * Handles both single-select and multi-select modes, plus "Other" custom input.
 */
export function QuestionPanel({
  question,
  questionIndex,
  answer,
  otherText,
  showOther,
  onSelectOption,
  onSetOtherText,
  onConfirmOther,
  onToggleOther,
  onNext,
  onSubmit,
  isLastQuestion,
  className,
  optionClassName,
}: QuestionPanelProps) {
  const isOptionSelected = (label: string): boolean => {
    if (Array.isArray(answer)) {
      return answer.includes(label);
    }
    return answer === label;
  };

  const hasAnswer =
    (Array.isArray(answer) && answer.length > 0) ||
    (typeof answer === "string" && answer.length > 0);

  return (
    <div
      role="tabpanel"
      id={`question-panel-${questionIndex}`}
      aria-labelledby={`question-tab-${questionIndex}`}
      data-question-panel
      className={className}
    >
      {/* Question text */}
      <p data-question-text>{question.question}</p>

      {/* Options */}
      <div
        role={question.multiSelect ? "group" : "radiogroup"}
        aria-label={question.question}
        data-options-group
      >
        {question.options.map((option) => (
          <QuestionOption
            key={option.label}
            option={option}
            isSelected={isOptionSelected(option.label)}
            isMultiSelect={question.multiSelect}
            onClick={() => onSelectOption(option.label)}
            className={optionClassName}
          />
        ))}

        {/* "Other" option */}
        <button
          type="button"
          role={question.multiSelect ? "checkbox" : "radio"}
          aria-checked={showOther}
          onClick={onToggleOther}
          data-question-option
          data-option-other
          data-selected={showOther}
          className={optionClassName}
        >
          <span data-option-label>Other</span>
          <span data-option-description>Provide a custom answer</span>
        </button>
      </div>

      {/* "Other" text input */}
      {showOther && (
        <div data-other-input-container>
          <input
            type="text"
            value={otherText}
            onChange={(e) => onSetOtherText(e.target.value)}
            placeholder="Type your answer..."
            aria-label="Custom answer"
            data-other-input
            autoFocus
          />
          <button
            type="button"
            onClick={onConfirmOther}
            disabled={!otherText.trim()}
            data-other-confirm
          >
            OK
          </button>
        </div>
      )}

      {/* Navigation and submit buttons */}
      <div data-panel-actions>
        {/* Next button (for multi-select or when not last question) */}
        {onNext && (question.multiSelect || !isLastQuestion) && hasAnswer && (
          <button type="button" onClick={onNext} data-action-next>
            Next
          </button>
        )}

        {/* Submit button (when all answered and last question) */}
        {onSubmit && isLastQuestion && (
          <button type="button" onClick={onSubmit} data-action-submit>
            Submit All
          </button>
        )}
      </div>
    </div>
  );
}
