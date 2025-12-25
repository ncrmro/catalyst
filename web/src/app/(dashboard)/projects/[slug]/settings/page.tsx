import { fetchProjectBySlug } from "@/actions/projects";
import { fetchProjectDeploymentConfigs } from "@/actions/deployment-configs";
import { GlassCard } from "@tetrastack/react-glass-components";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";

interface SettingsPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({
  params,
}: SettingsPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchProjectBySlug(slug);

  return {
    title: project
      ? `Settings - ${project.fullName} - Catalyst`
      : "Settings - Catalyst",
    description: "Configure deployment settings for your project.",
  };
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { slug } = await params;

  const project = await fetchProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  // Fetch deployment configurations
  const configsResult = await fetchProjectDeploymentConfigs(project.id);
  const configs = configsResult.success ? (configsResult.data ?? []) : [];

  // Create a map for easy lookup
  const configMap = new Map(configs.map((c) => [c.environmentName, c]));

  const environments = [
    {
      name: "production" as const,
      label: "Production",
      description:
        "Your live, customer-facing environment. Deployments are triggered when code is merged to your main branch.",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
      ),
      color: "text-error",
      bgColor: "bg-error-container",
    },
    {
      name: "staging" as const,
      label: "Staging",
      description:
        "A production-like environment for testing before release. Ideal for QA and stakeholder reviews.",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
      ),
      color: "text-warning",
      bgColor: "bg-warning-container",
    },
    {
      name: "preview" as const,
      label: "Preview",
      description:
        "Ephemeral environments created for each pull request. Automatically cleaned up when PR is closed.",
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      ),
      color: "text-primary",
      bgColor: "bg-primary-container",
    },
  ];

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-on-surface mb-2">
            Deployment Settings
          </h2>
          <p className="text-on-surface-variant">
            Configure how your application is built and deployed for each
            environment. Choose your deployment strategy, CI/CD provider, and
            trigger settings.
          </p>
        </div>

        <div className="space-y-4">
          {environments.map((env) => {
            const config = configMap.get(env.name);
            const isEnabled = config?.enabled ?? false;
            const strategy = config?.deploymentStrategy ?? "docker";
            const ciProvider = config?.ciProvider ?? "internal";

            return (
              <Link
                key={env.name}
                href={`/projects/${slug}/settings/${env.name}`}
                className="block"
              >
                <div className="flex items-start gap-4 p-4 border border-outline rounded-lg hover:bg-surface-variant/30 transition-colors">
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-lg ${env.bgColor} flex items-center justify-center ${env.color}`}
                  >
                    {env.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-on-surface">
                        {env.label}
                      </h3>
                      {isEnabled ? (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-success-container text-on-success-container">
                          Enabled
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-surface-variant text-on-surface-variant">
                          Not configured
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-on-surface-variant mb-2">
                      {env.description}
                    </p>
                    {isEnabled && (
                      <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Strategy:</span>
                          <span className="capitalize">{strategy}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-medium">CI:</span>
                          <span>
                            {ciProvider === "internal"
                              ? "Catalyst"
                              : ciProvider === "github_actions"
                                ? "GitHub Actions"
                                : ciProvider === "gitlab_ci"
                                  ? "GitLab CI"
                                  : "External"}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="font-medium">Branch:</span>
                          <code className="bg-surface-variant px-1 rounded">
                            {config?.triggerBranch}
                          </code>
                        </span>
                      </div>
                    )}
                  </div>
                  <svg
                    className="w-5 h-5 text-on-surface-variant flex-shrink-0"
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
          })}
        </div>
      </GlassCard>

      {/* Quick Tips */}
      <GlassCard>
        <h3 className="font-semibold text-on-surface mb-3">
          Getting Started Tips
        </h3>
        <ul className="space-y-2 text-sm text-on-surface-variant">
          <li className="flex items-start gap-2">
            <span className="text-primary">1.</span>
            <span>
              Start with <strong>Preview</strong> environments to test your
              deployment configuration with pull requests.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">2.</span>
            <span>
              Set up <strong>Staging</strong> once preview deployments are
              working reliably.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary">3.</span>
            <span>
              Configure <strong>Production</strong> last, after validating your
              deployment pipeline.
            </span>
          </li>
        </ul>
      </GlassCard>
    </div>
  );
}
