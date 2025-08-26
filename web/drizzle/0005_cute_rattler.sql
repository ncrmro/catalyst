ALTER TABLE "project" ADD COLUMN "team_id" text;--> statement-breakpoint
ALTER TABLE "repo" ADD COLUMN "team_id" text;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repo" ADD CONSTRAINT "repo_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;