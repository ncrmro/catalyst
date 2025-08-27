CREATE TABLE "project_workloads" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"repo_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"root_path" text DEFAULT '.' NOT NULL,
	"deployment_type" text DEFAULT 'dockerfile' NOT NULL,
	"dockerfile_path" text DEFAULT './Dockerfile',
	"helm_chart_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_workloads" ADD CONSTRAINT "project_workloads_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_workloads" ADD CONSTRAINT "project_workloads_repo_id_repo_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repo"("id") ON DELETE cascade ON UPDATE no action;