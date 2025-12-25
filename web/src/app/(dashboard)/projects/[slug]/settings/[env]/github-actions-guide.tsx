"use client";

import { useState } from "react";
import { GlassCard } from "@tetrastack/react-glass-components";
import type { ProjectWithRelations } from "@/models/projects";
import type {
  EnvironmentName,
  DeploymentStrategy,
} from "@/actions/deployment-configs";

interface GitHubActionsGuideProps {
  project: ProjectWithRelations;
  environmentName: EnvironmentName;
  deploymentStrategy: DeploymentStrategy;
}

export function GitHubActionsGuide({
  project,
  environmentName,
  deploymentStrategy,
}: GitHubActionsGuideProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const repoName = project.repositories[0]?.repo?.fullName ?? "owner/repo";
  const projectSlug = project.slug;

  // Generate workflow based on deployment strategy
  const getWorkflowYaml = () => {
    const triggerBranch =
      environmentName === "production"
        ? "main"
        : environmentName === "staging"
          ? "develop"
          : "**";

    const isPR = environmentName === "preview";

    if (deploymentStrategy === "docker") {
      return `name: Deploy to ${environmentName.charAt(0).toUpperCase() + environmentName.slice(1)}

on:
${
  isPR
    ? `  pull_request:
    types: [opened, synchronize, reopened]`
    : `  push:
    branches:
      - ${triggerBranch}`
}

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: \${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata for Docker
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: \${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=${environmentName}-
            type=ref,event=branch
            type=ref,event=pr

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: \${{ steps.meta.outputs.tags }}
          labels: \${{ steps.meta.outputs.labels }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Catalyst Deployment
        uses: actions/github-script@v7
        with:
          script: |
            await fetch('\${{ secrets.CATALYST_WEBHOOK_URL }}', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer \${{ secrets.CATALYST_DEPLOY_TOKEN }}'
              },
              body: JSON.stringify({
                project: '${projectSlug}',
                environment: '${environmentName}',
                image: '\${{ env.REGISTRY }}/\${{ env.IMAGE_NAME }}:\${{ github.sha }}',
                ref: '\${{ github.ref }}',
                sha: '\${{ github.sha }}'${isPR ? ",\n                prNumber: '\${{ github.event.pull_request.number }}'" : ""}
              })
            });`;
    }

    if (deploymentStrategy === "helm") {
      return `name: Deploy to ${environmentName.charAt(0).toUpperCase() + environmentName.slice(1)}

on:
${
  isPR
    ? `  pull_request:
    types: [opened, synchronize, reopened]`
    : `  push:
    branches:
      - ${triggerBranch}`
}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Install Helm
        uses: azure/setup-helm@v3
        with:
          version: 'v3.13.0'

      - name: Configure Kubernetes
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: \${{ secrets.KUBECONFIG }}

      - name: Deploy with Helm
        run: |
          helm upgrade --install ${projectSlug}-${environmentName} ./charts/app \\
            --namespace ${projectSlug}-${environmentName} \\
            --create-namespace \\
            -f ./charts/app/values-${environmentName}.yaml \\
            --set image.tag=\${{ github.sha }}${isPR ? " \\\n            --set ingress.hosts[0].host=${projectSlug}-pr-\\${{ github.event.pull_request.number }}.preview.example.com" : ""}`;
    }

    // Kubernetes manifests
    return `name: Deploy to ${environmentName.charAt(0).toUpperCase() + environmentName.slice(1)}

on:
${
  isPR
    ? `  pull_request:
    types: [opened, synchronize, reopened]`
    : `  push:
    branches:
      - ${triggerBranch}`
}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Configure Kubernetes
        uses: azure/k8s-set-context@v3
        with:
          kubeconfig: \${{ secrets.KUBECONFIG }}

      - name: Update image tag in manifests
        run: |
          sed -i 's|image:.*|image: ghcr.io/\${{ github.repository }}:\${{ github.sha }}|g' k8s/deployment.yaml

      - name: Apply Kubernetes manifests
        run: |
          kubectl apply -f k8s/ -n ${projectSlug}-${environmentName}`;
  };

  const workflowYaml = getWorkflowYaml();
  const workflowPath = `.github/workflows/deploy-${environmentName}.yml`;

  const secretsNeeded =
    deploymentStrategy === "docker"
      ? [
          {
            name: "CATALYST_WEBHOOK_URL",
            description: "Webhook URL to trigger Catalyst deployments",
            example: "https://catalyst.example.com/api/deploy/webhook",
          },
          {
            name: "CATALYST_DEPLOY_TOKEN",
            description: "API token for authenticating deployment requests",
            example: "ctk_xxxxxxxxxxxxxx",
          },
        ]
      : [
          {
            name: "KUBECONFIG",
            description:
              "Base64 encoded kubeconfig for your Kubernetes cluster",
            example: "Run: base64 -w 0 ~/.kube/config",
          },
        ];

  return (
    <GlassCard>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-on-surface mb-1">
            GitHub Actions Setup
          </h3>
          <p className="text-sm text-on-surface-variant">
            Copy this workflow to your repository to enable automated
            deployments.
          </p>
        </div>
        <span className="px-2 py-1 text-xs rounded-full bg-primary-container text-on-primary-container">
          {deploymentStrategy === "docker"
            ? "Docker Build"
            : deploymentStrategy === "helm"
              ? "Helm Deploy"
              : "K8s Manifests"}
        </span>
      </div>

      {/* Workflow File */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <code className="text-sm text-primary bg-primary-container/30 px-2 py-1 rounded">
            {workflowPath}
          </code>
          <button
            type="button"
            onClick={() => copyToClipboard(workflowYaml, "workflow")}
            className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            {copiedSection === "workflow" ? (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
        <div className="relative">
          <pre className="bg-surface-variant rounded-lg p-4 overflow-x-auto text-sm text-on-surface-variant max-h-96">
            <code>{workflowYaml}</code>
          </pre>
        </div>
      </div>

      {/* Required Secrets */}
      <div className="mb-6">
        <h4 className="font-medium text-on-surface mb-3">Required Secrets</h4>
        <p className="text-sm text-on-surface-variant mb-3">
          Add these secrets to your repository at{" "}
          <code className="bg-surface-variant px-1 rounded">
            Settings &gt; Secrets and variables &gt; Actions
          </code>
        </p>
        <div className="space-y-3">
          {secretsNeeded.map((secret) => (
            <div
              key={secret.name}
              className="p-3 bg-surface-variant/50 rounded-lg"
            >
              <div className="flex items-center justify-between mb-1">
                <code className="text-sm font-medium text-primary">
                  {secret.name}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(secret.name, secret.name)}
                  className="text-xs text-on-surface-variant hover:text-primary"
                >
                  {copiedSection === secret.name ? "Copied!" : "Copy name"}
                </button>
              </div>
              <p className="text-sm text-on-surface-variant">
                {secret.description}
              </p>
              <p className="text-xs text-on-surface-variant/70 mt-1">
                Example: <code>{secret.example}</code>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Setup Steps */}
      <div className="border-t border-outline pt-4">
        <h4 className="font-medium text-on-surface mb-3">Quick Setup</h4>
        <ol className="space-y-2 text-sm text-on-surface-variant">
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-on-primary text-xs flex items-center justify-center">
              1
            </span>
            <span>
              Create the workflow file at{" "}
              <code className="bg-surface-variant px-1 rounded">
                {workflowPath}
              </code>{" "}
              in your repository
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-on-primary text-xs flex items-center justify-center">
              2
            </span>
            <span>Add the required secrets to your repository settings</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-on-primary text-xs flex items-center justify-center">
              3
            </span>
            <span>
              {environmentName === "preview"
                ? "Open a pull request to trigger a preview deployment"
                : `Push to the ${environmentName === "production" ? "main" : "develop"} branch to trigger deployment`}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-on-primary text-xs flex items-center justify-center">
              4
            </span>
            <span>
              Monitor the deployment in the Actions tab and Catalyst dashboard
            </span>
          </li>
        </ol>
      </div>

      {/* Additional Resources */}
      <div className="mt-4 p-3 bg-secondary-container/30 rounded-lg">
        <div className="flex items-start gap-2">
          <svg
            className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm">
            <p className="font-medium text-on-surface mb-1">Need help?</p>
            <p className="text-on-surface-variant">
              Check out the{" "}
              <a
                href="https://docs.github.com/en/actions"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub Actions documentation
              </a>{" "}
              or view{" "}
              <a
                href={`https://github.com/${repoName}/actions`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                your repository&apos;s Actions
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
