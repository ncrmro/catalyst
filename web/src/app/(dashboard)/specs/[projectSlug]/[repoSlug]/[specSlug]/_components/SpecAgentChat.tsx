"use client";

import { useSearchParams } from "next/navigation";
import { ExpandableAgentChat } from "@tetrastack/react-agent-chat";

interface SpecAgentChatProps {
  projectSlug: string;
  repoSlug: string;
  specSlug: string;
}

export function SpecAgentChat({
  projectSlug,
  repoSlug,
  specSlug,
}: SpecAgentChatProps) {
  const searchParams = useSearchParams();
  const shouldAutoFocus = searchParams.get("chat") === "1";

  return (
    <div className="border-b border-outline/30">
      <ExpandableAgentChat
        context={{
          specSlug,
          projectSlug,
          repoSlug,
        }}
        placeholder={`Ask about ${specSlug}...`}
        defaultExpanded={shouldAutoFocus}
        className="p-4"
        inputContainerClassName="mt-3"
        messagesClassName="max-h-64 overflow-y-auto space-y-3 mt-3"
      />
    </div>
  );
}
