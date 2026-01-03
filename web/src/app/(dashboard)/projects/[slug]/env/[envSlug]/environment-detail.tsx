"use client";

import { useState, useCallback } from "react";
import {
  GlassCard,
  GlassEntityCard,
  EntityCardTabSelector,
} from "@tetrastack/react-glass-components";
import { TerminalModal } from "@/components/terminal";
import { execCommand } from "@/actions/pod-exec";
import { EnvironmentCR } from "@/types/crd";
import type { EnvironmentConfig } from "@/types/environment-config";
import { EnvironmentConfigTab } from "./_components";

interface EnvironmentDetailProps {
  environment: EnvironmentCR;
  targetNamespace: string;
  podName: string;
}

// Mock data for agents and logs as they are not yet in the CR
// TODO: Fetch real agent runs and logs
const mockAgentRuns = [
  {
    id: "1",
    agent: "implementation-agent",
    goal: "Implement feature changes based on PR requirements",
    status: "completed" as const,
    startTime: "2024-12-18 10:15:00",
    duration: "8m 20s",
    logs: `[10:15:00] Implementation agent initialized
[10:15:02] Fetched PR #42: "feat: add preview environments"
[10:15:05] Analyzing requirements from PR description...
[10:15:10] Identified 3 implementation tasks:
  - Add EnvironmentsSection component
  - Create environment detail page
  - Add mock data for preview environments
[10:15:30] Starting task 1: EnvironmentsSection component
[10:17:00] ✓ Created environments-section.tsx
[10:17:05] Starting task 2: Environment detail page
[10:19:30] ✓ Created env/[envSlug]/page.tsx
[10:19:35] Starting task 3: Mock data
[10:21:00] ✓ Added mock preview environments
[10:21:15] Running type check...
[10:22:00] ✓ No type errors
[10:22:30] Running lint...
[10:23:00] ✓ No lint errors
[10:23:20] Implementation complete`,
  },
];

const mockContainers = [
  { name: "workspace", status: "running" as const, restarts: 0 },
];

function getStatusColor(
  status: "running" | "pending" | "failed" | "completed",
) {
  switch (status) {
    case "running":
      return "bg-yellow-500";
    case "completed":
      return "bg-green-500";
    case "pending":
      return "bg-gray-500";
    case "failed":
      return "bg-red-500";
  }
}

function getStatusBadge(status: string) {
  switch (status?.toLowerCase()) {
    case "ready":
    case "running":
      return "bg-success-container text-on-success-container";
    case "completed":
      return "bg-primary-container text-on-primary-container";
    case "deploying":
    case "provisioning":
      return "bg-secondary-container text-on-secondary-container";
    case "pending":
      return "bg-surface-variant text-on-surface-variant";
    case "failed":
      return "bg-error-container text-on-error-container";
    default:
      return "bg-surface-variant text-on-surface-variant";
  }
}

export default function EnvironmentDetailView({
  environment,
  targetNamespace,
  podName,
}: EnvironmentDetailProps) {
  const [selectedContainer, setSelectedContainer] = useState<string | null>(
    "workspace",
  );
  const [expandedAgent, setExpandedAgent] = useState<string | null>(
    mockAgentRuns[0]?.id || null,
  );
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalContainer, setTerminalContainer] = useState<
    string | undefined
  >(undefined);

  // Handler for executing commands in the terminal
  const handleExec = useCallback(
    async (command: string): Promise<{ stdout: string; stderr: string }> => {
      return execCommand(targetNamespace, podName, command, terminalContainer);
    },
    [targetNamespace, podName, terminalContainer],
  );

  // Open terminal for a specific container
  const openTerminal = (containerName: string) => {
    setTerminalContainer(containerName);
    setTerminalOpen(true);
  };

  const branchName = environment.spec.source.branch;
  const status = environment.status?.phase || "Pending";
  const previewUrl = environment.status?.url;

  return (
    <>
      {/* Header */}
      <GlassCard>
        howdy partner!
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-on-surface">
              Preview Environment
            </h2>
            <h1 className="text-xl font-bold text-on-surface mt-1">
              {branchName}
            </h1>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-on-surface-variant hover:text-primary mt-1 block"
              >
                {previewUrl}
              </a>
            )}
            <div className="text-xs text-on-surface-variant mt-2 font-mono">
              Namespace: {targetNamespace} <br />
              Pod: {podName}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(status)}`}
            >
              {status}
            </span>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-lg hover:opacity-90 transition-opacity"
              >
                Open Preview
              </a>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Agents */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-on-surface mb-4">Agents</h2>
        <div className="space-y-3">
          {mockAgentRuns.map((run) => (
            <div
              key={run.id}
              className="border border-outline/50 rounded-lg overflow-hidden"
            >
              {/* Agent Run Header */}
              <div
                className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${
                  expandedAgent === run.id
                    ? "bg-primary/5"
                    : "hover:bg-surface/50"
                }`}
                onClick={() =>
                  setExpandedAgent(expandedAgent === run.id ? null : run.id)
                }
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(run.status)}`}
                ></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-on-surface">
                      {run.agent}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(run.status)}`}
                    >
                      {run.status}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant truncate">
                    {run.goal}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-on-surface-variant">
                    {run.startTime}
                  </div>
                  <div className="text-xs text-on-surface-variant">
                    {run.duration}
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 text-on-surface-variant transition-transform ${
                    expandedAgent === run.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>

              {/* Agent Logs (Expandable) */}
              {expandedAgent === run.id && (
                <div className="border-t border-outline/50">
                  <div className="bg-gray-900 p-4 max-h-64 overflow-y-auto">
                    <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap">
                      {run.logs}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Containers */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-on-surface mb-4">
          Containers
        </h2>
        <div className="divide-y divide-outline/50 -mx-6">
          {mockContainers.map((container) => (
            <div
              key={container.name}
              className={`flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors ${
                selectedContainer === container.name
                  ? "bg-primary/10"
                  : "hover:bg-surface/50"
              }`}
              onClick={() => setSelectedContainer(container.name)}
            >
              <span
                className={`w-2 h-2 rounded-full ${getStatusColor(container.status)}`}
              ></span>
              <span className="font-medium text-on-surface flex-1">
                {container.name}
              </span>
              <span className="text-sm text-on-surface-variant">
                {container.status}
              </span>
              <span className="text-sm text-on-surface-variant">
                {container.restarts}{" "}
                {container.restarts === 1 ? "restart" : "restarts"}
              </span>
              <button
                className="px-3 py-1 text-xs font-medium text-on-primary bg-primary hover:opacity-90 rounded-lg transition-opacity flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  openTerminal(container.name);
                }}
                disabled={container.status !== "running"}
                title={
                  container.status !== "running"
                    ? "Container must be running to open shell"
                    : "Open shell"
                }
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Shell
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Terminal Modal */}
      <TerminalModal
        isOpen={terminalOpen}
        onClose={() => setTerminalOpen(false)}
        namespace={targetNamespace}
        podName={podName}
        containerName={terminalContainer}
        onExec={handleExec}
      />
    </>
  );
}
