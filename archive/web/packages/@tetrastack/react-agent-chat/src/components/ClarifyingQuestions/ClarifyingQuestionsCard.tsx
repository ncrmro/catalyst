"use client";

import { useClarifyingQuestions } from "../../hooks";
import type {
  ClarifyingQuestion,
  ClarifyingQuestionsOutput,
  ClarifyingQuestionsToolState,
} from "../../types";
import { QuestionTab } from "./QuestionTab";
import { QuestionPanel } from "./QuestionPanel";
import { AnsweredQuestions } from "./AnsweredQuestions";
import { ClarifyingQuestionsSkeleton } from "./ClarifyingQuestionsSkeleton";

export interface ClarifyingQuestionsCardProps {
  /** Array of questions to present */
  questions: ClarifyingQuestion[];
  /** Tool call ID for tracking */
  toolCallId: string;
  /** Current state of the tool */
  state: ClarifyingQuestionsToolState;
  /** Result if state is output-available */
  result?: ClarifyingQuestionsOutput;
  /** Optional localStorage key for persisting partial answers */
  persistKey?: string;
  /** Callback when user submits all answers */
  onSubmit: (output: ClarifyingQuestionsOutput) => void;
  /** Container className */
  className?: string;
  /** Tab header className */
  tabClassName?: string;
  /** Question panel className */
  panelClassName?: string;
  /** Option button className */
  optionClassName?: string;
  /** Answered view className */
  answeredClassName?: string;
  /** Skeleton className */
  skeletonClassName?: string;
}

/**
 * Main container for clarifying questions UI
 *
 * Handles three states:
 * - input-streaming: Shows loading skeleton
 * - input-available: Shows interactive tabbed interface
 * - output-available: Shows read-only answered view
 *
 * @example
 * ```tsx
 * <ClarifyingQuestionsCard
 *   questions={part.input.questions}
 *   toolCallId={part.toolCallId}
 *   state={part.state}
 *   result={part.output}
 *   onSubmit={(output) => addToolOutput({ toolCallId, output })}
 *   persistKey={`questions-${part.toolCallId}`}
 * />
 * ```
 */
export function ClarifyingQuestionsCard({
  questions,
  toolCallId,
  state,
  result,
  persistKey,
  onSubmit,
  className,
  tabClassName,
  panelClassName,
  optionClassName,
  answeredClassName,
  skeletonClassName,
}: ClarifyingQuestionsCardProps) {
  // Show skeleton while streaming
  if (state === "input-streaming") {
    return <ClarifyingQuestionsSkeleton className={skeletonClassName} />;
  }

  // Show answered view if complete
  if (state === "output-available" && result) {
    return (
      <AnsweredQuestions
        questions={questions}
        answers={result.answers}
        className={answeredClassName}
      />
    );
  }

  // Show error state
  if (state === "output-error") {
    return (
      <div data-clarifying-questions-error className={className}>
        <p>An error occurred while processing your answers.</p>
      </div>
    );
  }

  // Interactive state
  return (
    <InteractiveClarifyingQuestions
      questions={questions}
      toolCallId={toolCallId}
      persistKey={persistKey}
      onSubmit={onSubmit}
      className={className}
      tabClassName={tabClassName}
      panelClassName={panelClassName}
      optionClassName={optionClassName}
    />
  );
}

interface InteractiveClarifyingQuestionsProps {
  questions: ClarifyingQuestion[];
  toolCallId: string;
  persistKey?: string;
  onSubmit: (output: ClarifyingQuestionsOutput) => void;
  className?: string;
  tabClassName?: string;
  panelClassName?: string;
  optionClassName?: string;
}

function InteractiveClarifyingQuestions({
  questions,
  toolCallId,
  persistKey,
  onSubmit,
  className,
  tabClassName,
  panelClassName,
  optionClassName,
}: InteractiveClarifyingQuestionsProps) {
  const hook = useClarifyingQuestions({
    questions,
    toolCallId,
    persistKey,
    onSubmit,
  });

  return (
    <div
      role="region"
      aria-label="Agent questions"
      aria-live="polite"
      data-clarifying-questions
      onKeyDown={hook.handleKeyDown}
      tabIndex={0}
      className={className}
    >
      {/* Tab headers (only if multiple questions) */}
      {questions.length > 1 && (
        <div role="tablist" aria-label="Questions" data-question-tabs>
          {questions.map((q, i) => (
            <QuestionTab
              key={i}
              index={i}
              header={q.header}
              isActive={hook.activeTab === i}
              isAnswered={hook.isAnswered(i)}
              onClick={() => hook.setActiveTab(i)}
              className={tabClassName}
            />
          ))}
        </div>
      )}

      {/* Question panel */}
      <QuestionPanel
        question={hook.currentQuestion}
        questionIndex={hook.activeTab}
        answer={hook.getAnswer(hook.activeTab)}
        otherText={hook.otherText[String(hook.activeTab)] || ""}
        showOther={hook.showOther[String(hook.activeTab)] || false}
        onSelectOption={(label) => hook.selectOption(hook.activeTab, label)}
        onSetOtherText={(text) => hook.setOtherAnswer(hook.activeTab, text)}
        onConfirmOther={() => hook.confirmOther(hook.activeTab)}
        onToggleOther={() =>
          hook.setShowOther((prev) => ({
            ...prev,
            [String(hook.activeTab)]: !prev[String(hook.activeTab)],
          }))
        }
        onNext={
          hook.activeTab < questions.length - 1 ? hook.nextTab : undefined
        }
        onSubmit={hook.allAnswered ? hook.submit : undefined}
        isLastQuestion={hook.activeTab === questions.length - 1}
        className={panelClassName}
        optionClassName={optionClassName}
      />
    </div>
  );
}
