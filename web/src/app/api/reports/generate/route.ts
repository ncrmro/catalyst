import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { PeriodicReportJob } from '@/jobs/periodic-reports';

/**
 * API endpoint to manually generate periodic reports using GitHub app installation tokens
 * 
 * This demonstrates how reports can be generated without requiring active user sessions,
 * using GitHub app installation tokens instead of user session tokens.
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let body = {};
    try {
      body = await request.json();
    } catch {
      // If no JSON body is provided, use empty object
      body = {};
    }
    
    const { userIds } = body as { userIds?: string[] };

    const job = new PeriodicReportJob();
    
    if (userIds && Array.isArray(userIds)) {
      // Generate reports for specific users
      await job.generateReportsForAllUsers({
        userIds,
        sendEmail: false,
        storeInDatabase: true,
      });
    } else {
      // Generate report for current user only
      const report = await job.generateReportForUser(session.user.id, {
        sendEmail: false,
        storeInDatabase: true,
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Report generated successfully using installation token',
        report: report ? {
          title: report.title,
          summary: report.summary,
          generated_with: 'github_app_installation_token'
        } : null
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Reports generated successfully using installation tokens' 
    });
  } catch (error) {
    console.error('Failed to generate periodic report:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate report',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}