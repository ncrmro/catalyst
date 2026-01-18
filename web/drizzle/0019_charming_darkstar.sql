ALTER TABLE "repo" DROP CONSTRAINT "repo_github_id_unique";--> statement-breakpoint
ALTER TABLE "projects_repos" ADD CONSTRAINT "projects_repos_project_id_repo_id_pk" PRIMARY KEY("project_id","repo_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repo_github_id_team_id_unique" ON "repo" USING btree ("github_id","team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repo_full_name_team_id_unique" ON "repo" USING btree ("full_name","team_id");