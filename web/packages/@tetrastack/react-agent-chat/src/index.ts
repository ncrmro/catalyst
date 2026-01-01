// Main package entry point
// Re-exports all public API

// Components
export {
  // Chat components
  ChatContainer,
  MessageList,
  MessageBubble,
  ChatInput,
  ExpandableAgentChat,
  // Clarifying questions components
  ClarifyingQuestionsCard,
  QuestionTab,
  QuestionPanel,
  QuestionOption,
  AnsweredQuestions,
  ClarifyingQuestionsSkeleton,
} from "./components";

export type {
  ChatContainerProps,
  MessageListProps,
  MessageBubbleProps,
  ChatInputProps,
  ExpandableAgentChatProps,
  SpecContext,
  ClarifyingQuestionsCardProps,
  QuestionTabProps,
  QuestionPanelProps,
  QuestionOptionProps,
  AnsweredQuestionsProps,
  ClarifyingQuestionsSkeletonProps,
} from "./components";

// Hooks
export {
  useAgentChat,
  useMessageParts,
  useToolResponse,
  useClarifyingQuestions,
} from "./hooks";

export type {
  UseAgentChatOptions,
  UseAgentChatReturn,
  UseMessagePartsReturn,
  UseToolResponseOptions,
  UseToolResponseReturn,
  UseClarifyingQuestionsOptions,
  UseClarifyingQuestionsReturn,
} from "./hooks";

// Types
export type {
  // Clarifying questions types
  QuestionOption as QuestionOptionType,
  ClarifyingQuestion,
  ClarifyingQuestionsInput,
  ClarifyingQuestionsOutput,
  ClarifyingQuestionsToolState,
  // Message types
  AgentMessage,
  MessageRole,
  TextPart,
  MessagePart,
  DynamicToolPart,
  // Tool types
  ToolState,
  ToolCall,
  AddToolOutputOptions,
  OnToolCallHandler,
} from "./types";

// Schemas (for validation)
export {
  questionOptionSchema,
  clarifyingQuestionSchema,
  clarifyingQuestionsInputSchema,
  clarifyingQuestionsOutputSchema,
} from "./types";

// Utils
export {
  // Part guards
  isTextPart,
  isToolPart,
  isClarifyingQuestionsPart,
  getToolState,
  getToolInput,
  getToolCallId,
  getToolName,
  getToolOutput,
  isToolCompleted,
  isToolWaitingForInput,
  isToolStreaming,
  // Message helpers
  getMessageText,
  hasTextContent,
  hasToolParts,
  getToolParts,
  getToolPartsByName,
  isUserMessage,
  isAssistantMessage,
  isSystemMessage,
  areAllToolsCompleted,
  getLastAssistantMessage,
} from "./utils";
