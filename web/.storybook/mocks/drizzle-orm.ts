/**
 * Mock drizzle-orm for Storybook browser environment
 * Provides type utilities that work with the actual schema definitions
 */

// Re-export the actual type utilities from drizzle-orm
// These are pure TypeScript types and don't require runtime code
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";

// Mock runtime exports that are not needed for type inference
export const relations = () => ({});
export const sql = {
  raw: (str) => str,
};

export default {};
