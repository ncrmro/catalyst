'use server';

import { generatePeriodicReport } from '@/agents/periodic-report';
import { _auth } from '@/auth';
import { db, periodicReports } from '@/db';
import { desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

/**
 * Server action to generate and fetch a periodic report using the periodic report agent
 */
export async function generateLatestPeriodicReport() {
  try {
    // Get the current session to access the user's GitHub access token
    // Use _auth instead of auth to avoid throwing on unauthenticated users
    const session = await _auth();
    
    const report = await generatePeriodicReport({
      accessToken: session?.accessToken,
    });

    // Save the report to the database
    await db.insert(periodicReports).values({
      title: report.title,
      summary: report.summary,
      projectsAnalysis: JSON.stringify(report.projectsAnalysis),
      clustersAnalysis: JSON.stringify(report.clustersAnalysis),
      recommendations: JSON.stringify(report.recommendations),
      nextSteps: JSON.stringify(report.nextSteps),
      isFallback: false,
    });

    // Revalidate the home page to show the new report
    revalidatePath('/');

    return {
      success: true,
      data: report,
      error: null
    };
  } catch (error) {
    console.error('Failed to generate periodic report:', error);
    
    // Provide fallback data for development when API keys are not configured
    const fallbackReport = {
      title: "Catalyst Platform Status Report",
      summary: "This is a demonstration report showing the periodic report agent integration. Configure ANTHROPIC_API_KEY environment variable to generate AI-powered reports.",
      projectsAnalysis: {
        totalProjects: 3,
        activeEnvironments: 8,
        inactiveEnvironments: 2,
        insights: [
          "3 projects are currently tracked in the platform",
          "Most environments are actively deployed and healthy",
          "Consider reviewing inactive environments for cleanup"
        ]
      },
      clustersAnalysis: {
        totalClusters: 2,
        insights: [
          "2 Kubernetes clusters are being monitored",
          "Cluster resources are within normal operating ranges",
          "All critical workloads are properly distributed"
        ]
      },
      recommendations: [
        "Configure AI API keys to enable full periodic report generation",
        "Review and clean up inactive environments",
        "Set up monitoring alerts for cluster resource usage",
        "Schedule regular infrastructure health checks"
      ],
      nextSteps: [
        "Add ANTHROPIC_API_KEY to environment variables",
        "Complete cluster monitoring setup",
        "Schedule weekly infrastructure reviews",
        "Implement automated environment cleanup policies"
      ]
    };

    // Save the fallback report to the database
    await db.insert(periodicReports).values({
      title: fallbackReport.title,
      summary: fallbackReport.summary,
      projectsAnalysis: JSON.stringify(fallbackReport.projectsAnalysis),
      clustersAnalysis: JSON.stringify(fallbackReport.clustersAnalysis),
      recommendations: JSON.stringify(fallbackReport.recommendations),
      nextSteps: JSON.stringify(fallbackReport.nextSteps),
      isFallback: true,
    });

    // Revalidate the home page to show the new report
    revalidatePath('/');
    
    return {
      success: true,
      data: fallbackReport,
      error: null,
      fallback: true
    };
  }
}

/**
 * Server action for form submission to generate a report (doesn't return data)
 */
export async function generateReportAction() {
  await generateLatestPeriodicReport();
  // Revalidate to show the updated page
  revalidatePath('/');
}

/**
 * Get the latest periodic report from the database
 */
export async function getLatestPeriodicReport() {
  try {
    const [latestReport] = await db
      .select()
      .from(periodicReports)
      .orderBy(desc(periodicReports.createdAt))
      .limit(1);

    if (!latestReport) {
      return {
        success: true,
        data: null,
        error: null
      };
    }

    // Parse the JSON fields back to objects
    const report = {
      id: latestReport.id,
      title: latestReport.title,
      summary: latestReport.summary,
      projectsAnalysis: JSON.parse(latestReport.projectsAnalysis),
      clustersAnalysis: JSON.parse(latestReport.clustersAnalysis),
      recommendations: JSON.parse(latestReport.recommendations),
      nextSteps: JSON.parse(latestReport.nextSteps),
      isFallback: latestReport.isFallback,
      createdAt: latestReport.createdAt,
    };

    return {
      success: true,
      data: report,
      error: null
    };
  } catch (error) {
    console.error('Failed to fetch latest periodic report:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Failed to fetch report'
    };
  }
}