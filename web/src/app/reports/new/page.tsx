import { createReport } from '@/actions/reports';
import { redirect } from 'next/navigation';
import Link from 'next/link';

async function handleCreateReport(formData: FormData) {
  'use server';
  
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const content = formData.get('content') as string;
  const goal = formData.get('goal') as string;
  
  // Parse PR summary data
  const prTotal = parseInt(formData.get('prTotal') as string) || 0;
  const prAwaitingReview = parseInt(formData.get('prAwaitingReview') as string) || 0;
  
  // Parse next issues data
  const nextIssuesData = [];
  let issueIndex = 0;
  while (formData.has(`issueTitle${issueIndex}`)) {
    const issueTitle = formData.get(`issueTitle${issueIndex}`) as string;
    const issueDescription = formData.get(`issueDescription${issueIndex}`) as string;
    const issueType = formData.get(`issueType${issueIndex}`) as 'existing' | 'idea';
    const issuePriority = formData.get(`issuePriority${issueIndex}`) as 'low' | 'medium' | 'high';
    const issueUrl = formData.get(`issueUrl${issueIndex}`) as string;
    
    if (issueTitle && issueDescription) {
      nextIssuesData.push({
        title: issueTitle,
        description: issueDescription,
        type: issueType,
        priority: issuePriority,
        url: issueUrl || undefined
      });
    }
    issueIndex++;
  }

  try {
    const newReport = await createReport({
      title,
      description: description || undefined,
      content,
      goal: goal || undefined,
      prSummary: prTotal > 0 ? {
        total: prTotal,
        awaitingReview: prAwaitingReview,
        recentPRs: [] // In a real implementation, this would be populated from GitHub
      } : undefined,
      nextIssues: nextIssuesData.length > 0 ? nextIssuesData : undefined
    });
    
    redirect(`/reports/${newReport.id}`);
  } catch {
    throw new Error('Failed to create report');
  }
}

export default function NewReportPage() {
  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/reports"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              ← Back to Reports
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-on-background">Create New Report</h1>
          <p className="mt-2 text-on-surface-variant">
            Create a periodic report to summarize development progress and set goals
          </p>
        </div>

        <form action={handleCreateReport} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-surface border border-outline rounded-lg p-6">
            <h2 className="text-xl font-semibold text-on-surface mb-6">Basic Information</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-on-surface mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="e.g., Weekly Development Report - Week 1"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-on-surface mb-2">
                  Description
                </label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Brief description of the report"
                />
              </div>

              <div>
                <label htmlFor="goal" className="block text-sm font-medium text-on-surface mb-2">
                  Goal
                </label>
                <input
                  type="text"
                  id="goal"
                  name="goal"
                  className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Main goal or objective for this period"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-surface border border-outline rounded-lg p-6">
            <h2 className="text-xl font-semibold text-on-surface mb-6">Report Content</h2>
            
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-on-surface mb-2">
                Content * (Supports Markdown)
              </label>
              <textarea
                id="content"
                name="content"
                required
                rows={12}
                className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="# Report Content

## Overview
Brief overview of the period...

## Key Achievements
- Achievement 1
- Achievement 2

## Challenges
- Challenge 1
- Challenge 2

## Next Steps
See next issues section for detailed priorities."
              />
            </div>
          </div>

          {/* PR Summary */}
          <div className="bg-surface border border-outline rounded-lg p-6">
            <h2 className="text-xl font-semibold text-on-surface mb-6">PR Summary</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prTotal" className="block text-sm font-medium text-on-surface mb-2">
                  Total PRs
                </label>
                <input
                  type="number"
                  id="prTotal"
                  name="prTotal"
                  min="0"
                  className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0"
                />
              </div>

              <div>
                <label htmlFor="prAwaitingReview" className="block text-sm font-medium text-on-surface mb-2">
                  Awaiting Review
                </label>
                <input
                  type="number"
                  id="prAwaitingReview"
                  name="prAwaitingReview"
                  min="0"
                  className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Next Issues */}
          <div className="bg-surface border border-outline rounded-lg p-6">
            <h2 className="text-xl font-semibold text-on-surface mb-6">Next Issues</h2>
            
            <div id="nextIssues" className="space-y-4">
              <div className="border border-outline rounded-md p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      Issue Title
                    </label>
                    <input
                      type="text"
                      name="issueTitle0"
                      className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Issue title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      Type
                    </label>
                    <select
                      name="issueType0"
                      className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="idea">Idea</option>
                      <option value="existing">Existing Issue</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      Priority
                    </label>
                    <select
                      name="issuePriority0"
                      className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                      <option value="high">High</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">
                      URL (optional)
                    </label>
                    <input
                      type="url"
                      name="issueUrl0"
                      className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="https://github.com/..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    Description
                  </label>
                  <textarea
                    name="issueDescription0"
                    rows={3}
                    className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Describe the issue or idea..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link
              href="/reports"
              className="px-6 py-3 border border-outline rounded-lg text-on-surface hover:bg-surface-variant transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              className="bg-primary text-on-primary px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Create Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}