import { getGitHubAppInstallations } from "@/actions/github-app";
import Image from "next/image";

// Force dynamic rendering - don't pre-render this page at build time
export const dynamic = 'force-dynamic';

export default async function AdminGitHubPage() {
  const installations = await getGitHubAppInstallations();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-on-surface mb-2">GitHub App Installations</h2>
        <p className="text-sm text-on-surface-variant">
          Manage GitHub App installations across organizations and repositories
        </p>
      </div>

      {installations.length === 0 ? (
        <div className="bg-surface border border-outline rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">📱</div>
          <h3 className="text-lg font-medium text-on-surface mb-2">No Installations Found</h3>
          <p className="text-sm text-on-surface-variant mb-4">
            The GitHub App has not been installed on any organizations or repositories yet.
          </p>
          <p className="text-xs text-on-surface-variant">
            Make sure GITHUB_APP_ID and GITHUB_PRIVATE_KEY environment variables are properly configured.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {installations.map((installation) => (
            <div
              key={installation.id}
              className="bg-surface border border-outline rounded-lg p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <Image
                    src={installation.account?.avatar_url || '/default-avatar.png'}
                    alt={`${installation.account?.login || 'Unknown'} avatar`}
                    width={48}
                    height={48}
                    className="rounded-full"
                  />
                  <div>
                    <h3 className="text-lg font-medium text-on-surface">
                      {installation.account?.login || 'Unknown Account'}
                    </h3>
                    <p className="text-sm text-on-surface-variant">
                      {installation.account?.type || 'Unknown'} • Installation ID: {installation.id}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-on-surface-variant">
                    Repository Access
                  </div>
                  <div className="text-sm font-medium text-on-surface">
                    {installation.repository_selection === 'all' ? 'All Repositories' : 'Selected Repositories'}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-on-surface mb-2">Permissions</h4>
                  <div className="space-y-1">
                    {Object.entries(installation.permissions).map(([permission, level]) => (
                      <div key={permission} className="flex justify-between text-xs">
                        <span className="text-on-surface-variant">{permission}</span>
                        <span className="text-on-surface font-medium">{level}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-on-surface mb-2">Events</h4>
                  <div className="flex flex-wrap gap-1">
                    {installation.events.map((event) => (
                      <span
                        key={event}
                        className="inline-block px-2 py-1 text-xs bg-primary-container text-on-primary-container rounded"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-outline">
                <div className="flex justify-between text-xs text-on-surface-variant">
                  <span>Created: {new Date(installation.created_at).toLocaleDateString()}</span>
                  <span>Updated: {new Date(installation.updated_at).toLocaleDateString()}</span>
                </div>
              </div>

              {installation.suspended_at && (
                <div className="mt-2 p-2 bg-error-container text-on-error-container rounded text-sm">
                  ⚠️ Installation suspended on {new Date(installation.suspended_at).toLocaleDateString()}
                  {installation.suspended_by && ` by ${installation.suspended_by.login}`}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}