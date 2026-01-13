ALTER TABLE "repo" DROP CONSTRAINT "repo_github_id_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "repo_github_id_team_id_unique" ON "repo" USING btree ("github_id","team_id");