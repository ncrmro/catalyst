"use client";

import { useState, useCallback } from "react";
import { GlassCard } from "@tetrastack/react-glass-components";
import {
  MessageList,
  MessageBubble,
  ChatInput,
  type AgentMessage,
  getMessageText,
} from "@tetrastack/react-agent-chat";
import type { Task } from "@/components/tasks/types";

// Priority order for sorting tasks
const priorityOrder: Record<string, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

// Extended message type to include timestamp
type ExtendedAgentMessage = AgentMessage & {
  createdAt: Date;
};

function generateInitialSummary(
  projectSlug: string,
  tasks: Task[],
): ExtendedAgentMessage {
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
    role: "assistant",
    parts: [
      {
        type: "text",
        text: `Here's a summary of the ${projectSlug} project status:`,
      },
      {
        type: "text",
        text: "\n**Recently Completed:**\n"
      },
      {
        type: "text",
        text: completedList
      },
      {
        type: "text",
        text: "\n**Next Priority Tasks:**\n"
      },
      {
        type: "text",
        text: pendingList
      }
    ],
    createdAt: new Date(),
  };
}

export interface AgentChatProps {
  projectSlug: string;
  tasks: Task[];
  className?: string;
}

export function AgentChat({
  projectSlug,
  tasks,
  className = "",
}: AgentChatProps) {
  const [messages, setMessages] = useState<ExtendedAgentMessage[]>(() => [
    generateInitialSummary(projectSlug, tasks),
  ]);

  const handleSend = useCallback((content: string) => {
    const userMessage: ExtendedAgentMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      parts: [{ type: "text", text: content }],
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // TODO: Integrate with actual agent backend
    // For now, simulate a response
    setTimeout(() => {
      const agentResponse: ExtendedAgentMessage = {
        id: `agent-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: "I understand you're asking about the project. In a future update, I'll be able to help with task management, provide status updates, and suggest next steps.",
          },
        ],
        createdAt: new Date(),
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
      <MessageList className="h-64 overflow-y-auto mb-4 space-y-4 pr-2">
        {messages.map((message) => {
          const isAssistant = message.role === "assistant";
          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}
            >
              {isAssistant && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
                    />
                  </svg>
                </div>
              )}

              <MessageBubble
                role={message.role === "system" ? "assistant" : message.role}
                className={`max-w-[80%] rounded-lg px-4 py-3 ${isAssistant ? "bg-surface-variant text-on-surface" : "bg-primary text-on-primary"}`}
                timestamp={message.createdAt}
                timestampClassName={`text-xs mt-2 block ${isAssistant ? "text-on-surface-variant" : "text-on-primary/70"}`}
              >
                <div className="whitespace-pre-wrap text-sm">
                  {getMessageText(message)}
                </div>
              </MessageBubble>

              {!isAssistant && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-secondary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </MessageList>

      {/* Input Area */}
      <ChatInput
        onSubmit={handleSend}
        placeholder="Ask about tasks, status, or next steps..."
        className="flex gap-2"
        inputClassName="flex-1 px-4 py-2 rounded-lg bg-surface-variant/50 border border-outline/30 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
        buttonClassName="px-4 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      />
    </GlassCard>
  );
}
