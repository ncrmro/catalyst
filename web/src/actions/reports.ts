'use server';

/**
 * Server action to fetch reports data with mock implementation
 */

export interface PullRequest {
  id: number;
  title: string;
  number: number;
  author: string;
  author_avatar: string;
  repository: string;
  url: string;
  created_at: string;
  updated_at: string;
  comments_count: number;
  priority: 'high' | 'medium' | 'low';
  status: 'draft' | 'ready' | 'changes_requested';
}

export interface Issue {
  id: number;
  title: string;
  number: number;
  repository: string;
  url: string;
  created_at: string;
  updated_at: string;
  labels: string[];
  priority: 'high' | 'medium' | 'low';
  effort_estimate: 'small' | 'medium' | 'large';
  type: 'bug' | 'feature' | 'improvement' | 'idea';
  state: 'open' | 'closed';
}

export interface RepoNarrative {
  repository: string;
  recently_delivered_features: string[];
  ideal_next_tasks: string[];
  current_blockers: string[];
}

export interface Report {
  id: string;
  generated_at: string;
  period_start: string;
  period_end: string;
  summary: {
    total_prs_awaiting_review: number;
    total_priority_issues: number;
    goal_focus: string;
  };
  prs_awaiting_review: PullRequest[];
  priority_issues: Issue[];
  recommendations: string[];
  narrative_report?: {
    overview: string;
    repositories: RepoNarrative[];
  };
}

/**
 * Mock data for development and testing
 */
