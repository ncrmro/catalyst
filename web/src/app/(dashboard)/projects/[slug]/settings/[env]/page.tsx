import { fetchProjectBySlug } from "@/actions/projects";
import { fetchDeploymentConfig } from "@/actions/deployment-configs";
import type { EnvironmentName } from "@/actions/deployment-configs";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { EnvironmentSettingsForm } from "./environment-settings-form";

interface EnvironmentSettingsPageProps {
  params: Promise<{
    slug: string;
    env: string;
  }>;
}

const validEnvironments: EnvironmentName[] = [
  "production",
  "staging",
  "preview",
];

const environmentLabels: Record<EnvironmentName, string> = {
  production: "Production",
  staging: "Staging",
  preview: "Preview",
};

export async function generateMetadata({
  params,
}: EnvironmentSettingsPageProps): Promise<Metadata> {
  const { slug, env } = await params;
  const project = await fetchProjectBySlug(slug);
  const envLabel = environmentLabels[env as EnvironmentName] ?? env;

  return {
    title: project
      ? `${envLabel} Settings - ${project.fullName} - Catalyst`
      : "Environment Settings - Catalyst",
    description: `Configure ${envLabel.toLowerCase()} deployment settings.`,
  };
}

export default async function EnvironmentSettingsPage({
  params,
}: EnvironmentSettingsPageProps) {
  const { slug, env } = await params;

  // Validate environment parameter
  if (!validEnvironments.includes(env as EnvironmentName)) {
    redirect(`/projects/${slug}/settings`);
  }

  const environmentName = env as EnvironmentName;

  const project = await fetchProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  // Fetch deployment configuration
  const configResult = await fetchDeploymentConfig(project.id, environmentName);
  const config = configResult.success ? configResult.data : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <Link
          href={`/projects/${slug}/settings`}
          className="hover:text-primary transition-colors"
        >
          Settings
        </Link>
        <span>/</span>
        <span className="text-on-surface font-medium">
          {environmentLabels[environmentName]}
        </span>
      </div>

      {/* Settings Form */}
      <EnvironmentSettingsForm
        project={project}
        environmentName={environmentName}
        initialConfig={config ?? undefined}
      />
    </div>
  );
}
