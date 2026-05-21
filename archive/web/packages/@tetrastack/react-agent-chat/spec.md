# @tetrastack/react-agent-chat

React components and hooks for building AI agent chat interfaces with AI SDK v6.

## Overview

This package provides project-agnostic, reusable components and hooks for implementing chat interfaces that interact with AI agents. It is designed around the AI SDK v6 types and patterns, enabling rich conversational experiences with tool-based interactions.

## Functional Requirements

### FR-001: Core Chat Hooks

- **FR-001.1**: Package MUST provide `useAgentChat` hook that wraps AI SDK's `useChat` with simplified API
- **FR-001.2**: Hook MUST support custom API endpoints for chat communication
- **FR-001.3**: Hook MUST expose `messages`, `status`, `error`, `sendMessage`, and `addToolOutput`
- **FR-001.4**: Hook MUST provide `isLoading` derived state for UI convenience

### FR-002: Message Part Utilities

- **FR-002.1**: Package MUST provide type guards for all AI SDK message part types (text, reasoning, file, tool)
- **FR-002.2**: Package MUST provide helpers for extracting text content from messages
- **FR-002.3**: Package MUST provide helpers for identifying and extracting tool invocations
- **FR-002.4**: Package MUST provide state checking utilities (streaming, completed, waiting for input)

### FR-003: Clarifying Questions Tool

- **FR-003.1**: Package MUST define Zod schemas for clarifying questions input/output
- **FR-003.2**: Package MUST support 1-4 questions presented simultaneously
- **FR-003.3**: Each question MUST support 2-4 predefined options
- **FR-003.4**: Questions MUST support both single-select and multi-select modes
- **FR-003.5**: An "Other" option MUST always be available for custom text input
- **FR-003.6**: Package MUST provide `useClarifyingQuestions` hook for managing question state

### FR-004: Clarifying Questions UI Components

- **FR-004.1**: Package MUST provide `ClarifyingQuestionsCard` as the main container component
- **FR-004.2**: Multiple questions MUST be presented in a tabbed interface
- **FR-004.3**: Tab headers MUST display short labels (max 12 characters)
- **FR-004.4**: Answered tabs MUST show a checkmark indicator
- **FR-004.5**: Single-select: clicking an option MUST select it (stay on tab, explicit Next)
- **FR-004.6**: Multi-select: options MUST toggle, with explicit submit button
- **FR-004.7**: Component MUST handle three states: `input-streaming`, `input-available`, `output-available`
- **FR-004.8**: Answered questions MUST display in read-only mode

### FR-005: State Persistence

- **FR-005.1**: Clarifying questions MUST support localStorage persistence via `persistKey` prop
- **FR-005.2**: Partial answers MUST be restored when user returns
- **FR-005.3**: Active tab position MUST be restored on return
- **FR-005.4**: Persistence MUST be tied to specific `toolCallId` to avoid stale data

### FR-006: Keyboard Navigation

- **FR-006.1**: Tab/Shift+Tab MUST navigate between question tabs
- **FR-006.2**: Arrow keys MUST navigate between options within a question
- **FR-006.3**: Space MUST select/toggle the focused option
- **FR-006.4**: Enter MUST submit when all questions are answered
- **FR-006.5**: Escape MUST close "Other" text input and return to options

### FR-007: Accessibility

- **FR-007.1**: Components MUST use proper ARIA roles (region, tablist, tab, tabpanel, radiogroup)
- **FR-007.2**: Questions container MUST use `aria-live="polite"` for announcements
- **FR-007.3**: Tab panels MUST be properly associated with tab headers
- **FR-007.4**: Options MUST have appropriate `aria-checked` or `aria-selected` states

### FR-008: Base Chat Components

- **FR-008.1**: Package MUST provide `MessageList` component for rendering messages
- **FR-008.2**: Package MUST provide `MessageBubble` component for individual messages
- **FR-008.3**: Package MUST provide `ChatInput` component for text input
- **FR-008.4**: Components MUST accept `className` props for styling customization
- **FR-008.5**: Components MUST be unstyled by default (bring your own styles)

### FR-009: Tool Response Handling

- **FR-009.1**: Package MUST provide `useToolResponse` hook for managing tool outputs
- **FR-009.2**: Hook MUST integrate with AI SDK's `addToolOutput` function
- **FR-009.3**: Components MUST pass tool responses back through `onSubmit` callbacks

## Non-Functional Requirements

### NFR-001: Dependencies

- Package MUST have `react`, `ai`, and `@ai-sdk/react` as peer dependencies
- Package MUST use Zod for schema validation
- Package MUST NOT include any project-specific dependencies

### NFR-002: TypeScript

- Package MUST be fully typed with TypeScript
- Package MUST export all types for consumer use
- Package MUST be compatible with strict TypeScript mode

### NFR-003: Bundle Size

- Package SHOULD be tree-shakeable
- Components SHOULD be individually importable via subpath exports

### NFR-004: React Compatibility

- Package MUST support React 19+
- Package MUST use 'use client' directive for client components

## Exports

```typescript
// Main export
import {
  useAgentChat,
  useClarifyingQuestions,
  ClarifyingQuestionsCard,
  MessageList,
  MessageBubble,
  ChatInput,
} from "@tetrastack/react-agent-chat";

// Subpath exports
import { useAgentChat } from "@tetrastack/react-agent-chat/hooks";
import { ClarifyingQuestionsCard } from "@tetrastack/react-agent-chat/components";
import { clarifyingQuestionSchema } from "@tetrastack/react-agent-chat/types";
import { isTextPart, getMessageText } from "@tetrastack/react-agent-chat/utils";
```

## Component Props

### ClarifyingQuestionsCard

```typescript
interface ClarifyingQuestionsCardProps {
  questions: ClarifyingQuestion[];
  toolCallId: string;
  state: "input-streaming" | "input-available" | "output-available";
  result?: ClarifyingQuestionsOutput;
  persistKey?: string;
  onSubmit: (output: ClarifyingQuestionsOutput) => void;
  className?: string;
}
```

### MessageList

```typescript
interface MessageListProps<TMessage extends AgentMessage = AgentMessage> {
  messages: TMessage[];
  isLoading?: boolean;
  onToolSubmit?: (toolCallId: string, output: unknown) => void;
  className?: string;
  renderMessage?: (message: TMessage, index: number) => ReactNode;
  renderToolPart?: (part: MessagePart, message: TMessage) => ReactNode;
}
```

### MessageBubble

```typescript
interface MessageBubbleProps {
  role: MessageRole;
  content: string;
  timestamp?: Date;
  isStreaming?: boolean;
  className?: string;
}
```

### ChatInput

```typescript
interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}
```

## Hook Signatures

### useAgentChat

```typescript
function useAgentChat(options: UseAgentChatOptions): {
  messages: AgentMessage[];
  status: ChatStatus;
  error: Error | undefined;
  sendMessage: (message: string) => Promise<void>;
  addToolOutput: (options: AddToolOutputOptions) => void;
  isLoading: boolean;
};
```

### useClarifyingQuestions

```typescript
function useClarifyingQuestions(options: UseClarifyingQuestionsOptions): {
  activeTab: number;
  setActiveTab: (index: number) => void;
  currentQuestion: ClarifyingQuestion;
  answers: Record<string, string | string[]>;
  selectOption: (questionIndex: number, label: string) => void;
  isAnswered: (index: number) => boolean;
  allAnswered: boolean;
  submit: () => void;
  nextTab: () => void;
  prevTab: () => void;
  // ... other state and handlers
};
```