function getMockReportsData(): Report[] {
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
        },
        {
          id: 202,
          title: 'Implement real-time notifications system',
          number: 298,
          repository: 'catalyst/web-ui',
          url: 'https://github.com/catalyst/web-ui/issues/298',
          created_at: '2024-01-14T14:20:00Z',
          updated_at: '2024-01-20T11:30:00Z',
          labels: ['feature', 'frontend', 'websockets'],
          priority: 'high',
          effort_estimate: 'large',
          type: 'feature',
          state: 'open' as const
        },
        {
          id: 203,
          title: 'Database connection pool optimization',
          number: 167,
          repository: 'catalyst/core-service',
          url: 'https://github.com/catalyst/core-service/issues/167',
          created_at: '2024-01-18T09:15:00Z',
          updated_at: '2024-01-21T12:00:00Z',
          labels: ['performance', 'database'],
          priority: 'medium',
          effort_estimate: 'medium',
          type: 'improvement',
          state: 'open' as const
        },
        {
          id: 204,
          title: 'Add support for bulk data import/export',
          number: 345,
          repository: 'catalyst/data-service',
          url: 'https://github.com/catalyst/data-service/issues/345',
          created_at: '2024-01-12T16:45:00Z',
          updated_at: '2024-01-19T10:20:00Z',
          labels: ['feature', 'data', 'api'],
          priority: 'medium',
          effort_estimate: 'large',
          type: 'feature',
          state: 'open' as const
        },
        {
          id: 205,
          title: 'Improve error messages for validation failures',
          number: 123,
          repository: 'catalyst/web-ui',
          url: 'https://github.com/catalyst/web-ui/issues/123',
          created_at: '2024-01-19T13:30:00Z',
          updated_at: '2024-01-21T16:15:00Z',
          labels: ['ux', 'frontend', 'validation'],
          priority: 'low',
          effort_estimate: 'small',
          type: 'improvement',
          state: 'open' as const
        }
      ],
      recommendations: [
        'Focus on merging the authentication middleware PR (#247) as it\'s blocking several other security improvements',
        'Address the API rate limiting issue (#412) to improve system reliability under load',
        'Consider scheduling a team discussion about the real-time notifications implementation approach',
        'Review and merge the memory leak fix (#178) to prevent production issues',
        'Plan technical debt reduction sprint focusing on database optimization'
      ],
      narrative_report: {
        overview: "This week has been focused on improving API reliability and user experience across our three core repositories. The team has made significant progress on authentication security, user interface improvements, and backend performance optimizations. However, some critical issues around rate limiting and memory management require immediate attention to maintain system stability.",
        repositories: [
          {
            repository: "catalyst/api-gateway",
            recently_delivered_features: [
              "Implemented comprehensive API request logging and monitoring dashboard",
              "Added support for JWT token refresh functionality",
              "Deployed circuit breaker pattern for external service calls"
            ],
            ideal_next_tasks: [
              "Complete authentication middleware implementation (#247) to enhance security",
              "Integrate distributed tracing for better observability",
              "Add automated API documentation generation"
            ],
            current_blockers: [
              "API rate limiting causing timeouts for large datasets (#412) - affecting user experience",
              "Legacy authentication tokens need migration strategy before middleware deployment",
              "External service dependencies causing intermittent failures"
            ]
          },
          {
            repository: "catalyst/web-ui",
            recently_delivered_features: [
              "Redesigned user dashboard with improved navigation and performance",
              "Added real-time status indicators for all background processes",
              "Implemented responsive design for mobile and tablet devices"
            ],
            ideal_next_tasks: [
              "Implement real-time notifications system (#298) for better user engagement",
              "Add dark mode theme support for improved accessibility",
              "Optimize bundle size and implement code splitting for faster load times"
            ],
            current_blockers: [
              "WebSocket connection instability causing notification delays",
              "Browser compatibility issues with older Safari versions",
              "Form validation improvements blocked by backend API changes"
            ]
          },
          {
            repository: "catalyst/core-service",
            recently_delivered_features: [
              "Optimized database queries resulting in 40% performance improvement",
              "Implemented automated backup and recovery procedures",
              "Added comprehensive health check endpoints for monitoring"
            ],
            ideal_next_tasks: [
              "Complete database connection pool optimization (#167) for better resource utilization",
              "Implement data retention policies for long-term storage management",
              "Add support for read replicas to distribute query load"
            ],
            current_blockers: [
              "Memory leak in background job processor (#178) causing service restarts",
              "Database migration scripts need approval for production deployment",
              "Monitoring alerts generating false positives during high load periods"
            ]
          }
        ]
      }
    },
    {
      id: 'report-2024-01-15',
      generated_at: '2024-01-15T09:00:00Z',
      period_start: '2024-01-08T00:00:00Z',
      period_end: '2024-01-15T00:00:00Z',
      summary: {
        total_prs_awaiting_review: 3,
        total_priority_issues: 2,
        goal_focus: 'Foundation stability and testing improvements'
      },
      prs_awaiting_review: [
        {
          id: 106,
          title: 'Refactor user authentication flow',
          number: 189,
          author: 'tom-security',
          author_avatar: 'https://github.com/identicons/tom-security.png',
          repository: 'catalyst/auth-service',
          url: 'https://github.com/catalyst/auth-service/pull/189',
          created_at: '2024-01-10T11:20:00Z',
          updated_at: '2024-01-14T15:30:00Z',
          comments_count: 6,
          priority: 'high',
          status: 'ready'
        },
        {
          id: 107,
          title: 'Add integration tests for webhook handlers',
          number: 98,
          author: 'lisa-qa',
          author_avatar: 'https://github.com/identicons/lisa-qa.png',
          repository: 'catalyst/webhook-service',
          url: 'https://github.com/catalyst/webhook-service/pull/98',
          created_at: '2024-01-12T14:45:00Z',
          updated_at: '2024-01-14T09:20:00Z',
          comments_count: 4,
          priority: 'medium',
          status: 'ready'
        },
        {
          id: 108,
          title: 'Update documentation for API v2',
          number: 67,
          author: 'david-docs',
          author_avatar: 'https://github.com/identicons/david-docs.png',
          repository: 'catalyst/documentation',
          url: 'https://github.com/catalyst/documentation/pull/67',
          created_at: '2024-01-13T16:10:00Z',
          updated_at: '2024-01-14T18:45:00Z',
          comments_count: 2,
          priority: 'low',
          status: 'draft'
        }
      ],
      priority_issues: [
        {
          id: 206,
          title: 'Intermittent test failures in CI pipeline',
          number: 387,
          repository: 'catalyst/core-service',
          url: 'https://github.com/catalyst/core-service/issues/387',
          created_at: '2024-01-09T08:30:00Z',
          updated_at: '2024-01-14T14:20:00Z',
          labels: ['bug', 'testing', 'ci'],
          priority: 'high',
          effort_estimate: 'medium',
          type: 'bug',
          state: 'open' as const
        },
        {
          id: 207,
          title: 'Implement health check endpoints for all services',
          number: 445,
          repository: 'catalyst/infrastructure',
          url: 'https://github.com/catalyst/infrastructure/issues/445',
          created_at: '2024-01-08T12:15:00Z',
          updated_at: '2024-01-13T10:45:00Z',
          labels: ['feature', 'monitoring', 'health'],
          priority: 'medium',
          effort_estimate: 'small',
          type: 'feature',
          state: 'open' as const
        }
      ],
      recommendations: [
        'Prioritize fixing the CI pipeline test failures to maintain development velocity',
        'Complete the authentication flow refactor before implementing new auth features',
        'Establish health check endpoints to improve monitoring capabilities',
        'Consider automating more integration tests to catch issues earlier'
      ]
    },
    {
      id: 'report-2024-01-08',
      generated_at: '2024-01-08T09:00:00Z',
      period_start: '2024-01-01T00:00:00Z',
      period_end: '2024-01-08T00:00:00Z',
      summary: {
        total_prs_awaiting_review: 1,
        total_priority_issues: 1,
        goal_focus: 'New year planning and architecture improvements'
      },
      prs_awaiting_review: [
        {
          id: 109,
          title: 'Migrate to new database schema v3',
          number: 212,
          author: 'rachel-db',
          author_avatar: 'https://github.com/identicons/rachel-db.png',
          repository: 'catalyst/data-service',
          url: 'https://github.com/catalyst/data-service/pull/212',
          created_at: '2024-01-03T10:30:00Z',
          updated_at: '2024-01-07T16:20:00Z',
          comments_count: 18,
          priority: 'high',
          status: 'changes_requested'
        }
      ],
      priority_issues: [
        {
          id: 208,
          title: 'Plan microservices architecture migration',
          number: 501,
          repository: 'catalyst/architecture',
          url: 'https://github.com/catalyst/architecture/issues/501',
          created_at: '2024-01-02T14:00:00Z',
          updated_at: '2024-01-07T11:30:00Z',
          labels: ['architecture', 'planning', 'microservices'],
          priority: 'high',
          effort_estimate: 'large',
          type: 'idea',
          state: 'open' as const
        }
      ],
      recommendations: [
        'Complete database schema migration planning before Q1 development begins',
        'Organize architecture review sessions for microservices migration',
        'Establish clear timelines for major architectural changes',
        'Focus on documentation and knowledge sharing for complex migrations'
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
  const reports = getMockReportsData();
  
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
  const reports = getMockReportsData();
  
  return reports.find(report => report.id === reportId) || null;
}

/**
 * Fetch the most recent report
 */
export async function fetchLatestReport(): Promise<Report | null> {
  const reports = await fetchReports();
  return reports.length > 0 ? reports[0] : null;
}