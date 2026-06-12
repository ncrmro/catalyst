"use server";

import { createReports, getReports } from "@/models/reports";
import { reportSchema, type ReportData, type Report } from "@/types/reports";

/**
 * Save a generated report to the database
 */
export async function saveReport(reportData: ReportData): Promise<void> {
  // Runtime validation with Zod
  const validatedData = reportSchema.parse(reportData);

  // Save to database using model
  await createReports(validatedData);
}

/**
 * Fetch reports from database, falling back to empty array if error
 */
export async function fetchPeriodicReports(): Promise<ReportData[]> {
  try {
    const results = await getReports();

    // Parse each result with Zod for runtime safety
    return results.map((row) => reportSchema.parse(row.data));
  } catch (error) {
    console.warn("Failed to fetch reports from database:", error);
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
      id: "report-2024-01-22",
      generated_at: "2024-01-22T09:00:00Z",
      period_start: "2024-01-15T00:00:00Z",
      period_end: "2024-01-22T00:00:00Z",
      summary: {
        total_prs_awaiting_review: 5,
        total_priority_issues: 5,
        goal_focus: "Improving API reliability and user experience",
      },
      prs_awaiting_review: [
        {
          id: 101,
          title: "Add authentication middleware for API endpoints",
          number: 247,
          author: "sarah-dev",
          author_avatar: "https://github.com/identicons/sarah-dev.png",
          repository: "catalyst/api-gateway",
          url: "https://github.com/catalyst/api-gateway/pull/247",
          created_at: "2024-01-18T14:30:00Z",
          updated_at: "2024-01-21T10:15:00Z",
          comments_count: 8,
          priority: "high",
          status: "ready",
        },
        {
          id: 102,
          title: "Implement caching layer for database queries",
          number: 156,
          author: "mike-backend",
          author_avatar: "https://github.com/identicons/mike-backend.png",
          repository: "catalyst/core-service",
          url: "https://github.com/catalyst/core-service/pull/156",
          created_at: "2024-01-19T09:20:00Z",
          updated_at: "2024-01-21T16:45:00Z",
          comments_count: 12,
          priority: "high",
          status: "changes_requested",
        },
        {
          id: 103,
          title: "Update user dashboard UI components",
          number: 89,
          author: "alex-frontend",
          author_avatar: "https://github.com/identicons/alex-frontend.png",
          repository: "catalyst/web-ui",
          url: "https://github.com/catalyst/web-ui/pull/89",
          created_at: "2024-01-20T11:00:00Z",
          updated_at: "2024-01-21T14:20:00Z",
          comments_count: 3,
          priority: "medium",
          status: "ready",
        },
        {
          id: 104,
          title: "Fix memory leak in background job processor",
          number: 178,
          author: "jenny-ops",
          author_avatar: "https://github.com/identicons/jenny-ops.png",
          repository: "catalyst/worker-service",
          url: "https://github.com/catalyst/worker-service/pull/178",
          created_at: "2024-01-17T16:45:00Z",
          updated_at: "2024-01-20T09:30:00Z",
          comments_count: 15,
          priority: "high",
          status: "ready",
        },
        {
          id: 105,
          title: "Add unit tests for payment processing",
          number: 234,
          author: "carlos-qa",
          author_avatar: "https://github.com/identicons/carlos-qa.png",
          repository: "catalyst/payment-service",
          url: "https://github.com/catalyst/payment-service/pull/234",
          created_at: "2024-01-21T08:15:00Z",
          updated_at: "2024-01-21T18:00:00Z",
          comments_count: 2,
          priority: "medium",
          status: "draft",
        },
      ],
      priority_issues: [
        {
          id: 201,
          title: "API rate limiting causing timeouts for large datasets",
          number: 412,
          repository: "catalyst/api-gateway",
          url: "https://github.com/catalyst/api-gateway/issues/412",
          created_at: "2024-01-16T10:30:00Z",
          updated_at: "2024-01-21T15:45:00Z",
          labels: ["bug", "performance", "api"],
          priority: "high",
          effort_estimate: "large",
          type: "bug",
          state: "open" as const,
        },
        {
          id: 202,
          title: "Implement real-time notifications system",
          number: 298,
          repository: "catalyst/web-ui",
          url: "https://github.com/catalyst/web-ui/issues/298",
          created_at: "2024-01-14T14:20:00Z",
          updated_at: "2024-01-20T11:30:00Z",
          labels: ["feature", "frontend", "websockets"],
          priority: "high",
          effort_estimate: "large",
          type: "feature",
          state: "open" as const,
        },
        {
          id: 203,
          title: "Database connection pool optimization",
          number: 167,
          repository: "catalyst/core-service",
          url: "https://github.com/catalyst/core-service/issues/167",
          created_at: "2024-01-18T09:15:00Z",
          updated_at: "2024-01-21T12:00:00Z",
          labels: ["performance", "database"],
          priority: "medium",
          effort_estimate: "medium",
          type: "improvement",
          state: "open" as const,
        },
        {
          id: 204,
          title: "Add support for bulk data import/export",
          number: 345,
          repository: "catalyst/data-service",
          url: "https://github.com/catalyst/data-service/issues/345",
          created_at: "2024-01-12T16:45:00Z",
          updated_at: "2024-01-19T10:20:00Z",
          labels: ["feature", "data", "api"],
          priority: "medium",
          effort_estimate: "large",
          type: "feature",
          state: "open" as const,
        },
        {
          id: 205,
          title: "Improve error messages for validation failures",
          number: 123,
          repository: "catalyst/web-ui",
          url: "https://github.com/catalyst/web-ui/issues/123",
          created_at: "2024-01-19T13:30:00Z",
          updated_at: "2024-01-21T16:15:00Z",
          labels: ["ux", "frontend", "validation"],
          priority: "low",
          effort_estimate: "small",
          type: "improvement",
          state: "open" as const,
        },
      ],
      recommendations: [
        "Focus on merging the authentication middleware PR (#247) as it's blocking several other security improvements",
        "Address the API rate limiting issue (#412) to improve system reliability under load",
        "Consider scheduling a team discussion about the real-time notifications implementation approach",
        "Review and merge the memory leak fix (#178) to prevent production issues",
        "Plan technical debt reduction sprint focusing on database optimization",
      ],
      narrative_report: {
        overview:
          "This week has been focused on improving API reliability and user experience across our three core repositories. The team has made significant progress on authentication security, user interface improvements, and backend performance optimizations. However, some critical issues around rate limiting and memory management require immediate attention to maintain system stability.",
        repositories: [
          {
            repository: "catalyst/api-gateway",
            recently_delivered_features: [
              "Implemented comprehensive API request logging and monitoring dashboard",
              "Added support for JWT token refresh functionality",
              "Deployed circuit breaker pattern for external service calls",
            ],
            ideal_next_tasks: [
              "Complete authentication middleware implementation (#247) to enhance security",
              "Integrate distributed tracing for better observability",
              "Add automated API documentation generation",
            ],
            current_blockers: [
              "API rate limiting causing timeouts for large datasets (#412) - affecting user experience",
              "Legacy authentication tokens need migration strategy before middleware deployment",
              "External service dependencies causing intermittent failures",
            ],
          },
          {
            repository: "catalyst/web-ui",
            recently_delivered_features: [
              "Redesigned user dashboard with improved navigation and performance",
              "Added real-time status indicators for all background processes",
              "Implemented responsive design for mobile and tablet devices",
            ],
            ideal_next_tasks: [
              "Implement real-time notifications system (#298) for better user engagement",
              "Add dark mode theme support for improved accessibility",
              "Optimize bundle size and implement code splitting for faster load times",
            ],
            current_blockers: [
              "WebSocket connection instability causing notification delays",
              "Browser compatibility issues with older Safari versions",
              "Form validation improvements blocked by backend API changes",
            ],
          },
          {
            repository: "catalyst/core-service",
            recently_delivered_features: [
              "Optimized database queries resulting in 40% performance improvement",
              "Implemented automated backup and recovery procedures",
              "Added comprehensive health check endpoints for monitoring",
            ],
            ideal_next_tasks: [
              "Complete database connection pool optimization (#167) for better resource utilization",
              "Implement data retention policies for long-term storage management",
              "Add support for read replicas to distribute query load",
            ],
            current_blockers: [
              "Memory leak in background job processor (#178) affecting system stability",
              "Database connection pool exhaustion during peak hours",
              "Legacy code dependencies blocking modern framework upgrades",
            ],
          },
        ],
      },
    },
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
  return reports.sort(
    (a, b) =>
      new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime(),
  );
}

/**
 * Fetch a specific report by ID
 */
export async function fetchReportById(
  reportId: string,
): Promise<Report | null> {
  // For now, use mock data
  // In a real implementation, this would fetch from a database
  const reports = await getMockReportsData();

  return reports.find((report) => report.id === reportId) || null;
}

/**
 * Fetch the most recent report
 */
export async function fetchLatestReport(): Promise<Report | null> {
  const reports = await fetchReports();
  return reports.length > 0 ? reports[0] : null;
}
