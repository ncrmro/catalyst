import { fetchLatestReport, type Report } from '@/actions/reports';
import Image from 'next/image';
import Link from 'next/link';

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

function DashboardReportCard({ report }: { report: Report }) {
  return (
    <div className="bg-surface border border-outline rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-on-surface mb-2">Latest Report</h2>
          <p className="text-on-surface-variant text-sm">
            Generated on {new Date(report.generated_at).toLocaleDateString()} • 
            Period: {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
          </p>
        </div>
        <Link
          href={`/reports/${report.id}`}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-on-primary bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          View Full Report →
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-primary-container rounded-lg p-4">
          <div className="text-2xl font-bold text-on-primary-container">{report.summary.total_prs_awaiting_review}</div>
          <div className="text-sm text-on-primary-container/80">PRs Awaiting Review</div>
        </div>
        <div className="bg-secondary-container rounded-lg p-4">
          <div className="text-2xl font-bold text-on-secondary-container">{report.summary.total_priority_issues}</div>
          <div className="text-sm text-on-secondary-container/80">Priority Issues</div>
        </div>
        <div className="bg-tertiary-container rounded-lg p-4">
          <div className="text-sm font-medium text-on-tertiary-container mb-1">Goal Focus</div>
          <div className="text-sm text-on-tertiary-container/80">{report.summary.goal_focus}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top PRs */}
        <div>
          <h3 className="text-lg font-semibold text-on-surface mb-4">Top PRs Awaiting Review</h3>
          <div className="space-y-3">
            {report.prs_awaiting_review.slice(0, 2).map((pr) => (
              <div key={pr.id} className="border border-outline rounded-lg p-3 bg-surface">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Image 
                      src={pr.author_avatar} 
                      alt={`${pr.author} avatar`}
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded-full"
                    />
                    <span className="text-sm font-medium text-on-surface">#{pr.number}</span>
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
                  className="text-sm text-blue-600 hover:text-blue-800 line-clamp-2"
                >
                  {pr.title}
                </a>
                <div className="text-xs text-on-surface-variant mt-1">
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
            {report.priority_issues.slice(0, 2).map((issue) => (
              <div key={issue.id} className="border border-outline rounded-lg p-3 bg-surface">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-on-surface">#{issue.number}</span>
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
                  className="text-sm text-blue-600 hover:text-blue-800 line-clamp-2"
                >
                  {issue.title}
                </a>
                <div className="text-xs text-on-surface-variant mt-1">
                  {issue.repository}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Recommendations */}
      <div className="mt-6 pt-6 border-t border-outline">
        <h3 className="text-lg font-semibold text-on-surface mb-3">Key Recommendations</h3>
        <ul className="space-y-2">
          {report.recommendations.slice(0, 3).map((recommendation, index) => (
            <li key={index} className="text-sm text-on-surface-variant flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              {recommendation}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default async function DashboardContent() {
  let latestReport: Report | null = null;
  let error: string | null = null;

  try {
    latestReport = await fetchLatestReport();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch latest report';
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-error-container border border-red-200 rounded-lg p-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
            <span className="text-red-600 text-xl">⚠️</span>
          </div>
          <h2 className="text-lg font-semibold text-on-error-container mb-2">Error Loading Dashboard</h2>
          <p className="text-on-error-container">{error}</p>
        </div>
      </div>
    );
  }

  if (!latestReport) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-on-surface-variant text-3xl">📊</span>
        </div>
        <h3 className="text-lg font-medium text-on-surface mb-2">No reports available</h3>
        <p className="text-on-surface-variant max-w-md mx-auto">
          Reports will be generated periodically to provide insights into your project status and development priorities.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-on-background">Welcome to your Dashboard</h1>
        <p className="text-on-surface-variant mt-1">
          Here&apos;s an overview of your latest project activity and priorities.
        </p>
      </div>
      <DashboardReportCard report={latestReport} />
    </div>
  );
}