import { fetchReportById } from '@/actions/reports';
import type { PullRequest, Issue } from '@/types/reports';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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

function getTypeColor(type: 'bug' | 'feature' | 'improvement' | 'idea') {
  switch (type) {
    case 'bug':
      return 'bg-red-100 text-red-800';
    case 'feature':
      return 'bg-blue-100 text-blue-800';
    case 'improvement':
      return 'bg-purple-100 text-purple-800';
    case 'idea':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function PullRequestCard({ pr }: { pr: PullRequest }) {
  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Image 
            src={pr.author_avatar} 
            alt={`${pr.author} avatar`}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full"
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-gray-900">#{pr.number}</span>
              <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(pr.priority)}`}>
                {pr.priority} priority
              </span>
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(pr.status)}`}>
                {pr.status.replace('_', ' ')}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              by {pr.author} • {pr.comments_count} comments
            </div>
          </div>
        </div>
      </div>

      <a 
        href={pr.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-lg font-semibold text-blue-600 hover:text-blue-800 mb-2 block"
      >
        {pr.title}
      </a>

      <div className="text-sm text-gray-600 mb-3">
        Repository: <span className="font-medium">{pr.repository}</span>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Created {new Date(pr.created_at).toLocaleDateString()}</span>
        <span>Updated {new Date(pr.updated_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function IssueCard({ issue }: { issue: Issue }) {
  return (
    <div className="bg-white border rounded-lg p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-medium text-gray-900">#{issue.number}</span>
          <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(issue.priority)}`}>
            {issue.priority} priority
          </span>
          <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(issue.type)}`}>
            {issue.type}
          </span>
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
            {issue.effort_estimate} effort
          </span>
        </div>
      </div>

      <a 
        href={issue.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-lg font-semibold text-blue-600 hover:text-blue-800 mb-2 block"
      >
        {issue.title}
      </a>

      <div className="text-sm text-gray-600 mb-3">
        Repository: <span className="font-medium">{issue.repository}</span>
      </div>

      {issue.labels.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {issue.labels.map((label) => (
            <span key={label} className="px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700">
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Created {new Date(issue.created_at).toLocaleDateString()}</span>
        <span>Updated {new Date(issue.updated_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

interface ReportPageProps {
  params: Promise<{
    reportId: string;
  }>;
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { reportId } = await params;
  const report = await fetchReportById(reportId);

  if (!report) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/reports"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Reports
          </Link>
          <div className="bg-white border rounded-lg p-8 shadow-sm">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{report.id}</h1>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-gray-600 mb-2">
                  <span className="font-medium">Generated:</span> {new Date(report.generated_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Period:</span> {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">Goal Focus</h3>
                <p className="text-blue-800">{report.summary.goal_focus}</p>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">{report.summary.total_prs_awaiting_review}</div>
                <div className="text-sm text-blue-800">PRs Awaiting Review</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{report.summary.total_priority_issues}</div>
                <div className="text-sm text-purple-800">Priority Issues</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{report.recommendations.length}</div>
                <div className="text-sm text-green-800">Recommendations</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pull Requests Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Pull Requests Awaiting Review</h2>
          {report.prs_awaiting_review.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {report.prs_awaiting_review.map((pr) => (
                <PullRequestCard key={pr.id} pr={pr} />
              ))}
            </div>
          ) : (
            <div className="bg-white border rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">✅</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No PRs awaiting review</h3>
              <p className="text-gray-600">All pull requests have been reviewed for this period.</p>
            </div>
          )}
        </div>

        {/* Priority Issues Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Priority Issues</h2>
          {report.priority_issues.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {report.priority_issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} />
              ))}
            </div>
          ) : (
            <div className="bg-white border rounded-lg p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">🎯</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No priority issues</h3>
              <p className="text-gray-600">No high-priority issues identified for this period.</p>
            </div>
          )}
        </div>

        {/* Recommendations Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Recommendations</h2>
          <div className="bg-white border rounded-lg p-8 shadow-sm">
            {report.recommendations.length > 0 ? (
              <ol className="space-y-4">
                {report.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-4">
                    <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full min-w-[24px] text-center">
                      {index + 1}
                    </span>
                    <p className="text-gray-700 leading-relaxed">{recommendation}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-400 text-2xl">💡</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations</h3>
                <p className="text-gray-600">No specific recommendations for this period.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}