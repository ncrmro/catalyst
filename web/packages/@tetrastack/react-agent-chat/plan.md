# Implementation Plan: @tetrastack/react-agent-chat

## Overview

This package provides React components and hooks for building AI agent chat interfaces using AI SDK v6. Components are designed to be unstyled (bring your own CSS) and fully composable.

## Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Consumer App                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │ useAgentChat │───▶│   messages   │───▶│  MessageList    │   │
│  └──────────────┘    └──────────────┘    └─────────────────┘   │
│         │                                         │              │
│         │ addToolOutput                           │              │
│         │                                         ▼              │
│         │                              ┌─────────────────────┐  │
│         │                              │  useMessageParts    │  │
│         │                              └─────────────────────┘  │
│         │                                         │              │
│         │                                         ▼              │
│         │                              ┌─────────────────────┐  │
│         ◀──────────────────────────────│ ClarifyingQuestions │  │
│                    onSubmit            └─────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
ChatContainer (optional wrapper)
├── MessageList
│   ├── MessageBubble (text messages)
│   └── [Tool Components] (per tool type)
│       └── ClarifyingQuestionsCard
│           ├── QuestionTab (tab headers)
│           └── QuestionPanel
│               ├── QuestionOption (selectable options)
│               └── OtherInput (custom text)
└── ChatInput
```

## Code Examples

### Basic Chat Integration

```tsx
import {
  useAgentChat,
  MessageList,
  ChatInput,
  ClarifyingQuestionsCard,
} from '@tetrastack/react-agent-chat';
import {
  getMessageText,
  isClarifyingQuestionsPart,
} from '@tetrastack/react-agent-chat/utils';

function ChatPage() {
  const { messages, sendMessage, addToolOutput, isLoading } = useAgentChat({
    apiEndpoint: '/api/chat',
  });

  const handleToolSubmit = (toolCallId: string, output: unknown) => {
    addToolOutput({ toolCallId, output });
  };

  return (
    <div className="chat-container">
      <MessageList
        messages={messages}
        isLoading={isLoading}
        onToolSubmit={handleToolSubmit}
        renderMessage={(message) => (
          <div className={`message ${message.role}`}>
            {getMessageText(message)}
          </div>
        )}
        renderToolPart={(part, message) => {
          if (isClarifyingQuestionsPart(part)) {
            return (
              <ClarifyingQuestionsCard
                questions={part.input.questions}
                toolCallId={part.toolCallId}
                state={part.state}
                result={part.output}
                onSubmit={(output) => handleToolSubmit(part.toolCallId, output)}
              />
            );
          }
          return null;
        }}
      />
      <ChatInput onSubmit={(text) => sendMessage(text)} isLoading={isLoading} />
    </div>
  );
}
```

### Using useClarifyingQuestions Hook Directly

```tsx
import { useClarifyingQuestions } from '@tetrastack/react-agent-chat/hooks';

