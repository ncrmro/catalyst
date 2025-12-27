# @tetrastack/react-agent-chat - Implementation Tasks

## Status Legend
- [ ] Not started
- [x] Completed
- [~] In progress

---

## Phase 1: Package Foundation

### 1.1 Package Setup
- [x] Create package directory structure
- [x] Create package.json with ESM config and peer dependencies
- [x] Create tsconfig.json extending base config
- [x] Configure exports map for subpath imports

### 1.2 Type Definitions
- [x] Create `src/types/clarifying-questions.ts` with Zod schemas
- [x] Create `src/types/messages.ts` for AgentMessage type
- [x] Create `src/types/tools.ts` for tool part types
- [x] Create barrel export `src/types/index.ts`

### 1.3 Utility Functions
- [x] Create `src/utils/part-guards.ts` for type guards
- [x] Create `src/utils/message-helpers.ts` for message utilities
- [x] Create barrel export `src/utils/index.ts`

---

## Phase 2: Hooks

### 2.1 Core Hooks
- [x] Create `useAgentChat` - wrapper around AI SDK useChat
- [x] Create `useMessageParts` - extract and categorize message parts
- [x] Create `useToolResponse` - manage tool response state

### 2.2 Clarifying Questions Hook
- [x] Create `useClarifyingQuestions` with:
  - [x] Tab state management
  - [x] Answer tracking (single/multi-select)
  - [x] localStorage persistence
  - [x] Keyboard navigation (Tab, Space, Enter)
  - [x] "Other" custom answer support
  - [x] Submit handling

---

## Phase 3: Components

### 3.1 Clarifying Questions Components
- [x] Create `QuestionOption` - single option button
- [x] Create `QuestionTab` - tab header with checkmark
- [x] Create `QuestionPanel` - question display with options
- [x] Create `AnsweredQuestions` - read-only answered view
- [x] Create `ClarifyingQuestionsSkeleton` - loading state
- [x] Create `ClarifyingQuestionsCard` - main container

### 3.2 Chat Components
- [x] Create `MessageBubble` - single message display
- [x] Create `MessageList` - scrollable message container
- [x] Create `ChatInput` - text input with submit
- [x] Create `ChatContainer` - layout wrapper

### 3.3 Barrel Exports
- [x] Create `src/components/ClarifyingQuestions/index.ts`
- [x] Create `src/components/index.ts`
- [x] Create `src/index.ts` (main entry)

---

## Phase 4: Documentation

### 4.1 Package Documentation
- [x] Create `spec.md` with functional requirements
- [x] Create `plan.md` with architecture and examples
- [x] Create `tasks.md` (this file)

### 4.2 Integration Documentation
- [ ] Update `specs/003-agent-chat-interfaces/spec.md` to reference package
- [ ] Update `specs/003-agent-chat-interfaces/plan.md` to reference package
- [ ] Update `specs/003-agent-chat-interfaces/tasks.md` to reference package

---

## Phase 5: Testing (Future)

### 5.1 Unit Tests
- [ ] Test type guards (isTextPart, isToolPart, etc.)
- [ ] Test message helpers
- [ ] Test Zod schema validation

### 5.2 Hook Tests
- [ ] Test useClarifyingQuestions state management
- [ ] Test useMessageParts categorization
- [ ] Test useToolResponse flow

### 5.3 Component Tests
- [ ] Test ClarifyingQuestionsCard state transitions
- [ ] Test keyboard navigation
- [ ] Test multi-select behavior
- [ ] Test localStorage persistence

---

## Phase 6: Integration (Future)

### 6.1 Storybook Stories
- [ ] Create stories for ClarifyingQuestionsCard states
- [ ] Create stories for chat components
- [ ] Create combined demo story

### 6.2 Example Application
- [ ] Create example chat implementation in Latinum Space
- [ ] Integrate with existing agent system
- [ ] Add CSS styling following theme system

---

## Component Data Attributes Reference

All components use data-* attributes for styling (no built-in CSS):

### ClarifyingQuestions
```
[data-clarifying-questions]       - Main container
[data-question-tabs]              - Tab list container
[data-question-tab]               - Individual tab
  [data-active="true|false"]
  [data-answered="true|false"]
[data-question-panel]             - Question content panel
[data-question-text]              - Question text
[data-options-group]              - Options container
[data-question-option]            - Option button
  [data-selected="true|false"]
  [data-option-other]             - "Other" option marker
[data-other-input-container]      - Custom input wrapper
[data-other-input]                - Text input
[data-other-confirm]              - OK button
[data-answered-questions]         - Answered view container
[data-answered-item]              - Single answered question
```

### Chat Components
```
[data-chat-container]             - Main chat wrapper
[data-chat-header]                - Header area
[data-chat-body]                  - Body area
[data-message-list]               - Scrollable message area
[data-message-bubble]             - Single message
  [data-role="user|assistant"]
  [data-streaming="true|false"]
[data-chat-input]                 - Input container
[data-input-field]                - Input/textarea
[data-submit-button]              - Send button
```

---

## Notes

- All components are unstyled by design - consumers provide CSS
- AI SDK v6 beta types used throughout
- React 19+ required for peer dependency
- localStorage persistence is optional (via persistKey prop)
- ARIA attributes included for accessibility
