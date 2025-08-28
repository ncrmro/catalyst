CREATE TABLE "project_manifests" (
	"project_id" text NOT NULL,
	"repo_id" text NOT NULL,
	"path" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_manifests_pkey" PRIMARY KEY("project_id","repo_id","path")
);
--> statement-breakpoint
ALTER TABLE "project_manifests" ADD CONSTRAINT "project_manifests_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_manifests" ADD CONSTRAINT "project_manifests_repo_id_repo_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repo"("id") ON DELETE cascade ON UPDATE no action;