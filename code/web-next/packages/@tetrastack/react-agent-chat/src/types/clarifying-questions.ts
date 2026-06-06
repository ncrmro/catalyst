import { z } from "zod";

/**
 * Schema for a single option in a clarifying question
 */
export const questionOptionSchema = z.object({
  /** Display text for the option (1-30 characters) */
  label: z.string().min(1).max(30),
  /** Optional explanation of what this option means or its implications */
  description: z.string().optional(),
});

/**
 * Schema for a single clarifying question
 */
export const clarifyingQuestionSchema = z.object({
  /** The complete question to ask (ends with ?) */
  question: z.string(),
  /** Short label displayed as chip/tag (max 12 chars, e.g., "Auth method", "Library") */
  header: z.string().max(12),
  /** Available choices (2-4 options). "Other" is automatically appended by UI. */
  options: z.array(questionOptionSchema).min(2).max(4),
  /** Allow multiple selections (default: false) */
  multiSelect: z.boolean().default(false),
});

/**
 * Schema for the input to askClarifyingQuestions tool
 */
export const clarifyingQuestionsInputSchema = z.object({
  /** Array of 1-4 questions to present simultaneously */
  questions: z.array(clarifyingQuestionSchema).min(1).max(4),
});

/**
 * Schema for the output/response from clarifying questions
 */
export const clarifyingQuestionsOutputSchema = z.object({
  /** Map of question index to selected option labels or custom text */
  answers: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
});

export type QuestionOption = z.infer<typeof questionOptionSchema>;
export type ClarifyingQuestion = z.infer<typeof clarifyingQuestionSchema>;
export type ClarifyingQuestionsInput = z.infer<
  typeof clarifyingQuestionsInputSchema
>;
export type ClarifyingQuestionsOutput = z.infer<
  typeof clarifyingQuestionsOutputSchema
>;

/**
 * Tool state for clarifying questions (maps to AI SDK tool states)
 */
export type ClarifyingQuestionsToolState =
  | "input-streaming"
  | "input-available"
  | "output-available"
  | "output-error";
