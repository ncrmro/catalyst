import { getProviderStatuses, ProviderStatus } from "@/actions/account";
import { signOutAction } from "@/actions/auth";
import { auth } from "@/auth";
import { GlassCard } from "@tetrastack/react-glass-components";
import { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Account - Catalyst",
  description: "Manage your account settings and connected services.",
};

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function GitLabIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z" />
    </svg>
  );
}

function BitbucketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M.778 1.213a.768.768 0 0 0-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 0 0 .77-.646l3.27-20.03a.768.768 0 0 0-.768-.891zM14.52 15.53H9.522L8.17 8.466h7.561z" />
    </svg>
  );
}

function AzureDevOpsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M0 8.877L2.247 5.91l8.405-3.416V.022l7.37 5.393L2.966 8.338v8.225L0 15.707zm24-4.45v14.651l-5.753 4.9-9.303-3.057v3.056l-5.978-7.416 15.057 1.798V5.415z" />
    </svg>
  );
}

function ProviderIcon({
  icon,
  className,
}: {
  icon: ProviderStatus["icon"];
  className?: string;
}) {
  switch (icon) {
    case "github":
      return <GitHubIcon className={className} />;
    case "gitlab":
      return <GitLabIcon className={className} />;
    case "bitbucket":
      return <BitbucketIcon className={className} />;
    case "azure":
      return <AzureDevOpsIcon className={className} />;
  }
}

function ProviderCard({
  provider,
  highlighted,
}: {
  provider: ProviderStatus;
  highlighted?: boolean;
}) {
  return (
    <div
      id={`provider-${provider.id}`}
      className={`relative p-6 rounded-xl border transition-all ${
        highlighted
          ? "border-primary ring-2 ring-primary/50 bg-primary/10 animate-pulse"
          : provider.available
            ? provider.connected
              ? "border-primary/50 bg-primary/5"
              : "border-outline/50 bg-surface hover:border-primary/30"
            : "border-outline/30 bg-surface-variant/30 opacity-60"
      }`}
    >
      {/* Coming Soon Badge */}
      {!provider.available && (
        <span className="absolute top-3 right-3 px-2 py-0.5 text-xs font-medium rounded-full bg-surface-variant text-on-surface-variant">
          Coming Soon
        </span>
      )}

      <div className="flex items-start gap-4">
        {/* Provider Icon */}
        <div
          className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
            provider.connected
              ? "bg-primary/10 text-primary"
              : "bg-surface-variant text-on-surface-variant"
          }`}
        >
          <ProviderIcon icon={provider.icon} className="w-6 h-6" />
        </div>

        {/* Provider Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-on-surface">{provider.name}</h3>
            {provider.connected && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Connected
              </span>
            )}
          </div>

          {provider.connected && provider.username ? (
            <div className="flex flex-col gap-1 mt-2">
              <div className="flex items-center gap-2">
                {provider.avatarUrl && (
                  <Image
                    src={provider.avatarUrl}
                    alt={provider.username}
                    width={24}
                    height={24}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <span className="text-sm text-on-surface-variant">
                  @{provider.username}
                </span>
              </div>
              {provider.authMethod && (
                <span className="text-xs text-on-surface-variant/70">
                  via{" "}
                  {provider.authMethod === "pat"
                    ? "Personal Access Token"
                    : "OAuth"}
                </span>
              )}
            </div>
          ) : provider.available ? (
            <p className="text-sm text-on-surface-variant mt-1">
              {provider.error || "Not connected"}
            </p>
          ) : (
            <p className="text-sm text-on-surface-variant/70 mt-1">
              Integration coming soon
            </p>
          )}
        </div>

        {/* Action Button */}
        {provider.available && (
          <div className="flex-shrink-0">
            {provider.connected ? (
              <button
                disabled
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-surface-variant text-on-surface-variant cursor-not-allowed"
              >
                Disconnect
              </button>
            ) : (
              <button
                disabled
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-on-primary opacity-50 cursor-not-allowed"
              >
                Connect
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface AccountPageProps {
  searchParams: Promise<{ highlight?: string }>;
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const session = await auth();
  const providers = await getProviderStatuses();
  const { highlight } = await searchParams;

  const connectedCount = providers.filter((p) => p.connected).length;
  const availableCount = providers.filter((p) => p.available).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-on-surface">Account Settings</h1>
        <p className="text-on-surface-variant mt-1">
          Manage your account and connected services
        </p>
      </div>

      {/* User Profile Card */}
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "User"}
                width={64}
                height={64}
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-semibold text-primary">
                  {session.user.name?.charAt(0) ||
                    session.user.email?.charAt(0) ||
                    "?"}
                </span>
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-on-surface">
                {session.user.name || "User"}
              </h2>
              <p className="text-on-surface-variant">{session.user.email}</p>
              {session.user.admin && (
                <span className="inline-flex items-center mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-secondary-container text-on-secondary-container">
                  Admin
                </span>
              )}
            </div>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-error/10 text-error hover:bg-error/20 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </GlassCard>

      {/* Version Control Providers */}
      <GlassCard>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-on-surface">
              Version Control Providers
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Connect your repositories from different providers
            </p>
          </div>
          <span className="text-sm text-on-surface-variant">
            {connectedCount} of {availableCount} connected
          </span>
        </div>

        <div className="space-y-4">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              highlighted={highlight === provider.id}
            />
          ))}
        </div>
      </GlassCard>

      {/* Quick Info */}
      <GlassCard>
        <h2 className="text-lg font-semibold text-on-surface mb-4">
          About Connections
        </h2>
        <div className="space-y-3 text-sm text-on-surface-variant">
          <p>
            <strong className="text-on-surface">GitHub</strong> - Full
            integration with repository access, webhooks, and PR environments.
          </p>
          <p>
            <strong className="text-on-surface">
              GitLab, Bitbucket, Azure DevOps
            </strong>{" "}
            - Coming soon. We are working on adding support for more providers.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
