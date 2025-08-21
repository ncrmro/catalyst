'use server';

import { auth } from '@/auth';

export interface Report {
  id: string;
  title: string;
  description?: string;
  content: string;
  goal?: string;
  prSummary?: {
    total: number;
    awaitingReview: number;
    recentPRs: Array<{
      id: number;
      title: string;
      url: string;
      author: string;
      createdAt: string;
    }>;
  };
  nextIssues?: Array<{
    type: 'existing' | 'idea';
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    url?: string;
  }>;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReportData {
  title: string;
  description?: string;
  content: string;
  goal?: string;
  prSummary?: Report['prSummary'];
  nextIssues?: Report['nextIssues'];
}

export interface UpdateReportData extends CreateReportData {
  id: string;
}

/**
 * Mock data for development and testing
 */
function getMockReports(): Report[] {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return [
    {
      id: '1',
      title: 'Weekly Development Report - Week 1',
      description: 'Summary of development progress and upcoming priorities',
      content: `# Weekly Development Report

## Overview
This week we made significant progress on the authentication system and GitHub integration.

## Key Achievements
- Implemented GitHub OAuth integration
- Created repository listing functionality
- Set up database schema with Drizzle ORM
- Added comprehensive testing framework

## Challenges
- Database connection issues in local environment
- GitHub API rate limiting considerations
- TypeScript configuration complexities

## Next Steps
See the next issues section for detailed priorities.`,
      goal: 'Complete MVP authentication and repository management features',
      prSummary: {
        total: 8,
        awaitingReview: 3,
        recentPRs: [
          {
            id: 123,
            title: 'Add GitHub OAuth integration',
            url: 'https://github.com/ncrmro/catalyst/pull/123',
            author: 'developer1',
            createdAt: '2024-01-15T10:30:00Z'
          },
          {
            id: 124,
            title: 'Implement repository listing page',
            url: 'https://github.com/ncrmro/catalyst/pull/124',
            author: 'developer2',
            createdAt: '2024-01-14T15:45:00Z'
          },
          {
            id: 125,
            title: 'Add database migrations',
            url: 'https://github.com/ncrmro/catalyst/pull/125',
            author: 'developer1',
            createdAt: '2024-01-13T09:20:00Z'
          }
        ]
      },
      nextIssues: [
        {
          type: 'existing',
          title: 'Implement user profile management',
          description: 'Allow users to update their profile information and preferences',
          priority: 'high',
          url: 'https://github.com/ncrmro/catalyst/issues/45'
        },
        {
          type: 'idea',
          title: 'Add repository search functionality',
          description: 'Enable users to search through their repositories with filters',
          priority: 'medium'
        },
        {
          type: 'existing',
          title: 'Set up CI/CD pipeline',
          description: 'Implement automated testing and deployment pipeline',
          priority: 'high',
          url: 'https://github.com/ncrmro/catalyst/issues/67'
        }
      ],
      userId: 'user1',
      createdAt: lastWeek,
      updatedAt: lastWeek
    },
    {
      id: '2',
      title: 'Sprint Retrospective - December 2024',
      description: 'Retrospective analysis of December development sprint',
      content: `# Sprint Retrospective - December 2024

## What Went Well
- Team collaboration improved significantly
- Successfully delivered core authentication features
- Good test coverage achieved (>80%)
- Documentation quality improved

## What Could Be Improved
- Better estimation of task complexity
- More frequent communication during blockers
- Earlier identification of technical debt

## Action Items
1. Implement daily standup process
2. Create technical debt tracking system
3. Improve code review guidelines`,
      goal: 'Improve team velocity and code quality for next sprint',
      prSummary: {
        total: 12,
        awaitingReview: 2,
        recentPRs: [
          {
            id: 126,
            title: 'Fix authentication redirect issues',
            url: 'https://github.com/ncrmro/catalyst/pull/126',
            author: 'developer3',
            createdAt: '2024-01-12T14:20:00Z'
          },
          {
            id: 127,
            title: 'Update documentation for API endpoints',
            url: 'https://github.com/ncrmro/catalyst/pull/127',
            author: 'developer2',
            createdAt: '2024-01-11T11:15:00Z'
          }
        ]
      },
      nextIssues: [
        {
          type: 'idea',
          title: 'Implement automated code quality checks',
          description: 'Add pre-commit hooks and automated linting',
          priority: 'medium'
        },
        {
          type: 'existing',
          title: 'Optimize database queries',
          description: 'Review and optimize slow database queries identified in monitoring',
          priority: 'high',
          url: 'https://github.com/ncrmro/catalyst/issues/89'
        }
      ],
      userId: 'user1',
      createdAt: yesterday,
      updatedAt: yesterday
    }
  ];
}

/**
 * Get all reports for the current user
 */
export async function getReports(): Promise<Report[]> {
  // For development with mocked data, skip authentication check
  if (process.env.NODE_ENV === 'development' || process.env.MOCKED === '1') {
    const mockReports = getMockReports();
    return mockReports.filter(report => report.userId === 'user1'); // Mock user ID
  }

  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // In a real implementation, this would query the database
  // For now, return mock data filtered by user
  const mockReports = getMockReports();
  return mockReports.filter(report => report.userId === 'user1'); // Mock user ID
}

/**
 * Get a single report by ID
 */
export async function getReport(id: string): Promise<Report | null> {
  // For development with mocked data, skip authentication check
  if (process.env.NODE_ENV === 'development' || process.env.MOCKED === '1') {
    const mockReports = getMockReports();
    const report = mockReports.find(r => r.id === id && r.userId === 'user1');
    return report || null;
  }

  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const mockReports = getMockReports();
  const report = mockReports.find(r => r.id === id && r.userId === 'user1');
  return report || null;
}

/**
 * Create a new report
 */
export async function createReport(data: CreateReportData): Promise<Report> {
  // For development with mocked data, skip authentication check
  if (process.env.NODE_ENV === 'development' || process.env.MOCKED === '1') {
    const newReport: Report = {
      id: `report-${Date.now()}`,
      ...data,
      userId: 'user1', // Mock user ID
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return newReport;
  }

  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  // In a real implementation, this would insert into the database
  const newReport: Report = {
    id: `report-${Date.now()}`,
    ...data,
    userId: 'user1', // Mock user ID
    createdAt: new Date(),
    updatedAt: new Date()
  };

  return newReport;
}

/**
 * Update an existing report
 */
export async function updateReport(data: UpdateReportData): Promise<Report> {
  // For development with mocked data, skip authentication check
  if (process.env.NODE_ENV === 'development' || process.env.MOCKED === '1') {
    const existingReport = await getReport(data.id);
    if (!existingReport) {
      throw new Error('Report not found');
    }

    const updatedReport: Report = {
      ...existingReport,
      ...data,
      updatedAt: new Date()
    };

    return updatedReport;
  }

  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const existingReport = await getReport(data.id);
  if (!existingReport) {
    throw new Error('Report not found');
  }

  // In a real implementation, this would update the database
  const updatedReport: Report = {
    ...existingReport,
    ...data,
    updatedAt: new Date()
  };

  return updatedReport;
}

/**
 * Delete a report
 */
export async function deleteReport(id: string): Promise<void> {
  // For development with mocked data, skip authentication check
  if (process.env.NODE_ENV === 'development' || process.env.MOCKED === '1') {
    const existingReport = await getReport(id);
    if (!existingReport) {
      throw new Error('Report not found');
    }

    // In a real implementation, this would delete from the database
    // For now, just simulate success
    return;
  }

  const session = await auth();
  
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const existingReport = await getReport(id);
  if (!existingReport) {
    throw new Error('Report not found');
  }

  // In a real implementation, this would delete from the database
  // For now, just simulate success
}