function CustomQuestionsUI({ questions, toolCallId, onSubmit }) {
  const {
    activeTab,
    setActiveTab,
    currentQuestion,
    answers,
    selectOption,
    isOptionSelected,
    isAnswered,
    allAnswered,
    submit,
    nextTab,
    handleKeyDown,
  } = useClarifyingQuestions({
    questions,
    toolCallId,
    persistKey: `chat-questions-${toolCallId}`,
    onSubmit,
  });

  return (
    <div onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Tab Navigation */}
      <div role="tablist">
        {questions.map((q, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={activeTab === i}
            onClick={() => setActiveTab(i)}
          >
            {q.header}
            {isAnswered(i) && ' ✓'}
          </button>
        ))}
      </div>

      {/* Current Question */}
      <div role="tabpanel">
        <p>{currentQuestion.question}</p>
        <div role={currentQuestion.multiSelect ? 'group' : 'radiogroup'}>
          {currentQuestion.options.map((opt) => (
            <button
              key={opt.label}
              role={currentQuestion.multiSelect ? 'checkbox' : 'radio'}
              aria-checked={isOptionSelected(activeTab, opt.label)}
              onClick={() => selectOption(activeTab, opt.label)}
            >
              {opt.label}
              {opt.description && <span>{opt.description}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation & Submit */}
      {activeTab < questions.length - 1 && (
        <button onClick={nextTab}>Next</button>
      )}
      {allAnswered && <button onClick={submit}>Submit All</button>}
    </div>
  );
}
```

### Processing Message Parts

```tsx
import { useMessageParts } from '@tetrastack/react-agent-chat/hooks';

function MessageWithTools({ message }) {
  const { text, tools, hasTools, isStreaming } = useMessageParts(message);

  return (
    <div className={isStreaming ? 'streaming' : ''}>
      {/* Text content */}
      <p>{text.text}</p>

      {/* Tool invocations */}
      {hasTools &&
        tools.map((tool) => (
          <div key={tool.toolCallId}>
            <span>Tool: {tool.toolName}</span>
            <span>State: {tool.state}</span>
            {tool.state === 'output-available' && (
              <pre>{JSON.stringify(tool.output, null, 2)}</pre>
            )}
          </div>
        ))}
    </div>
  );
}
```

## Clarifying Questions Tab UI Design

```
┌─────────────────────────────────────────────────────────┐
│  [Auth ✓]  [Library]  [Approach]                        │  ← Tab headers
├─────────────────────────────────────────────────────────┤
│  Which library should we use for date formatting?       │  ← Question text
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ○ date-fns                                       │   │  ← Options
│  │   Tree-shakeable, functional API                 │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ● dayjs                                          │   │  ← Selected
│  │   Lightweight, moment.js compatible              │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ○ Other                                          │   │
│  │   Provide a custom answer                        │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│                              [Next →]  [Submit All]     │  ← Actions
└─────────────────────────────────────────────────────────┘
```

### Keyboard Navigation

| Key               | Context        | Action                         |
| ----------------- | -------------- | ------------------------------ |
| `Tab`             | Card focused   | Move to next question tab      |
| `Shift+Tab`       | Card focused   | Move to previous question tab  |
| `ArrowDown/Right` | Options        | Next option                    |
| `ArrowUp/Left`    | Options        | Previous option                |
| `Space`           | Option focused | Select/toggle option           |
| `Enter`           | Card           | Submit if all answered         |
| `Escape`          | "Other" input  | Close input, return to options |

### State Transitions

```
┌──────────────────┐
│ input-streaming  │  ← Show skeleton/loading
└────────┬─────────┘
         │ args complete
         ▼
┌──────────────────┐
│ input-available  │  ← Show interactive UI
└────────┬─────────┘
         │ user submits
         ▼
┌──────────────────┐
│ output-available │  ← Show read-only answered view
└──────────────────┘
```

## File Structure

```
packages/@tetrastack/react-agent-chat/
├── package.json
├── tsconfig.json
├── spec.md                         # Requirements
├── plan.md                         # This file
├── tasks.md                        # Task breakdown
├── src/
│   ├── index.ts                    # Main barrel export
│   ├── components/
│   │   ├── index.ts
│   │   ├── MessageList.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── ChatInput.tsx
│   │   └── ClarifyingQuestions/
│   │       ├── index.ts
│   │       ├── ClarifyingQuestionsCard.tsx
│   │       ├── QuestionTab.tsx
│   │       ├── QuestionPanel.tsx
│   │       ├── QuestionOption.tsx
│   │       └── AnsweredQuestions.tsx
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── useAgentChat.ts
│   │   ├── useMessageParts.ts
│   │   ├── useToolResponse.ts
│   │   └── useClarifyingQuestions.ts
│   ├── types/
│   │   ├── index.ts
│   │   ├── clarifying-questions.ts
│   │   ├── messages.ts
│   │   └── tools.ts
│   └── utils/
│       ├── index.ts
│       ├── part-guards.ts
│       └── message-helpers.ts
└── tests/
    ├── hooks/
    │   └── useClarifyingQuestions.test.ts
    └── utils/
        └── part-guards.test.ts
```

## Integration with Consuming Apps

### 1. Install Package

```bash
pnpm add @tetrastack/react-agent-chat
```

### 2. Define Tool in API Route

```typescript
// app/api/chat/route.ts
import { tool } from 'ai';
import { clarifyingQuestionsInputSchema } from '@tetrastack/react-agent-chat/types';

const tools = {
  askClarifyingQuestions: tool({
    description: 'Ask clarifying questions with predefined options',
    inputSchema: clarifyingQuestionsInputSchema,
    // No execute - client-side tool
  }),
};
```

### 3. Render in Chat UI

```tsx
// components/Chat.tsx
import { ClarifyingQuestionsCard } from '@tetrastack/react-agent-chat';
import {
  isClarifyingQuestionsPart,
  getToolInput,
  getToolCallId,
  getToolState,
} from '@tetrastack/react-agent-chat/utils';

function renderToolPart(part, addToolOutput) {
  if (isClarifyingQuestionsPart(part)) {
    const input = getToolInput(part);
    const state = getToolState(part);
    const toolCallId = getToolCallId(part);

    return (
      <ClarifyingQuestionsCard
        questions={input.questions}
        toolCallId={toolCallId}
        state={state}
        onSubmit={(output) => addToolOutput({ toolCallId, output })}
        persistKey={`questions-${toolCallId}`}
      />
    );
  }
  return null;
}
```

## Styling Approach

Components are unstyled by default. Consumers provide styles via:

1. **className props** - Every component accepts `className`
2. **CSS targeting** - Components use semantic data attributes
3. **Render props** - Full control via render functions

Example CSS:

```css
/* Target by data attribute */
[data-agent-chat-message] { ... }
[data-agent-chat-message="user"] { ... }
[data-agent-chat-message="assistant"] { ... }

/* Target clarifying questions */
[data-clarifying-questions] { ... }
[data-question-tab] { ... }
[data-question-tab][data-active="true"] { ... }
[data-question-tab][data-answered="true"] { ... }
[data-question-option] { ... }
[data-question-option][data-selected="true"] { ... }
```
