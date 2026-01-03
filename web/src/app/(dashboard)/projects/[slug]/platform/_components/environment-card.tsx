"use client";

import { useState } from "react";
import { EntityCard } from "@/components/ui/entity-card";
import { EntityCardTabSelector } from "@tetrastack/react-glass-components";
import type { EnvironmentCR } from "@/types/crd";
import type { EnvironmentConfig } from "@/types/environment-config";
import { EnvironmentConfigTab } from "../../env/[envSlug]/_components";
import { StatusTabContent } from "./status-tab-content";
import { CreateTabPlaceholder } from "./create-tab-placeholder";

type TabValue = "status" | "config" | "create";

const TABS = [
  { value: "status", label: "Status" },
  { value: "config", label: "Config" },
  { value: "create", label: "Create" },
];

interface EnvironmentCardProps {
  environment: EnvironmentCR;
  environmentId?: string;
  environmentConfig: EnvironmentConfig | null;
  projectSlug: string;
}

export function EnvironmentCard({
  environment,
  environmentId,
  environmentConfig,
  projectSlug,
}: EnvironmentCardProps) {
  const [activeTab, setActiveTab] = useState<TabValue>("status");

  const { metadata, spec, status } = environment;
  const envName = metadata.name;
  const envType = spec.type;
  const phase = status?.phase || "Pending";

  // Status badge styling
  const getStatusBadge = (phase: string) => {
    switch (phase?.toLowerCase()) {
      case "ready":
      case "running":
        return "bg-success-container text-on-success-container";
      case "deploying":
      case "provisioning":
        return "bg-secondary-container text-on-secondary-container";
      case "failed":
        return "bg-error-container text-on-error-container";
      default:
        return "bg-surface-variant text-on-surface-variant";
    }
  };

  return (
    <EntityCard
      title={envName}
      subtitle={
        <span className="capitalize text-on-surface-variant">{envType}</span>
      }
      metadata={
        <span
          className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(phase)}`}
        >
          {phase}
        </span>
      }
      trailingContent={
        <EntityCardTabSelector
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={(value) => setActiveTab(value as TabValue)}
        />
      }
      expandable
      expanded={true}
      expandedContent={
        <div className="pt-2">
          {activeTab === "status" && (
            <StatusTabContent
              environment={environment}
              projectSlug={projectSlug}
            />
          )}
          {activeTab === "config" && environmentId && (
            <EnvironmentConfigTab
              environmentId={environmentId}
              config={environmentConfig}
            />
          )}
          {activeTab === "config" && !environmentId && (
            <div className="text-sm text-on-surface-variant text-center py-4">
              No configuration found for this environment.
            </div>
          )}
          {activeTab === "create" && <CreateTabPlaceholder />}
        </div>
      }
    />
  );
}
