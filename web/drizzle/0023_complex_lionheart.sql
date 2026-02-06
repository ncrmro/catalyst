-- Migration 0023: Fix unique constraints for secrets table with NULL handling
-- 
-- PostgreSQL's standard UNIQUE constraints treat NULL as distinct values,
-- meaning multiple rows with NULL in the same column are allowed.
-- We need partial indexes to properly enforce uniqueness at each scope level.

-- Drop the problematic unique constraint from migration 0022
ALTER TABLE "secrets" DROP CONSTRAINT IF EXISTS "secrets_team_id_project_id_environment_id_name_unique";

-- Create partial unique indexes for each scope level

-- Team-level secrets: unique on (team_id, name) where project_id and environment_id are NULL
CREATE UNIQUE INDEX "secrets_team_level_unique" ON "secrets" ("team_id", "name") 
WHERE "project_id" IS NULL AND "environment_id" IS NULL;

-- Project-level secrets: unique on (team_id, project_id, name) where environment_id is NULL
CREATE UNIQUE INDEX "secrets_project_level_unique" ON "secrets" ("team_id", "project_id", "name") 
WHERE "environment_id" IS NULL AND "project_id" IS NOT NULL;

-- Environment-level secrets: unique on all four columns (no NULLs at this level)
CREATE UNIQUE INDEX "secrets_environment_level_unique" ON "secrets" ("team_id", "project_id", "environment_id", "name") 
WHERE "project_id" IS NOT NULL AND "environment_id" IS NOT NULL;

-- Manual fix for NOT NULL constraints
ALTER TABLE "secrets" ALTER COLUMN "project_id" DROP NOT NULL;
ALTER TABLE "secrets" ALTER COLUMN "environment_id" DROP NOT NULL;
