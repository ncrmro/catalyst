CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"description" text,
	"owner_login" text NOT NULL,
	"owner_type" text NOT NULL,
	"owner_avatar_url" text,
	"preview_environments_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "project_full_name_unique" UNIQUE("full_name")
);
--> statement-breakpoint
CREATE TABLE "projects_repos" (
	"project_id" text NOT NULL,
	"repo_id" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repo" (
	"id" text PRIMARY KEY NOT NULL,
	"github_id" integer NOT NULL,
	"name" text NOT NULL,
	"full_name" text NOT NULL,
	"description" text,
	"url" text NOT NULL,
	"is_private" boolean DEFAULT false NOT NULL,
	"language" text,
	"stargazers_count" integer DEFAULT 0 NOT NULL,
	"forks_count" integer DEFAULT 0 NOT NULL,
	"open_issues_count" integer DEFAULT 0 NOT NULL,
	"owner_login" text NOT NULL,
	"owner_type" text NOT NULL,
	"owner_avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"pushed_at" timestamp,
	CONSTRAINT "repo_github_id_unique" UNIQUE("github_id")
);
--> statement-breakpoint
ALTER TABLE "projects_repos" ADD CONSTRAINT "projects_repos_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects_repos" ADD CONSTRAINT "projects_repos_repo_id_repo_id_fk" FOREIGN KEY ("repo_id") REFERENCES "public"."repo"("id") ON DELETE cascade ON UPDATE no action;