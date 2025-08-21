import { getReport, deleteReport } from '@/actions/reports';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

async function handleDeleteReport(id: string) {
  'use server';
  
  try {
    await deleteReport(id);
    redirect('/reports');
  } catch {
    throw new Error('Failed to delete report');
  }
}

function formatMarkdown(content: string) {
  // Simple markdown to HTML conversion for basic formatting
  return content
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-on-surface mb-4">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-on-surface mb-3 mt-6">$1</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-medium text-on-surface mb-2 mt-4">$1</h3>')
    .replace(/^\- (.*$)/gm, '<li class="text-on-surface ml-4">$1</li>')
    .replace(/(\n<li.*<\/li>\n?)+/g, '<ul class="list-disc list-inside space-y-1 mb-4">$&</ul>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/\n\n/g, '</p><p class="text-on-surface mb-4">')
    .replace(/^(?!<[h|u|l])/gm, '<p class="text-on-surface mb-4">')
    .replace(/(?<!>)$/gm, '</p>');
}

export default async function ReportPage({ params }: { params: { id: string } }) {
  const report = await getReport(params.id);

  if (!report) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/reports"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              ← Back to Reports
            </Link>
            <div className="flex gap-3">
              <Link
                href={`/reports/${report.id}/edit`}
                className="bg-secondary text-on-secondary px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors"
              >
                Edit
              </Link>
              <form action={handleDeleteReport.bind(null, report.id)} className="inline">
                <button
                  type="submit"
                  className="bg-error text-on-error px-4 py-2 rounded-lg hover:bg-error/90 transition-colors"
                >
                  Delete
                </button>
              </form>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-on-background mb-2">{report.title}</h1>
          {report.description && (
            <p className="text-lg text-on-surface-variant mb-4">{report.description}</p>
          )}
          
          <div className="flex gap-6 text-sm text-on-surface-variant">
            <span>Created {new Date(report.createdAt).toLocaleDateString()}</span>
            <span>Updated {new Date(report.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="space-y-8">
          {/* Goal */}
          {report.goal && (
            <div className="bg-primary-container border border-outline rounded-lg p-6">
              <h2 className="text-lg font-semibold text-on-primary-container mb-3 flex items-center gap-2">
                🎯 Goal
              </h2>
              <p className="text-on-primary-container">{report.goal}</p>
            </div>
          )}

          {/* PR Summary */}
          {report.prSummary && (
            <div className="bg-surface border border-outline rounded-lg p-6">
              <h2 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
                📊 PR Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-secondary-container rounded-lg">
                  <div className="text-2xl font-bold text-on-secondary-container">{report.prSummary.total}</div>
                  <div className="text-sm text-on-secondary-container">Total PRs</div>
                </div>
                <div className="text-center p-3 bg-tertiary-container rounded-lg">
                  <div className="text-2xl font-bold text-on-tertiary-container">{report.prSummary.awaitingReview}</div>
                  <div className="text-sm text-on-tertiary-container">Awaiting Review</div>
                </div>
                <div className="text-center p-3 bg-primary-container rounded-lg">
                  <div className="text-2xl font-bold text-on-primary-container">
                    {report.prSummary.total - report.prSummary.awaitingReview}
                  </div>
                  <div className="text-sm text-on-primary-container">Merged/Closed</div>
                </div>
              </div>
              
              {report.prSummary.recentPRs && report.prSummary.recentPRs.length > 0 && (
                <div>
                  <h3 className="font-medium text-on-surface mb-2">Recent PRs</h3>
                  <div className="space-y-2">
                    {report.prSummary.recentPRs.map((pr) => (
                      <div key={pr.id} className="flex items-center gap-3 p-3 bg-surface-variant rounded-md">
                        <span className="text-sm font-mono text-on-surface-variant">#{pr.id}</span>
                        <div className="flex-1">
                          <a 
                            href={pr.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-on-surface hover:text-primary transition-colors"
                          >
                            {pr.title}
                          </a>
                          <div className="text-xs text-on-surface-variant">
                            by {pr.author} • {new Date(pr.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Next Issues */}
          {report.nextIssues && report.nextIssues.length > 0 && (
            <div className="bg-surface border border-outline rounded-lg p-6">
              <h2 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
                📋 Next Issues
              </h2>
              <div className="space-y-3">
                {report.nextIssues.map((issue, index) => (
                  <div key={index} className="border border-outline rounded-md p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-on-surface">
                            {issue.url ? (
                              <a 
                                href={issue.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-primary transition-colors"
                              >
                                {issue.title}
                              </a>
                            ) : (
                              issue.title
                            )}
                          </h3>
                        </div>
                        <p className="text-sm text-on-surface-variant mb-2">{issue.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          issue.type === 'existing' 
                            ? 'bg-primary-container text-on-primary-container' 
                            : 'bg-secondary-container text-on-secondary-container'
                        }`}>
                          {issue.type}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          issue.priority === 'high' 
                            ? 'bg-error-container text-on-error-container'
                            : issue.priority === 'medium'
                            ? 'bg-tertiary-container text-on-tertiary-container'
                            : 'bg-surface-variant text-on-surface-variant'
                        }`}>
                          {issue.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="bg-surface border border-outline rounded-lg p-6">
            <h2 className="text-lg font-semibold text-on-surface mb-4 flex items-center gap-2">
              📄 Report Content
            </h2>
            <div 
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(report.content) }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}