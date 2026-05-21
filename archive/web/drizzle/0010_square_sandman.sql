ALTER TABLE "project" DROP CONSTRAINT "project_full_name_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "project_full_name_team_id_unique" ON "project" USING btree ("full_name","team_id");