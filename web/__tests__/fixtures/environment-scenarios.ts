import { environmentCRFactory } from "../factories/environment-cr.factory";
import { agentRunFactory } from "../factories/agent-run.factory";
import { containerFactory } from "../factories/container.factory";

/**
 * Pre-built environment scenarios for reuse across tests and stories
 *
 * These fixtures provide realistic, complex scenarios that would be tedious
 * to recreate manually in each test or story.
 *
 * Usage:
 *   import { successfulDeployment } from '@/__tests__/fixtures/environment-scenarios';
 *   <EnvironmentDetailView {...successfulDeployment} />
 */

/**
 * Successful PR preview environment - happy path
 */
export const successfulDeployment = {
  environment: environmentCRFactory
    .preview()
    .ready()
    .withPullRequest(42)
    .build({
      metadata: {
        name: "catalyst-web-feat-preview-environments",
        namespace: "default",
        creationTimestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      },
      spec: {
        projectRef: { name: "catalyst-web" },
        type: "preview",
        source: {
          commitSha: "abc1234567890def",
          branch: "feat/preview-environments",
          prNumber: 42,
        },
        config: {
          envVars: [
            { name: "NODE_ENV", value: "development" },
            {
              name: "NEXT_PUBLIC_API_URL",
              value: "https://api-preview.catalyst.dev",
            },
            { name: "DEBUG", value: "true" },
          ],
        },
      },
      status: {
        phase: "Ready",
        url: "https://pr-42-catalyst-web.preview.catalyst.dev",
        conditions: [
          { type: "Ready", status: "True" },
          { type: "BuildComplete", status: "True" },
          { type: "DeploymentReady", status: "True" },
        ],
      },
    }),
  targetNamespace: "env-catalyst-web-feat-preview-environments",
  podName: "workspace-catalyst-web-abc1234",
  agents: [
    agentRunFactory
      .implementationAgent()
      .completed()
      .build({
        id: "agent-1",
        goal: "Implement preview environment feature",
        startTime: new Date(Date.now() - 3000000).toLocaleString(),
        duration: "8m 20s",
      }),
    agentRunFactory
      .testAgent()
      .completed()
      .build({
        id: "agent-2",
        goal: "Run test suite and validate changes",
        startTime: new Date(Date.now() - 1800000).toLocaleString(),
        duration: "4m 15s",
      }),
  ],
  containers: [
    containerFactory.workspace().running().build(),
    containerFactory.sidecar().running().build({ name: "proxy" }),
  ],
};

/**
 * Failed deployment scenario - build error
 */
export const failedDeployment = {
  environment: environmentCRFactory
    .preview()
    .failed()
    .withPullRequest(43)
    .build({
      metadata: {
        name: "catalyst-web-feat-broken-build",
        namespace: "default",
        creationTimestamp: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
      },
      spec: {
        projectRef: { name: "catalyst-web" },
        type: "preview",
        source: {
          commitSha: "bad1234567890bad",
          branch: "feat/broken-build",
          prNumber: 43,
        },
      },
      status: {
        phase: "Failed",
        conditions: [
          { type: "Ready", status: "False" },
          { type: "BuildFailed", status: "True" },
        ],
      },
    }),
  targetNamespace: "env-catalyst-web-feat-broken-build",
  podName: "workspace-catalyst-web-bad1234",
  agents: [
    agentRunFactory
      .implementationAgent()
      .failed()
      .build({
        id: "agent-failed-1",
        goal: "Implement feature with dependency conflicts",
        startTime: new Date(Date.now() - 900000).toLocaleString(),
        duration: "12m 45s",
      }),
  ],
  containers: [
    containerFactory.workspace().failed().unstable().build({
      restarts: 8,
    }),
  ],
};

/**
 * Provisioning deployment - in progress
 */
export const provisioningDeployment = {
  environment: environmentCRFactory
    .preview()
    .provisioning()
    .withPullRequest(44)
    .build({
      metadata: {
        name: "catalyst-web-feat-new-dashboard",
        namespace: "default",
        creationTimestamp: new Date(Date.now() - 300000).toISOString(), // 5 min ago
      },
      spec: {
        projectRef: { name: "catalyst-web" },
        type: "preview",
        source: {
          commitSha: "def4567890abcdef",
          branch: "feat/new-dashboard",
          prNumber: 44,
        },
      },
      status: {
        phase: "Provisioning",
        conditions: [
          { type: "Ready", status: "False" },
          { type: "BuildStarted", status: "True" },
        ],
      },
    }),
  targetNamespace: "env-catalyst-web-feat-new-dashboard",
  podName: "workspace-catalyst-web-def4567",
  agents: [
    agentRunFactory
      .implementationAgent()
      .running()
      .build({
        id: "agent-running-1",
        goal: "Implement dashboard redesign",
        startTime: new Date(Date.now() - 240000).toLocaleString(),
        duration: "4m 0s",
      }),
  ],
  containers: [containerFactory.workspace().pending().build()],
};

