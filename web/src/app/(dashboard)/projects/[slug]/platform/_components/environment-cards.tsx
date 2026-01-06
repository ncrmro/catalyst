"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import Link from "next/link";
import {
  TabbedEntityCard,
  type EntityCardTab,
} from "@/components/ui/entity-card";
import type { EnvironmentCR } from "@/types/crd";

const ENVIRONMENT_TABS: EntityCardTab[] = [
  { value: "status", label: "Status" },
  { value: "config", label: "Config" },
  { value: "new", label: "New" },
];

interface EnvironmentRowProps {
  environment: EnvironmentCR;
  projectSlug: string;
}

function EnvironmentRowItem({ environment, projectSlug }: EnvironmentRowProps) {
  const { metadata, spec, status } = environment;

  return (
    <Link
      href={`/projects/${projectSlug}/env/${metadata.name}`}
      className="block px-4 py-3 hover:bg-surface/50 transition-colors rounded-lg"
    >
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-on-surface">{metadata.name}</h3>
          <div className="text-sm text-on-surface-variant flex gap-2">
            <span className="capitalize">{spec.type}</span>
            {status?.url && (
              <span className="text-primary truncate max-w-[200px]">
                {status.url}
              </span>
            )}
          </div>
        </div>
        <span
          className={`px-2 py-0.5 text-xs rounded-full shrink-0 ${
            status?.phase === "Ready"
              ? "bg-success-container text-on-success-container"
              : "bg-surface-variant text-on-surface-variant"
          }`}
        >
          {status?.phase || "Pending"}
        </span>
        <svg
          className="w-4 h-4 text-on-surface-variant flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </Link>
  );
}

export interface DeploymentEnvironmentsCardProps {
  environments: EnvironmentCR[];
  projectSlug: string;
  /** Config tab content - passed from server component with Suspense boundary */
  configContent: ReactNode;
}

export function DeploymentEnvironmentsCard({
  environments,
  projectSlug,
  configContent,
}: DeploymentEnvironmentsCardProps) {
  const [activeTab, setActiveTab] = useState("status");
  const [isExpanded, setIsExpanded] = useState(true);

  const tabContent = {
    status: (
      <div className="space-y-2">
        {environments.length > 0 ? (
          environments.map((env) => (
            <EnvironmentRowItem
              key={env.metadata.name}
              environment={env}
              projectSlug={projectSlug}
            />
          ))
        ) : (
          <div className="py-8 text-center">
            <svg
              className="w-12 h-12 mx-auto text-on-surface-variant/50 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
              />
            </svg>
            <p className="text-on-surface-variant">
              No deployment environments configured
            </p>
            <p className="text-sm text-on-surface-variant/70 mt-1">
              Set up staging and production environments to deploy your
              application
            </p>
          </div>
        )}
      </div>
    ),
    config: configContent,
    new: (
      <div className="space-y-4">
        <p className="text-sm text-on-surface-variant">
          Create a new deployment environment (staging, production, etc.)
        </p>
        <Link
          href={`/environments/${projectSlug}`}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-md hover:opacity-90 transition-opacity"
        >
          New Environment
        </Link>
      </div>
    ),
  };

  return (
    <TabbedEntityCard
      title="Deployment Environments"
      subtitle="Production and staging deployments"
      tabs={ENVIRONMENT_TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabContent={tabContent}
      expandable
      expanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
    />
  );
}

export interface DevelopmentEnvironmentsCardProps {
  environments: EnvironmentCR[];
  projectSlug: string;
  /** Config tab content - passed from server component with Suspense boundary */
  configContent: ReactNode;
}

export function DevelopmentEnvironmentsCard({
  environments,
  projectSlug,
  configContent,
}: DevelopmentEnvironmentsCardProps) {
  const [activeTab, setActiveTab] = useState("status");
  const [isExpanded, setIsExpanded] = useState(true);

  const tabContent = {
    status: (
      <div className="space-y-2">
        {environments.length > 0 ? (
          environments.map((env) => (
            <EnvironmentRowItem
              key={env.metadata.name}
              environment={env}
              projectSlug={projectSlug}
            />
          ))
        ) : (
          <div className="py-8 text-center">
            <svg
              className="w-12 h-12 mx-auto text-on-surface-variant/50 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-on-surface-variant">
              No development environments active
            </p>
            <p className="text-sm text-on-surface-variant/70 mt-1">
              Development environments are created automatically from pull
              requests
            </p>
          </div>
        )}
      </div>
    ),
    config: configContent,
    new: (
      <div className="space-y-4">
        <p className="text-sm text-on-surface-variant">
          Development environments are created automatically from pull requests.
        </p>
        <Link
          href={`/projects/${projectSlug}/configure`}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-md hover:opacity-90 transition-opacity"
        >
          Configure Development Settings
        </Link>
      </div>
    ),
  };

  return (
    <TabbedEntityCard
      title="Development Environments"
      subtitle="PR preview and development workspaces"
      tabs={ENVIRONMENT_TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      tabContent={tabContent}
      expandable
      expanded={isExpanded}
      onToggle={() => setIsExpanded(!isExpanded)}
    />
  );
}