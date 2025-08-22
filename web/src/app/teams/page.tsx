import { fetchUserTeams, Team } from '@/actions/teams';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Teams - Catalyst",
  description: "Manage your teams and team memberships in Catalyst.",
};

function TeamCard({ team }: { team: Team }) {
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-primary text-primary-foreground';
      case 'admin':
        return 'bg-secondary text-secondary-foreground';
      case 'member':
        return 'bg-outline text-card-foreground';
      default:
        return 'bg-outline text-card-foreground';
    }
  };

  const capitalizeRole = (role: string) => {
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
              <span className="text-primary-foreground-container font-semibold text-lg">
                {team.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-card-foreground">{team.name}</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(team.role)}`}>
                {capitalizeRole(team.role)}
              </span>
            </div>
          </div>
          
          {team.description && (
            <p className="text-muted-foreground mb-3">{team.description}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              👤 Owner: {team.owner.name || team.owner.email}
            </span>
            <span>📅 Created {new Date(team.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function TeamsPage() {
  const teams = await fetchUserTeams();

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-foreground">My Teams</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Teams you&apos;re a member of and their roles
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {teams.length} {teams.length === 1 ? 'team' : 'teams'}
          </p>
        </div>

        {/* Teams Grid */}
        {teams.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {teams.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center mx-auto mb-4 border border-border">
              <span className="text-muted-foreground text-3xl">👥</span>
            </div>
            <h3 className="text-lg font-medium text-card-foreground mb-2">No teams found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              You haven&apos;t been added to any teams yet. Teams are automatically created when you sign up.
              If you don&apos;t see any teams, try signing out and signing back in.
            </p>
            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-foreground bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Go Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}