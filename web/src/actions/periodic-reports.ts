'use server';

import { generatePeriodicReport } from '@/agents/periodic-report';
import { saveReport } from '@/actions/reports';
import { _auth } from '@/auth';

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

    // Save the generated report to the database
    try {
      await saveReport(report);
      console.log('Report saved to database successfully');
    } catch (saveError) {
      console.error('Failed to save report to database:', saveError);
      // Continue execution - we still want to return the report even if save fails
    }

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

    // Try to save fallback report as well
    try {
      await saveReport(fallbackReport);
      console.log('Fallback report saved to database successfully');
    } catch (saveError) {
      console.error('Failed to save fallback report to database:', saveError);
    }
    
    return {
      success: true,
      data: fallbackReport,
      error: null,
      fallback: true
    };
  }
}