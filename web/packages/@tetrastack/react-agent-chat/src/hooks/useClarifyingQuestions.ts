"use client";

import { useState, useCallback, useEffect, KeyboardEvent } from "react";
import type { ClarifyingQuestion, ClarifyingQuestionsOutput } from "../types";

/**
 * Options for useClarifyingQuestions hook
 */
export interface UseClarifyingQuestionsOptions {
  /** Array of questions to present */
  questions: ClarifyingQuestion[];
  /** Tool call ID for persistence association */
  toolCallId: string;
  /** Optional localStorage key for persisting partial answers */
  persistKey?: string;
  /** Callback when all questions are submitted */
  onSubmit: (output: ClarifyingQuestionsOutput) => void;
}

/**
 * State stored in localStorage for persistence
 */
interface PersistedState {
  toolCallId: string;
  answers: Record<string, string | string[]>;
  activeTab: number;
}

/**
 * Return type for useClarifyingQuestions hook
 */
export interface UseClarifyingQuestionsReturn {
  /** Currently active tab index */
  activeTab: number;
  /** Set the active tab */
  setActiveTab: (index: number) => void;
  /** The current question being displayed */
  currentQuestion: ClarifyingQuestion;
  /** All answers keyed by question index */
  answers: Record<string, string | string[]>;
  /** Text input for "Other" option per question */
  otherText: Record<string, string>;
  /** Whether "Other" input is shown per question */
  showOther: Record<string, boolean>;
  /** Toggle "Other" input visibility */
  setShowOther: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  /** Select an option for a question */
  selectOption: (questionIndex: number, label: string) => void;
  /** Set "Other" text for a question */
  setOtherAnswer: (questionIndex: number, text: string) => void;
  /** Confirm "Other" text as the answer */
  confirmOther: (questionIndex: number) => void;
  /** Check if a question is answered */
  isAnswered: (index: number) => boolean;
  /** Whether all questions are answered */
  allAnswered: boolean;
  /** Submit all answers */
  submit: () => void;
  /** Move to next tab */
  nextTab: () => void;
  /** Move to previous tab */
  prevTab: () => void;
  /** Keyboard event handler for navigation */
  handleKeyDown: (event: KeyboardEvent) => void;
  /** Get answer for a specific question */
  getAnswer: (index: number) => string | string[] | undefined;
  /** Check if an option is selected */
  isOptionSelected: (questionIndex: number, label: string) => boolean;
}

