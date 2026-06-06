ALTER TABLE "secrets" DROP CONSTRAINT "secrets_team_id_project_id_environment_id_name_pk";--> statement-breakpoint
ALTER TABLE "secrets" ADD COLUMN "id" text PRIMARY KEY NOT NULL;--> statement-breakpoint
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_team_id_project_id_environment_id_name_unique" UNIQUE("team_id","project_id","environment_id","name");