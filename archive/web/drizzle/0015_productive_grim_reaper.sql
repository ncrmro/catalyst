ALTER TABLE "project_environments" ADD COLUMN "sub_type" text;--> statement-breakpoint
ALTER TABLE "project_environments" ADD COLUMN "deployment_config" jsonb;