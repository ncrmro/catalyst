"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  GlassEntityCard,
  EntityCardTabSelector,
  GlassButton,
} from "@tetrastack/react-glass-components";
import {
  EnvironmentStatusBadge,
  type EnvironmentStatus,
} from "./EnvironmentStatusBadge";
import { EnvironmentPodsList } from "./EnvironmentPodsList";
import { AgentChat } from "@/components/chat/AgentChat";
import type { EnvironmentData } from "@/actions/preview-environments";
import { DEFAULT_DEV_IMAGE } from "@/schemas/project-config";

type TabValue = "pods" | "chat" | "logs" | "metrics";

interface EnvironmentCardClientProps {
  environment: EnvironmentData;
  projectSlug: string;
  prNumber: number;
  isNew?: boolean;
  defaultExpanded?: boolean;
}

const TABS = [
  { value: "pods", label: "Pods" },
  { value: "chat", label: "Agent" },
  { value: "logs", label: "Logs" },
  { value: "metrics", label: "Metrics" },
] as const;

/**
 * Client component for the expandable environment card.
 *
 * Features:
 * - SSE connection for real-time status updates during deployment
 * - Expandable content with tabs (Agent Chat, Logs, Metrics, Tags)
 * - Status badge with visual feedback
 */
export function EnvironmentCardClient({
  environment: initialEnvironment,
  projectSlug,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Reserved for future agent chat context
  prNumber,
  isNew = false,
  defaultExpanded = false,
}: EnvironmentCardClientProps) {
  const [environment, setEnvironment] =
    useState<EnvironmentData>(initialEnvironment);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState<TabValue>("pods");

  // Check if this is a pending environment that needs configuration
  const needsConfiguration = isNew && environment.status === "pending";

  // SSE connection for real-time status updates
  useEffect(() => {
    // Skip SSE for new pending environments (no actual deployment yet)
    // and for terminal states
    if (
      needsConfiguration ||
      environment.status === "running" ||
      environment.status === "failed" ||
      environment.status === "deleting"
    ) {
      return;
    }

    const eventSource = new EventSource(
      `/api/preview-environments/${environment.id}/stream`,
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "status") {
          setEnvironment((prev) => ({
            ...prev,
            status: data.data.status,
          }));
        } else if (data.type === "ready") {
          setEnvironment((prev) => ({
            ...prev,
            status: "running",
            publicUrl: data.data.publicUrl,
          }));
          eventSource.close();
        } else if (data.type === "error") {
          setEnvironment((prev) => ({
            ...prev,
            status: "failed",
            errorMessage: data.data.message,
          }));
          eventSource.close();
        }
      } catch (error) {
        console.error("Failed to parse SSE event:", error);
      }
    };

    eventSource.onerror = () => {
      // Reconnection is handled automatically by EventSource
      console.warn("SSE connection error, will retry...");
    };

    return () => {
      eventSource.close();
    };
  }, [environment.id, environment.status]);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value as TabValue);
  }, []);

  const renderExpandedContent = () => {
    switch (activeTab) {
      case "pods":
        return <EnvironmentPodsList namespace={environment.namespace} />;
      case "chat":
        return <AgentChat projectSlug={projectSlug} className="min-h-[300px]" />;
      case "logs":
        return <ComingSoonPlaceholder feature="Logs" />;
      case "metrics":
        return <ComingSoonPlaceholder feature="Metrics" />;
      default:
        return null;
    }
  };

  const renderControls = () => {
    // Show configure button for new pending environments
    if (needsConfiguration) {
      return (
        <Link
          href={`/projects/${projectSlug}/configure`}
          onClick={(e) => e.stopPropagation()}
        >
          <GlassButton size="small" variant="primary">
            Configure
          </GlassButton>
        </Link>
      );
    }

    if (environment.status === "running" && environment.publicUrl) {
      return (
        <a
          href={environment.publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          <GlassButton size="small" variant="primary">
            Preview
          </GlassButton>
        </a>
      );
    }

    if (
      environment.status === "pending" ||
      environment.status === "deploying"
    ) {
      return (
        <GlassButton size="small" disabled>
          <span className="flex items-center gap-2">
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {environment.status === "pending" ? "Pending" : "Deploying"}
          </span>
        </GlassButton>
      );
    }

    if (environment.status === "failed") {
      return (
        <GlassButton
          size="small"
          variant="error"
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Implement retry
          }}
        >
          Retry
        </GlassButton>
      );
    }

    return null;
  };

  // Subtitle shows configuration guidance when needed
  const subtitle = needsConfiguration
    ? `No configuration found. Will use ${DEFAULT_DEV_IMAGE} as default image.`
    : environment.namespace;

  return (
    <GlassEntityCard
      title="Environment"
      subtitle={subtitle}
      metadata={
        <EnvironmentStatusBadge
          status={environment.status as EnvironmentStatus}
          size="sm"
        />
      }
      expandable
      expanded={expanded}
      onToggle={handleToggle}
      trailingContent={
        expanded ? (
          <EntityCardTabSelector
            tabs={TABS.map((t) => ({ value: t.value, label: t.label }))}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        ) : null
      }
      controls={renderControls()}
      expandedContent={renderExpandedContent()}
    />
  );
}

/**
 * Placeholder for coming soon features
 */
function ComingSoonPlaceholder({ feature }: { feature: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-on-surface-variant"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      </div>
      <h4 className="text-lg font-medium text-on-surface mb-2">{feature}</h4>
      <p className="text-sm text-on-surface-variant">Coming soon</p>
    </div>
  );
}
