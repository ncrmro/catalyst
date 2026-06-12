-- Drop existing indices if they exist (they were added manually in migration 0023)
DROP INDEX IF EXISTS "secrets_team_level_unique";
DROP INDEX IF EXISTS "secrets_project_level_unique";
DROP INDEX IF EXISTS "secrets_environment_level_unique";

ALTER TABLE "secrets" ADD COLUMN "environment_type" text;--> statement-breakpoint
CREATE UNIQUE INDEX "secrets_team_level_unique" ON "secrets" USING btree ("team_id","name") WHERE project_id IS NULL AND environment_id IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "secrets_project_level_unique" ON "secrets" USING btree ("team_id","project_id","name") WHERE environment_id IS NULL AND project_id IS NOT NULL AND environment_type IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "secrets_template_level_unique" ON "secrets" USING btree ("team_id","project_id","environment_type","name") WHERE environment_type IS NOT NULL AND environment_id IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "secrets_environment_level_unique" ON "secrets" USING btree ("team_id","project_id","environment_id","name") WHERE project_id IS NOT NULL AND environment_id IS NOT NULL;