"use client";

import type { ClarifyingQuestion } from "../../types";

export interface AnsweredQuestionsProps {
  questions: ClarifyingQuestion[];
  answers: Record<string, string | string[]>;
  className?: string;
}

/**
 * Read-only view of answered clarifying questions
 *
 * Displayed after user has submitted their answers.
 */
export function AnsweredQuestions({
  questions,
  answers,
  className,
}: AnsweredQuestionsProps) {
  return (
    <div data-answered-questions className={className}>
      <span data-answered-label>Answered</span>
      <div data-answered-list>
        {questions.map((question, index) => {
          const answer = answers[String(index)];
          const displayAnswer = Array.isArray(answer)
            ? answer.join(", ")
            : answer;

          return (
            <div key={index} data-answered-item>
              <span data-answered-header>{question.header}</span>
              <span data-answered-value>{displayAnswer || "No answer"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