/**
 * Hook for managing clarifying questions state and interactions
 *
 * Handles:
 * - Tab navigation between multiple questions
 * - Single-select and multi-select option modes
 * - "Other" custom text input
 * - localStorage persistence for partial answers
 * - Keyboard navigation
 *
 * @example
 * ```tsx
 * function QuestionsUI({ questions, toolCallId, onSubmit }) {
 *   const {
 *     activeTab,
 *     currentQuestion,
 *     selectOption,
 *     allAnswered,
 *     submit,
 *   } = useClarifyingQuestions({ questions, toolCallId, onSubmit });
 *
 *   return (
 *     <div>
 *       <h3>{currentQuestion.question}</h3>
 *       {currentQuestion.options.map(opt => (
 *         <button
 *           key={opt.label}
 *           onClick={() => selectOption(activeTab, opt.label)}
 *         >
 *           {opt.label}
 *         </button>
 *       ))}
 *       {allAnswered && <button onClick={submit}>Submit</button>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useClarifyingQuestions(
  options: UseClarifyingQuestionsOptions,
): UseClarifyingQuestionsReturn {
  const { questions, toolCallId, persistKey, onSubmit } = options;

  // Initialize state from localStorage if available
  const [activeTab, setActiveTab] = useState<number>(() => {
    if (persistKey && typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(persistKey);
        if (saved) {
          const parsed: PersistedState = JSON.parse(saved);
          if (parsed.toolCallId === toolCallId) {
            return parsed.activeTab;
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
    return 0;
  });

  const [answers, setAnswers] = useState<Record<string, string | string[]>>(
    () => {
      if (persistKey && typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem(persistKey);
          if (saved) {
            const parsed: PersistedState = JSON.parse(saved);
            if (parsed.toolCallId === toolCallId) {
              return parsed.answers;
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
      return {};
    },
  );

  const [otherText, setOtherText] = useState<Record<string, string>>({});
  const [showOther, setShowOther] = useState<Record<string, boolean>>({});

  // Persist to localStorage on changes
  useEffect(() => {
    if (persistKey && typeof window !== "undefined") {
      const state: PersistedState = {
        toolCallId,
        answers,
        activeTab,
      };
      localStorage.setItem(persistKey, JSON.stringify(state));
    }
  }, [persistKey, toolCallId, answers, activeTab]);

  const currentQuestion = questions[activeTab] || questions[0];

  const isAnswered = useCallback(
    (index: number): boolean => {
      const answer = answers[String(index)];
      if (Array.isArray(answer)) {
        return answer.length > 0;
      }
      return !!answer;
    },
    [answers],
  );

  const allAnswered = questions.every((_, i) => isAnswered(i));

  const getAnswer = useCallback(
    (index: number): string | string[] | undefined => {
      return answers[String(index)];
    },
    [answers],
  );

  const isOptionSelected = useCallback(
    (questionIndex: number, label: string): boolean => {
      const answer = answers[String(questionIndex)];
      if (Array.isArray(answer)) {
        return answer.includes(label);
      }
      return answer === label;
    },
    [answers],
  );

  const selectOption = useCallback(
    (questionIndex: number, label: string) => {
      const question = questions[questionIndex];
      if (!question) return;

      if (question.multiSelect) {
        // Toggle selection in array
        const current = (answers[String(questionIndex)] as string[]) || [];
        const newValue = current.includes(label)
          ? current.filter((l) => l !== label)
          : [...current, label];
        setAnswers((prev) => ({ ...prev, [String(questionIndex)]: newValue }));
      } else {
        // Single select: just set the value
        setAnswers((prev) => ({ ...prev, [String(questionIndex)]: label }));
      }

      // Hide "Other" input if selecting a predefined option
      setShowOther((prev) => ({ ...prev, [String(questionIndex)]: false }));
    },
    [questions, answers],
  );

  const setOtherAnswer = useCallback((questionIndex: number, text: string) => {
    setOtherText((prev) => ({ ...prev, [String(questionIndex)]: text }));
  }, []);

  const confirmOther = useCallback(
    (questionIndex: number) => {
      const text = otherText[String(questionIndex)]?.trim();
      if (text) {
        const question = questions[questionIndex];
        if (!question) return;

        setAnswers((prev) => ({
          ...prev,
          [String(questionIndex)]: question.multiSelect ? [text] : text,
        }));
        setShowOther((prev) => ({ ...prev, [String(questionIndex)]: false }));
        setOtherText((prev) => ({ ...prev, [String(questionIndex)]: "" }));
      }
    },
    [questions, otherText],
  );

  const submit = useCallback(() => {
    onSubmit({ answers });
  }, [answers, onSubmit]);

  const nextTab = useCallback(() => {
    if (activeTab < questions.length - 1) {
      setActiveTab(activeTab + 1);
    }
  }, [activeTab, questions.length]);

  const prevTab = useCallback(() => {
    if (activeTab > 0) {
      setActiveTab(activeTab - 1);
    }
  }, [activeTab]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case "Tab":
          if (event.shiftKey) {
            event.preventDefault();
            prevTab();
          } else if (!event.shiftKey && questions.length > 1) {
            // Only prevent default Tab if we have multiple questions
            // Let it navigate within options otherwise
            event.preventDefault();
            nextTab();
          }
          break;
        case "Enter":
          if (allAnswered) {
            event.preventDefault();
            submit();
          }
          break;
        case "Escape":
          // Close "Other" input if open
          setShowOther((prev) => ({
            ...prev,
            [String(activeTab)]: false,
          }));
          break;
      }
    },
    [activeTab, allAnswered, nextTab, prevTab, questions.length, submit],
  );

  return {
    activeTab,
    setActiveTab,
    currentQuestion,
    answers,
    otherText,
    showOther,
    setShowOther,
    selectOption,
    setOtherAnswer,
    confirmOther,
    isAnswered,
    allAnswered,
    submit,
    nextTab,
    prevTab,
    handleKeyDown,
    getAnswer,
    isOptionSelected,
  };
}
