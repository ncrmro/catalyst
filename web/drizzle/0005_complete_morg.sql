-- First add the team_id columns as nullable
ALTER TABLE "project" ADD COLUMN "team_id" text;--> statement-breakpoint
ALTER TABLE "repo" ADD COLUMN "team_id" text;--> statement-breakpoint

-- Update existing rows to use the first available team_id
UPDATE "project" SET "team_id" = (SELECT "id" FROM "teams" ORDER BY "createdAt" LIMIT 1);--> statement-breakpoint
UPDATE "repo" SET "team_id" = (SELECT "id" FROM "teams" ORDER BY "createdAt" LIMIT 1);--> statement-breakpoint

-- Now make the columns NOT NULL
ALTER TABLE "project" ALTER COLUMN "team_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "repo" ALTER COLUMN "team_id" SET NOT NULL;--> statement-breakpoint

-- Add the foreign key constraints
ALTER TABLE "project" ADD CONSTRAINT "project_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo" ADD CONSTRAINT "repo_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;
