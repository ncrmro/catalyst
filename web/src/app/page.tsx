import { auth } from "@/auth";
import { Metadata } from "next";
import DashboardLayout from "@/components/dashboard-layout";
import { generateLatestPeriodicReport } from "@/actions/periodic-reports";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dashboard - Catalyst",
  description: "Your Catalyst development platform dashboard with latest project insights.",
};

export default async function Home() {
  const session = await auth();

  // Generate the latest periodic report
  let periodicReport;
  let error: string | null = null;
  let isFallback = false;

  try {
    const result = await generateLatestPeriodicReport();
    if (result.success) {
      periodicReport = result.data;
      isFallback = result.fallback || false;
    } else {
      error = result.error;
      periodicReport = null;
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to generate periodic report';
    periodicReport = null;
  }

  return (
    <DashboardLayout user={session.user}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold text-on-background mb-2">
            Welcome back, {session.user.name || session.user.email?.split('@')[0]}!
          </h1>
          <p className="text-on-surface-variant">
            Here&apos;s your latest project overview and insights.
          </p>
        </div>

        {/* Latest Report Section */}
        {error ? (
          <div className="bg-error-container border border-outline rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
              <span className="text-red-600 text-xl">⚠️</span>
            </div>
            <h2 className="text-lg font-semibold text-on-error-container mb-2 text-center">Error Loading Dashboard</h2>
            <p className="text-on-error-container text-center">{error}</p>
          </div>
        ) : !periodicReport ? (
          <div className="bg-surface border border-outline rounded-lg p-8 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-gray-400 text-3xl">📊</span>
            </div>
            <h3 className="text-lg font-medium text-on-surface mb-2">No reports available</h3>
            <p className="text-on-surface-variant max-w-md mx-auto">
              Reports will be generated periodically to provide insights into your project status and development priorities.
            </p>
          </div>
        ) : (
          <div className="bg-surface border border-outline rounded-lg p-8 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-on-surface mb-2">{periodicReport.title}</h2>
                <p className="text-on-surface-variant">
                  Generated on {new Date().toLocaleDateString()}
                  {isFallback && " • Demo Mode (Configure API keys for full functionality)"}
                </p>
              </div>
              <Link
                href="/reports"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                View All Reports →
              </Link>
            </div>

            {/* Executive Summary */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-on-surface mb-3">Executive Summary</h3>
              <p className="text-on-surface-variant leading-relaxed">{periodicReport.summary}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{periodicReport.projectsAnalysis.totalProjects}</div>
                <div className="text-sm text-blue-800">Total Projects</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{periodicReport.projectsAnalysis.activeEnvironments}</div>
                <div className="text-sm text-green-800">Active Environments</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">{periodicReport.clustersAnalysis.totalClusters}</div>
                <div className="text-sm text-purple-800">Total Clusters</div>
              </div>
            </div>

            {/* Analysis Sections */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Projects Analysis */}
              <div>
                <h3 className="text-lg font-semibold text-on-surface mb-4">Projects Insights</h3>
                <div className="space-y-3">
                  {periodicReport.projectsAnalysis.insights.map((insight, index) => (
                    <div key={index} className="border border-outline rounded-lg p-3 bg-gray-50">
                      <p className="text-sm text-on-surface">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clusters Analysis */}
              <div>
                <h3 className="text-lg font-semibold text-on-surface mb-4">Clusters Insights</h3>
                <div className="space-y-3">
                  {periodicReport.clustersAnalysis.insights.map((insight, index) => (
                    <div key={index} className="border border-outline rounded-lg p-3 bg-gray-50">
                      <p className="text-sm text-on-surface">{insight}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-on-surface mb-4">Recommendations</h3>
              <div className="space-y-2">
                {periodicReport.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start">
                    <span className="text-blue-600 mr-2">•</span>
                    <p className="text-sm text-on-surface">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Next Steps */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-on-surface mb-4">Next Steps</h3>
              <div className="space-y-2">
                {periodicReport.nextSteps.map((step, index) => (
                  <div key={index} className="flex items-start">
                    <span className="text-green-600 mr-2">→</span>
                    <p className="text-sm text-on-surface">{step}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-6 border-t border-outline">
              <h3 className="text-lg font-semibold text-on-surface mb-4">Quick Actions</h3>
              <div className="flex gap-4 flex-wrap">
                <Link
                  href="/reports"
                  className="inline-flex items-center px-4 py-2 border border-outline text-sm font-medium rounded-md text-on-surface bg-surface hover:bg-secondary-container hover:text-on-secondary-container"
                >
                  View All Reports
                </Link>
                <Link
                  href="/projects"
                  className="inline-flex items-center px-4 py-2 border border-outline text-sm font-medium rounded-md text-on-surface bg-surface hover:bg-secondary-container hover:text-on-secondary-container"
                >
                  Manage Projects
                </Link>
                <Link
                  href="/teams"
                  className="inline-flex items-center px-4 py-2 border border-outline text-sm font-medium rounded-md text-on-surface bg-surface hover:bg-secondary-container hover:text-on-secondary-container"
                >
                  View Teams
                </Link>
                <Link
                  href="/repos"
                  className="inline-flex items-center px-4 py-2 border border-outline text-sm font-medium rounded-md text-on-surface bg-surface hover:bg-secondary-container hover:text-on-secondary-container"
                >
                  View Repositories
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
