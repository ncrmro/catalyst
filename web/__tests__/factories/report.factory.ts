/**
 * Factory for creating test report data.
 *
 * @example
 * ```typescript
 * // Build in-memory report
 * const report = reportFactory.build();
 *
 * // Build with overrides
 * const customReport = reportFactory.build({
 *   data: {
 *     title: 'Monthly Status Report',
 *     summary: 'All systems operational',
 *   },
 * });
 *
 * // Persist to database
 * const persistedReport = await reportFactory.create();
 * ```
 */

import { Factory, faker } from "@/lib/factories";
import { createReports, type InsertReport } from "@/models/reports";
import type { ReportData } from "@/types/reports";

/**
 * Report factory for generating test report data
 */
class ReportFactory extends Factory<InsertReport> {
	/**
	 * Create and persist report to database using model layer
	 */
	async create(params?: Partial<InsertReport>) {
		const report = this.build(params);
		const [created] = await createReports(report.data);
		return created;
	}
}

/**
 * Generate realistic report data structure
 */
function generateReportData(): ReportData {
	const totalProjects = faker.number.int({ min: 5, max: 50 });
	const activeEnvironments = faker.number.int({
		min: 10,
		max: totalProjects * 3,
	});
	const inactiveEnvironments = faker.number.int({ min: 0, max: 10 });

	return {
		title: `${faker.date.month()} ${faker.date.recent().getFullYear()} Status Report`,
		summary: faker.company.catchPhrase(),
		projectsAnalysis: {
			totalProjects,
			activeEnvironments,
			inactiveEnvironments,
			insights: [
				faker.lorem.sentence(),
				faker.lorem.sentence(),
				faker.lorem.sentence(),
			],
		},
		recommendations: [faker.lorem.sentence(), faker.lorem.sentence()],
		nextSteps: [faker.lorem.sentence(), faker.lorem.sentence()],
	};
}

export const reportFactory = ReportFactory.define(() => ({
	data: generateReportData(),
}));
