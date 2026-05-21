CREATE TABLE "pull_request_pods" (
	"id" text PRIMARY KEY NOT NULL,
	"pull_request_id" text NOT NULL,
	"commit_sha" text NOT NULL,
	"namespace" text NOT NULL,
	"deployment_name" text NOT NULL,
	"status" text NOT NULL,
	"public_url" text,
	"branch" text NOT NULL,
	"image_tag" text,
	"error_message" text,
	"resources_allocated" jsonb,
	"last_deployed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "unique_pr_commit" UNIQUE("pull_request_id","commit_sha")
);
--> statement-breakpoint
ALTER TABLE "pull_request_pods" ADD CONSTRAINT "pull_request_pods_pull_request_id_pull_requests_id_fk" FOREIGN KEY ("pull_request_id") REFERENCES "public"."pull_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pod_status" ON "pull_request_pods" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pod_namespace" ON "pull_request_pods" USING btree ("namespace");