import type { ReactNode } from "react";

export interface ChatMessage {
  id: string;
  role: "agent" | "user";
  content: string | ReactNode;
  timestamp?: Date;
}

export interface TaskSummary {
  id: string;
  title: string;
  specSlug?: string;
  status: string;
  priority: string;
}

export interface AgentSummary {
  completedTasks: TaskSummary[];
  prioritizedTasks: TaskSummary[];
}

export interface ChatMessageProps {
  message: ChatMessage;
}

export interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface AgentChatProps {
  projectSlug: string;
  initialSummary?: AgentSummary;
  className?: string;
}
