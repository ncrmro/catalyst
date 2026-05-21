"use client";

import { useState } from "react";
import { EntityCard } from "@/components/ui/entity-card";
import type { EnvironmentConfig } from "@/types/environment-config";
import { ConfigSetupBanner } from "./config-setup-banner";
import { DetectionStatusCard } from "./detection-status-card";
import { DeploymentMethodForm } from "./deployment-method-form";
import { ManagedServicesForm } from "./managed-services-form";
import { ResourcesConfigForm } from "./resources-config-form";

interface EnvironmentConfigTabProps {
  environmentId: string;
  config: EnvironmentConfig | null;
  onConfigChange?: (updates: Partial<EnvironmentConfig>) => void;
}

export function EnvironmentConfigTab({
  environmentId,
  config,
  onConfigChange,
}: EnvironmentConfigTabProps) {
  const [methodExpanded, setMethodExpanded] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [resourcesExpanded, setResourcesExpanded] = useState(false);

  if (!config) {
    return (
      <ConfigSetupBanner
        environmentId={environmentId}
        onSetup={() => {
          // TODO: Implement setup flow - could open a modal or redirect
          console.log("Setup configuration for environment:", environmentId);
        }}
      />
    );
  }

  const handleOverride = () => {
    if (!onConfigChange) return;
    onConfigChange({
      ...config,
      autoDetect: false,
      overriddenAt: new Date().toISOString(),
    });
  };

  const handleReEnableAutoDetect = () => {
    if (!onConfigChange) return;
    onConfigChange({
      ...config,
      autoDetect: true,
      overriddenAt: undefined,
    });
  };

  // Get summary for managed services subtitle
  const enabledServices: string[] = [];
  if (config.managedServices?.postgres?.enabled)
    enabledServices.push("PostgreSQL");
  if (config.managedServices?.redis?.enabled) enabledServices.push("Redis");
  if (config.managedServices?.opensearch?.enabled)
    enabledServices.push("OpenSearch");
  const servicesSubtitle =
    enabledServices.length > 0
      ? enabledServices.join(", ") + " enabled"
      : "No services enabled";

  return (
    <div className="space-y-4">
      {/* Detection Status - always visible */}
      <DetectionStatusCard
        config={config}
        onOverride={onConfigChange ? handleOverride : undefined}
        onReEnableAutoDetect={
          onConfigChange ? handleReEnableAutoDetect : undefined
        }
      />

      {/* Deployment Method - collapsible */}
      <EntityCard
        title="Deployment Method"
        subtitle={`Using ${config.method}`}
        expandable
        expanded={methodExpanded}
        onToggle={() => setMethodExpanded(!methodExpanded)}
        expandedContent={
          <DeploymentMethodForm
            config={config}
            onChange={onConfigChange}
            readOnly={!onConfigChange}
          />
        }
      />

      {/* Managed Services - collapsible */}
      <EntityCard
        title="Managed Services"
        subtitle={servicesSubtitle}
        expandable
        expanded={servicesExpanded}
        onToggle={() => setServicesExpanded(!servicesExpanded)}
        expandedContent={
          config.managedServices ? (
            <ManagedServicesForm
              config={config.managedServices}
              onChange={(updates) => {
                if (!onConfigChange) return;
                onConfigChange({
                  ...config,
                  managedServices: {
                    ...config.managedServices,
                    ...updates,
                  },
                });
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              No managed services configured.
            </p>
          )
        }
      />

      {/* Resource Limits - collapsible */}
      <EntityCard
        title="Resource Limits"
        subtitle="CPU and memory allocation"
        expandable
        expanded={resourcesExpanded}
        onToggle={() => setResourcesExpanded(!resourcesExpanded)}
        expandedContent={
          <ResourcesConfigForm
            config={{
              requests: { cpu: "100m", memory: "128Mi" },
              limits: { cpu: "500m", memory: "512Mi" },
              replicas: 1,
            }}
            onChange={(updates) => {
              // TODO: Add resources to EnvironmentConfig type and persist
              console.log("Resource updates:", updates);
            }}
          />
        }
      />
    </div>
  );
}