/**
 * Production environment - stable and running
 */
export const productionEnvironment = {
  environment: environmentCRFactory
    .production()
    .ready()
    .build({
      metadata: {
        name: "catalyst-web-production",
        namespace: "default",
        creationTimestamp: new Date(Date.now() - 86400000 * 7).toISOString(), // 7 days ago
      },
      spec: {
        projectRef: { name: "catalyst-web" },
        type: "production",
        source: {
          commitSha: "main1234567890abc",
          branch: "main",
        },
        config: {
          envVars: [
            { name: "NODE_ENV", value: "production" },
            { name: "NEXT_PUBLIC_API_URL", value: "https://api.catalyst.dev" },
            { name: "LOG_LEVEL", value: "error" },
          ],
        },
      },
      status: {
        phase: "Ready",
        url: "https://catalyst.dev",
        conditions: [
          { type: "Ready", status: "True" },
          { type: "DeploymentReady", status: "True" },
          { type: "HealthCheckPassing", status: "True" },
        ],
      },
    }),
  targetNamespace: "env-catalyst-web-production",
  podName: "workspace-catalyst-web-main1234",
  agents: [
    agentRunFactory
      .reviewAgent()
      .completed()
      .build({
        id: "agent-prod-1",
        goal: "Perform security audit",
        startTime: new Date(Date.now() - 86400000).toLocaleString(),
        duration: "15m 30s",
      }),
  ],
  containers: [
    containerFactory.workspace().running().build({ restarts: 0 }),
    containerFactory.sidecar().running().build({ name: "logger", restarts: 0 }),
    containerFactory
      .sidecar()
      .running()
      .build({ name: "metrics", restarts: 0 }),
  ],
};

/**
 * Environment with multiple active agents
 */
export const multiAgentEnvironment = {
  environment: environmentCRFactory
    .preview()
    .deploying()
    .withPullRequest(45)
    .build({
      metadata: {
        name: "catalyst-web-feat-multi-agent",
        namespace: "default",
        creationTimestamp: new Date(Date.now() - 900000).toISOString(), // 15 min ago
      },
      spec: {
        projectRef: { name: "catalyst-web" },
        type: "preview",
        source: {
          commitSha: "multi123456789abc",
          branch: "feat/multi-agent-test",
          prNumber: 45,
        },
      },
      status: {
        phase: "Deploying",
        conditions: [
          { type: "BuildComplete", status: "True" },
          { type: "DeploymentStarted", status: "True" },
        ],
      },
    }),
  targetNamespace: "env-catalyst-web-feat-multi-agent",
  podName: "workspace-catalyst-web-multi123",
  agents: [
    agentRunFactory
      .implementationAgent()
      .completed()
      .build({
        id: "agent-multi-1",
        startTime: new Date(Date.now() - 800000).toLocaleString(),
      }),
    agentRunFactory
      .testAgent()
      .completed()
      .build({
        id: "agent-multi-2",
        startTime: new Date(Date.now() - 600000).toLocaleString(),
      }),
    agentRunFactory
      .reviewAgent()
      .running()
      .build({
        id: "agent-multi-3",
        startTime: new Date(Date.now() - 300000).toLocaleString(),
      }),
    agentRunFactory.refactorAgent().pending().build({
      id: "agent-multi-4",
    }),
  ],
  containers: [containerFactory.workspace().running().build()],
};

/**
 * Environment with long branch name (edge case testing)
 */
export const longBranchNameEnvironment = {
  environment: environmentCRFactory
    .preview()
    .ready()
    .build({
      metadata: {
        name: "catalyst-web-feat-very-long-branch-name-that-might-cause-display-issues",
        namespace: "default",
      },
      spec: {
        projectRef: { name: "catalyst-web" },
        type: "preview",
        source: {
          commitSha: "edge123456789abc",
          branch:
            "feat/very-long-branch-name-that-might-cause-display-issues-in-the-ui",
          prNumber: 99,
        },
      },
      status: {
        phase: "Ready",
        url: "https://pr-99-catalyst-web.preview.catalyst.dev",
        conditions: [{ type: "Ready", status: "True" }],
      },
    }),
  targetNamespace:
    "env-catalyst-web-feat-very-long-branch-name-that-might-cause-display-issues",
  podName: "workspace-catalyst-web-edge123",
  agents: [],
  containers: [containerFactory.workspace().running().build()],
};
