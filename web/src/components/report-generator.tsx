import Link from 'next/link';
import { generateReportAction, getLatestPeriodicReport } from '@/actions/periodic-reports';

interface PeriodicReport {
  id: string;
  title: string;
  summary: string;
  projectsAnalysis: {
    totalProjects: number;
    activeEnvironments: number;
    inactiveEnvironments?: number;
    insights: string[];
  };
  clustersAnalysis: {
    totalClusters: number;
    insights: string[];
  };
  recommendations: string[];
  nextSteps: string[];
  isFallback: boolean;
  createdAt: Date;
}

interface ReportGeneratorProps {
  className?: string;
}

function GenerateReportButton() {
  return (
    <form action={generateReportAction}>
      <button
        type="submit"
        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        📊 Generate Report
      </button>
    </form>
  );
}

function RegenerateReportButton() {
  return (
    <form action={generateReportAction}>
      <button
        type="submit"
        className="inline-flex items-center px-4 py-2 border border-outline text-sm font-medium rounded-md text-on-surface bg-surface hover:bg-secondary-container hover:text-on-secondary-container focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        🔄 Regenerate
      </button>
    </form>
  );
}

export default async function ReportGenerator({ className = '' }: ReportGeneratorProps) {
  try {
    const reportResult = await getLatestPeriodicReport();
    
    // Show error state if there was an error fetching the report
    if (!reportResult.success) {
      return (
        <div className={`bg-error-container border border-outline rounded-lg p-6 ${className}`}>
          <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
            <span className="text-red-600 text-xl">⚠️</span>
          </div>
          <h2 className="text-lg font-semibold text-on-error-container mb-2 text-center">Error Loading Dashboard</h2>
          <p className="text-on-error-container text-center mb-4">{reportResult.error}</p>
          <div className="text-center">
            <GenerateReportButton />
          </div>
        </div>
      );
    }

    const periodicReport = reportResult.data;

  // Show report if available
  if (periodicReport) {
    return (
      <div className={`bg-surface border border-outline rounded-lg p-4 md:p-8 shadow-sm ${className}`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-on-surface mb-2">{periodicReport.title}</h2>
            <p className="text-on-surface-variant">
              Generated on {periodicReport.createdAt.toLocaleDateString()}
              {periodicReport.isFallback && " • Demo Mode (Configure API keys for full functionality)"}
            </p>
          </div>
          <div className="flex gap-2">
            <RegenerateReportButton />
            <Link
              href="/reports"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              View All Reports →
            </Link>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-on-surface mb-3">Executive Summary</h3>
          <p className="text-on-surface-variant leading-relaxed">{periodicReport.summary}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-on-surface mb-4">Projects Insights</h3>
            <div className="space-y-3">
              {periodicReport.projectsAnalysis.insights.map((insight: string, index: number) => (
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
              {periodicReport.clustersAnalysis.insights.map((insight: string, index: number) => (
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
            {periodicReport.recommendations.map((recommendation: string, index: number) => (
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
            {periodicReport.nextSteps.map((step: string, index: number) => (
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
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-3 md:gap-4">
            <Link
              href="/reports"
              className="inline-flex items-center justify-center px-4 py-2 border border-outline text-sm font-medium rounded-md text-on-surface bg-surface hover:bg-secondary-container hover:text-on-secondary-container min-h-[44px]"
            >
              View All Reports
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center justify-center px-4 py-2 border border-outline text-sm font-medium rounded-md text-on-surface bg-surface hover:bg-secondary-container hover:text-on-secondary-container min-h-[44px]"
            >
              Manage Projects
            </Link>
            <Link
              href="/teams"
              className="inline-flex items-center justify-center px-4 py-2 border border-outline text-sm font-medium rounded-md text-on-surface bg-surface hover:bg-secondary-container hover:text-on-secondary-container min-h-[44px]"
            >
              View Teams
            </Link>
            <Link
              href="/repos"
              className="inline-flex items-center justify-center px-4 py-2 border border-outline text-sm font-medium rounded-md text-on-surface bg-surface hover:bg-secondary-container hover:text-on-secondary-container min-h-[44px]"
            >
              View Repositories
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show initial state with generate button
  return (
    <div className={`bg-surface border border-outline rounded-lg p-8 text-center ${className}`}>
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-gray-400 text-3xl">📊</span>
      </div>
      <h3 className="text-lg font-medium text-on-surface mb-2">Generate Project Report</h3>
      <p className="text-on-surface-variant max-w-md mx-auto mb-6">
        Click the button below to generate a comprehensive report with insights into your project status and development priorities.
      </p>
      <GenerateReportButton />
    </div>
  );
  } catch (error) {
    // Fallback if database connection fails
    return (
      <div className={`bg-surface border border-outline rounded-lg p-8 text-center ${className}`}>
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-400 text-3xl">📊</span>
        </div>
        <h3 className="text-lg font-medium text-on-surface mb-2">Generate Project Report</h3>
        <p className="text-on-surface-variant max-w-md mx-auto mb-6">
          Click the button below to generate a comprehensive report with insights into your project status and development priorities.
        </p>
        <GenerateReportButton />
      </div>
    );
  }
}