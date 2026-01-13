ALTER TABLE "projects_repos" ADD COLUMN "repo_full_name" text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "repo_full_name_team_id_unique" ON "repo" USING btree ("full_name","team_id");