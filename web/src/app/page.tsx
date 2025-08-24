import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard-layout";
import { fetchLatestReport } from "@/actions/reports";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard - Catalyst",
  description: "Your Catalyst development platform dashboard with latest project insights.",
};

// Import utility functions for styling (copied from reports page)
function getPriorityColor(priority: 'high' | 'medium' | 'low') {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusColor(status: 'draft' | 'ready' | 'changes_requested') {
  switch (status) {
    case 'ready':
      return 'bg-green-100 text-green-800';
    case 'changes_requested':
      return 'bg-orange-100 text-orange-800';
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default async function Home() {
  const session = await auth();

  // Fetch the latest report
  let latestReport;
  let error: string | null = null;

  try {
    latestReport = await fetchLatestReport();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch latest report';
    latestReport = null;
  }

  return (
    <DashboardLayout user={session.user}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-background mb-2">
            Welcome back, {session.user.name || session.user.email?.split('@')[0]}!
          </h1>
          <p className="text-sm md:text-base text-on-surface-variant">
            Here&apos;s your latest project overview and insights.
          </p>
        </div>

        {/* Latest Report Section */}
        {error ? (
          <div className="bg-error-container border border-outline rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <span className="text-red-600 text-xl">⚠️</span>
            </div>
            <h2 className="text-lg font-semibold text-on-error-container mb-2 text-center">Error Loading Dashboard</h2>
            <p className="text-on-error-container text-center">{error}</p>
          </div>
        ) : !latestReport ? (
          <div className="bg-surface border border-outline rounded-lg p-8 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-3xl">📊</span>
            </div>
            <h3 className="text-lg font-medium text-on-surface mb-2">No reports available</h3>
            <p className="text-on-surface-variant max-w-md mx-auto">
              Reports will be generated periodically to provide insights into your project status and development priorities.
            </p>
          </div>
        ) : (
          <div className="bg-surface border border-outline rounded-lg p-4 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-on-surface mb-2">Latest Project Report</h2>
                <p className="text-sm md:text-base text-on-surface-variant">
                  Generated on {new Date(latestReport.generated_at).toLocaleDateString()} • 
                  Period: {new Date(latestReport.period_start).toLocaleDateString()} - {new Date(latestReport.period_end).toLocaleDateString()}
                </p>
              </div>
              <Link
                href={`/reports/${latestReport.id}`}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px] whitespace-nowrap"
              >
                View Full Report →
              </Link>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{latestReport.summary.total_prs_awaiting_review}</div>
                <div className="text-sm text-blue-800">PRs Awaiting Review</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">{latestReport.summary.total_priority_issues}</div>
                <div className="text-sm text-purple-800">Priority Issues</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 sm:col-span-2 md:col-span-1">
                <div className="text-sm font-medium text-green-800 mb-1">Goal Focus</div>
                <div className="text-sm text-green-700">{latestReport.summary.goal_focus}</div>
              </div>
            </div>

            {/* Top PRs and Issues */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
              {/* Top PRs */}
              <div>
                <h3 className="text-lg font-semibold text-on-surface mb-4">Top PRs Awaiting Review</h3>
                <div className="space-y-3">
                  {latestReport.prs_awaiting_review.slice(0, 3).map((pr) => (
                    <div key={pr.id} className="border border-outline rounded-lg p-3 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">#{pr.number}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(pr.priority)}`}>
                            {pr.priority}
                          </span>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(pr.status)}`}>
                          {pr.status.replace('_', ' ')}
                        </span>
                      </div>
                      <a 
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 line-clamp-2 block"
                      >
                        {pr.title}
                      </a>
                      <div className="text-xs text-gray-500 mt-1">
                        {pr.repository} • {pr.comments_count} comments
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Issues */}
              <div>
                <h3 className="text-lg font-semibold text-on-surface mb-4">Top Priority Issues</h3>
                <div className="space-y-3">
                  {latestReport.priority_issues.slice(0, 3).map((issue) => (
                    <div key={issue.id} className="border border-outline rounded-lg p-3 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">#{issue.number}</span>
                          <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(issue.priority)}`}>
                            {issue.priority}
                          </span>
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {issue.type}
                          </span>
                        </div>
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                          {issue.effort_estimate}
                        </span>
                      </div>
                      <a 
                        href={issue.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 line-clamp-2 block"
                      >
                        {issue.title}
                      </a>
                      <div className="text-xs text-gray-500 mt-1">
                        {issue.repository}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-6 border-t border-outline">
              <h3 className="text-lg font-semibold text-on-surface mb-4">Quick Actions</h3>
              <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 md:gap-4">
                <Link
                  href="/reports"
                  className="inline-flex items-center justify-center px-4 py-2 border border-outline text-sm font-medium rounded-md text-on-surface bg-surface hover:bg-secondary-container hover:text-on-secondary-container min-h-[44px]"
                >
                  View All Reports
                </Link>
                <Link
                  href="/projects"
                  className="inline-flex items-center justify-center px-4 py-2 border border-outline text-sm font-medium rounded-md text-on-surface bg-surface hover:bg-secondary-container hover:text-on-secondary-container min-h-[44px]"
                >
                  Manage Projects
                </Link>
                <Link
                  href="/teams"
                  className="inline-flex items-center justify-center px-4 py-2 border border-outline text-sm font-medium rounded-md text-on-surface bg-surface hover:bg-secondary-container hover:text-on-secondary-container min-h-[44px]"
                >
                  View Teams
                </Link>
                <Link
                  href="/repos"
                  className="inline-flex items-center justify-center px-4 py-2 border border-outline text-sm font-medium rounded-md text-on-surface bg-surface hover:bg-secondary-container hover:text-on-secondary-container min-h-[44px]"
                >
                  View Repositories
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
