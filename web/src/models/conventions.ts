import { db } from "@/db";
import { conventionRules } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type ConventionRule = typeof conventionRules.$inferSelect;
export type NewConventionRule = typeof conventionRules.$inferInsert;

export async function getProjectConventionRules(projectId: string) {
  return await db.query.conventionRules.findMany({
    where: eq(conventionRules.projectId, projectId),
  });
}

export async function createConventionRule(rule: NewConventionRule) {
  const [created] = await db.insert(conventionRules).values(rule).returning();
  return created;
}

export async function updateConventionRule(id: string, updates: Partial<ConventionRule>) {
  const [updated] = await db
    .update(conventionRules)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(conventionRules.id, id))
    .returning();
  return updated;
}

export async function deleteConventionRule(id: string) {
  await db.delete(conventionRules).where(eq(conventionRules.id, id));
}

export async function getConventionRule(id: string) {
  return await db.query.conventionRules.findFirst({
    where: eq(conventionRules.id, id),
  });
}
