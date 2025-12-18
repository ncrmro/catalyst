'use client';

import { useState } from 'react';
import { GlassCard } from '@tetrastack/react-glass-components';
import { useParams } from 'next/navigation';

// Mock data - maps slug to environment info
const mockEnvironments: Record<string, { branch: string; previewUrl: string; status: string }> = {
  '001-environments--pull-request-environment': {
    branch: '001-environments/pull-request-environment',
    previewUrl: 'https://001-environments--pull-request-environment.catalyst.example.com',
    status: 'running',
  },
  '001-environments--web-shell': {
    branch: '001-environments/web-shell',
    previewUrl: 'https://001-environments--web-shell.catalyst.example.com',
    status: 'running',
  },
  '003-vsc-providers--dev-environment-pr-comment': {
    branch: '003-vsc-providers/dev-environment-pr-comment',
    previewUrl: 'https://003-vsc-providers--dev-environment-pr-comment.catalyst.example.com',
    status: 'running',
  },
  'copilot--fix-ci': {
    branch: 'copilot/fix-ci',
    previewUrl: 'https://copilot--fix-ci.catalyst.example.com',
    status: 'deploying',
  },
};

// Mock agent runs with task info
const mockAgentRuns = [
  {
    id: '1',
    agent: 'implementation-agent',
    goal: 'Implement feature changes based on PR requirements',
    status: 'completed' as const,
    startTime: '2024-12-18 10:15:00',
    duration: '8m 20s',
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
  {
    id: '2',
    agent: 'review-agent',
    goal: 'Review code changes and provide feedback',
    status: 'running' as const,
    startTime: '2024-12-18 10:23:40',
    duration: '3m 25s',
    logs: `[10:23:40] Review agent initialized
[10:23:42] Fetching diff for PR #42...
[10:23:45] Found 12 modified files
[10:23:50] Analyzing code quality...
[10:24:00] Checking for security issues...
[10:24:15] ✓ No security vulnerabilities found
[10:24:30] Checking for best practices...
[10:25:00] ✓ Code follows project conventions
[10:25:30] Checking test coverage...
[10:26:00] ⚠ Missing tests for EnvironmentsSection
[10:26:30] Generating review comments...
[10:27:00] ● Posting review to PR...`,
  },
];

const mockContainers = [
  { name: 'agent', status: 'running' as const, restarts: 0 },
  { name: 'web', status: 'running' as const, restarts: 0 },
  { name: 'db', status: 'running' as const, restarts: 0 },
  { name: 'worker', status: 'running' as const, restarts: 1 },
];

const mockContainerLogs: Record<string, string> = {
  agent: `[2024-12-18 10:23:40] Agent container started
[2024-12-18 10:23:41] Loading agent configuration...
[2024-12-18 10:23:42] Connected to task queue
[2024-12-18 10:23:43] Waiting for tasks...
[2024-12-18 10:23:45] Received task: pr-review
[2024-12-18 10:30:35] Task completed
[2024-12-18 10:31:00] Received task: e2e-tests
[2024-12-18 10:33:15] Task in progress...`,
  web: `[2024-12-18 10:23:45] Starting application...
[2024-12-18 10:23:46] Loading configuration from environment
[2024-12-18 10:23:46] Connected to database at db:5432
[2024-12-18 10:23:47] Server listening on port 3000
[2024-12-18 10:24:00] Request: GET /api/health
[2024-12-18 10:24:00] Response: 200 OK (12ms)
[2024-12-18 10:24:15] Request: GET /api/projects
[2024-12-18 10:24:15] Response: 200 OK (45ms)
[2024-12-18 10:25:00] Request: POST /api/deployments
[2024-12-18 10:25:01] Response: 201 Created (892ms)`,
  db: `[2024-12-18 10:23:40] PostgreSQL 15.4 starting up
[2024-12-18 10:23:41] Listening on port 5432
[2024-12-18 10:23:41] Database system is ready to accept connections
[2024-12-18 10:23:46] Connection received from web:45678
[2024-12-18 10:24:15] Query: SELECT * FROM projects WHERE...
[2024-12-18 10:25:00] Query: INSERT INTO deployments...`,
  worker: `[2024-12-18 10:23:50] Worker process starting...
[2024-12-18 10:23:51] Connected to Redis queue
[2024-12-18 10:23:51] Waiting for jobs...
[2024-12-18 10:25:02] Processing job: deploy-preview-123
[2024-12-18 10:25:05] Job completed successfully
[2024-12-18 10:25:05] Waiting for jobs...`,
};

function getStatusColor(status: 'running' | 'pending' | 'failed' | 'completed') {
  switch (status) {
    case 'running':
      return 'bg-yellow-500';
    case 'completed':
      return 'bg-green-500';
    case 'pending':
      return 'bg-gray-500';
    case 'failed':
      return 'bg-red-500';
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'running':
      return 'bg-success-container text-on-success-container';
    case 'completed':
      return 'bg-primary-container text-on-primary-container';
    case 'deploying':
      return 'bg-secondary-container text-on-secondary-container';
    case 'pending':
      return 'bg-surface-variant text-on-surface-variant';
    case 'failed':
      return 'bg-error-container text-on-error-container';
    default:
      return 'bg-surface-variant text-on-surface-variant';
  }
}

export default function EnvironmentDetailPage() {
  const params = useParams();
  const envSlug = params.envSlug as string;
  const [selectedContainer, setSelectedContainer] = useState<string | null>('web');
  const [expandedAgent, setExpandedAgent] = useState<string | null>(mockAgentRuns[0]?.id || null);

  const environment = mockEnvironments[envSlug];

  if (!environment) {
    return (
      <GlassCard>
        <div className="text-center py-8">
          <h2 className="text-lg font-medium text-on-surface mb-2">Environment not found</h2>
          <p className="text-on-surface-variant">The requested environment does not exist.</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <>
      {/* Header */}
      <GlassCard>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-on-surface">Preview Environment</h2>
            <h1 className="text-xl font-bold text-on-surface mt-1">{environment.branch}</h1>
            <a
              href={environment.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-on-surface-variant hover:text-primary mt-1 block"
            >
              {environment.previewUrl}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(environment.status)}`}>
              {environment.status}
            </span>
            <a
              href={environment.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm font-medium text-on-primary bg-primary rounded-lg hover:opacity-90 transition-opacity"
            >
              Open Preview
            </a>
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
                  expandedAgent === run.id ? 'bg-primary/5' : 'hover:bg-surface/50'
                }`}
                onClick={() => setExpandedAgent(expandedAgent === run.id ? null : run.id)}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(run.status)}`}></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-on-surface">{run.agent}</span>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusBadge(run.status)}`}>
                      {run.status}
                    </span>
                  </div>
                  <p className="text-sm text-on-surface-variant truncate">{run.goal}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs text-on-surface-variant">{run.startTime}</div>
                  <div className="text-xs text-on-surface-variant">{run.duration}</div>
                </div>
                <svg
                  className={`w-4 h-4 text-on-surface-variant transition-transform ${
                    expandedAgent === run.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
        <h2 className="text-lg font-semibold text-on-surface mb-4">Containers</h2>
        <div className="divide-y divide-outline/50 -mx-6">
          {mockContainers.map((container) => (
            <div
              key={container.name}
              className={`flex items-center gap-4 px-6 py-3 cursor-pointer transition-colors ${
                selectedContainer === container.name ? 'bg-primary/10' : 'hover:bg-surface/50'
              }`}
              onClick={() => setSelectedContainer(container.name)}
            >
              <span className={`w-2 h-2 rounded-full ${getStatusColor(container.status)}`}></span>
              <span className="font-medium text-on-surface flex-1">{container.name}</span>
              <span className="text-sm text-on-surface-variant">{container.status}</span>
              <span className="text-sm text-on-surface-variant">
                {container.restarts} {container.restarts === 1 ? 'restart' : 'restarts'}
              </span>
              <button
                className="px-3 py-1 text-xs font-medium text-on-surface-variant bg-surface hover:bg-surface/80 border border-outline rounded-lg transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedContainer(container.name);
                }}
              >
                View Logs
              </button>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Container Logs */}
      {selectedContainer && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-on-surface">
              Container Logs - {selectedContainer}
            </h2>
            <span className="text-xs text-on-surface-variant">Last 100 lines</span>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto max-h-96 overflow-y-auto">
            <pre className="text-sm text-gray-100 font-mono whitespace-pre-wrap">
              {mockContainerLogs[selectedContainer] || 'No logs available'}
            </pre>
          </div>
        </GlassCard>
      )}
    </>
  );
}
