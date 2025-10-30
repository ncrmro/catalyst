/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { db, reports } from "@/db";
import { inArray } from "drizzle-orm";
import { getReports, createReports } from "@/models/reports";
import { reportFactory } from "../../factories";

/**
 * Integration tests for reports model
 *
 * Tests all model functions with real database operations
 */
describe("Reports Model Integration", () => {
  const createdReportIds: string[] = [];

  afterAll(async () => {
    // Clean up all created reports
    if (createdReportIds.length > 0) {
      await db.delete(reports).where(inArray(reports.id, createdReportIds));
    }
  });

  beforeEach(() => {
    // Reset created reports list for tracking
    createdReportIds.length = 0;
  });

  describe("getReports", () => {
    it("should return reports ordered by creation date (newest first)", async () => {
      // Create multiple reports
      const report1 = await reportFactory.create();
      const report2 = await reportFactory.create();
      const report3 = await reportFactory.create();

      createdReportIds.push(report1.id, report2.id, report3.id);

      const result = await getReports();

      // Should have at least our 3 reports
      expect(result.length).toBeGreaterThanOrEqual(3);

      // Verify descending order (newest first)
      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          result[i + 1].createdAt.getTime(),
        );
      }
    });

    it("should respect limit parameter", async () => {
      const result = await getReports({ limit: 5 });

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("should respect offset parameter", async () => {
      // Create multiple reports to test offset
      const reports = await Promise.all([
        reportFactory.create(),
        reportFactory.create(),
        reportFactory.create(),
      ]);
      createdReportIds.push(...reports.map((r) => r.id));

      const firstPage = await getReports({ limit: 2, offset: 0 });
      const secondPage = await getReports({ limit: 2, offset: 2 });

      // Verify pagination works
      expect(firstPage.length).toBeLessThanOrEqual(2);
      expect(secondPage.length).toBeGreaterThan(0);

      // Verify different results
      if (firstPage.length > 0 && secondPage.length > 0) {
        expect(firstPage[0].id).not.toBe(secondPage[0].id);
      }
    });

    it("should use default limit of 50", async () => {
      const result = await getReports({});

      // Should not return more than 50 reports
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it("should return reports with valid data structure", async () => {
      const report = await reportFactory.create();
      createdReportIds.push(report.id);

      const result = await getReports({ limit: 1 });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("data");
      expect(result[0]).toHaveProperty("createdAt");

      // Verify data structure matches ReportData
      const reportData = result[0].data;
      expect(reportData).toHaveProperty("title");
      expect(reportData).toHaveProperty("summary");
      expect(reportData).toHaveProperty("projectsAnalysis");
      expect(reportData).toHaveProperty("recommendations");
      expect(reportData).toHaveProperty("nextSteps");
    });
  });

  describe("createReports", () => {
    it("should create a single report", async () => {
      const reportData = reportFactory.build().data;

      const [created] = await createReports(reportData);
      createdReportIds.push(created.id);

      expect(created).toHaveProperty("id");
      expect(created.data).toBeDefined();
      expect(created.data.title).toBe(reportData.title);
      expect(created.data.summary).toBe(reportData.summary);
      expect(created.createdAt).toBeInstanceOf(Date);

      // Verify it's actually in the database
      const fromDb = await getReports({ limit: 100 });
      const found = fromDb.find((r) => r.id === created.id);
      expect(found).toBeDefined();
    });

    it("should create multiple reports in bulk", async () => {
      const reportsData = [
        reportFactory.build().data,
        reportFactory.build().data,
        reportFactory.build().data,
      ];

      const created = await createReports(reportsData);
      createdReportIds.push(...created.map((r) => r.id));

      expect(created).toHaveLength(3);

      // Verify all have valid IDs and data
      for (const report of created) {
        expect(report).toHaveProperty("id");
        expect(report.data).toBeDefined();
        expect(report.data).toHaveProperty("title");
        expect(report.data).toHaveProperty("projectsAnalysis");
      }
    });

    it("should preserve complex report data structure", async () => {
      const reportData = {
        title: "Test Complex Report",
        summary: "This is a test summary",
        projectsAnalysis: {
          totalProjects: 10,
          activeEnvironments: 25,
          inactiveEnvironments: 5,
          insights: ["Insight 1", "Insight 2", "Insight 3"],
        },
        recommendations: ["Recommendation 1", "Recommendation 2"],
        nextSteps: ["Step 1", "Step 2", "Step 3"],
      };

      const [created] = await createReports(reportData);
      createdReportIds.push(created.id);

      expect(created.data.title).toBe("Test Complex Report");
      expect(created.data.projectsAnalysis.totalProjects).toBe(10);
      expect(created.data.projectsAnalysis.insights).toHaveLength(3);
      expect(created.data.recommendations).toHaveLength(2);
      expect(created.data.nextSteps).toHaveLength(3);
    });

    it("should handle empty arrays in report data", async () => {
      const reportData = {
        title: "Minimal Report",
        summary: "Minimal summary",
        projectsAnalysis: {
          totalProjects: 0,
          activeEnvironments: 0,
          inactiveEnvironments: 0,
          insights: [],
        },
        recommendations: [],
        nextSteps: [],
      };

      const [created] = await createReports(reportData);
      createdReportIds.push(created.id);

      expect(created.data.projectsAnalysis.insights).toEqual([]);
      expect(created.data.recommendations).toEqual([]);
      expect(created.data.nextSteps).toEqual([]);
    });

    it("should set timestamps automatically", async () => {
      const reportData = reportFactory.build().data;

      const [created] = await createReports(reportData);
      createdReportIds.push(created.id);

      expect(created.createdAt).toBeInstanceOf(Date);
      expect(created.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
      expect(created.createdAt.getTime()).toBeGreaterThan(Date.now() - 5000); // Within last 5 seconds
    });
  });
});
