'use server';

import { db } from '@/db';
import { reports } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { reportSchema, type ReportData, type Report } from '@/types/reports';

/**
 * Save a generated report to the database
 */
export async function saveReport(reportData: ReportData): Promise<void> {
  // Runtime validation with Zod
  const validatedData = reportSchema.parse(reportData);
  
  // Save to database
  await db.insert(reports).values({
    data: validatedData
  });
}

/**
 * Fetch reports from database, falling back to mock data if none exist
 */
export async function fetchPeriodicReports(): Promise<ReportData[]> {
  try {
    const results = await db.select().from(reports).orderBy(desc(reports.createdAt));
    
    // Parse each result with Zod for runtime safety
    return results.map(row => reportSchema.parse(row.data));
  } catch (error) {
    console.warn('Failed to fetch reports from database:', error);
    return [];
  }
}

/**
 * Fetch the most recent periodic report
 */
export async function fetchLatestPeriodicReport(): Promise<ReportData | null> {
  const periodicReports = await fetchPeriodicReports();
  return periodicReports.length > 0 ? periodicReports[0] : null;
}

/**
 * Mock data for development and testing (legacy reports system)
 */
async function getMockReportsData(): Promise<Report[]> {
  return [
    {
      id: 'report-2024-01-22',
      generated_at: '2024-01-22T09:00:00Z',
      period_start: '2024-01-15T00:00:00Z',
      period_end: '2024-01-22T00:00:00Z',
      summary: {
        total_prs_awaiting_review: 5,
        total_priority_issues: 5,
        goal_focus: 'Improving API reliability and user experience'
      },
      prs_awaiting_review: [
        {
          id: 101,
          title: 'Add authentication middleware for API endpoints',
          number: 247,
          author: 'sarah-dev',
          author_avatar: 'https://github.com/identicons/sarah-dev.png',
          repository: 'catalyst/api-gateway',
          url: 'https://github.com/catalyst/api-gateway/pull/247',
          created_at: '2024-01-18T14:30:00Z',
          updated_at: '2024-01-21T10:15:00Z',
          comments_count: 8,
          priority: 'high',
          status: 'ready'
        },
        {
          id: 102,
          title: 'Implement caching layer for database queries',
          number: 156,
          author: 'mike-backend',
          author_avatar: 'https://github.com/identicons/mike-backend.png',
          repository: 'catalyst/core-service',
          url: 'https://github.com/catalyst/core-service/pull/156',
          created_at: '2024-01-19T09:20:00Z',
          updated_at: '2024-01-21T16:45:00Z',
          comments_count: 12,
          priority: 'high',
          status: 'changes_requested'
        },
        {
          id: 103,
          title: 'Update user dashboard UI components',
          number: 89,
          author: 'alex-frontend',
          author_avatar: 'https://github.com/identicons/alex-frontend.png',
          repository: 'catalyst/web-ui',
          url: 'https://github.com/catalyst/web-ui/pull/89',
          created_at: '2024-01-20T11:00:00Z',
          updated_at: '2024-01-21T14:20:00Z',
          comments_count: 3,
          priority: 'medium',
          status: 'ready'
        },
        {
          id: 104,
          title: 'Fix memory leak in background job processor',
          number: 178,
          author: 'jenny-ops',
          author_avatar: 'https://github.com/identicons/jenny-ops.png',
          repository: 'catalyst/worker-service',
          url: 'https://github.com/catalyst/worker-service/pull/178',
          created_at: '2024-01-17T16:45:00Z',
          updated_at: '2024-01-20T09:30:00Z',
          comments_count: 15,
          priority: 'high',
          status: 'ready'
        },
        {
          id: 105,
          title: 'Add unit tests for payment processing',
          number: 234,
          author: 'carlos-qa',
          author_avatar: 'https://github.com/identicons/carlos-qa.png',
          repository: 'catalyst/payment-service',
          url: 'https://github.com/catalyst/payment-service/pull/234',
          created_at: '2024-01-21T08:15:00Z',
          updated_at: '2024-01-21T18:00:00Z',
          comments_count: 2,
          priority: 'medium',
          status: 'draft'
        }
      ],
      priority_issues: [
        {
          id: 201,
          title: 'API rate limiting causing timeouts for large datasets',
          number: 412,
          repository: 'catalyst/api-gateway',
          url: 'https://github.com/catalyst/api-gateway/issues/412',
          created_at: '2024-01-16T10:30:00Z',
          updated_at: '2024-01-21T15:45:00Z',
          labels: ['bug', 'performance', 'api'],
          priority: 'high',
          effort_estimate: 'large',
          type: 'bug',
          state: 'open' as const
        }
      ],
      recommendations: [
        'Focus on merging the authentication middleware PR (#247) as it\'s blocking several other security improvements',
        'Address the API rate limiting issue (#412) to improve system reliability under load'
      ]
    }
  ];
}

/**
 * Fetch all reports, sorted by generation date (newest first)
 */
export async function fetchReports(): Promise<Report[]> {
  // For now, return mock data
  // In a real implementation, this would fetch from a database
  const reports = await getMockReportsData();
  
  // Sort by generated_at date, newest first
  return reports.sort((a, b) => 
    new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime()
  );
}

/**
 * Fetch a specific report by ID
 */
export async function fetchReportById(reportId: string): Promise<Report | null> {
  // For now, use mock data
  // In a real implementation, this would fetch from a database
  const reports = await getMockReportsData();
  
  return reports.find(report => report.id === reportId) || null;
}

/**
 * Fetch the most recent report
 */
export async function fetchLatestReport(): Promise<Report | null> {
  const reports = await fetchReports();
  return reports.length > 0 ? reports[0] : null;
}