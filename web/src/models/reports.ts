/**
 * Reports Model
 *
 * Database operations for reports table
 * No authentication - handled by actions layer
 */

import type { InferInsertModel } from "drizzle-orm";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { reports } from "@/db/schema";
import type { ReportData } from "@/types/reports";

export type InsertReport = InferInsertModel<typeof reports>;

/**
 * Query parameters for flexible report filtering
 */
export interface GetReportsParams {
	limit?: number;
	offset?: number;
}

/**
 * Get reports with optional pagination
 * Ordered by creation date (newest first)
 */
export async function getReports(params: GetReportsParams = {}) {
	const { limit = 50, offset = 0 } = params;

	return db
		.select()
		.from(reports)
		.orderBy(desc(reports.createdAt))
		.limit(limit)
		.offset(offset);
}

/**
 * Create one or multiple reports
 * Follows bulk operation pattern
 */
export async function createReports(data: ReportData | ReportData[]) {
	const items = Array.isArray(data) ? data : [data];

	const values = items.map((item) => ({
		data: item,
	}));

	return db.insert(reports).values(values).returning();
}
