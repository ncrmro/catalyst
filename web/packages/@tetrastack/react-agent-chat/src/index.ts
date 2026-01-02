// Main package entry point
// Re-exports all public API

export type {
	AnsweredQuestionsProps,
	ChatContainerProps,
	ChatInputProps,
	ClarifyingQuestionsCardProps,
	ClarifyingQuestionsSkeletonProps,
	ExpandableAgentChatProps,
	MessageBubbleProps,
	MessageListProps,
	QuestionOptionProps,
	QuestionPanelProps,
	QuestionTabProps,
	SpecContext,
} from "./components";
// Components
export {
	AnsweredQuestions,
	// Chat components
	ChatContainer,
	ChatInput,
	// Clarifying questions components
	ClarifyingQuestionsCard,
	ClarifyingQuestionsSkeleton,
	ExpandableAgentChat,
	MessageBubble,
	MessageList,
	QuestionOption,
	QuestionPanel,
	QuestionTab,
} from "./components";
export type {
	UseAgentChatOptions,
	UseAgentChatReturn,
	UseClarifyingQuestionsOptions,
	UseClarifyingQuestionsReturn,
	UseMessagePartsReturn,
	UseToolResponseOptions,
	UseToolResponseReturn,
} from "./hooks";
// Hooks
export {
	useAgentChat,
	useClarifyingQuestions,
	useMessageParts,
	useToolResponse,
} from "./hooks";

// Types
export type {
	AddToolOutputOptions,
	// Message types
	AgentMessage,
	ClarifyingQuestion,
	ClarifyingQuestionsInput,
	ClarifyingQuestionsOutput,
	ClarifyingQuestionsToolState,
	DynamicToolPart,
	MessagePart,
	MessageRole,
	OnToolCallHandler,
	// Clarifying questions types
	QuestionOption as QuestionOptionType,
	TextPart,
	ToolCall,
	// Tool types
	ToolState,
} from "./types";

// Schemas (for validation)
export {
	clarifyingQuestionSchema,
	clarifyingQuestionsInputSchema,
	clarifyingQuestionsOutputSchema,
	questionOptionSchema,
} from "./types";

// Utils
export {
	areAllToolsCompleted,
	getLastAssistantMessage,
	// Message helpers
	getMessageText,
	getToolCallId,
	getToolInput,
	getToolName,
	getToolOutput,
	getToolParts,
	getToolPartsByName,
	getToolState,
	hasTextContent,
	hasToolParts,
	isAssistantMessage,
	isClarifyingQuestionsPart,
	isSystemMessage,
	// Part guards
	isTextPart,
	isToolCompleted,
	isToolPart,
	isToolStreaming,
	isToolWaitingForInput,
	isUserMessage,
} from "./utils";
