/**
 * Mock drizzle-orm for Storybook browser environment
 * Provides type utilities that work with the actual schema definitions
 */

// Mock runtime exports that are not needed for type inference
export const relations = () => ({});
export const sql = {
  raw: (str) => str,
};

// Mock type inference helpers (these are runtime no-ops in JS)
export const InferSelectModel = {};
export const InferInsertModel = {};

export default {};
