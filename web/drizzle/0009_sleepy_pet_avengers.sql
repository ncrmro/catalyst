CREATE TABLE "pull_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"repo_id" text NOT NULL,
	"provider" text NOT NULL,
	"provider_pr_id" text NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"state" text NOT NULL,
	"status" text NOT NULL,
	"url" text NOT NULL,
	"author_login" text NOT NULL,
	"author_avatar_url" text,
	"head_branch" text NOT NULL,
	"base_branch" text NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"reviews_count" integer DEFAULT 0 NOT NULL,
	"changed_files_count" integer DEFAULT 0 NOT NULL,
	"additions_count" integer DEFAULT 0 NOT NULL,
	"deletions_count" integer DEFAULT 0 NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"labels" text,
	"assignees" text,
	"reviewers" text,
	"merged_at" timestamp,
	"closed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pull_requests_repo_id_provider_provider_pr_id_unique" UNIQUE("repo_id","provider","provider_pr_id")
);
--> statement-breakpoint
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_repo_id_repo_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repo"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "idx_pull_requests_repo_id" ON "pull_requests" ("repo_id");
--> statement-breakpoint
CREATE INDEX "idx_pull_requests_state" ON "pull_requests" ("state");
--> statement-breakpoint
CREATE INDEX "idx_pull_requests_status" ON "pull_requests" ("status");
--> statement-breakpoint
CREATE INDEX "idx_pull_requests_updated_at" ON "pull_requests" ("updated_at");
--> statement-breakpoint
CREATE INDEX "idx_pull_requests_author_login" ON "pull_requests" ("author_login");
--> statement-breakpoint
CREATE INDEX "idx_pull_requests_provider_pr_id" ON "pull_requests" ("provider", "provider_pr_id");