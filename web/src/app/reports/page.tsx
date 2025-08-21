import { getReports, Report } from '@/actions/reports';
import Link from 'next/link';

function ReportCard({ report }: { report: Report }) {
  return (
    <div className="bg-surface border border-outline rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-medium text-on-surface mb-2">
            <Link 
              href={`/reports/${report.id}`}
              className="hover:text-primary transition-colors"
            >
              {report.title}
            </Link>
          </h3>
          {report.description && (
            <p className="text-on-surface-variant text-sm mb-3">{report.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/reports/${report.id}/edit`}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>

      {report.goal && (
        <div className="mb-4">
          <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Goal</span>
          <p className="text-sm text-on-surface mt-1">{report.goal}</p>
        </div>
      )}

      {report.prSummary && (
        <div className="mb-4">
          <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">PR Summary</span>
          <div className="flex gap-4 text-sm text-on-surface-variant mt-1">
            <span>📊 {report.prSummary.total} total</span>
            <span>⏳ {report.prSummary.awaitingReview} awaiting review</span>
          </div>
        </div>
      )}

      {report.nextIssues && report.nextIssues.length > 0 && (
        <div className="mb-4">
          <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Next Issues</span>
          <div className="mt-1">
            {report.nextIssues.slice(0, 2).map((issue, index: number) => (
              <div key={index} className="text-sm text-on-surface-variant">
                • {issue.title} ({issue.priority})
              </div>
            ))}
            {report.nextIssues.length > 2 && (
              <div className="text-sm text-on-surface-variant">
                +{report.nextIssues.length - 2} more
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center text-xs text-on-surface-variant">
        <span>Created {new Date(report.createdAt).toLocaleDateString()}</span>
        <span>Updated {new Date(report.updatedAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

export default async function ReportsPage() {
  let reportsData;
  let error = null;

  try {
    reportsData = await getReports();
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load reports';
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-error-container border border-outline rounded-lg p-6">
            <h2 className="text-lg font-semibold text-on-error-container mb-2">Error Loading Reports</h2>
            <p className="text-on-error-container">{error}</p>
            <div className="mt-4 text-sm text-on-error-container">
              <p>Please ensure you are logged in to view reports.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!reportsData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-on-surface-variant">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-bold text-on-background">Reports</h1>
            <p className="mt-4 text-lg text-on-surface-variant">
              Periodic reports summarizing development progress and goals
            </p>
            <p className="text-sm text-on-surface-variant mt-2">
              {reportsData.length} reports found
            </p>
          </div>
          <Link
            href="/reports/new"
            className="bg-primary text-on-primary px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Create New Report
          </Link>
        </div>

        {reportsData.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-surface border border-outline rounded-lg p-8 max-w-md mx-auto">
              <h3 className="text-lg font-medium text-on-surface mb-4">No Reports Yet</h3>
              <p className="text-on-surface-variant mb-6">
                Create your first periodic report to track development progress and goals.
              </p>
              <Link
                href="/reports/new"
                className="bg-primary text-on-primary px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors inline-block"
              >
                Create Your First Report
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reportsData.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}