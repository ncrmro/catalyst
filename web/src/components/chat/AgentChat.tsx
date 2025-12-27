"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { GlassCard } from "@tetrastack/react-glass-components";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import type { AgentChatProps, ChatMessage as ChatMessageType } from "./types";
import type { Task } from "@/components/tasks/types";

// Priority order for sorting tasks
const priorityOrder: Record<string, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

function generateInitialSummary(
  projectSlug: string,
  tasks: Task[],
): ChatMessageType {
  const projectTasks = tasks.filter((t) => t.projectSlug === projectSlug);
  const completed = projectTasks.filter((t) => t.status === "completed");
  const pending = projectTasks
    .filter((t) => t.status !== "completed")
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const completedList =
    completed.length > 0
      ? completed
          .map(
            (t) => `- ${t.spec?.href.split("/").pop() || "task"}: ${t.title}`,
          )
          .join("\n")
      : "- No recently completed tasks";

  const pendingList =
    pending.length > 0
      ? pending
          .slice(0, 3)
          .map(
            (t) => `- ${t.spec?.href.split("/").pop() || "task"}: ${t.title}`,
          )
          .join("\n")
      : "- No pending tasks";

  return {
    id: "initial-summary",
    role: "agent",
    content: `Here's a summary of the ${projectSlug} project status:

**Recently Completed:**
${completedList}

**Next Priority Tasks:**
${pendingList}`,
    timestamp: new Date(),
  };
}

interface AgentChatWithTasksProps extends AgentChatProps {
  tasks: Task[];
}

export function AgentChat({
  projectSlug,
  tasks,
  className = "",
}: AgentChatWithTasksProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>(() => [
    generateInitialSummary(projectSlug, tasks),
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback((content: string) => {
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // TODO: Integrate with actual agent backend
    // For now, simulate a response
    setTimeout(() => {
      const agentResponse: ChatMessageType = {
        id: `agent-${Date.now()}`,
        role: "agent",
        content:
          "I understand you're asking about the project. In a future update, I'll be able to help with task management, provide status updates, and suggest next steps.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentResponse]);
    }, 1000);
  }, []);

  return (
    <GlassCard className={className}>
      <div className="flex items-center gap-2 mb-4">
        <svg
          className="w-5 h-5 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <h2 className="text-lg font-semibold text-on-surface">Agent Chat</h2>
      </div>

      {/* Messages Area */}
      <div className="h-64 overflow-y-auto mb-4 space-y-4 pr-2">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput
        onSend={handleSend}
        placeholder="Ask about tasks, status, or next steps..."
      />
    </GlassCard>
  );
}
