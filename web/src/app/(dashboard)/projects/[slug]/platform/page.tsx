import { Suspense } from "react";
import { fetchProjectBySlug } from "@/actions/projects";
import { GlassCard } from "@tetrastack/react-glass-components";
import { listEnvironmentCRs } from "@/lib/k8s-operator";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import {
  DeploymentEnvironmentsCard,
  DevelopmentEnvironmentsCard,
} from "./_components/environment-cards";
import { DetectionWrapper } from "./_components/detection-wrapper";
import { DetectionLoading } from "./_components/detection-loading";

interface PlatformPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: PlatformPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchProjectBySlug(slug);

  return {
    title: project
      ? `Platform - ${project.fullName} - Catalyst`
      : "Platform - Catalyst",
    description: "Platform configuration and deployment environments.",
  };
}

export default async function PlatformPage({ params }: PlatformPageProps) {
  const { slug } = await params;

  const project = await fetchProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  // Get the primary repository for detection
  const primaryRepoRelation = project.repositories.find((r) => r.isPrimary);
  const primaryRepo = primaryRepoRelation?.repo;

  // Get environments from K8s
  const sanitizedProjectName = project.name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");

  const k8sEnvironments = await listEnvironmentCRs("default");
  const environments = k8sEnvironments.filter(
    (env) => env.spec.projectRef.name === sanitizedProjectName,
  );

  const deploymentEnvironments = environments.filter(
    (env) => env.spec.type === "deployment",
  );
  const developmentEnvironments = environments.filter(
    (env) => env.spec.type === "development",
  );

  // Determine domain display based on environment
  const isLocalDev = process.env.NODE_ENV === "development";
  const ingressPort = process.env.INGRESS_PORT || "8080";
  const previewDomain = process.env.PREVIEW_DOMAIN || "preview.catalyst.dev";

  const domainDisplay = isLocalDev
    ? `http://localhost:${ingressPort}/<env-name>/`
    : `*.<env-name>.${previewDomain}`;

  const domainLabel = isLocalDev ? "Local Path" : "Domain";
  const domainStatus = isLocalDev ? "Path-based" : "Auto-assigned";

  // Build config content for cards with Suspense boundaries
  const deploymentConfigContent = primaryRepo ? (
    <Suspense fallback={<DetectionLoading />}>
      <DetectionWrapper
        projectId={project.id}
        repoId={primaryRepo.id}
        repoFullName={primaryRepo.fullName}
        environmentName="production"
        environmentType="deployment"
        projectConfig={project.projectConfig}
      />
    </Suspense>
  ) : (
    <div className="text-sm text-on-surface-variant">
      No repository connected. Connect a repository to configure deployments.
    </div>
  );

  const developmentConfigContent = primaryRepo ? (
    <Suspense fallback={<DetectionLoading />}>
      <DetectionWrapper
        projectId={project.id}
        repoId={primaryRepo.id}
        repoFullName={primaryRepo.fullName}
        environmentName="development"
        environmentType="development"
      />
    </Suspense>
  ) : (
    <div className="text-sm text-on-surface-variant">
      No repository connected. Connect a repository to configure development
      environments.
    </div>
  );

  return (
    <>
      {/* Platform Overview */}
      <GlassCard>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-on-surface">
            Platform Configuration
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            View and manage deployment environments. Select an environment below
            to configure its deployment method and settings.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-outline/30">
          <div className="text-center">
            <div className="text-2xl font-bold text-on-surface">
              {deploymentEnvironments.length}
            </div>
            <div className="text-sm text-on-surface-variant">
              Deployment Environments
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-on-surface">
              {developmentEnvironments.length}
            </div>
            <div className="text-sm text-on-surface-variant">
              Dev Environments
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-on-surface">
              {environments.filter((e) => e.status?.phase === "Ready").length}
            </div>
            <div className="text-sm text-on-surface-variant">Ready</div>
          </div>
        </div>
      </GlassCard>

      {/* Deployment Environments Card with Tabs */}
      <DeploymentEnvironmentsCard
        environments={deploymentEnvironments}
        projectSlug={slug}
        configContent={deploymentConfigContent}
      />

      {/* Development Environments Card with Tabs */}
      <DevelopmentEnvironmentsCard
        environments={developmentEnvironments}
        projectSlug={slug}
        configContent={developmentConfigContent}
      />

      {/* Infrastructure Settings */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-on-surface">
            Infrastructure
          </h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-surface-container rounded-lg">
            <div>
              <h3 className="font-medium text-on-surface">
                Kubernetes Cluster
              </h3>
              <p className="text-sm text-on-surface-variant">default</p>
            </div>
            <span className="px-2 py-1 text-xs rounded-full bg-success-container text-on-success-container">
              Connected
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-container rounded-lg">
            <div>
              <h3 className="font-medium text-on-surface">
                Container Registry
              </h3>
              <p className="text-sm text-on-surface-variant">
                GitHub Container Registry
              </p>
            </div>
            <span className="px-2 py-1 text-xs rounded-full bg-success-container text-on-success-container">
              Configured
            </span>
          </div>

          <div className="flex items-center justify-between p-4 bg-surface-container rounded-lg">
            <div>
              <h3 className="font-medium text-on-surface">{domainLabel}</h3>
              <p className="text-sm text-on-surface-variant font-mono">
                {domainDisplay}
              </p>
            </div>
            <span className="px-2 py-1 text-xs rounded-full bg-secondary-container text-on-secondary-container">
              {domainStatus}
            </span>
          </div>
        </div>
      </GlassCard>
    </>
  );
}
