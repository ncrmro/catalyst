CREATE TABLE "project_environments" (
	"project_id" text NOT NULL,
	"repo_id" text NOT NULL,
	"environment" text NOT NULL,
	"latest_deployment" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_environments" ADD CONSTRAINT "project_environments_pkey" PRIMARY KEY ("project_id", "repo_id");--> statement-breakpoint
ALTER TABLE "project_environments" ADD CONSTRAINT "project_environments_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_environments" ADD CONSTRAINT "project_environments_repo_id_repo_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repo"("id") ON DELETE cascade ON UPDATE no action;