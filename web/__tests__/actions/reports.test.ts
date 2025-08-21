import { fetchReports, fetchReportById, fetchLatestReport } from '../../src/actions/reports';

describe('Reports Actions', () => {
  test('should fetch all reports', async () => {
    const reports = await fetchReports();
    
    expect(Array.isArray(reports)).toBe(true);
    expect(reports.length).toBeGreaterThan(0);
    
    // Verify the reports are sorted by generated_at date (newest first)
    for (let i = 0; i < reports.length - 1; i++) {
      const currentDate = new Date(reports[i].generated_at);
      const nextDate = new Date(reports[i + 1].generated_at);
      expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
    }
    
    // Validate report structure
    const report = reports[0];
    expect(report).toHaveProperty('id');
    expect(report).toHaveProperty('generated_at');
    expect(report).toHaveProperty('period_start');
    expect(report).toHaveProperty('period_end');
    expect(report).toHaveProperty('summary');
    expect(report).toHaveProperty('prs_awaiting_review');
    expect(report).toHaveProperty('priority_issues');
    expect(report).toHaveProperty('recommendations');
    
    // Validate summary structure
    expect(report.summary).toHaveProperty('total_prs_awaiting_review');
    expect(report.summary).toHaveProperty('total_priority_issues');
    expect(report.summary).toHaveProperty('goal_focus');
    
    // Validate PR structure
    if (report.prs_awaiting_review.length > 0) {
      const pr = report.prs_awaiting_review[0];
      expect(pr).toHaveProperty('id');
      expect(pr).toHaveProperty('title');
      expect(pr).toHaveProperty('number');
      expect(pr).toHaveProperty('author');
      expect(pr).toHaveProperty('repository');
      expect(pr).toHaveProperty('priority');
      expect(pr).toHaveProperty('status');
    }
    
    // Validate issue structure
    if (report.priority_issues.length > 0) {
      const issue = report.priority_issues[0];
      expect(issue).toHaveProperty('id');
      expect(issue).toHaveProperty('title');
      expect(issue).toHaveProperty('number');
      expect(issue).toHaveProperty('repository');
      expect(issue).toHaveProperty('priority');
      expect(issue).toHaveProperty('type');
      expect(issue).toHaveProperty('effort_estimate');
    }
  });

  test('should fetch a specific report by ID', async () => {
    const reports = await fetchReports();
    const firstReport = reports[0];
    
    const report = await fetchReportById(firstReport.id);
    
    expect(report).not.toBeNull();
    expect(report?.id).toBe(firstReport.id);
    expect(report?.generated_at).toBe(firstReport.generated_at);
  });

  test('should return null for non-existent report ID', async () => {
    const report = await fetchReportById('non-existent-report');
    
    expect(report).toBeNull();
  });

  test('should fetch the latest report', async () => {
    const latestReport = await fetchLatestReport();
    const allReports = await fetchReports();
    
    expect(latestReport).not.toBeNull();
    expect(latestReport?.id).toBe(allReports[0].id);
  });

  test('should have valid priority values for PRs', async () => {
    const reports = await fetchReports();
    const validPriorities = ['high', 'medium', 'low'];
    
    reports.forEach(report => {
      report.prs_awaiting_review.forEach(pr => {
        expect(validPriorities).toContain(pr.priority);
      });
    });
  });

  test('should have valid status values for PRs', async () => {
    const reports = await fetchReports();
    const validStatuses = ['draft', 'ready', 'changes_requested'];
    
    reports.forEach(report => {
      report.prs_awaiting_review.forEach(pr => {
        expect(validStatuses).toContain(pr.status);
      });
    });
  });

  test('should have valid type values for issues', async () => {
    const reports = await fetchReports();
    const validTypes = ['bug', 'feature', 'improvement', 'idea'];
    
    reports.forEach(report => {
      report.priority_issues.forEach(issue => {
        expect(validTypes).toContain(issue.type);
      });
    });
  });

  test('should have valid effort estimates for issues', async () => {
    const reports = await fetchReports();
    const validEfforts = ['small', 'medium', 'large'];
    
    reports.forEach(report => {
      report.priority_issues.forEach(issue => {
        expect(validEfforts).toContain(issue.effort_estimate);
      });
    });
  });

  test('should have consistent summary counts', async () => {
    const reports = await fetchReports();
    
    reports.forEach(report => {
      expect(report.summary.total_prs_awaiting_review).toBe(report.prs_awaiting_review.length);
      expect(report.summary.total_priority_issues).toBe(report.priority_issues.length);
    });
  });
});