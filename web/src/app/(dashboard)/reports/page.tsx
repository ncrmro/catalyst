import { fetchReports, fetchLatestReport } from '@/actions/reports';
import type { Report, RepoNarrative } from '@/types/reports';
import Image from 'next/image';
import Link from 'next/link';

function getNarrativeIcon(type: 'delivered' | 'next' | 'blockers') {
  switch (type) {
    case 'delivered':
      return '✅';
    case 'next':
      return '🎯';
    case 'blockers':
      return '🚧';
    default:
      return '📝';
  }
}

function RepoNarrativeCard({ repo }: { repo: RepoNarrative }) {
  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="text-blue-600">📁</span>
        {repo.repository}
      </h3>
      
      <div className="space-y-4">
        {/* Recently Delivered Features */}
        <div>
          <h4 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-2">
            <span>{getNarrativeIcon('delivered')}</span>
            Recently Delivered Features
          </h4>
          <ul className="space-y-1">
            {repo.recently_delivered_features.map((feature, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-green-500 font-bold mt-1">•</span>
                {feature}
              </li>
            ))}
          </ul>
        </div>

        {/* Ideal Next Tasks */}
        <div>
          <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
            <span>{getNarrativeIcon('next')}</span>
            Ideal Next Tasks
          </h4>
          <ul className="space-y-1">
            {repo.ideal_next_tasks.map((task, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-blue-500 font-bold mt-1">•</span>
                {task}
              </li>
            ))}
          </ul>
        </div>

        {/* Current Blockers */}
        <div>
          <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
            <span>{getNarrativeIcon('blockers')}</span>
            Current Blockers
          </h4>
          <ul className="space-y-1">
            {repo.current_blockers.map((blocker, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-red-500 font-bold mt-1">•</span>
                {blocker}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function NarrativeReportSection({ report }: { report: Report }) {
  if (!report.narrative_report) {
    return null;
  }

  return (
    <div className="bg-gray-50 border rounded-lg p-8 mb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-purple-600">📋</span>
          Periodic Report Summary
        </h2>
        <p className="text-gray-700 leading-relaxed text-base">
          {report.narrative_report.overview}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {report.narrative_report.repositories.map((repo, index) => (
          <RepoNarrativeCard key={index} repo={repo} />
        ))}
      </div>
    </div>
  );
}

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

function LatestReportCard({ report }: { report: Report }) {
  return (
    <div className="bg-white border rounded-lg p-8 shadow-lg mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Latest Report</h2>
          <p className="text-gray-600">
            Generated on {new Date(report.generated_at).toLocaleDateString()} • 
            Period: {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
          </p>
        </div>
        <Link
          href={`/reports/${report.id}`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          View Full Report →
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">{report.summary.total_prs_awaiting_review}</div>
          <div className="text-sm text-blue-800">PRs Awaiting Review</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">{report.summary.total_priority_issues}</div>
          <div className="text-sm text-purple-800">Priority Issues</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm font-medium text-green-800 mb-1">Goal Focus</div>
          <div className="text-sm text-green-700">{report.summary.goal_focus}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top PRs */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top PRs Awaiting Review</h3>
          <div className="space-y-3">
            {report.prs_awaiting_review.slice(0, 3).map((pr) => (
              <div key={pr.id} className="border rounded-lg p-3 bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Image 
                      src={pr.author_avatar} 
                      alt={`${pr.author} avatar`}
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded-full"
                    />
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
                  className="text-sm text-blue-600 hover:text-blue-800 line-clamp-2"
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Priority Issues</h3>
          <div className="space-y-3">
            {report.priority_issues.slice(0, 3).map((issue) => (
              <div key={issue.id} className="border rounded-lg p-3 bg-gray-50">
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
                  className="text-sm text-blue-600 hover:text-blue-800 line-clamp-2"
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

      {/* Quick Recommendations */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Recommendations</h3>
        <ul className="space-y-2">
          {report.recommendations.slice(0, 3).map((recommendation, index) => (
            <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
              <span className="text-blue-600 font-bold">•</span>
              {recommendation}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ReportHistoryCard({ report }: { report: Report }) {
  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{report.id}</h3>
          <p className="text-sm text-gray-600">
            {new Date(report.generated_at).toLocaleDateString()}
          </p>
        </div>
        <Link
          href={`/reports/${report.id}`}
          className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          View →
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-xl font-bold text-blue-600">{report.summary.total_prs_awaiting_review}</div>
          <div className="text-xs text-gray-600">PRs</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-purple-600">{report.summary.total_priority_issues}</div>
          <div className="text-xs text-gray-600">Issues</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-bold text-green-600">{report.recommendations.length}</div>
          <div className="text-xs text-gray-600">Recommendations</div>
        </div>
      </div>

      <p className="text-sm text-gray-700 line-clamp-2">
        Focus: {report.summary.goal_focus}
      </p>
    </div>
  );
}

export default async function ReportsPage() {
  let reports: Report[];
  let latestReport: Report | null;
  let error: string | null = null;

  try {
    [reports, latestReport] = await Promise.all([
      fetchReports(),
      fetchLatestReport()
    ]);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to fetch reports';
    reports = [];
    latestReport = null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Reports</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-2xl mx-auto">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                <span className="text-red-600 text-xl">⚠️</span>
              </div>
              <h2 className="text-lg font-semibold text-red-900 mb-2">Error Loading Reports</h2>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Reports</h1>
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-3xl">📊</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
              <p className="text-gray-600 max-w-md mx-auto">
                Reports will be generated periodically to provide insights into your project status and development priorities.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Historical reports (excluding the latest one)
  const historicalReports = reports.slice(1);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Project Reports</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Periodic summaries of pull requests awaiting review, priority issues, and recommendations for your projects.
          </p>
        </div>

        {/* Latest Report */}
        {latestReport && <LatestReportCard report={latestReport} />}

        {/* Narrative Report Section */}
        {latestReport && <NarrativeReportSection report={latestReport} />}

        {/* Historical Reports */}
        {historicalReports.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Report History</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {historicalReports.map((report) => (
                <ReportHistoryCard key={report.id} report={report} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}