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
import { EnvironmentLogs } from "./EnvironmentLogs";
import { AgentChat } from "@/components/chat/AgentChat";
import type { EnvironmentData } from "@/models/preview-environments";

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

  // Poll Environment CR status directly from K8s (MVP - no DB)
  useEffect(() => {
    // Skip polling for terminal states only
    // For MVP, we always poll pending/deploying environments since the operator
    // starts immediately (no configuration required)
    if (
      environment.status === "running" ||
      environment.status === "failed" ||
      environment.status === "deleting"
    ) {
      return;
    }

    let isMounted = true;
    const pollInterval = 3000; // 3 seconds

    const pollStatus = async () => {
      if (!isMounted) return;

      try {
        const response = await fetch(
          `/api/environments/${environment.namespace}/status`,
        );

        if (!response.ok) {
          console.warn("Failed to fetch environment status:", response.status);
          return;
        }

        const data = await response.json();

        if (!isMounted) return;

        // Update status if changed
        if (data.status !== environment.status) {
          setEnvironment((prev) => ({
            ...prev,
            status: data.status,
            publicUrl: data.url || prev.publicUrl,
          }));
        }
      } catch (error) {
        console.error("Failed to poll environment status:", error);
      }
    };

    // Initial poll
    pollStatus();

    // Set up interval polling
    const intervalId = setInterval(pollStatus, pollInterval);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [environment.namespace, environment.status, needsConfiguration]);

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
        return (
          <AgentChat projectSlug={projectSlug} className="min-h-[300px]" />
        );
      case "logs":
        return <EnvironmentLogs namespace={environment.namespace} />;
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

  return (
    <GlassEntityCard
      title="Environment"
      metadata={
        <div className="flex items-center gap-3">
          <span className="text-on-surface-variant font-mono text-sm">
            {environment.namespace}
          </span>
          <EnvironmentStatusBadge
            status={environment.status as EnvironmentStatus}
            size="sm"
          />
        </div>
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
